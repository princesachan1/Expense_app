import os
import json
import tempfile
import shutil
import asyncio
import io
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from PIL import Image
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

# Import our modular logic
from paddle_ocr import perform_ocr
from spacy_ner import extract_entities, predict_category_from_text
from regex_logic import apply_fallbacks
from database import init_db, get_db, Expense, User
from timing import Timer
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI(title="Expense AI Backend")

# Thread pool for heavy OCR work
executor = ThreadPoolExecutor(max_workers=2)

@app.on_event("startup")
def startup_event():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────
# AUTH MODELS
# ──────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str = None

# ──────────────────────────────────────────
# AUTH ENDPOINTS
# ──────────────────────────────────────────

@app.post("/api/auth/register")
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    print(f"Registration attempt for user: {data.username}")
    
    if not data.username or not data.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    
    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        print(f"Registration failed: Username {data.username} already exists")
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = get_password_hash(data.password)
    new_user = User(username=data.username, full_name=data.full_name, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"User created successfully: {data.username}")
    return {"success": True, "message": "User created successfully"}

@app.post("/api/auth/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Login attempt for user: {form_data.username}")
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        print(f"Login failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    print(f"Login successful for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username, 
        "full_name": current_user.full_name,
        "id": current_user.id
    }

@app.put("/api/auth/profile")
def update_profile(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "full_name" in data:
        user.full_name = data["full_name"]
        db.commit()
    return {"success": True, "full_name": user.full_name}

# ──────────────────────────────────────────
# EXPENSE ENDPOINTS (Protected)
# ──────────────────────────────────────────

def run_extraction_pipeline(temp_file_path: str):
    with Timer("Overall Pipeline"):
        extracted_lines = perform_ocr(temp_file_path)
        structured_data, full_text = extract_entities(extracted_lines)
        structured_data = apply_fallbacks(full_text, extracted_lines, structured_data)
    return structured_data

@app.post("/api/extract")
async def extract_text_from_receipt(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user)
):
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename or "receipt.jpg")
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        img.thumbnail((800, 800))
        img.save(temp_file_path, "JPEG", quality=95)
        
        loop = asyncio.get_running_loop()
        structured_data = await loop.run_in_executor(
            executor, run_extraction_pipeline, temp_file_path
        )
        return {"success": True, "structured_data": structured_data}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/api/expenses")
def save_expense(
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        total_val = float(str(data.get("total", 0.0)).replace(",", ""))
        # Serialize items list to JSON string for storage
        items_raw = data.get("items")
        items_json = json.dumps(items_raw) if isinstance(items_raw, list) else items_raw
        
        # Auto-categorization logic
        category = data.get("category", "Other")
        if category in ("Other", "Pending..."):
            description_text = ""
            if isinstance(items_raw, list) and items_raw:
                description_text = " ".join(items_raw)
            elif isinstance(items_raw, str) and items_raw.strip():
                description_text = items_raw
            
            if description_text:
                category = predict_category_from_text(description_text)
                print(f"Auto-categorized '{description_text}' to '{category}'")
            elif category == "Pending...":
                category = "Other"  # Don't let 'Pending...' persist in DB

        new_expense = Expense(
            user_id=current_user.id,
            merchant=data.get("merchant"),
            total=total_val,
            date=data.get("date"),
            category=category,
            gstno=data.get("gstno"),
            filename=data.get("filename"),
            items=items_json
        )
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return {"success": True, "id": new_expense.id, "category": category}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/expenses")
def get_expenses(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).order_by(Expense.created_at.desc()).all()
    # Parse items JSON strings back into lists for the frontend
    result = []
    for exp in expenses:
        # Safely parse items JSON
        items_list = []
        if exp.items:
            try:
                parsed = json.loads(exp.items)
                items_list = parsed if isinstance(parsed, list) else [str(parsed)]
            except (json.JSONDecodeError, TypeError):
                items_list = [exp.items] if exp.items.strip() else []
        
        exp_dict = {
            "id": exp.id,
            "user_id": exp.user_id,
            "merchant": exp.merchant,
            "total": exp.total,
            "date": exp.date,
            "category": exp.category,
            "gstno": exp.gstno,
            "filename": exp.filename,
            "items": items_list,
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
        }
        result.append(exp_dict)
    return {"success": True, "expenses": result}

@app.put("/api/expenses/{expense_id}")
def update_expense(
    expense_id: int, 
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        if "merchant" in data: expense.merchant = data["merchant"]
        if "total" in data: expense.total = float(str(data["total"]).replace(",", ""))
        if "date" in data: expense.date = data["date"]
        if "category" in data: expense.category = data["category"]
        if "gstno" in data: expense.gstno = data["gstno"]
        if "items" in data:
            items_raw = data["items"]
            expense.items = json.dumps(items_raw) if isinstance(items_raw, list) else items_raw
        db.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/expenses/{expense_id}")
def delete_expense(
    expense_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        db.delete(expense)
        db.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "AI Multi-User Backend is Running!"}

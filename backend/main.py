import os
import tempfile
import shutil
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from sqlalchemy.orm import Session
from typing import Optional

# Import our modular logic
from paddle_ocr import perform_ocr
from spacy_ner import extract_entities
from regex_logic import apply_fallbacks
from database import init_db, get_db, Expense

app = FastAPI(title="Expense AI Backend")

# Initialize the database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# We use CORS to ensure your mobile app can talk to the server safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "AI Backend is Running! Modular and Ready."}

@app.post("/")
def debug_post_root():
    return {
        "success": False, 
        "error": "You hit POST /. Please use POST /api/extract instead.",
        "hint": "Check your frontend API_URL configuration."
    }

@app.post("/api/extract")
async def extract_text_from_receipt(file: UploadFile = File(...)):
    """Extracts data but DOES NOT save to database. Frontend handles editing first."""
    print(f"--- Recieved extraction request: {file.filename} ---")
    
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        img = Image.open(temp_file_path)
        img.thumbnail((736, 736))
        img.save(temp_file_path, "JPEG")
        
        extracted_lines = perform_ocr(temp_file_path)
        structured_data, full_text = extract_entities(extracted_lines)
        structured_data = apply_fallbacks(full_text, extracted_lines, structured_data)
        
        return {
            "success": True,
            "filename": file.filename, 
            "structured_data": structured_data
        }
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/api/expenses")
def save_expense(data: dict, db: Session = Depends(get_db)):
    """Saves a new expense manually (usually after review)"""
    try:
        total_val = float(str(data.get("total", 0.0)).replace(",", ""))
        new_expense = Expense(
            merchant=data.get("merchant"),
            total=total_val,
            date=data.get("date"),
            category=data.get("category", "Other"),
            gstno=data.get("gstno"),
            filename=data.get("filename")
        )
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return {"success": True, "id": new_expense.id}
    except Exception as e:
        print(f"Error saving expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/expenses/{expense_id}")
def update_expense(expense_id: int, data: dict, db: Session = Depends(get_db)):
    """Updates an existing expense in the database"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        if "merchant" in data: expense.merchant = data["merchant"]
        if "total" in data: expense.total = float(str(data["total"]).replace(",", ""))
        if "date" in data: expense.date = data["date"]
        if "category" in data: expense.category = data["category"]
        if "gstno" in data: expense.gstno = data["gstno"]
        
        db.commit()
        return {"success": True}
    except Exception as e:
        print(f"Error updating expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/expenses")
def get_expenses(db: Session = Depends(get_db)):
    expenses = db.query(Expense).order_by(Expense.created_at.desc()).all()
    return {"success": True, "expenses": expenses}

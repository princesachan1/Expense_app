import os
import spacy

# Initialize the custom spaCy model lazily
nlp_instance = None

def get_nlp():
    global nlp_instance
    if nlp_instance is None:
        print("Loading Custom spaCy model...")
        try:
            # Use model-best if it exists, otherwise fallback to model-last
            model_path = "output/model-best" if os.path.exists("output/model-best") else "output/model-last"
            if os.path.exists(model_path):
                nlp_instance = spacy.load(model_path)
                print(f"Custom spaCy model loaded from {model_path}!")
            else:
                print("Warning: Custom spaCy model not found. Run training first.")
                nlp_instance = None
        except Exception as e:
            print(f"Error loading custom spaCy model: {e}")
            nlp_instance = None
    return nlp_instance

# Strict category list as requested
ALLOWED_CATEGORIES = [
    "Groceries", "Fuel & Transport", "Food", "Bills & Utilities", 
    "Shopping", "Entertainment", "Health", "Education", 
    "Travel", "Personal Care", "Other"
]

def predict_category_from_text(text: str):
    """
    Predicts one of the 11 strict categories from a text description.
    """
    if not text or len(text.strip()) < 2:
        return "Other"

    nlp = get_nlp()
    if not nlp:
        return "Other"

    doc = nlp(text)
    
    if doc.cats:
        # Get the highest scoring category from the model
        predicted = max(doc.cats, key=doc.cats.get)
        
        # Exact match check (case-insensitive)
        for cat in ALLOWED_CATEGORIES:
            if cat.lower() == predicted.lower():
                return cat
                
    # Fallback to simple keyword matching if model is unsure or prediction is invalid
    text_lower = text.lower()
    if any(k in text_lower for k in ["grocery", "milk", "bread", "supermarket"]): return "Groceries"
    if any(k in text_lower for k in ["fuel", "petrol", "diesel", "uber", "taxi", "ola"]): return "Fuel & Transport"
    if any(k in text_lower for k in ["food", "dinner", "lunch", "restaurant", "swiggy", "zomato", "pizza"]): return "Food"
    if any(k in text_lower for k in ["bill", "electricity", "water", "recharge", "utility"]): return "Bills & Utilities"
    if any(k in text_lower for k in ["shop", "amazon", "flipkart", "clothes", "mall"]): return "Shopping"
    if any(k in text_lower for k in ["movie", "pvr", "netflix", "game", "show"]): return "Entertainment"
    if any(k in text_lower for k in ["health", "med", "doctor", "pharmacy", "hospital"]): return "Health"
    if any(k in text_lower for k in ["school", "fee", "course", "book", "education"]): return "Education"
    if any(k in text_lower for k in ["travel", "flight", "hotel", "train", "ticket"]): return "Travel"
    if any(k in text_lower for k in ["beauty", "salon", "soap", "care"]): return "Personal Care"

    return "Other"

def extract_entities(extracted_lines):
    """
    Uses the custom spaCy model to extract structured data from OCR text lines.
    Returns (structured_data, full_text).
    """
    structured_data = {
        "merchant": None,
        "gstno": None,
        "date": None,
        "total": None,
        "items": [],
        "category": "Other"
    }
    
    nlp = get_nlp()
    if not nlp or not extracted_lines:
        return structured_data, ""
    
    full_text = "\n".join(extracted_lines)
    doc = nlp(full_text)
    
    # Extract recognized entities
    for ent in doc.ents:
        label = ent.label_
        if label == "MERCHANT": structured_data["merchant"] = ent.text
        elif label == "GSTNO": structured_data["gstno"] = ent.text
        elif label == "DATE": structured_data["date"] = ent.text
        elif label == "ITEM": structured_data["items"].append(ent.text)
    
    # Predict the best category and ensure it's in the allowed list
    if doc.cats:
        raw_pred = max(doc.cats, key=doc.cats.get)
        matched = False
        for cat in ALLOWED_CATEGORIES:
            if cat.lower() == raw_pred.lower():
                structured_data["category"] = cat
                matched = True
                break
        if not matched:
            structured_data["category"] = "Other"

    # --- NEW: Merchant Fallback (Top Line) ---
    if not structured_data["merchant"] and extracted_lines:
        first_line = extracted_lines[0].strip()
        if len(first_line) > 2:
            structured_data["merchant"] = first_line
        
    return structured_data, full_text

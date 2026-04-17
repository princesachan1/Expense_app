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

def warmup_nlp():
    """
    Pre-loads the spaCy model at startup so the first request doesn't pay the load cost.
    """
    print("Warming up spaCy NER model...")
    nlp = get_nlp()
    if nlp:
        # Run a dummy prediction to warm up any lazy internals
        nlp("test warmup sentence")
        print("spaCy NER warm-up complete!")
    else:
        print("⚠️  spaCy model not available for warm-up")

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
        confidence = doc.cats[predicted]
        
        print(f"DEBUG [spaCy NER] Text: '{text}' | Predicted: '{predicted}' | Confidence: {confidence:.2f}")
        
        # Only trust the ML model if it's reasonably confident
        if confidence > 0.70:
            # Exact match check (case-insensitive)
            for cat in ALLOWED_CATEGORIES:
                if cat.lower() == predicted.lower():
                    return cat
                
    # Fallback to expanded keyword matching if model is unsure or prediction is invalid
    text_lower = text.lower()
    
    # 1. Food (Expanded for Indian cuisine and snacks)
    if any(k in text_lower for k in ["food", "dinner", "lunch", "breakfast", "restaurant", "swiggy", "zomato", "pizza", "burger", "samosa", "samose", "bhature", "chole", "kulche", "paratha", "naan", "roti", "biryani", "rice", "dal", "paneer", "chicken", "mutton", "fish", "egg", "tea", "coffee", "chai", "frappe", "nescafe", "starbucks", "icecream", "ice cream", "sweet", "namkeen", "snack", "snacks", "noodle", "momos", "momo", "colddrink", "cold drink", "beverage", "water", "drink", "aloo", "veg", "thali", "dosa", "idli", "waffle", "cafe", "dhaba"]): 
        return "Food"
    
    # 2. Groceries
    if any(k in text_lower for k in ["grocery", "groceries", "milk", "bread", "butter", "vegetable", "fruit", "supermarket", "mart", "bazaar", "blinkit", "zepto", "instamart", "bigbasket"]): 
        return "Groceries"
        
    # 3. Fuel & Transport
    if any(k in text_lower for k in ["fuel", "petrol", "diesel", "cng", "uber", "ola", "rapido", "cab", "taxi", "auto", "metro", "bus", "parking", "toll"]): 
        return "Fuel & Transport"
        
    # 4. Bills & Utilities (Added rent and PG)
    if any(k in text_lower for k in ["bill", "electricity", "water", "gas", "recharge", "utility", "wifi", "internet", "broadband", "mobile", "phone", "rent", "pg", "room", "maintenance"]): 
        return "Bills & Utilities"
        
    # 5. Shopping
    if any(k in text_lower for k in ["shop", "amazon", "flipkart", "myntra", "meesho", "zara", "h&m", "cloth", "shoe", "bag", "dress", "shirt", "pant", "jeans", "mall"]): 
        return "Shopping"
        
    # 6. Entertainment
    if any(k in text_lower for k in ["movie", "cinema", "pvr", "inox", "netflix", "prime", "hotstar", "spotify", "music", "game", "show", "concert", "event"]): 
        return "Entertainment"
        
    # 7. Health
    if any(k in text_lower for k in ["health", "med", "doctor", "pharmacy", "hospital", "clinic", "pill", "tablet"]): 
        return "Health"
        
    # 8. Education
    if any(k in text_lower for k in ["school", "fee", "course", "book", "education", "college", "tuition"]): 
        return "Education"
        
    # 9. Travel
    if any(k in text_lower for k in ["travel", "flight", "hotel", "train", "ticket", "irctc", "makemytrip", "goibibo"]): 
        return "Travel"
        
    # 10. Personal Care
    if any(k in text_lower for k in ["beauty", "salon", "soap", "care", "hair", "cut", "spa", "massage", "makeup", "cosmetics", "shave"]): 
        return "Personal Care"

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
        confidence = doc.cats[raw_pred]
        
        print(f"DEBUG [spaCy NER] OCR Entity categorization | Predicted: '{raw_pred}' | Confidence: {confidence:.2f}")
        
        if confidence > 0.70:
            matched = False
            for cat in ALLOWED_CATEGORIES:
                if cat.lower() == raw_pred.lower():
                    structured_data["category"] = cat
                    matched = True
                    break
            if not matched:
                structured_data["category"] = "Other"
        else:
            structured_data["category"] = "Other"
    else:
        structured_data["category"] = "Other"

    # --- NEW: Merchant Fallback (Top Line) ---
    if not structured_data["merchant"] and extracted_lines:
        first_line = extracted_lines[0].strip()
        if len(first_line) > 2:
            structured_data["merchant"] = first_line
        
    return structured_data, full_text

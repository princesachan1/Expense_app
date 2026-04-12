import os
import spacy

# Load our custom spaCy model for structured data extraction
print("Loading Custom spaCy model...")
try:
    # Use model-best if it exists, otherwise fallback to model-last
    model_path = "output/model-best" if os.path.exists("output/model-best") else "output/model-last"
    if os.path.exists(model_path):
        nlp = spacy.load(model_path)
        print(f"Custom spaCy model loaded from {model_path}!")
    else:
        print("Warning: Custom spaCy model not found. Run training first.")
        nlp = None
except Exception as e:
    print(f"Error loading custom spaCy model: {e}")
    nlp = None

def extract_entities(extracted_lines):
    """
    Uses the spaCy model to extract structured data from OCR text lines.
    """
    structured_data = {
        "merchant": None,
        "gstno": None,
        "date": None,
        "total": None,
        "items": [],
        "category": "Other"
    }
    
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
    
    # Predict the best category
    if doc.cats:
        structured_data["category"] = max(doc.cats, key=doc.cats.get)

    # --- NEW: Merchant Fallback (Top Line) ---
    # If the AI missed the merchant, the first line is usually the brand
    if not structured_data["merchant"] and extracted_lines:
        first_line = extracted_lines[0].strip()
        # Basic cleanup: ignore lines that are too short or just symbols
        if len(first_line) > 2:
            structured_data["merchant"] = first_line
        
    return structured_data, full_text

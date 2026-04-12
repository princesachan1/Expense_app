import re
from typing import Tuple, Optional

# 1. Mapping for word-to-number conversion
WORD_TO_NUM = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000, 'crore': 10000000,
}

# 2. Amount Regex Patterns (Regex, Type, Priority)
# Priority ensures that "Grand Total" matches take precedence over a generic "Rs." match.
AMOUNT_PATTERNS = [
    (r'amount\s*(?:in\s*)?words?\s*[:]*\s*([a-zA-Z\s_,\-]+(?:thousand|hundred|lakh|crore|only)[a-zA-Z\s_,\-]*)', 'words', 1.0),
    (r'(?:grand\s*tota?l?)\s*[:=]?\s*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.97),
    (r'(?:TOTAL|total)\s*:?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.98),
    (r'grand\s*total\s*[:]*\s*(?:Rs\.?|₹|INR)?[\s]*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.95),
    (r'(?:bill\s*(?:no|total)|net\s*payable)\s*[:=]*\s*(?:Rs\.?|₹|INR)?[\s]*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.94),
    (r'=\s*[₹Rs\.]*\s*(\d+(?:\.\d{1,2})?)(?!\d)\s*(?:only|rupees)?', 'num', 0.92),
    (r'net\s*(?:amount|amt)?\s*[:]*\s*(?:Rs\.?|₹|INR)?[\s]*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.90),
    (r'(?:fare|amount|charge)\s*[:=]*\s*(?:Rs\.?|₹|INR)?[\s]*(\d+(?:\.\d{1,2})?)(?!\d)', 'num', 0.88),
    (r'(?:Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)(?!\d)', 'num', 0.75),
]

def words_to_number(text: str) -> Optional[float]:
    """Converts text like 'Five Hundred and Twenty' to 520.0."""
    words = re.sub(r'[^a-z\s]', ' ', text.lower()).split()
    total, current = 0, 0
    for w in words:
        if w in ('only', 'and', 'rupees'): continue
        val = WORD_TO_NUM.get(w)
        if val is None: continue
        if val >= 100:
            current = max(current, 1) * val
            if val >= 1000:
                total += current
                current = 0
        else:
            current += val
    total += current
    return total if total > 0 else None

def extract_amount(text: str) -> Tuple[Optional[float], float]:
    """
    Parses the OCR text to find the most likely total amount.
    Returns: (Amount, Confidence Score)
    """
    # Remove time patterns (e.g. 10:30 AM) to avoid matching '10.30' as an amount
    cleaned = re.sub(r'\d{1,2}:\d{2}(:\d{2})?(\s*(?:AM|PM|am|pm))?', ' ', text)

    best_amount, best_conf = None, 0.0
    
    for pattern, ptype, priority in AMOUNT_PATTERNS:
        matches = re.findall(pattern, cleaned, re.IGNORECASE)
        for match in matches:
            try:
                if ptype == 'words':
                    amt = words_to_number(match)
                    if amt and 10 < amt < 10_000_000:
                        return amt, 1.0 # Word matches are usually high confidence
                else:
                    # Clean commas and spaces
                    amt = float(match.replace(',', '').strip())
                    if 1 < amt < 10_000_000 and priority > best_conf:
                        best_amount, best_conf = amt, priority
            except (ValueError, AttributeError):
                continue

    # Fallback: find the largest decimal number with 2 decimal places if no keywords match
    if best_amount is None:
        for m in re.findall(r'([\d,]+\.\d{2})', cleaned):
            try:
                a = float(m.replace(',', ''))
                if 10 < a < 500_000 and a > (best_amount or 0):
                    best_amount, best_conf = a, 0.5
            except ValueError:
                continue
                
    return best_amount, best_conf

def apply_fallbacks(full_text, extracted_lines, structured_data):
    """
    Applies regex-based fallbacks for critical fields if they are missing in the structured data.
    """
    # 1. Amount Fallback
    if not structured_data.get("total") or str(structured_data.get("total")) == "0.00":
        amount, confidence = extract_amount(full_text)
        if amount:
            structured_data["total"] = f"{amount:.2f}"

    # 2. GSTIN Fallback (Indian Format)
    if not structured_data.get("gstno"):
        gst_match = re.search(r'\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}', full_text)
        if gst_match:
            structured_data["gstno"] = gst_match.group()
    
    # 3. Date Fallback
    if not structured_data.get("date"):
        # Match DD-MM-YYYY, DD/MM/YYYY, and non-standard formats like DD-MM:YYYY
        date_match = re.search(r'\b\d{1,2}[/-]\d{1,2}[:-]\d{2,4}\b', full_text)
        if date_match:
            structured_data["date"] = date_match.group()
                    
    return structured_data

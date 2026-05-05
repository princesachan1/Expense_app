import re
from datetime import date, timedelta, datetime
from typing import Dict, Any, Optional
from regex_logic import extract_amount
from spacy_ner import predict_category_from_text

def parse_voice_date(text: str) -> str:
    """
    Parses natural language dates like 'today', 'yesterday' or standard formats.
    Returns YYYY-MM-DD.
    """
    text_lower = text.lower()
    today = date.today()
    d = today

    if "today" in text_lower:
        d = today
    elif "yesterday" in text_lower:
        d = today - timedelta(days=1)
    elif "tomorrow" in text_lower:
        d = today + timedelta(days=1)
    elif "day before" in text_lower:
        d = today - timedelta(days=2)
    else:
        months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        month_pattern = "|".join(months)
        
        ordinal_match = re.search(r'(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(' + month_pattern + r')', text_lower)
        if ordinal_match:
            day_val = int(ordinal_match.group(1))
            month_name = ordinal_match.group(2)
            month_val = months.index(month_name) + 1
            try:
                d = date(today.year, month_val, day_val)
            except ValueError:
                d = today
        else:
            date_match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', text)
            if date_match:
                day_str, month_str, year_str = date_match.groups()
                year = int(year_str)
                if year < 100: year += 2000
                try:
                    d = date(year, int(month_str), int(day_str))
                except ValueError:
                    d = today
            
    return d.strftime("%Y-%m-%d")

def extract_voice_merchant(text: str) -> Optional[str]:

    merchant_match = re.search(r'(?:at|from|to|in)\s+([A-Za-z][A-Za-z0-9\s&\'-]{1,30})', text, re.IGNORECASE)
    if merchant_match:
        merchant = merchant_match.group(1).strip()
        noise_words = [
            "for", "on", "today", "yesterday", "tomorrow", "spent", "paid", 
            "rupees", "rs", "rupee", "at", "hundred", "thousand", "lakh", "crore",
            "can", "we", "add", "expense", "purchase", "from"
        ]
        
        for noise in noise_words:
            merchant = re.sub(r'\b' + noise + r'\b.*$', '', merchant, flags=re.IGNORECASE).strip()
            merchant = re.sub(r'^' + noise + r'\b', '', merchant, flags=re.IGNORECASE).strip()
        
        merchant = re.sub(r'\d{1,2}(?::\d{2})?\s*(?:am|pm)?$', '', merchant, flags=re.IGNORECASE).strip()

        if len(merchant) > 1:
            return merchant.title()
    return None

def extract_voice_time(text: str) -> Optional[str]:

    text_lower = text.lower()
    
    time_match = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)?', text_lower)
    if time_match:
        h, m, period = time_match.groups()
        h, m = int(h), int(m)
        if period == 'pm' and h < 12: h += 12
        if period == 'am' and h == 12: h = 0
        return f"{h:02d}:{m:02d}"
    
    simple_time = re.search(r'(?:at\s+)?(\d{1,2})\s*(am|pm)', text_lower)
    if simple_time:
        h, period = simple_time.groups()
        h = int(h)
        if period == 'pm' and h < 12: h += 12
        if period == 'am' and h == 12: h = 0
        return f"{h:02d}:00"
        
    return None

def handle_voice_extraction(text: str) -> Dict[str, Any]:

    structured = {
        "merchant": None,
        "total": None,
        "date": None,
        "category": "Other",
        "items": [],
        "gstno": None,
    }

    amount, confidence = extract_amount(text)
    if amount:
        structured["total"] = f"{amount:.2f}"

    base_date = parse_voice_date(text)
    
    voice_time = extract_voice_time(text)
    
    clean_text = text
    if voice_time:
        time_pattern = r'(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?'
        clean_text = re.sub(time_pattern, '', text, flags=re.IGNORECASE).strip()

    if not voice_time:
        voice_time = datetime.now().strftime("%H:%M")
        
    structured["date"] = f"{base_date} {voice_time}"

    structured["merchant"] = extract_voice_merchant(clean_text)

    items_match = re.search(r'(?:for|on)\s+(.+?)(?:\s+at\s+|\s+from\s+|\s+today|\s+yesterday|$)', text, re.IGNORECASE)
    if items_match:
        items_text = items_match.group(1).strip()
        items_text = re.sub(r'(?:₹|rs\.?|inr|rupees?|rupee)\s*\d[\d,]*\.?\d*', '', items_text, flags=re.IGNORECASE).strip()
        items_text = re.sub(r'\d[\d,]*\.?\d*\s*(?:₹|rs\.?|inr|rupees?|rupee)', '', items_text, flags=re.IGNORECASE).strip()
        items_text = re.sub(r'(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?', '', items_text, flags=re.IGNORECASE).strip()
        
        if items_text and len(items_text) > 1:
            structured["items"] = [items_text]

    category_context = " ".join(structured["items"]) if structured["items"] else text
    structured["category"] = predict_category_from_text(category_context)

    return structured

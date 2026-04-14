import os
import paddle
from paddleocr import PaddleOCR

# Prevent PaddleOCR from hanging indefinitely while trying to phone home to model hosters
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# Match CPU threads to HuggingFace free-tier (2 vCPUs) to avoid context-switching overhead
os.environ['OMP_NUM_THREADS'] = '2'

# Initialize the Paddle OCR model lazily
ocr_instance = None

def get_ocr():
    global ocr_instance
    if ocr_instance is None:
        print("Loading PaddleOCR model...")
        ocr_instance = PaddleOCR(
            text_detection_model_name='PP-OCRv5_mobile_det',   # Forced Mobile Detection
            text_recognition_model_name='en_PP-OCRv5_mobile_rec', # Forced Mobile Recognition
            lang="en",
            text_det_limit_side_len=640,           # Reduced from 736 — smaller grid = faster detection
            use_doc_orientation_classify=False,    # Skip orientation
            use_doc_unwarping=False,               # Skip unwarping
            use_textline_orientation=False,        # Skip textline orientation
            enable_mkldnn=False,                   # Keep False if v3.3.1 bug persists
            cpu_threads=2,                         # Match HF free-tier (2 vCPUs)
        )
        print("PaddleOCR model loaded successfully!")
    return ocr_instance

def warmup_ocr():
    """
    Pre-loads the OCR model and runs a dummy inference to fully warm up.
    Call this at application startup to eliminate cold-start latency on the first real request.
    """
    import numpy as np
    print("Warming up PaddleOCR...")
    ocr = get_ocr()
    # Run a tiny dummy image through the pipeline to JIT-compile any remaining ops
    dummy_img = np.zeros((32, 100, 3), dtype=np.uint8)
    try:
        ocr.ocr(dummy_img)
    except Exception:
        pass  # Errors on blank image are expected
    print("PaddleOCR warm-up complete!")

def perform_ocr(image_path):
    """
    Runs PaddleOCR on the saved image and returns extracted lines and confidence scores.
    """
    print(f"Scanning image with PaddleOCR...")
    ocr = get_ocr()
    result = ocr.ocr(image_path)
    
    extracted_lines = []
    
    for res in result:
        # Extract texts and scores from the new JSON format
        texts = res.json['res']['rec_texts']
        extracted_lines.extend(texts)
        
    return extracted_lines

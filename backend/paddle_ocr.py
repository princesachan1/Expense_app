import os
import paddle
from paddleocr import PaddleOCR

# Prevent PaddleOCR from hanging indefinitely while trying to phone home to model hosters
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# Limit CPU threads to prevent 100% CPU usage
os.environ['OMP_NUM_THREADS'] = '8'

# Initialize the Paddle OCR model
print("Loading PaddleOCR model...")
ocr = PaddleOCR(
    text_detection_model_name='PP-OCRv5_mobile_det',   # Forced Mobile Detection
    text_recognition_model_name='en_PP-OCRv5_mobile_rec', # Forced Mobile Recognition
    lang="en",
    text_det_limit_side_len=736,           # Match app thumbnail resolution
    use_doc_orientation_classify=False,    # Skip orientation
    use_doc_unwarping=False,               # Skip unwarping
    use_textline_orientation=False,        # Skip textline orientation
    enable_mkldnn=False,                   # Keep False if v3.3.1 bug persists
    cpu_threads=8,                         # Upgraded for i5-9300H (8 threads)
)
print("PaddleOCR model loaded successfully!")

def perform_ocr(image_path):
    """
    Runs PaddleOCR on the saved image and returns extracted lines and confidence scores.
    """
    print(f"Scanning image with PaddleOCR...")
    result = ocr.ocr(image_path)
    
    extracted_lines = []
    
    for res in result:
        # Extract texts and scores from the new JSON format
        texts = res.json['res']['rec_texts']
        extracted_lines.extend(texts)
        
    return extracted_lines

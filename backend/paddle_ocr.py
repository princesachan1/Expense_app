import os
import paddle
from paddleocr import PaddleOCR

os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

os.environ['OMP_NUM_THREADS'] = '2'

ocr_instance = None

def get_ocr():
    global ocr_instance
    if ocr_instance is None:
        print("Loading PaddleOCR model...")
        ocr_instance = PaddleOCR(
            text_detection_model_name='PP-OCRv5_mobile_det',  
            text_recognition_model_name='en_PP-OCRv5_mobile_rec', 
            lang="en",
            text_det_limit_side_len=640,          
            use_doc_orientation_classify=False,   
            use_doc_unwarping=False,              
            use_textline_orientation=False,       
            enable_mkldnn=False,                  
            cpu_threads=2,                        
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
    dummy_img = np.zeros((32, 100, 3), dtype=np.uint8)
    try:
        ocr.ocr(dummy_img)
    except Exception:
        pass 
    print("PaddleOCR warm-up complete!")

def perform_ocr(image_path):
    print(f"Scanning image with PaddleOCR...")
    ocr = get_ocr()
    result = ocr.ocr(image_path)
    
    extracted_lines = []
    
    for res in result:
        texts = res.json['res']['rec_texts']
        extracted_lines.extend(texts)
        
    return extracted_lines

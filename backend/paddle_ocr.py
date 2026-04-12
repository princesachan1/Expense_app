import os
import paddle
from paddleocr import PaddleOCR

# Prevent PaddleOCR from hanging indefinitely while trying to phone home to model hosters
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# Limit CPU threads to prevent 100% CPU usage
os.environ['OMP_NUM_THREADS'] = '8'

# Initialize the Paddle OCR model
print("Loading PaddleOCR model...")
paddle.set_flags({'FLAGS_use_mkldnn': False})
ocr = PaddleOCR(
    use_angle_cls=False,
    enable_mkldnn=False,
    lang="en",
    det_limit_side_len=960 # Limit image size to prevent RAM spikes
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

import os
import torch
import cv2
import numpy as np
from transformers import VideoMAEImageProcessor, VideoMAEForVideoClassification

# Load the model directly from the local download or fallback to Hugging Face Hub
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "videomae-base")
MODEL_NAME = MODEL_DIR if os.path.exists(MODEL_DIR) else "MCG-NJU/videomae-base"

try:
    print(f"Loading Motion Model: {MODEL_NAME}...")
    processor = VideoMAEImageProcessor.from_pretrained(MODEL_NAME)
    model = VideoMAEForVideoClassification.from_pretrained(MODEL_NAME)
    print("Motion model loaded successfully.")
except Exception as e:
    print(f"Error loading the motion model: {e}")
    processor = None
    model = None

# Keywords mapping for identifying emergency-related actions
EMERGENCY_KEYWORDS = [
    "running",
    "falling",
    "fighting",
    "fight",
    "panic",
    "crowd panic",
    "abnormal",
    "struggle",
    "hit",
    "collapse"
]

def extract_frames(video_path: str, num_frames=16):
    """
    Extracts a fixed number of frames evenly distributed across the video clip.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Cannot open video file {video_path}")
        
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # We want exactly num_frames equally spaced across the video
    indices = np.linspace(0, total_frames - 1, num=num_frames, dtype=int)
    
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            # OpenCV loads as BGR, convert to RGB for transformers
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
            
    cap.release()
    
    # Padding in case the video had fewer frames or reading failed
    while len(frames) < num_frames and len(frames) > 0:
        frames.append(frames[-1])
        
    if len(frames) == 0:
        # Fallback to zeros if video is completely unreadable
        frames = [np.zeros((224, 224, 3), dtype=np.uint8) for _ in range(num_frames)]
        
    return frames

def analyze_motion(video_path: str, threshold: float = 0.6) -> dict:
    """
    Analyzes a video clip to detect human actions using the VideoMAE model.
    Returns the detected action, confidence, and flags an alert if emergency.
    """
    if processor is None or model is None:
        return {"error": "Motion model is not loaded."}
        
    try:
        # Extract 16 frames as expected by VideoMAE
        frames = extract_frames(video_path, num_frames=16)
        
        # Preprocess the frames
        inputs = processor(list(frames), return_tensors="pt")
        
        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)
            
        logits = outputs.logits
        # Use softmax to convert to probabilities
        probabilities = torch.nn.functional.softmax(logits, dim=-1).squeeze()
        
        # Sort probabilities to get the top prediction
        top_idx = torch.argmax(probabilities).item()
        confidence = probabilities[top_idx].item()
        
        # Retrieve the string label from the model configuration
        # For the base model, it may just return a generic label format if not finetuned fully
        if hasattr(model.config, "id2label") and model.config.id2label:
            raw_label = str(model.config.id2label.get(top_idx, f"action_{top_idx}")).lower()
        else:
            raw_label = f"action_{top_idx}"
            
        is_emergency = False
        event_type = raw_label
            
        # Check against emergency keywords to format properly
        for keyword in EMERGENCY_KEYWORDS:
            if keyword in raw_label:
                is_emergency = True
                event_type = keyword
                break
                
        motion_features = {
            "running": 1 if "running" in raw_label else 0,
            "falling": 1 if "falling" in raw_label or "collapse" in raw_label else 0,
            "fighting": 1 if "fighting" in raw_label or "fight" in raw_label or "struggle" in raw_label or "hit" in raw_label else 0
        }
        
        # Structure the final output exactly as requested
        result = {
            "motion_event": event_type,
            "confidence": round(confidence, 4),
            "fusion_features": motion_features
        }
        
        # Add alert flags if the prediction warrants it according to the logic
        if is_emergency and confidence > threshold:
            result = {
                "motion_alert": True,
                "event_type": event_type,
                "confidence": round(confidence, 4)
            }
            
        return result
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Example usage:
    # result = analyze_motion("path_to_video_clip.mp4")
    # print(result)
    pass

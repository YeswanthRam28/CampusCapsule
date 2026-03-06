import os
import json
import base64
import numpy as np
import cv2
from ultralytics import YOLO
from datetime import datetime

# Load YOLOv8/v11 Nano (fastest) pre-trained on COCO
# This will download the weights automatically on first run
model = YOLO('yolo11n.pt') 

async def analyze_cctv_frame(image_b64: str, location: str):
    # 1. Decode base64 to OpenCV image
    if "base64," in image_b64:
        image_b64 = image_b64.split("base64,")[1]
    
    encoded_data = np.frombuffer(base64.b64decode(image_b64), np.uint8)
    img = cv2.imdecode(encoded_data, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"detected": False}

    # 2. Run Inference
    results = model(img, verbose=False)[0]
    
    # logic variables
    person_count = 0
    suspicious_objects = []
    has_medical_emergency = False
    
    # Class names in COCO: 0 is person, 24 is backpack, 26 is handbag, 28 is suitcase
    for box in results.boxes:
        cls = int(box.cls[0])
        coords = box.xyxy[0].tolist() # x1, y1, x2, y2
        w = coords[2] - coords[0]
        h = coords[3] - coords[1]
        
        if cls == 0: # Person
            person_count += 1
            # Simple Medical/Fall detection: if width > height significantly (lying down)
            if w > h * 1.5 and h < 100: 
                has_medical_emergency = True
        
        if cls in [24, 26, 28]: # Backpack, Handbag, Suitcase
            suspicious_objects.append(coords)

    # 3. Apply Heuristics for Incidents
    result = {
        "detected": False,
        "person_count": person_count,
        "unauthorized_person": 1 if person_count > 0 and "Restricted" in location else 0,
        "suspicious_object_count": len(suspicious_objects)
    }
    
    # A. CROWD PANIC
    if person_count > 10:
        result.update({
            "detected": True,
            "incident_type": "CROWD_PANIC",
            "severity": "HIGH",
            "description": f"High density crowd detected ({person_count} persons). Potential stampede risk.",
            "location_specific": "Central Corridor"
        })
        return result
        
    # B. MEDICAL EMERGENCY
    if has_medical_emergency:
        result.update({
            "detected": True,
            "incident_type": "MEDICAL",
            "severity": "CRITICAL",
            "description": "Person lying on floor detected. Potential collapse or medical emergency.",
            "location_specific": "Floor Area"
        })
        return result

    # C. RESTRICTED AREA / SECURITY (Static logic for demo)
    # If person detected at unusual location or just any person in this 'Admin' zone
    if person_count > 0 and "Restricted" in location:
        result.update({
            "detected": True,
            "incident_type": "SECURITY",
            "severity": "MEDIUM",
            "description": "Unauthorized personnel detected in restricted security zone.",
            "location_specific": "Entry Point"
        })
        return result

    # D. ABANDONED OBJECT (If object exists and no person nearby - simplified)
    if len(suspicious_objects) > 0 and person_count == 0:
        result.update({
            "detected": True,
            "incident_type": "ABANDONED_OBJECT",
            "severity": "MEDIUM",
            "description": "Unattended baggage detected with no owner in vicinity.",
            "location_specific": "Wait Area"
        })
        return result

    return result

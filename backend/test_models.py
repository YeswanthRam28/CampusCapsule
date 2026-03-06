import asyncio
import base64
import cv2
import numpy as np
import scipy.io.wavfile as wavf
import os

from cctv_logic import analyze_cctv_frame
from audio_logic import analyze_audio
from motion_logic import analyze_motion
from fusion_logic import detect_incident

async def main():
    print("=== Testing CCTV Logic (YOLO) ===")
    # Create a dummy image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw a bounding box resembling a person to force a detection
    cv2.rectangle(img, (100, 100), (200, 300), (255, 255, 255), -1)
    # YOLO might not detect this as a person, but let's see. If not, it'll return {"detected": False}
    _, buffer = cv2.imencode('.jpg', img)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    
    cctv_result = await analyze_cctv_frame(img_b64, "Test Area")
    print("CCTV Output:", cctv_result)
    
    print("\n=== Testing Audio Logic (AST) ===")
    # Create a 1-second dummy 16kHz audio file
    sample_rate = 16000
    t = np.linspace(0., 1., sample_rate)
    # 440 Hz sine wave
    amplitude = np.iinfo(np.int16).max
    data = amplitude * np.sin(2. * np.pi * 440. * t)
    wavf.write("test_audio.wav", sample_rate, data.astype(np.int16))
    
    audio_result = analyze_audio("test_audio.wav")
    print("Audio Output:", audio_result)
    
    print("\n=== Testing Motion Logic (VideoMAE) ===")
    # Create a 1-second dummy video (16 frames)
    out = cv2.VideoWriter("test_video.mp4", cv2.VideoWriter_fourcc(*'mp4v'), 16.0, (224, 224))
    for i in range(16):
        frame = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        out.write(frame)
    out.release()
    
    motion_result = analyze_motion("test_video.mp4")
    print("Motion Output:", motion_result)
    
    print("\n=== Testing Fusion Logic (Random Forest) ===")
    features_dict = {
        "people_count": cctv_result.get("person_count", 0),
        "unauthorized_person": cctv_result.get("unauthorized_person", 0),
        "suspicious_object": cctv_result.get("suspicious_object_count", 0),
        "motion_running": motion_result.get("fusion_features", {}).get("running", 0),
        "motion_falling": motion_result.get("fusion_features", {}).get("falling", 0),
        "motion_fighting": motion_result.get("fusion_features", {}).get("fighting", 0),
        "audio_scream": audio_result.get("fusion_features", {}).get("scream", 0),
        "audio_alarm": audio_result.get("fusion_features", {}).get("alarm", 0),
        "audio_explosion": audio_result.get("fusion_features", {}).get("explosion", 0)
    }
    fusion_result = detect_incident(features_dict)
    
    print("Aggregated Features:", features_dict)
    print("Final Fusion Output:", fusion_result)
    
    # Clean up
    if os.path.exists("test_audio.wav"):
        os.remove("test_audio.wav")
    if os.path.exists("test_video.mp4"):
        os.remove("test_video.mp4")

if __name__ == "__main__":
    asyncio.run(main())

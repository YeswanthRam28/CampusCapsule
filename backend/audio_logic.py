import torch
import librosa
from transformers import ASTFeatureExtractor, ASTForAudioClassification

# Load the model and feature extractor once to avoid reloading on every call
# We are using the locally downloaded model in the models/ folder
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "ast-finetuned-audioset")
MODEL_NAME = MODEL_DIR if os.path.exists(MODEL_DIR) else "MIT/ast-finetuned-audioset-10-10-0.4593"

try:
    print(f"Loading Audio Model: {MODEL_NAME}...")
    feature_extractor = ASTFeatureExtractor.from_pretrained(MODEL_NAME)
    model = ASTForAudioClassification.from_pretrained(MODEL_NAME)
    print("Audio model loaded successfully.")
except Exception as e:
    print(f"Error loading the audio model: {e}")
    feature_extractor = None
    model = None

# Keywords mapping for identifying emergency-related events
# We use partial matching, so "glass" matches "glass breaking", etc.
EMERGENCY_KEYWORDS = [
    "scream",
    "yell",
    "shriek",
    "alarm",
    "explosion",
    "burst",
    "glass",
    "shatter",
    "gunshot",
    "gunfire",
    "siren",
    "panic"
]

def analyze_audio(file_path: str, threshold: float = 0.6) -> dict:
    """
    Analyzes an audio file and detects emergency events using the AST model.
    Returns the detected events and flags an alert if confidence > threshold.
    """
    if feature_extractor is None or model is None:
        return {"error": "Audio model is not loaded."}

    try:
        # Load audio using librosa
        # The AST model expects a sampling rate of 16kHz
        waveform, sampling_rate = librosa.load(file_path, sr=16000)
        
        # Preprocess the audio sequence
        inputs = feature_extractor(waveform, sampling_rate=sampling_rate, padding="max_length", return_tensors="pt")
        
        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)
            
        # Convert logits to probabilities using sigmoid
        # (AudioSet is a multi-label classification task)
        logits = outputs.logits
        probabilities = torch.sigmoid(logits).squeeze()
        
        # Sort probabilities to get top predicted classes
        top_indices = torch.argsort(probabilities, descending=True)
        
        all_events = []
        highest_emergency_confidence = 0.0
        primary_emergency_event = None
        
        for idx in top_indices:
            prob = probabilities[idx].item()
            # Stop if probability is too low to be relevant (e.g., < 0.01)
            if prob < 0.01:
                break
                
            label = model.config.id2label[idx.item()].lower()
            all_events.append({"event": label, "confidence": round(prob, 4)})
            
            # Check if this label is related to an emergency
            for keyword in EMERGENCY_KEYWORDS:
                if keyword in label:
                    if prob > highest_emergency_confidence:
                        highest_emergency_confidence = prob
                        primary_emergency_event = label
        
        audio_features = {
            "scream": 0,
            "alarm": 0,
            "explosion": 0
        }
        for item in all_events:
            ev = item["event"]
            if "scream" in ev or "yell" in ev or "shriek" in ev:
                audio_features["scream"] = 1
            if "alarm" in ev or "siren" in ev:
                audio_features["alarm"] = 1
            if "explosion" in ev or "burst" in ev:
                audio_features["explosion"] = 1
                
        # Structure the final output
        result = {
            "audio_alert": False,
            "all_detected_events": all_events[:10],  # Return top 10 events broadly
            "fusion_features": audio_features
        }
        
        # Check against emergency threshold
        if primary_emergency_event and highest_emergency_confidence > threshold:
            result["audio_alert"] = True
            result["event_type"] = primary_emergency_event
            result["confidence"] = round(highest_emergency_confidence, 4)
            
        return result
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Example usage:
    # result = analyze_audio("path_to_audio_file.wav")
    # print(result)
    pass

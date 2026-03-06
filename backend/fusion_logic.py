import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Define the synthetic dataset to train the fusion classifier
data = [
    # Normal cases
    {"people_count": 2, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "NORMAL"},
    {"people_count": 5, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "NORMAL"},
    {"people_count": 0, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "NORMAL"},
    
    # Crowd Panic
    {"people_count": 15, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 1, "alarm": 0, "expl": 0, "label": "CROWD_PANIC"},
    {"people_count": 12, "unauth": 0, "obj": 0, "run": 1, "fall": 1, "fight": 0, "scream": 1, "alarm": 0, "expl": 0, "label": "CROWD_PANIC"},
    {"people_count": 18, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "CROWD_PANIC"},
    {"people_count": 11, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 1, "alarm": 0, "expl": 0, "label": "CROWD_PANIC"},
    
    # Security Breach
    {"people_count": 1, "unauth": 1, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
    {"people_count": 2, "unauth": 1, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
    {"people_count": 3, "unauth": 0, "obj": 1, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
    {"people_count": 4, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 1, "scream": 1, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
    {"people_count": 2, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 1, "scream": 0, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
    
    # Medical Emergency
    {"people_count": 1, "unauth": 0, "obj": 0, "run": 0, "fall": 1, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "MEDICAL_EMERGENCY"},
    {"people_count": 2, "unauth": 0, "obj": 0, "run": 0, "fall": 1, "fight": 0, "scream": 1, "alarm": 0, "expl": 0, "label": "MEDICAL_EMERGENCY"},
    
    # Fire 
    {"people_count": 5, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 0, "alarm": 1, "expl": 0, "label": "FIRE"},
    {"people_count": 0, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 1, "expl": 0, "label": "FIRE"},
    {"people_count": 8, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 1, "alarm": 1, "expl": 0, "label": "FIRE"},
    
    # Infrastructure / General Explosion
    {"people_count": 0, "unauth": 0, "obj": 0, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 1, "label": "INFRASTRUCTURE_ISSUE"},
    {"people_count": 5, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 1, "alarm": 0, "expl": 1, "label": "INFRASTRUCTURE_ISSUE"},
    {"people_count": 1, "unauth": 0, "obj": 0, "run": 0, "fall": 1, "fight": 0, "scream": 0, "alarm": 1, "expl": 1, "label": "INFRASTRUCTURE_ISSUE"},
    
    # Mixed / Noise robustness
    {"people_count": 1, "unauth": 0, "obj": 0, "run": 1, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "NORMAL"},
    {"people_count": 0, "unauth": 0, "obj": 1, "run": 0, "fall": 0, "fight": 0, "scream": 0, "alarm": 0, "expl": 0, "label": "SECURITY_BREACH"},
]

df = pd.DataFrame(data)
# Our features are everything except the 'label'
X = df.drop(columns=["label"])
y = df["label"]

# Initialize and train the internal model with requested parameters
clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=4,
    min_samples_leaf=2,
    random_state=42
)

print("Training Multi-modal Fusion Classifier...")
clf.fit(X, y)
print("Fusion Classifier trained and ready.")

def detect_incident(features_dict: dict) -> dict:
    """
    Takes a dictionary of features from various modules, converts it to a 
    feature vector, and runs the trained Random Forest classifier.
    """
    
    # Build list representing our exact column order
    # columns expected: ['people_count', 'unauth', 'obj', 'run', 'fall', 'fight', 'scream', 'alarm', 'expl']
    vector = [[
        features_dict.get("people_count", 0),
        features_dict.get("unauthorized_person", 0),
        features_dict.get("suspicious_object", 0),
        features_dict.get("motion_running", 0),
        features_dict.get("motion_falling", 0),
        features_dict.get("motion_fighting", 0),
        features_dict.get("audio_scream", 0),
        features_dict.get("audio_alarm", 0),
        features_dict.get("audio_explosion", 0)
    ]]
    
    # Needs to match column names to avoid warnings in newer sklearn, but passed as a DataFrame
    vector_df = pd.DataFrame(vector, columns=X.columns)
    
    probas = clf.predict_proba(vector_df)[0]
    preds = clf.classes_
    top_idx = np.argmax(probas)
    
    label = preds[top_idx]
    confidence = float(probas[top_idx])
    
    # Default return for non-incidents
    if label == "NORMAL":
        return {
            "incident_detected": False,
            "incident_type": label,
            "confidence": round(confidence, 4)
        }
        
    return {
        "incident_detected": True,
        "incident_type": label,
        "confidence": round(confidence, 4)
    }

if __name__ == "__main__":
    # Internal Unit Test
    test_features = {
        "people_count": 12,
        "unauthorized_person": 0,
        "suspicious_object": 0,
        "motion_running": 1,
        "motion_falling": 0,
        "motion_fighting": 0,
        "audio_scream": 1,
        "audio_alarm": 0,
        "audio_explosion": 0
    }
    print("Testing fusion classification:")
    print(detect_incident(test_features))

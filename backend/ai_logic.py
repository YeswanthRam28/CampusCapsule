import os
import json
import google.generativeai as genai
from .models import IncidentIntake, IncidentClassification, ActionPlaybook
from dotenv import load_dotenv

load_dotenv(os.path.join(os.getcwd(), '.env'))

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

model = genai.GenerativeModel('gemini-2.5-flash')

# Playbook Mapping for Recommendation Generator
PLAYBOOK_MAPPING = {
    "FIRE": {
        "priority_mult": 3,
        "recommendations": ["Evacuate building immediately", "Deploy Fire Suppression Team", "Notify nearest Fire Station", "Activate fire alarms"],
        "teams": ["Fire Safety", "Security", "Medical"]
    },
    "MEDICAL": {
        "priority_mult": 2,
        "recommendations": ["Dispatch Emergency Medical Services", "Clear access for ambulance", "Locate nearest AED", "Alert on-site medical staff"],
        "teams": ["Medical", "Security"]
    },
    "SECURITY": {
        "priority_mult": 2,
        "recommendations": ["Lock down perimeter", "Dispatch security patrol", "Review CCTV footage", "Notify local law enforcement if needed"],
        "teams": ["Security", "Admin"]
    },
    "HAZMAT": {
        "priority_mult": 4,
        "recommendations": ["Evacuate affected area", "Isolate air ventilation", "Notify Hazmat response team", "Identify hazardous substance"],
        "teams": ["Hazmat", "Security", "Medical"]
    }
}

async def classify_incident(report: IncidentIntake) -> IncidentClassification:
    prompt = f"""
    Analyze the following emergency report and classify it into structured data.
    
    Report: "{report.text}"
    Reported Location: "{report.location or 'Unknown'}"
    
    Return ONLY a JSON object with the following fields:
    - incident_type: (FIRE, MEDICAL, SECURITY, HAZMAT, OTHER)
    - severity: (LOW, MEDIUM, HIGH, CRITICAL)
    - location_extracted: (Specific building, room, or area)
    - entities: (List of relevant entities mentioned: people, specific objects, hazards)
    - lat: (Estimated Latitude, e.g. between 12.9710 and 12.9720)
    - lng: (Estimated Longitude, e.g. between 77.5940 and 77.5955)
    
    JSON Output:
    """
    
    response = model.generate_content(prompt)
    try:
        # Clean up potential markdown formatting in response
        result_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(result_text)
        return IncidentClassification(**data)
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        # Fallback to defaults
        return IncidentClassification(
            incident_type="OTHER",
            severity="MEDIUM",
            location_extracted=report.location or "Unknown",
            entities=[]
        )

def generate_playbook(classification: IncidentClassification) -> ActionPlaybook:
    # Get base mapping or default to OTHER
    config = PLAYBOOK_MAPPING.get(classification.incident_type, {
        "priority_mult": 1,
        "recommendations": ["Monitor situation", "Standard security check"],
        "teams": ["Security"]
    })
    
    # Calculate Severity Multiplier
    sev_levels = {"LOW": 1, "MEDIUM": 2, "HIGH": 4, "CRITICAL": 7}
    base_sev = sev_levels.get(classification.severity, 2)
    
    # Final Priority Score (1-10)
    priority = min(10, base_sev + config["priority_mult"])
    
    return ActionPlaybook(
        priority=priority,
        recommendations=config["recommendations"],
        teams_to_notify=config["teams"]
    )

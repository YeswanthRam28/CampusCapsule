import os
import json
import base64
import google.generativeai as genai
from .models import IncidentIntake, IncidentClassification
from dotenv import load_dotenv

load_dotenv(os.path.join(os.getcwd(), '.env'))

# Use Gemini for face verification
model = genai.GenerativeModel('gemini-2.0-flash')

async def verify_face(reg_image_b64: str, login_image_b64: str):
    # reg_image_b64 is the stored reference
    # login_image_b64 is the current login frame
    
    # Process both images
    if "base64," in reg_image_b64:
        reg_image_b64 = reg_image_b64.split("base64,")[1]
    if "base64," in login_image_b64:
        login_image_b64 = login_image_b64.split("base64,")[1]
        
    reg_data = base64.b64decode(reg_image_b64)
    login_data = base64.b64decode(login_image_b64)
    
    prompt = """
    Look at these two images of faces. 
    Image 1 is the registered profile face.
    Image 2 is the person trying to log in now.
    
    Task: Compare them and decide if they belong to the SAME person.
    Be strict for security. 
    Consider facial features, eye shape, nose shape, and overall profile.
    
    Return a JSON object:
    - verified: true (if same person), false (otherwise)
    - confidence: float (0.0 to 1.0) 
    - reasoning: short explanation.
    """
    
    try:
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": reg_data},
            {"mime_type": "image/jpeg", "data": login_data}
        ])
        
        result_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(result_text)
        return data
    except Exception as e:
        print(f"Face verification AI Error: {e}")
        return {"verified": False, "confidence": 0.0}

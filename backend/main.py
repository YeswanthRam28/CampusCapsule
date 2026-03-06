import asyncio
import json
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models import IncidentIntake, ProcessedIncident, IncidentClassification, ActionPlaybook
from ai_logic import classify_incident, generate_playbook
from cctv_logic import analyze_cctv_frame
from database import store_incident, get_all_incidents, incident_db, get_user, create_user, update_incident_status, update_user_face
from auth import verify_password, get_password_hash, create_access_token
from audio_logic import analyze_audio
from motion_logic import analyze_motion
from fusion_logic import detect_incident
from face_logic import verify_face
from pydantic import BaseModel
import uuid
import os
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str

class CCTVAnalyzeRequest(BaseModel):
    image_b64: str # Base64 encoded frame
    location: str

class FusionAnalyzeRequest(BaseModel):
    image_b64: str = ""
    audio_path: str = ""
    video_path: str = ""
    location: str = "Unknown"

class FaceAuthRequest(BaseModel):
    username: str
    image_b64: str # Base64 frame for registration or login

app = FastAPI(title="CampusCapsule - The Engine")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Seed initial users for demo
    seed_users = [
        ("admin", "admin123", "admin"),
        ("volunteer", "vol123", "volunteer"),
        ("student", "stud123", "student")
    ]
    for username, password, role in seed_users:
        user = get_user(username)
        if not user:
            create_user(username, get_password_hash(password), role)
            print(f"Seeded user: {username}")

@app.get("/")
async def root():
    return {"status": "online", "system": "CampusCapsule - Incident Intelligence Engine"}

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = get_user(req.username)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }

@app.post("/auth/register")
async def register(req: RegisterRequest):
    if req.role not in ["admin", "volunteer", "student"]:
         raise HTTPException(status_code=400, detail="Invalid role")
    
    success = create_user(req.username, get_password_hash(req.password), req.role)
    if not success:
        raise HTTPException(status_code=400, detail="User already exists")
    
    return {"status": "user created"}

@app.patch("/auth/register_face")
async def register_face(req: FaceAuthRequest):
    user = get_user(req.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    success = update_user_face(req.username, req.image_b64)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to register face")
    
    return {"status": "face registered"}

@app.post("/auth/login_face")
async def login_face(req: FaceAuthRequest):
    user = get_user(req.username)
    if not user or not user.get("face_registration"):
        raise HTTPException(status_code=401, detail="Face not registered for this user")
    
    # AI Comparison
    result = await verify_face(user["face_registration"], req.image_b64)
    
    if result.get("verified") and result.get("confidence", 0) > 0.7:
        access_token = create_access_token(
            data={"sub": user["username"], "role": user["role"]}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user["role"],
            "username": user["username"],
            "confidence": result.get("confidence")
        }
    else:
        raise HTTPException(status_code=401, detail=f"Face verification failed: {result.get('reasoning')}")

@app.post("/incidents", response_model=ProcessedIncident)
async def report_incident(report: IncidentIntake, background_tasks: BackgroundTasks):
    print(f"Received raw report: {report.text}")
    
    # 1. Classify with AI
    classification = await classify_incident(report)
    
    # Use direct GPS from student if provided
    if report.lat and report.lng:
        classification.lat = report.lat
        classification.lng = report.lng
    
    # 2. Generate Playbook/Recommendations
    playbook = generate_playbook(classification)
    
    # 3. Create Processed Incident
    processed = ProcessedIncident(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        raw_data=report,
        classification=classification,
        playbook=playbook,
        status="ACTIVE"
    )
    
    # 4. Store (Background Task)
    background_tasks.add_task(store_incident, processed)
    
    return processed

@app.get("/incidents")
async def list_incidents():
    return await get_all_incidents()

@app.patch("/incidents/{incident_id}/status")
async def update_status(incident_id: str, payload: dict):
    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Missing status")
    
    success = await update_incident_status(incident_id, status)
    if not success:
        raise HTTPException(status_code=404, detail="Incident not found or DB error")
    
    # Update memory for SSE stream implicitly (update_incident_status does it)
    return {"status": "updated"}

@app.post("/cctv/analyze")
async def cctv_analyze(req: CCTVAnalyzeRequest, background_tasks: BackgroundTasks):
    analysis = await analyze_cctv_frame(req.image_b64, req.location)
    
    if analysis.get("detected"):
        # Auto-create an incident
        report = IncidentIntake(
            text=f"[CCTV_AI_ALERT] {analysis['description']}",
            location=f"{req.location} ({analysis.get('location_specific', 'Unknown')})",
            reporter_id="CCTV_SYSTEM_AI",
            source="sensor"
        )
        
        # Reuse existing incident reporting logic
        classification = IncidentClassification(
            incident_type=analysis["incident_type"],
            severity=analysis["severity"],
            location_extracted=report.location,
            entities=[]
        )
        playbook = generate_playbook(classification)
        
        processed = ProcessedIncident(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            raw_data=report,
            classification=classification,
            playbook=playbook,
            status="ACTIVE"
        )
        
        background_tasks.add_task(store_incident, processed)
        return {"alert": True, "incident": processed}
        
    return {"alert": False}

@app.post("/analyze/fusion")
async def fusion_analyze(req: FusionAnalyzeRequest, background_tasks: BackgroundTasks):
    # Gather features across modalities
    cctv_features = await analyze_cctv_frame(req.image_b64, req.location) if req.image_b64 else {}
    audio_features = analyze_audio(req.audio_path) if req.audio_path else {}
    motion_features = analyze_motion(req.video_path) if req.video_path else {}
    
    features_dict = {
        "people_count": cctv_features.get("person_count", 0),
        "unauthorized_person": cctv_features.get("unauthorized_person", 0),
        "suspicious_object": cctv_features.get("suspicious_object_count", 0),
        "motion_running": motion_features.get("fusion_features", {}).get("running", 0),
        "motion_falling": motion_features.get("fusion_features", {}).get("falling", 0),
        "motion_fighting": motion_features.get("fusion_features", {}).get("fighting", 0),
        "audio_scream": audio_features.get("fusion_features", {}).get("scream", 0),
        "audio_alarm": audio_features.get("fusion_features", {}).get("alarm", 0),
        "audio_explosion": audio_features.get("fusion_features", {}).get("explosion", 0)
    }
    
    # Run fusion heuristic
    fusion_result = detect_incident(features_dict)
    
    if fusion_result.get("incident_detected"):
        incident_type = fusion_result["incident_type"]
        report = IncidentIntake(
            text=f"[FUSION_AI_ALERT] {incident_type} detected. Confidence: {fusion_result.get('confidence', 0)}",
            location=req.location,
            reporter_id="FUSION_SYSTEM_AI",
            source="sensor_fusion"
        )
        
        classification = IncidentClassification(
            incident_type=incident_type,
            severity="CRITICAL" if incident_type in ["FIRE", "MEDICAL_EMERGENCY"] else "HIGH",
            location_extracted=report.location,
            entities=[]
        )
        playbook = generate_playbook(classification)
        
        processed = ProcessedIncident(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            raw_data=report,
            classification=classification,
            playbook=playbook,
            status="ACTIVE"
        )
        
        background_tasks.add_task(store_incident, processed)
        return {"alert": True, "incident": processed, "fusion_details": fusion_result}
        
    return {"alert": False, "fusion_details": fusion_result}

@app.get("/incidents/stream")
async def stream_incidents():
    """
    Simulated SSE (Server-Sent Events) for real-time dashboard updates.
    In a real app, this would use WebSockets or a real SSE stream.
    """
    async def event_generator():
        # Keep track of last sent incident to only send new ones
        last_count = len(incident_db)
        while True:
            current_count = len(incident_db)
            if current_count > last_count:
                # Send the newest incident
                newest = incident_db[-1]
                yield f"data: {json.dumps(newest.dict(), default=str)}\n\n"
                last_count = current_count
            await asyncio.sleep(1) # Check for new incidents every second
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
 

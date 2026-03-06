# 🛰️ CampusCapsule: Tactical Incident Intelligence

CampusCapsule is a high-tech, real-time campus safety and incident management engine. It combines computer vision, biometric authentication, and live geospatial tracking to provide a unified command center for campus security and volunteers.

## 🚀 Key Features

### 🛡️ AI Sentinel (Multimodal Incident Analysis)
- **Local Vision**: Powered by **YOLOv11** for object detection and crowd counting.
- **Audio Intelligence**: Employs **AST (Audio Spectrogram Transformer)** `ast-finetuned-audioset` to detect screams, alarms, and explosions.
- **Motion Analytics**: Uses **VideoMAE** `videomae-base` to recognize complex human actions such as falling, running, or fighting.
- **Fusion Engine**: **Random Forest** machine learning classifier fuses the metadata from Vision, Audio, and Motion to instantly classify the overriding incident (e.g. `CROWD_PANIC`, `FIRE`, `MEDICAL_EMERGENCY`).
- **Auto-Intelligence**: Operates 100% locally with downloaded Hugging Face weights.

### 🧬 Biometric Sentinel (Face Auth)
- **Secure Access**: Zero-knowledge facial verification using **Gemini 2.0 Flash**.
- **Edge Enrollment**: Users can register their biometric profile directly from the dashboard.
- **Double-Layer Auth**: Combines standard credentials with visual feature mapping for high-security areas (Admin/Volunteer).

### 📍 Live Ops Command Center
- **Real-time Map**: Interactive Leaflet maps tracking incidents and volunteer positions in real-time.
- **Dispatch Mode**: Immediate navigation for responders once a "Respond" action is initiated.
- **Role-Based Dashboards**: Integrated views for Admins (Global Control), Volunteers (Response), and Students (Reporting).

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: FastAPI, Python, Uvicorn, Pandas, Scikit-learn.
- **AI/ML**: YOLOv11 (Vision), AST Transformer (Audio), VideoMAE (Motion), Random Forest (Fusion), Google Gemini 2.0 Flash (Cognitive Analysis).
- **Database**: NeonDB (Serverless PostgreSQL).
- **Tracking**: HTML5 Geolocation API.

## 🏁 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- NeonDB API Key
- Google Gemini API Key

### Backend Setup
1. `cd backend`
2. `pip install -r requirements.txt`
3. Create a `.env` file with `NEONDB_API` and `GEMINI_API_KEY`.
4. `uvicorn main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 🛡️ Security Protocols
- JWT-based authentication.
- Scoped access controls (Admin, Volunteer, Student).
- Encrypted biometric storage (Base64 Anchors).

---
*Built for the [Hackathon Name/Event] - Ensuring a safer campus through Tactical AI.*

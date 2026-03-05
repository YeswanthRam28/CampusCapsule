# 🛰️ CampusCapsule: Tactical Incident Intelligence

CampusCapsule is a high-tech, real-time campus safety and incident management engine. It combines computer vision, biometric authentication, and live geospatial tracking to provide a unified command center for campus security and volunteers.

## 🚀 Key Features

### 🛡️ AI Sentinel (CCTV Analysis)
- **Local Vision**: Powered by **YOLOv11** for sub-millisecond object detection.
- **Auto-Intelligence**: Detects crowd panic, medical emergencies (falls), security intrusions, and abandoned objects without human intervention.
- **Live HUD**: Real-time tactical overlay on camera feeds for security personnel.

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
- **Backend**: FastAPI, Python, Uvicorn.
- **AI/ML**: YOLOv11 (Local Vision), Google Gemini 2.0 Flash (Cognitive Analysis).
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

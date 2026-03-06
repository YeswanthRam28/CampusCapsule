import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from models import ProcessedIncident
from dotenv import load_dotenv

# Load from root directory
load_dotenv(os.path.join(os.getcwd(), '.env'))

db_url: str = os.getenv("NEONDB_API", "")

# In-memory store for fallback/hackathon mode
incident_db = []

def get_connection():
    if not db_url:
        return None
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"NeonDB connection error: {e}")
        return None

def init_db():
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # Incidents table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS incidents (
                        id UUID PRIMARY KEY,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        raw_data JSONB,
                        classification JSONB,
                        playbook JSONB,
                        status TEXT
                    );
                """)
                # Users table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL,
                        face_registration TEXT
                    );
                """)
                conn.commit()
        except Exception as e:
            print(f"Failed to initialize database table: {e}")
        finally:
            conn.close()

def get_user(username: str):
    conn = get_connection()
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE username = %s", (username,))
                return cur.fetchone()
        finally:
            conn.close()
    return None

def create_user(username: str, password_hash: str, role: str):
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (username, password_hash, role)
                )
                conn.commit()
                return True
        finally:
            conn.close()
    return False

async def store_incident(incident: ProcessedIncident):
    # Store in memory
    incident_db.append(incident)
    
    # Store in NeonDB if configured
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO incidents (id, timestamp, raw_data, classification, playbook, status) VALUES (%s, %s, %s, %s, %s, %s)",
                    (
                        incident.id,
                        incident.timestamp,
                        json.dumps(incident.raw_data.dict()),
                        json.dumps(incident.classification.dict()),
                        json.dumps(incident.playbook.dict()),
                        incident.status
                    )
                )
                conn.commit()
        except Exception as e:
            print(f"Failed to store in NeonDB: {e}")
        finally:
            conn.close()

async def get_all_incidents():
    conn = get_connection()
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM incidents ORDER BY timestamp DESC")
                rows = cur.fetchall()
                # Simple conversion from DB rows to model-like dicts
                return rows
        except Exception as e:
            print(f"Failed to fetch from NeonDB: {e}")
        finally:
            conn.close()
    
async def update_incident_status(incident_id: str, status: str):
    # Update in memory
    for inc in incident_db:
        if str(inc.id) == incident_id:
            inc.status = status
            break
            
    # Update in NeonDB
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE incidents SET status = %s WHERE id = %s",
                    (status, incident_id)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to update status in NeonDB: {e}")
def update_user_face(username: str, face_b64: str):
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET face_registration = %s WHERE username = %s",
                    (face_b64, username)
                )
                conn.commit()
                return True
        finally:
            conn.close()
    return False

# Initialize on module load
init_db()

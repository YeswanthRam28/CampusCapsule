from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class IncidentIntake(BaseModel):
    text: str = Field(..., description="Raw prose describing the incident")
    location: Optional[str] = Field(None, description="Reported location string or coordinates")
    reporter_id: str = Field(..., description="Unique ID of the reporter or sensor")
    source: str = Field("user", description="Source of report: user, sensor, system")
    lat: Optional[float] = None
    lng: Optional[float] = None

class IncidentClassification(BaseModel):
    incident_type: str = Field(..., description="Category: FIRE, MEDICAL, SECURITY, etc.")
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    location_extracted: str = Field(..., description="Specific location extracted from text")
    entities: List[str] = Field(default_factory=list, description="Extracted entities like people, chemicals, etc.")
    lat: Optional[float] = Field(None, description="Latitude for mapping")
    lng: Optional[float] = Field(None, description="Longitude for mapping")

class ActionPlaybook(BaseModel):
    priority: int = Field(..., ge=1, le=10, description="Calculated priority score")
    recommendations: List[str] = Field(..., description="List of auto-suggested actions")
    teams_to_notify: List[str] = Field(..., description="Teams that should be alerted")

class ProcessedIncident(BaseModel):
    id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    raw_data: IncidentIntake
    classification: IncidentClassification
    playbook: ActionPlaybook
    status: str = "PENDING"

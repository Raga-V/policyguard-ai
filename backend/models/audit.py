from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AuditRecord(BaseModel):
    id: Optional[int] = None
    agent_id: str
    session_id: str
    event_type: str
    tool_name: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    policy_decision: Optional[str] = None
    policy_reason: Optional[str] = None
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    latency_ms: Optional[int] = None
    timestamp: Optional[datetime] = None

class AuditQuery(BaseModel):
    agent_id: Optional[str] = None
    event_type: Optional[str] = None
    policy_decision: Optional[str] = None
    limit: int = 100
    offset: int = 0

class AuditResponse(BaseModel):
    records: List[AuditRecord]
    total: int

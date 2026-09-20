from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class ToolPermission(BaseModel):
    tool_name: str
    allowed_resources: List[str]
    allowed_actions: List[str]
    context_constraints: Dict[str, Any] = {}

class AgentConfig(BaseModel):
    id: str
    name: str
    description: str
    purpose: str
    tools: List[ToolPermission]
    trust_level: int = Field(ge=1, le=5)
    sensitivity: str
    resource_scopes: Dict[str, List[str]]

class CreateAgentRequest(BaseModel):
    description: str
    selected_tools: List[str]
    resource_scopes: Optional[Dict[str, List[str]]] = None

class AgentResponse(AgentConfig):
    status: str
    container_id: Optional[str] = None
    created_at: datetime
    policy_text: Optional[str] = None

class RunAgentRequest(BaseModel):
    session_id: str
    prompt: str

class RunAgentResponse(BaseModel):
    session_id: str
    agent_id: str
    status: str
    result: Optional[str] = None

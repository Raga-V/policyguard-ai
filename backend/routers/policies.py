from fastapi import APIRouter, HTTPException
from database import get_db
from pydantic import BaseModel
from typing import Dict, Any
from config import CEDAR_AGENT_URL
import httpx

router = APIRouter(prefix="/api/policies", tags=["policies"])

class PolicyCheckRequest(BaseModel):
    principal: str
    action: str
    resource: str
    context: Dict[str, Any] = {}

@router.get("/{agent_id}")
async def get_policy(agent_id: str):
    db = await get_db()
    async with db.execute("SELECT policy_text FROM agents WHERE id = ?", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"policy_text": row['policy_text']}

@router.post("/{agent_id}/check")
async def check_policy(agent_id: str, request: PolicyCheckRequest):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{CEDAR_AGENT_URL}/v1/is_authorized",
                json={
                    "principal": request.principal,
                    "action": request.action,
                    "resource": request.resource,
                    "context": request.context
                }
            )
            response.raise_for_status()
            data = response.json()
            return {
                "decision": data.get("decision", "Deny"),
                "reason": data.get("diagnostics", {}).get("reason", [])
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

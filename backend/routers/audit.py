from fastapi import APIRouter, Depends
from models.audit import AuditQuery, AuditResponse, AuditRecord
from services.audit_service import query_logs, get_session_logs
from database import get_db

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/", response_model=AuditResponse)
async def get_audit_logs(
    agent_id: str = None,
    event_type: str = None,
    policy_decision: str = None,
    limit: int = 100,
    offset: int = 0
):
    query = AuditQuery(
        agent_id=agent_id,
        event_type=event_type,
        policy_decision=policy_decision,
        limit=limit,
        offset=offset
    )
    return await query_logs(query)

@router.get("/sessions/{session_id}")
async def session_logs(session_id: str) -> list[AuditRecord]:
    return await get_session_logs(session_id)

@router.get("/stats")
async def audit_stats():
    db = await get_db()
    stats = {}
    
    async with db.execute("SELECT COUNT(*) FROM audit_logs") as cursor:
        stats['total_events'] = (await cursor.fetchone())[0]
        
    async with db.execute("SELECT COUNT(*) FROM audit_logs WHERE policy_decision = 'Deny'") as cursor:
        stats['deny_count'] = (await cursor.fetchone())[0]
        
    async with db.execute("SELECT COUNT(*) FROM audit_logs WHERE policy_decision = 'Allow'") as cursor:
        stats['allow_count'] = (await cursor.fetchone())[0]
        
    agent_stats = []
    async with db.execute("""
        SELECT agent_id, COUNT(*) as count, 
               SUM(CASE WHEN policy_decision = 'Deny' THEN 1 ELSE 0 END) as denies
        FROM audit_logs 
        GROUP BY agent_id
    """) as cursor:
        async for row in cursor:
            agent_stats.append(dict(row))
            
    stats['by_agent'] = agent_stats
    
    await db.close()
    return stats

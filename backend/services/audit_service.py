from database import get_db
from models.audit import AuditRecord, AuditQuery, AuditResponse

async def log_event(record: AuditRecord) -> None:
    db = await get_db()
    await db.execute('''
        INSERT INTO audit_logs (
            agent_id, session_id, event_type, tool_name, resource, action,
            policy_decision, policy_reason, input_data, output_data, latency_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        record.agent_id, record.session_id, record.event_type, record.tool_name,
        record.resource, record.action, record.policy_decision, record.policy_reason,
        record.input_data, record.output_data, record.latency_ms
    ))
    await db.commit()
    await db.close()

async def query_logs(query: AuditQuery) -> AuditResponse:
    db = await get_db()
    
    conditions = []
    params = []
    
    if query.agent_id:
        conditions.append("agent_id = ?")
        params.append(query.agent_id)
    if query.event_type:
        conditions.append("event_type = ?")
        params.append(query.event_type)
    if query.policy_decision:
        conditions.append("policy_decision = ?")
        params.append(query.policy_decision)
        
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total
    async with db.execute(f"SELECT COUNT(*) FROM audit_logs WHERE {where_clause}", params) as cursor:
        total = (await cursor.fetchone())[0]
        
    # Get records
    params.extend([query.limit, query.offset])
    records = []
    async with db.execute(
        f"SELECT * FROM audit_logs WHERE {where_clause} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params
    ) as cursor:
        async for row in cursor:
            records.append(AuditRecord(**dict(row)))
            
    await db.close()
    return AuditResponse(records=records, total=total)

async def get_session_logs(session_id: str) -> list[AuditRecord]:
    db = await get_db()
    records = []
    async with db.execute(
        "SELECT * FROM audit_logs WHERE session_id = ? ORDER BY timestamp ASC",
        (session_id,)
    ) as cursor:
        async for row in cursor:
            records.append(AuditRecord(**dict(row)))
    await db.close()
    return records

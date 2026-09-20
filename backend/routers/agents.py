from fastapi import APIRouter, HTTPException
from models.agent import CreateAgentRequest, AgentResponse, RunAgentRequest, RunAgentResponse
from services.agent_builder import build_agent
from services.policy_compiler import compile_policy, push_policy_to_cedar, push_entity_to_cedar, remove_policy_from_cedar
from services.orchestrator import deploy_agent, stop_agent, get_container_logs, run_prompt_in_agent
from database import get_db
import json
from datetime import datetime

router = APIRouter(prefix="/api/agents", tags=["agents"])

@router.post("/", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest):
    # 1. Build agent config
    config = await build_agent(request)
    
    # 2. Compile policy
    policy_text = compile_policy(config)
    
    # 3. Push to Cedar
    await push_entity_to_cedar(config)
    cedar_policy_id = await push_policy_to_cedar(config.id, policy_text)
    
    # 4. Deploy sandbox
    try:
        container_id = await deploy_agent(config, policy_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 5. Save to DB
    db = await get_db()
    now = datetime.now()
    await db.execute('''
        INSERT INTO agents (id, name, description, status, config_json, policy_text, cedar_policy_id, container_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        config.id, config.name, config.description, 'running', 
        json.dumps(config.model_dump()), policy_text, cedar_policy_id, container_id,
        now, now
    ))
    await db.commit()
    await db.close()
    
    return AgentResponse(
        **config.model_dump(),
        status='running',
        container_id=container_id,
        created_at=now,
        policy_text=policy_text
    )

@router.get("/")
async def list_agents():
    db = await get_db()
    agents = []
    async with db.execute("SELECT * FROM agents") as cursor:
        async for row in cursor:
            agents.append(dict(row))
    await db.close()
    return agents

@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    db = await get_db()
    async with db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return dict(row)

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    db = await get_db()
    async with db.execute("SELECT container_id FROM agents WHERE id = ?", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        await db.close()
        raise HTTPException(status_code=404, detail="Agent not found")
        
    container_id = row['container_id']
    
    if container_id:
        await stop_agent(container_id)
        
    await remove_policy_from_cedar(agent_id)
    
    await db.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
    await db.commit()
    await db.close()
    return {"status": "deleted"}

@router.post("/{agent_id}/run", response_model=RunAgentResponse)
async def run_agent(agent_id: str, request: RunAgentRequest):
    db = await get_db()
    async with db.execute("SELECT container_id FROM agents WHERE id = ? AND status = 'running'", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        await db.close()
        raise HTTPException(status_code=400, detail="Agent not found or not running")
        
    container_id = row['container_id']
    
    # Save session
    await db.execute(
        "INSERT INTO agent_sessions (id, agent_id, prompt) VALUES (?, ?, ?)",
        (request.session_id, agent_id, request.prompt)
    )
    await db.commit()
    
    try:
        result = await run_prompt_in_agent(container_id, request.session_id, request.prompt)
        await db.execute(
            "UPDATE agent_sessions SET status = 'completed', result = ? WHERE id = ?",
            (result, request.session_id)
        )
        await db.commit()
    except Exception as e:
        await db.execute(
            "UPDATE agent_sessions SET status = 'failed', result = ? WHERE id = ?",
            (str(e), request.session_id)
        )
        await db.commit()
        await db.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    await db.close()
    return RunAgentResponse(
        session_id=request.session_id,
        agent_id=agent_id,
        status="completed",
        result=result
    )

@router.get("/{agent_id}/logs")
async def agent_logs(agent_id: str):
    db = await get_db()
    async with db.execute("SELECT container_id FROM agents WHERE id = ?", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row or not row['container_id']:
        raise HTTPException(status_code=404, detail="Agent container not found")
        
    logs = await get_container_logs(row['container_id'])
    return {"logs": logs}

@router.post("/{agent_id}/start")
async def start_agent_api(agent_id: str):
    db = await get_db()
    await db.execute("UPDATE agents SET status = 'running' WHERE id = ?", (agent_id,))
    await db.commit()
    await db.close()
    return {"status": "started"}

@router.post("/{agent_id}/stop")
async def stop_agent_api(agent_id: str):
    db = await get_db()
    async with db.execute("SELECT container_id FROM agents WHERE id = ?", (agent_id,)) as cursor:
        row = await cursor.fetchone()
    if not row or not row['container_id']:
        await db.close()
        raise HTTPException(status_code=404, detail="Agent container not found")
        
    await stop_agent(row['container_id'])
    await db.execute("UPDATE agents SET status = 'stopped' WHERE id = ?", (agent_id,))
    await db.commit()
    await db.close()
    return {"status": "stopped"}

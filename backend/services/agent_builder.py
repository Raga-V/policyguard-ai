import json
import uuid
import httpx
from models.agent import CreateAgentRequest, AgentConfig, ToolPermission
from config import OLLAMA_BASE_URL, OLLAMA_MODEL
import re

SYSTEM_PROMPT = """You are an AI agent configuration expert. Given a natural language description of an AI agent's role, extract a structured configuration.

Available tools: read_file, write_file, list_dir, http_get, http_post, sql_query, run_command

Output ONLY valid JSON matching this schema:
{
  "name": "kebab-case-agent-name",
  "description": "one sentence",
  "purpose": "detailed purpose",
  "tools": [
    {
      "tool_name": "tool_name",
      "allowed_resources": ["resource_path_or_pattern"],
      "allowed_actions": ["specific_action"],
      "context_constraints": {}
    }
  ],
  "trust_level": 1-5,
  "sensitivity": "public|internal|confidential",
  "resource_scopes": {"files": [], "endpoints": [], "databases": []}
}"""

async def build_agent(request: CreateAgentRequest) -> AgentConfig:
    parsed_json = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": request.description,
                    "system": SYSTEM_PROMPT,
                    "stream": False
                },
                timeout=120.0
            )
            response.raise_for_status()
            result = response.json()
            
        response_text = result.get("response", "")
        
        # Strip markdown code blocks
        json_str = response_text
        match = re.search(r'```(?:json)?(.*?)```', response_text, re.DOTALL)
        if match:
            json_str = match.group(1)
            
        parsed_json = json.loads(json_str.strip())
    except Exception as e:
        # Graceful fallback: synthesize configuration from description & tools
        # Useful when LLM weights are still loading or downloading
        words = re.findall(r'[a-zA-Z0-9]+', request.description.lower())
        name = "-".join(words[:3]) if words else "secure-agent"
        if not name.endswith("-agent"):
            name = f"{name}-agent"
            
        parsed_json = {
            "name": name,
            "description": request.description[:120],
            "purpose": request.description,
            "tools": [],
            "trust_level": 3,
            "sensitivity": "internal",
            "resource_scopes": request.resource_scopes or {"files": [], "endpoints": [], "databases": []}
        }
    
    # Ensure selected_tools are represented
    tools = parsed_json.get("tools", [])
    existing_tool_names = {t["tool_name"] for t in tools}
    for st in request.selected_tools:
        if st not in existing_tool_names:
            # Determine appropriate resource scope
            resources = ["*"]
            if request.resource_scopes:
                if st in ("read_file", "write_file", "list_dir") and request.resource_scopes.get("files"):
                    resources = request.resource_scopes["files"]
                elif st in ("http_get", "http_post") and request.resource_scopes.get("endpoints"):
                    resources = request.resource_scopes["endpoints"]
                elif st == "sql_query" and request.resource_scopes.get("databases"):
                    resources = request.resource_scopes["databases"]
                    
            tools.append({
                "tool_name": st,
                "allowed_resources": resources,
                "allowed_actions": ["*"],
                "context_constraints": {}
            })
            existing_tool_names.add(st)
            
    parsed_json["tools"] = tools
    
    agent_id = str(uuid.uuid4())
    
    # If resource_scopes is provided in request, merge or override
    if request.resource_scopes:
        parsed_json["resource_scopes"] = request.resource_scopes
        
    return AgentConfig(id=agent_id, **parsed_json)

import httpx
import logging
import json

logger = logging.getLogger(__name__)

class PolicyEnforcer:
    def __init__(self, cedar_agent_url: str, agent_id: str, audit_callback=None):
        self.cedar_agent_url = cedar_agent_url.rstrip("/") if cedar_agent_url else ""
        self.agent_id = agent_id
        self.audit_callback = audit_callback
        
        self.tool_action_mapping = {
            "read_file": 'AgentApp::Action::"readFile"',
            "write_file": 'AgentApp::Action::"writeFile"',
            "list_dir": 'AgentApp::Action::"listDir"',
            "http_get": 'AgentApp::Action::"callApi"',
            "http_post": 'AgentApp::Action::"callApi"',
            "sql_query": 'AgentApp::Action::"queryDatabase"',
            "run_command": 'AgentApp::Action::"runCommand"'
        }
    
    def map_resource(self, tool_name: str, resource_val: str) -> str:
        if tool_name in ["read_file", "write_file", "list_dir"]:
            return f'AgentApp::File::"{resource_val}"'
        elif tool_name in ["http_get", "http_post"]:
            return f'AgentApp::ApiEndpoint::"{resource_val}"'
        elif tool_name == "sql_query":
            return f'AgentApp::Database::"{resource_val}"'
        elif tool_name == "run_command":
            return f'AgentApp::Command::"{resource_val}"'
        return 'AgentApp::Resource::"unknown"'

    async def check(self, tool_name: str, resource: str, action: str, context: dict) -> tuple[bool, str]:
        cedar_action = self.tool_action_mapping.get(tool_name)
        if not cedar_action:
            return False, f"Unknown tool: {tool_name}"
            
        cedar_resource = self.map_resource(tool_name, resource)
        
        payload = {
            "principal": f'AgentApp::Agent::"{self.agent_id}"',
            "action": cedar_action,
            "resource": cedar_resource,
            "context": context
        }
        
        if not self.cedar_agent_url:
            return False, "cedar-agent URL not configured"
            
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(f"{self.cedar_agent_url}/v1/is_authorized", json=payload)
                resp.raise_for_status()
                data = resp.json()
                
                decision = data.get("decision")
                if decision == "Allow":
                    return True, "Allowed by policy"
                else:
                    diagnostics = data.get("diagnostics", {})
                    reason = diagnostics.get("reason", ["Denied by default or explicit deny policy"])
                    if isinstance(reason, list) and reason:
                        reason_str = ", ".join(reason)
                    else:
                        reason_str = str(reason)
                    return False, f"Policy denied: {reason_str}"
                    
        except Exception as e:
            logger.error(f"Failed to reach cedar-agent: {e}")
            return False, "cedar-agent unreachable (fail-closed)"

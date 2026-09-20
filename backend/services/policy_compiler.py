from models.agent import AgentConfig
from config import CEDAR_AGENT_URL
import httpx
from datetime import datetime

def compile_policy(config: AgentConfig) -> str:
    # ── Tool-to-Cedar action mapping ──────────────────────────
    TOOL_TO_CEDAR_ACTION = {
        "read_file":    'AgentApp::Action::"readFile"',
        "write_file":   'AgentApp::Action::"writeFile"',
        "list_dir":     'AgentApp::Action::"listDir"',
        "http_get":     'AgentApp::Action::"callApi"',
        "http_post":    'AgentApp::Action::"callApi"',
        "sql_query":    'AgentApp::Action::"queryDatabase"',
        "run_command":  'AgentApp::Action::"runCommand"',
    }

    actions = []
    conditions = []
    for tool in config.tools:
        cedar_action = TOOL_TO_CEDAR_ACTION.get(tool.tool_name)
        if cedar_action and cedar_action not in actions:
            actions.append(cedar_action)

        if tool.allowed_resources and tool.allowed_resources != ["*"]:
            if tool.tool_name in ("read_file", "write_file", "list_dir"):
                attr = "resource.path"
            elif tool.tool_name in ("http_get", "http_post"):
                attr = "resource.url"
            elif tool.tool_name == "sql_query":
                attr = "resource.name"
            else:
                attr = "resource.path"

            for res in tool.allowed_resources:
                conditions.append(f'{attr} like "{res}"')

    if not actions:
        actions = ['AgentApp::Action::"readFile"']

    when_block = ""
    if conditions:
        joined_conds = " ||\n    ".join(conditions)
        when_block = f"\nwhen {{\n    {joined_conds}\n}}"

    action_expr = actions[0] if len(actions) == 1 else f"[{', '.join(actions)}]"
    action_op = "==" if len(actions) == 1 else "in"

    policy = (
        f'// Agent: {config.name} ({config.id})\n'
        f'permit (\n'
        f'    principal == AgentApp::Agent::"{config.id}",\n'
        f'    action {action_op} {action_expr},\n'
        f'    resource\n'
        f'){when_block};'
    )
    return policy


async def push_policy_to_cedar(agent_id: str, policy_text: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.put(
            f"{CEDAR_AGENT_URL}/v1/policies/{agent_id}",
            json={"content": policy_text}
        )
        response.raise_for_status()
        return agent_id


async def push_entity_to_cedar(config: AgentConfig) -> None:
    tool_names = [t.tool_name for t in config.tools]
    # cedar-agent expects entity data as a list
    entities = [
        {
            "uid": {"type": "AgentApp::Agent", "id": config.id},
            "attrs": {
                "agentId":    config.id,
                "trustLevel": config.trust_level,
                "isVerified": True,
                "capabilities": tool_names,
                "sensitivity": config.sensitivity,
            },
            "parents": []
        }
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.put(
            f"{CEDAR_AGENT_URL}/v1/data",
            json=entities
        )
        response.raise_for_status()


async def remove_policy_from_cedar(agent_id: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.delete(
            f"{CEDAR_AGENT_URL}/v1/policies/{agent_id}"
        )
        # 404 is acceptable — policy may not exist
        if response.status_code not in (200, 204, 404):
            response.raise_for_status()

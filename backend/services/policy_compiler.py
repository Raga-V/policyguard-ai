from models.agent import AgentConfig
from config import CEDAR_AGENT_URL
import httpx
from datetime import datetime

def compile_policy(config: AgentConfig) -> str:
    timestamp = datetime.now().isoformat()
    lines = [
        f"// Agent Name: {config.name}",
        f"// Agent ID: {config.id}",
        f"// Compiled At: {timestamp}",
        f"// Sensitivity: {config.sensitivity}",
        ""
    ]

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

    # ── Generate permit rule per tool ─────────────────────────
    for tool in config.tools:
        cedar_action = TOOL_TO_CEDAR_ACTION.get(tool.tool_name)
        if not cedar_action:
            continue

        # Build when-clause conditions for resource restrictions
        conditions = []
        if tool.allowed_resources and tool.allowed_resources != ["*"]:
            # File tools use resource.path, API tools use resource.url, DB tools use resource.name
            if tool.tool_name in ("read_file", "write_file", "list_dir"):
                attr = "resource.path"
            elif tool.tool_name in ("http_get", "http_post"):
                attr = "resource.url"
            elif tool.tool_name == "sql_query":
                attr = "resource.name"
            else:
                attr = "resource.path"

            resource_checks = " ||\n        ".join(
                [f'{attr} like "{res}"' for res in tool.allowed_resources]
            )
            conditions.append(resource_checks)

        when_block = ""
        if conditions:
            when_block = f"\nwhen {{\n    {chr(10).join(conditions)}\n}}"

        rule = (
            f'permit (\n'
            f'    principal == AgentApp::Agent::"{config.id}",\n'
            f'    action == {cedar_action},\n'
            f'    resource\n'
            f'){when_block};'
        )
        lines.append(rule)
        lines.append("")

    # ── Hard forbid: protected file paths ────────────────────
    lines.append(
        f'forbid (\n'
        f'    principal == AgentApp::Agent::"{config.id}",\n'
        f'    action == AgentApp::Action::"writeFile",\n'
        f'    resource is AgentApp::File\n'
        f') when {{\n'
        f'    resource.path like "/etc/**" ||\n'
        f'    resource.path like "/secrets/**" ||\n'
        f'    resource.path like "/root/**" ||\n'
        f'    resource.path like "**/.env" ||\n'
        f'    resource.path like "**/credentials**"\n'
        f'}};'
    )
    lines.append("")

    # ── Hard forbid: shell/bash execution ────────────────────
    lines.append(
        f'forbid (\n'
        f'    principal == AgentApp::Agent::"{config.id}",\n'
        f'    action == AgentApp::Action::"runCommand",\n'
        f'    resource is AgentApp::Command\n'
        f') when {{\n'
        f'    resource.executable like "**/bash" ||\n'
        f'    resource.executable like "**/sh" ||\n'
        f'    resource.isRestricted == true\n'
        f'}};'
    )
    lines.append("")

    # ── Hard forbid: credential files (any action) ───────────
    lines.append(
        f'forbid (\n'
        f'    principal == AgentApp::Agent::"{config.id}",\n'
        f'    action,\n'
        f'    resource is AgentApp::File\n'
        f') when {{\n'
        f'    resource.path like "**/.env" ||\n'
        f'    resource.path like "**/credentials**" ||\n'
        f'    resource.path like "**/.ssh/**"\n'
        f'}};'
    )
    lines.append("")

    # ── Hard forbid: confidential agents cannot POST externally
    if config.sensitivity == "confidential":
        lines.append(
            f'forbid (\n'
            f'    principal == AgentApp::Agent::"{config.id}",\n'
            f'    action == AgentApp::Action::"callApi",\n'
            f'    resource is AgentApp::ApiEndpoint\n'
            f') when {{\n'
            f'    resource.environment == "external"\n'
            f'}};'
        )
        lines.append("")

    return "\n".join(lines)


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

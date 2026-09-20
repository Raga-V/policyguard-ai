import docker
from models.agent import AgentConfig
from config import SANDBOX_IMAGE, SANDBOX_NETWORK, CEDAR_AGENT_URL, OLLAMA_BASE_URL, OLLAMA_MODEL
import json
import logging

logger = logging.getLogger(__name__)
_client = None

def get_client():
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client

async def deploy_agent(config: AgentConfig, policy_text: str) -> str:
    env_vars = {
        "AGENT_ID": config.id,
        "AGENT_CONFIG": json.dumps(config.model_dump()),
        "CEDAR_AGENT_URL": CEDAR_AGENT_URL,
        "OLLAMA_BASE_URL": OLLAMA_BASE_URL,
        "OLLAMA_MODEL": OLLAMA_MODEL
    }
    
    container_name = f"agent-{config.id[:8]}"
    
    try:
        # Create docker network if not exists
        cli = get_client()
        try:
            cli.networks.get(SANDBOX_NETWORK)
        except docker.errors.NotFound:
            cli.networks.create(SANDBOX_NETWORK, driver="bridge")

        container = cli.containers.run(
            image=SANDBOX_IMAGE,
            name=container_name,
            environment=env_vars,
            network=SANDBOX_NETWORK,
            detach=True,
            remove=False,
            read_only=True,
            tmpfs={'/tmp': 'size=64M,mode=1777', '/data': 'size=128M,mode=1777'},
            command="tail -f /dev/null" # Keep alive
        )
        return container.id
    except Exception as e:
        logger.error(f"Failed to deploy agent: {e}")
        raise

async def stop_agent(container_id: str) -> None:
    try:
        container = get_client().containers.get(container_id)
        container.stop()
    except docker.errors.NotFound:
        pass
    except Exception as e:
        logger.error(f"Failed to stop agent container: {e}")
        raise

async def get_container_logs(container_id: str) -> str:
    try:
        container = get_client().containers.get(container_id)
        return container.logs().decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to get container logs: {e}")
        return ""

async def run_prompt_in_agent(container_id: str, session_id: str, prompt: str) -> str:
    try:
        container = get_client().containers.get(container_id)
        exec_result = container.exec_run(
            cmd=["python", "agent_runner.py", "--session-id", session_id, "--prompt", prompt]
        )
        return exec_result.output.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to run prompt in agent: {e}")
        raise

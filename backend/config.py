import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
CEDAR_AGENT_URL = os.getenv("CEDAR_AGENT_URL", "http://cedar-agent:8180")
DATABASE_URL = os.getenv("DATABASE_URL", "/data/audit.db")
SANDBOX_IMAGE = os.getenv("SANDBOX_IMAGE", "agent-runtime:latest")
SANDBOX_NETWORK = os.getenv("SANDBOX_NETWORK", "agent-net")
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-in-production")

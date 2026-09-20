import asyncio
import argparse
import os
import json
import logging
import httpx
import re
from typing import Optional

from policy_enforcer import PolicyEnforcer
from tools import TOOL_REGISTRY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI agent operating under strict security policies. You can only use explicitly approved tools.
Every tool call you make is checked against authorization policies before execution.

Available tools:
{tool_descriptions}

Think step by step. To use a tool, output EXACTLY this JSON format:
ACTION: {{"tool": "tool_name", "args": {{"param": "value"}}}}

After receiving tool results, continue reasoning. When you have a final answer, output:
FINAL ANSWER: <your answer here>

IMPORTANT: If a tool call is denied by policy, accept the restriction and work with what you have.
"""

TOOL_DESCRIPTIONS = """
- read_file(path): Read a file from the filesystem
- write_file(path, content): Write content to a file  
- list_dir(path): List directory contents
- http_get(url): Make an HTTP GET request
- http_post(url, body): Make an HTTP POST request with JSON body
- sql_query(database, query): Run a SELECT query on a database
- run_command(command): Execute a shell command
"""

async def report_to_audit(backend_url: str, session_id: str, agent_id: str, event_type: str, **kwargs):
    payload = {
        "session_id": session_id,
        "agent_id": agent_id,
        "event_type": event_type,
        "details": kwargs
    }
    
    if not backend_url:
        logger.warning(f"[AUDIT] (Fallback) {json.dumps(payload)}")
        return

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(f"{backend_url.rstrip('/')}/api/audit/ingest", json=payload)
            resp.raise_for_status()
    except Exception as e:
        logger.warning(f"[AUDIT] Failed to post to backend: {e}. Event: {json.dumps(payload)}")


async def call_llm(ollama_url: str, model: str, prompt: str) -> str:
    url = f"{ollama_url.rstrip('/')}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")

def parse_llm_response(response: str):
    # check for ACTION
    action_match = re.search(r'ACTION:\s*(\{.*?\})', response, re.DOTALL)
    if action_match:
        try:
            action_json = json.loads(action_match.group(1))
            return "action", action_json
        except json.JSONDecodeError:
            pass
            
    # check for FINAL ANSWER
    final_match = re.search(r'FINAL ANSWER:\s*(.*)', response, re.DOTALL)
    if final_match:
        return "final", final_match.group(1).strip()
        
    return "reasoning", response.strip()

def get_resource_from_args(tool_name: str, args: dict) -> str:
    if tool_name in ["read_file", "write_file", "list_dir"]:
        return args.get("path", "unknown")
    elif tool_name in ["http_get", "http_post"]:
        return args.get("url", "unknown")
    elif tool_name == "sql_query":
        return args.get("database", "unknown")
    elif tool_name == "run_command":
        return args.get("command", "unknown")
    return "unknown"

async def run_agent(session_id: str, user_prompt: str, max_steps: int):
    agent_id = os.environ.get("AGENT_ID", "default-agent")
    agent_config = os.environ.get("AGENT_CONFIG", "{}")
    cedar_url = os.environ.get("CEDAR_AGENT_URL", "")
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.environ.get("OLLAMA_MODEL", "llama3")
    backend_url = os.environ.get("BACKEND_URL", "")
    
    enforcer = PolicyEnforcer(cedar_url, agent_id)
    
    conversation = SYSTEM_PROMPT.format(tool_descriptions=TOOL_DESCRIPTIONS.strip())
    conversation += f"\n\nUSER: {user_prompt}\n"
    
    await report_to_audit(backend_url, session_id, agent_id, "AGENT_START", prompt=user_prompt)
    
    step = 0
    while step < max_steps:
        logger.info(f"Step {step+1}/{max_steps} - Calling LLM...")
        try:
            llm_response = await call_llm(ollama_url, ollama_model, conversation)
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            break
            
        conversation += f"\nASSISTANT:\n{llm_response}\n"
        
        parsed_type, parsed_content = parse_llm_response(llm_response)
        
        if parsed_type == "final":
            print(f"FINAL ANSWER: {parsed_content}")
            await report_to_audit(backend_url, session_id, agent_id, "AGENT_FINISH", final_answer=parsed_content)
            return
            
        elif parsed_type == "action":
            tool_name = parsed_content.get("tool")
            args = parsed_content.get("args", {})
            
            logger.info(f"Tool request: {tool_name} {args}")
            
            if tool_name not in TOOL_REGISTRY:
                result_str = f"Error: Tool '{tool_name}' not found."
                conversation += f"\nTOOL RESULT: {result_str}\n"
                continue
                
            resource = get_resource_from_args(tool_name, args)
            
            # Policy Check
            context = {"args": args}
            is_allowed, reason = await enforcer.check(tool_name, resource, "execute", context)
            
            await report_to_audit(backend_url, session_id, agent_id, "TOOL_CALL", 
                                tool=tool_name, args=args, allowed=is_allowed, reason=reason)
                                
            if not is_allowed:
                msg = f"TOOL DENIED: Policy blocked {tool_name} on {resource}. Reason: {reason}"
                logger.warning(msg)
                conversation += f"\n{msg}\n"
            else:
                # Execute tool
                tool_func = TOOL_REGISTRY[tool_name]
                try:
                    result = await tool_func(**args)
                    result_str = str(result)
                except Exception as e:
                    result_str = f"Tool execution failed: {e}"
                    
                logger.info(f"Tool result: {result_str[:100]}...")
                conversation += f"\nTOOL RESULT:\n{result_str}\n"
        
        else:
            # reasoning, just loop
            logger.info("Agent reasoned but provided no tool action.")
            
        step += 1
        
    print("FINAL ANSWER: Max steps reached without a final answer.")
    await report_to_audit(backend_url, session_id, agent_id, "AGENT_ERROR", reason="Max steps reached")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--max-steps", type=int, default=10)
    args = parser.parse_args()
    
    asyncio.run(run_agent(args.session_id, args.prompt, args.max_steps))

if __name__ == "__main__":
    main()

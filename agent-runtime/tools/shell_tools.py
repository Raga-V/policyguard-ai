import asyncio
import re

BLOCKED_COMMANDS_REGEX = r"\b(rm|curl|wget|nc|netcat|chmod|chown|sudo|su|bash|sh -c|python -c|eval|exec)\b"
TIMEOUT_SECS = 10

async def run_command(command: str) -> str:
    if re.search(BLOCKED_COMMANDS_REGEX, command):
        return "Error: Command contains blocked keywords."
        
    try:
        # Use asyncio.create_subprocess_shell to run the command
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=TIMEOUT_SECS)
        except asyncio.TimeoutError:
            process.kill()
            return f"Error: Command timed out after {TIMEOUT_SECS} seconds"
            
        out_str = stdout.decode('utf-8', errors='replace').strip()
        err_str = stderr.decode('utf-8', errors='replace').strip()
        
        result = []
        if out_str:
            result.append(f"STDOUT:\n{out_str}")
        if err_str:
            result.append(f"STDERR:\n{err_str}")
        
        if not result:
            return "Command executed successfully with no output."
            
        return "\n\n".join(result)
        
    except Exception as e:
        return f"Failed to execute command: {e}"

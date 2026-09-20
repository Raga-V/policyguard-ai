import httpx
import json

MAX_RESPONSE_SIZE = 1 * 1024 * 1024  # 1MB
TIMEOUT = 30.0

async def http_get(url: str, headers: dict = None) -> str:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
            
            # check size before reading if possible
            if "Content-Length" in resp.headers and int(resp.headers["Content-Length"]) > MAX_RESPONSE_SIZE:
                return f"Error: Response too large (status {resp.status_code})"
                
            body = resp.read()
            if len(body) > MAX_RESPONSE_SIZE:
                return f"Error: Response too large (status {resp.status_code})"
                
            try:
                body_str = body.decode('utf-8')
            except UnicodeDecodeError:
                body_str = "<binary data>"
                
            return f"Status: {resp.status_code}\nBody: {body_str}"
    except httpx.RequestError as e:
        return f"HTTP GET request failed: {e}"

async def http_post(url: str, body: dict = None, headers: dict = None) -> str:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(url, json=body, headers=headers)
            
            if "Content-Length" in resp.headers and int(resp.headers["Content-Length"]) > MAX_RESPONSE_SIZE:
                return f"Error: Response too large (status {resp.status_code})"
                
            resp_body = resp.read()
            if len(resp_body) > MAX_RESPONSE_SIZE:
                return f"Error: Response too large (status {resp.status_code})"
                
            try:
                body_str = resp_body.decode('utf-8')
            except UnicodeDecodeError:
                body_str = "<binary data>"
                
            return f"Status: {resp.status_code}\nBody: {body_str}"
    except httpx.RequestError as e:
        return f"HTTP POST request failed: {e}"

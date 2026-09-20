import os

MAX_READ_SIZE = 50 * 1024  # 50KB

async def read_file(path: str) -> str:
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"Not a file: {path}")
        
    size = os.path.getsize(path)
    if size > MAX_READ_SIZE:
        return f"Error: File too large to read (>{MAX_READ_SIZE} bytes)"
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        raise PermissionError(f"Failed to read file {path}: {e}")

async def write_file(path: str, content: str) -> str:
    try:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote to {path}"
    except Exception as e:
        raise PermissionError(f"Failed to write to file {path}: {e}")

async def list_dir(path: str) -> str:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Directory not found: {path}")
    if not os.path.isdir(path):
        raise ValueError(f"Not a directory: {path}")
        
    try:
        entries = os.listdir(path)
        if not entries:
            return "Directory is empty."
        return "\n".join(entries)
    except Exception as e:
        raise PermissionError(f"Failed to list directory {path}: {e}")

from .file_tools import read_file, write_file, list_dir
from .http_tools import http_get, http_post
from .sql_tools import sql_query
from .shell_tools import run_command

TOOL_REGISTRY = {
    "read_file": read_file,
    "write_file": write_file,
    "list_dir": list_dir,
    "http_get": http_get,
    "http_post": http_post,
    "sql_query": sql_query,
    "run_command": run_command,
}

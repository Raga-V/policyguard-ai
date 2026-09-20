import sqlite3
import os
import re

async def sql_query(database: str, query: str) -> str:
    db_path = f"/data/{database}.db"
    
    # Check for forbidden keywords (case insensitive)
    forbidden_keywords = r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b"
    if re.search(forbidden_keywords, query, re.IGNORECASE):
        return "Error: Only SELECT queries are allowed. Write operations are blocked."
        
    if not os.path.exists(db_path):
        return f"Error: Database {database} not found at {db_path}"
        
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if not rows:
            return "Query executed successfully, no results returned."
            
        columns = rows[0].keys()
        result_lines = [", ".join(columns)]
        for row in rows:
            result_lines.append(", ".join(str(row[c]) for c in columns))
            
        conn.close()
        return "\n".join(result_lines)
    except sqlite3.Error as e:
        return f"SQL Error: {e}"

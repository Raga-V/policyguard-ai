import aiosqlite
from config import DATABASE_URL
import os

async def get_db():
    # Ensure directory exists
    os.makedirs(os.path.dirname(DATABASE_URL), exist_ok=True)
    db = await aiosqlite.connect(DATABASE_URL)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    os.makedirs(os.path.dirname(DATABASE_URL), exist_ok=True)
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute('''
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'stopped',
          config_json TEXT NOT NULL,
          policy_text TEXT,
          cedar_policy_id TEXT,
          container_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        
        await db.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          tool_name TEXT,
          resource TEXT,
          action TEXT,
          policy_decision TEXT,
          policy_reason TEXT,
          input_data TEXT,
          output_data TEXT,
          latency_ms INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        
        await db.execute('''
        CREATE TABLE IF NOT EXISTS agent_sessions (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          prompt TEXT NOT NULL,
          status TEXT DEFAULT 'running',
          result TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        
        await db.commit()

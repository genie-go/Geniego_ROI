import sqlite3
from pathlib import Path

DB_PATH = Path("genie_v243.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        job_type TEXT,
        payload TEXT,
        status TEXT,
        created_at REAL
    )
    """)
    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        status TEXT,
        message TEXT,
        created_at REAL
    )
    """)
    conn.commit()
    conn.close()

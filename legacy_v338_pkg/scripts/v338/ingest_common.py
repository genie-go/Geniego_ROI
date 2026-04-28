#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import pathlib, sqlite3, json, uuid, time
from scripts.v335.ops_store import OpsStore
from datetime import datetime
from typing import Dict, Any, Tuple

def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

def open_db(workspace: pathlib.Path) -> sqlite3.Connection:
    # ensure schema by touching OpsStore
    _ = OpsStore(workspace)
    db = workspace/"data"/"ops_v335.db"
    db.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db.as_posix())
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def new_job(conn: sqlite3.Connection, project_id: str, source: str, file_name: str) -> str:
    job_id = uuid.uuid4().hex
    now = _now_iso()
    conn.execute(
        "INSERT INTO ingest_jobs_v335(project_id,job_id,source,file_name,status,rows_total,rows_ok,rows_bad,error,started_ts,finished_ts) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (project_id, job_id, source, file_name, "RUNNING", 0, 0, 0, "", now, "")
    )
    conn.commit()
    return job_id

def finish_job(conn: sqlite3.Connection, job_id: str, status: str, rows_total: int, rows_ok: int, rows_bad: int, error: str=""):
    now = _now_iso()
    conn.execute(
        "UPDATE ingest_jobs_v335 SET status=?,rows_total=?,rows_ok=?,rows_bad=?,error=?,finished_ts=? WHERE job_id=?",
        (status, int(rows_total), int(rows_ok), int(rows_bad), error or "", now, job_id)
    )
    conn.commit()

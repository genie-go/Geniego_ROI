#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V327 Ops Store (audit log, approvals, job queue)

All stored in a single SQLite db under workspace/data/ops_v327.db
Stdlib-only.

Tables:
- audit_log(ts, username, project_id, action, resource, detail_json)
- approvals(id, ts, project_id, requested_by, action, payload_json, status, reviewed_by, reviewed_at, review_note)
- job_queue(id, ts, project_id, job_type, payload_json, status, started_at, finished_at, error)
- connector_state(project_id, connector, last_run_at, watermark_json)
- marketplace_state(project_id, channel, last_run_at, watermark_json)

"""
from __future__ import annotations
import json, sqlite3, pathlib, threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

class OpsStore:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.db_path = (workspace/"data"/"ops_v327.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path.as_posix(), check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init(self):
        with self._lock:
            conn = self._conn()
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS audit_log(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              username TEXT,
              project_id TEXT,
              action TEXT NOT NULL,
              resource TEXT,
              detail_json TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
            CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id, ts);

            CREATE TABLE IF NOT EXISTS approvals(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              requested_by TEXT,
              action TEXT NOT NULL,
              payload_json TEXT,
              status TEXT NOT NULL, -- pending/approved/rejected
              reviewed_by TEXT,
              reviewed_at TEXT,
              review_note TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals(project_id, status, ts);

            CREATE TABLE IF NOT EXISTS job_queue(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              job_type TEXT NOT NULL,
              payload_json TEXT,
              status TEXT NOT NULL, -- queued/running/done/failed
              attempts INTEGER NOT NULL DEFAULT 0,
              max_attempts INTEGER NOT NULL DEFAULT 5,
              next_run_at TEXT, -- for backoff / scheduling
              started_at TEXT,
              finished_at TEXT,
              error TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_queue(status, ts);
            CREATE INDEX IF NOT EXISTS idx_jobs_project ON job_queue(project_id, status, ts);

            CREATE TABLE IF NOT EXISTS connector_state(
              project_id TEXT NOT NULL,
              connector TEXT NOT NULL,
              last_run_at TEXT,
              watermark_json TEXT,
              PRIMARY KEY(project_id, connector)
            );

            CREATE TABLE IF NOT EXISTS marketplace_state(
              project_id TEXT NOT NULL,
              channel TEXT NOT NULL,
              last_run_at TEXT,
              watermark_json TEXT,
              PRIMARY KEY(project_id, channel)
            );
            """)
            # Lightweight migrations (add new columns if missing)
            try:
                cols = [r[1] for r in conn.execute("PRAGMA table_info(job_queue)").fetchall()]
                for col, ddl in [
                    ("attempts", "ALTER TABLE job_queue ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0"),
                    ("max_attempts", "ALTER TABLE job_queue ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5"),
                    ("next_run_at", "ALTER TABLE job_queue ADD COLUMN next_run_at TEXT"),
                ]:
                    if col not in cols:
                        conn.execute(ddl)
            except Exception:
                pass

            conn.commit()
            conn.close()

    # ----- audit -----
    def audit(self, action: str, username: str|None=None, project_id: str|None=None, resource: str|None=None, detail: Dict[str,Any]|None=None):
        with self._lock:
            conn = self._conn()
            conn.execute(
                "INSERT INTO audit_log(ts, username, project_id, action, resource, detail_json) VALUES (?,?,?,?,?,?)",
                (datetime.utcnow().isoformat()+"Z", username, project_id, action, resource, json.dumps(detail or {}, ensure_ascii=False))
            )
            conn.commit()
            conn.close()

    def list_audit(self, project_id: str|None=None, limit: int=200):
        with self._lock:
            conn = self._conn()
            if project_id:
                rows = conn.execute(
                    "SELECT ts, username, project_id, action, resource, detail_json FROM audit_log WHERE project_id=? ORDER BY id DESC LIMIT ?",
                    (project_id, limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT ts, username, project_id, action, resource, detail_json FROM audit_log ORDER BY id DESC LIMIT ?",
                    (limit,)
                ).fetchall()
            conn.close()
        out=[]
        for ts,u,p,a,r,dj in rows:
            try: d=json.loads(dj or "{}")
            except Exception: d={}
            out.append({"ts":ts,"username":u,"project_id":p,"action":a,"resource":r,"detail":d})
        return out

    # ----- approvals -----
    def create_approval(self, project_id: str, requested_by: str|None, action: str, payload: Dict[str,Any]) -> int:
        with self._lock:
            conn=self._conn()
            cur=conn.execute(
                "INSERT INTO approvals(ts, project_id, requested_by, action, payload_json, status) VALUES (?,?,?,?,?,?)",
                (datetime.utcnow().isoformat()+"Z", project_id, requested_by, action, json.dumps(payload, ensure_ascii=False), "pending")
            )
            rid=int(cur.lastrowid)
            conn.commit()
            conn.close()
        return rid

    def list_approvals(self, project_id: str, status: str="pending", limit: int=200):
        with self._lock:
            conn=self._conn()
            rows=conn.execute(
                "SELECT id, ts, requested_by, action, payload_json, status, reviewed_by, reviewed_at, review_note FROM approvals WHERE project_id=? AND status=? ORDER BY id DESC LIMIT ?",
                (project_id, status, limit)
            ).fetchall()
            conn.close()
        out=[]
        for row in rows:
            rid, ts, req_by, action, payload_json, st, rev_by, rev_at, note = row
            try: payload=json.loads(payload_json or "{}")
            except Exception: payload={}
            out.append({
                "id": rid, "ts": ts, "requested_by": req_by, "action": action,
                "payload": payload, "status": st, "reviewed_by": rev_by,
                "reviewed_at": rev_at, "review_note": note
            })
        return out

    def review_approval(self, approval_id: int, reviewer: str, approve: bool, note: str="") -> bool:
        new_status = "approved" if approve else "rejected"
        with self._lock:
            conn=self._conn()
            cur=conn.execute("SELECT project_id, action, payload_json, status FROM approvals WHERE id=?", (approval_id,))
            row=cur.fetchone()
            if not row:
                conn.close()
                return False
            project_id, action, payload_json, st = row
            if st != "pending":
                conn.close()
                return False
            conn.execute(
                "UPDATE approvals SET status=?, reviewed_by=?, reviewed_at=?, review_note=? WHERE id=?",
                (new_status, reviewer, datetime.utcnow().isoformat()+"Z", note, approval_id)
            )
            conn.commit()
            conn.close()
        return True

    def get_approval(self, approval_id: int):
        with self._lock:
            conn=self._conn()
            row=conn.execute("SELECT project_id, action, payload_json, status FROM approvals WHERE id=?", (approval_id,)).fetchone()
            conn.close()
        if not row: return None
        project_id, action, payload_json, st = row
        try: payload=json.loads(payload_json or "{}")
        except Exception: payload={}
        return {"id":approval_id,"project_id":project_id,"action":action,"payload":payload,"status":st}

    # ----- jobs -----
    def enqueue_job(self, project_id: str, job_type: str, payload: Dict[str,Any]) -> int:
        with self._lock:
            conn=self._conn()
            cur=conn.execute(
                "INSERT INTO job_queue(ts, project_id, job_type, payload_json, status, attempts, max_attempts, next_run_at) VALUES (?,?,?,?,?,?,?,?)",
                (datetime.utcnow().isoformat()+"Z", project_id, job_type, json.dumps(payload, ensure_ascii=False), "queued", 0, int(payload.get("max_attempts",5)), None)
            )
            jid=int(cur.lastrowid)
            conn.commit()
            conn.close()
        return jid

    def fetch_next_job(self) -> Optional[Dict[str,Any]]:
        """
        Fetch the next runnable queued job.
        - Respects next_run_at (for backoff/scheduling)
        - Keeps attempts/max_attempts for automatic retry
        """
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        with self._lock:
            conn=self._conn()
            row=conn.execute(
                "SELECT id, project_id, job_type, payload_json, attempts, max_attempts, next_run_at "
                "FROM job_queue "
                "WHERE status='queued' AND (next_run_at IS NULL OR next_run_at<=?) "
                "ORDER BY id ASC LIMIT 1",
                (now,)
            ).fetchone()
            if not row:
                conn.close(); return None
            jid, project_id, job_type, payload_json, attempts, max_attempts, next_run_at = row
            conn.execute(
                "UPDATE job_queue SET status='running', started_at=?, attempts=? WHERE id=?",
                (now, int(attempts), int(jid))
            )
            conn.commit()
            conn.close()
            payload = json.loads(payload_json) if payload_json else {}
            return {"id": jid, "project_id": project_id, "job_type": job_type, "payload": payload,
                    "attempts": int(attempts), "max_attempts": int(max_attempts)}

    
    def requeue_job(self, job_id: int, *, attempts: int, backoff_seconds: int, error: str="") -> None:
        """Mark a running/failed job back to queued with backoff and updated attempts."""
        from datetime import datetime, timedelta
        next_run = (datetime.utcnow() + timedelta(seconds=int(backoff_seconds))).isoformat()
        with self._lock:
            conn=self._conn()
            conn.execute(
                "UPDATE job_queue SET status='queued', attempts=?, next_run_at=?, error=?, finished_at=NULL WHERE id=?",
                (int(attempts), next_run, error, int(job_id))
            )
            conn.commit()
            conn.close()

    def finish_job(self, job_id: int, ok: bool, error: str=""):
        with self._lock:
            conn=self._conn()
            conn.execute(
                "UPDATE job_queue SET status=?, finished_at=?, error=? WHERE id=?",
                ("done" if ok else "failed", datetime.utcnow().isoformat()+"Z", error, job_id)
            )
            conn.commit()
            conn.close()

    def list_jobs(self, project_id: str|None=None, limit: int=200):
        with self._lock:
            conn=self._conn()
            if project_id:
                rows=conn.execute(
                    "SELECT id, ts, project_id, job_type, status, started_at, finished_at, error FROM job_queue WHERE project_id=? ORDER BY id DESC LIMIT ?",
                    (project_id, limit)
                ).fetchall()
            else:
                rows=conn.execute(
                    "SELECT id, ts, project_id, job_type, status, started_at, finished_at, error FROM job_queue ORDER BY id DESC LIMIT ?",
                    (limit,)
                ).fetchall()
            conn.close()
        out=[]
        for row in rows:
            jid, ts, pid, jt, st, sa, fa, err = row
            out.append({"id":jid,"ts":ts,"project_id":pid,"job_type":jt,"status":st,"started_at":sa,"finished_at":fa,"error":err})
        return out

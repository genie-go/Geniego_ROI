#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V328 Ops Store (audit log, approvals, job queue, pixel, connector state)

V328 upgrades:
- connector_state_v328: production-grade state per connector
  - token_json: access/refresh/expiry and OAuth metadata
  - perms_json: granted scopes/roles snapshot
  - ratelimit_json: last call timestamps + simple token bucket counters
  - watermark_json: incremental cursor (time/page/id) for backfill + 증분 수집
- pixel_events: first-party event collection (browser + server-side)
- id_graph_edges: lightweight identity graph (anonymous_id <-> stable ids)

All stored in one SQLite db:
  workspace/data/ops_v328.db

Stdlib-only.
"""
from __future__ import annotations
import json, os, pathlib, sqlite3, time
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime

def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

class OpsStore:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.db_path = workspace/"data"/"ops_v328.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _conn(self):
        return sqlite3.connect(self.db_path.as_posix())

    def _init_db(self):
        with self._conn() as con:
            cur = con.cursor()
            cur.execute("""CREATE TABLE IF NOT EXISTS audit_log(
              ts TEXT, username TEXT, project_id TEXT,
              action TEXT, resource TEXT, detail_json TEXT
            );""")
            cur.execute("""CREATE TABLE IF NOT EXISTS approvals(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT, project_id TEXT, requested_by TEXT,
              action TEXT, payload_json TEXT,
              status TEXT, reviewed_by TEXT, reviewed_at TEXT, review_note TEXT
            );""")
            cur.execute("""CREATE TABLE IF NOT EXISTS job_queue(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT, project_id TEXT, job_type TEXT, payload_json TEXT,
              status TEXT, started_at TEXT, finished_at TEXT, error TEXT
            );""")

            # V328 connector state (do not break V327)
            cur.execute("""CREATE TABLE IF NOT EXISTS connector_state_v328(
              project_id TEXT NOT NULL,
              connector TEXT NOT NULL,
              last_run_at TEXT,
              watermark_json TEXT,
              token_json TEXT,
              perms_json TEXT,
              ratelimit_json TEXT,
              PRIMARY KEY(project_id, connector)
            );""")

            # First-party Pixel events
            cur.execute("""CREATE TABLE IF NOT EXISTS pixel_events(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              anonymous_id TEXT,
              event_name TEXT NOT NULL,
              event_json TEXT NOT NULL
            );""")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_proj_ts ON pixel_events(project_id, ts);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_anon_ts ON pixel_events(anonymous_id, ts);")

            # Identity graph edges (lightweight)
            cur.execute("""CREATE TABLE IF NOT EXISTS id_graph_edges(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              src_type TEXT NOT NULL,
              src_value TEXT NOT NULL,
              dst_type TEXT NOT NULL,
              dst_value TEXT NOT NULL,
              confidence REAL NOT NULL DEFAULT 1.0
            );""")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_id_graph_proj_src ON id_graph_edges(project_id, src_type, src_value);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_id_graph_proj_dst ON id_graph_edges(project_id, dst_type, dst_value);")

            con.commit()

    # ---------------- audit log ----------------
    def audit(self, username: str, project_id: str, action: str, resource: str, detail: Dict[str,Any]|None=None):
        d = json.dumps(detail or {}, ensure_ascii=False)
        with self._conn() as con:
            con.execute("INSERT INTO audit_log(ts,username,project_id,action,resource,detail_json) VALUES (?,?,?,?,?,?)",
                        (_now_iso(), username, project_id, action, resource, d))
            con.commit()

    # ---------------- connector state ----------------
    def get_connector_state(self, project_id: str, connector: str) -> Dict[str,Any]:
        with self._conn() as con:
            row = con.execute(
                "SELECT last_run_at, watermark_json, token_json, perms_json, ratelimit_json "
                "FROM connector_state_v328 WHERE project_id=? AND connector=?",
                (project_id, connector)
            ).fetchone()
        if not row:
            return {"project_id": project_id, "connector": connector, "last_run_at": None,
                    "watermark": {}, "token": {}, "perms": {}, "ratelimit": {}}
        last_run_at, watermark_json, token_json, perms_json, ratelimit_json = row
        def _j(s): 
            try: return json.loads(s) if s else {}
            except Exception: return {}
        return {"project_id": project_id, "connector": connector, "last_run_at": last_run_at,
                "watermark": _j(watermark_json), "token": _j(token_json),
                "perms": _j(perms_json), "ratelimit": _j(ratelimit_json)}

    def upsert_connector_state(self, project_id: str, connector: str,
                              last_run_at: Optional[str]=None,
                              watermark: Optional[Dict[str,Any]]=None,
                              token: Optional[Dict[str,Any]]=None,
                              perms: Optional[Dict[str,Any]]=None,
                              ratelimit: Optional[Dict[str,Any]]=None):
        st = self.get_connector_state(project_id, connector)
        if last_run_at is not None: st["last_run_at"] = last_run_at
        if watermark is not None: st["watermark"] = watermark
        if token is not None: st["token"] = token
        if perms is not None: st["perms"] = perms
        if ratelimit is not None: st["ratelimit"] = ratelimit
        with self._conn() as con:
            con.execute(
                "INSERT INTO connector_state_v328(project_id,connector,last_run_at,watermark_json,token_json,perms_json,ratelimit_json) "
                "VALUES (?,?,?,?,?,?,?) "
                "ON CONFLICT(project_id,connector) DO UPDATE SET "
                "last_run_at=excluded.last_run_at, watermark_json=excluded.watermark_json, "
                "token_json=excluded.token_json, perms_json=excluded.perms_json, ratelimit_json=excluded.ratelimit_json",
                (project_id, connector, st["last_run_at"],
                 json.dumps(st["watermark"], ensure_ascii=False),
                 json.dumps(st["token"], ensure_ascii=False),
                 json.dumps(st["perms"], ensure_ascii=False),
                 json.dumps(st["ratelimit"], ensure_ascii=False))
            )
            con.commit()

    # ---------------- pixel ----------------
    def add_pixel_event(self, project_id: str, anonymous_id: str|None, event_name: str, event: Dict[str,Any]):
        with self._conn() as con:
            con.execute("INSERT INTO pixel_events(ts,project_id,anonymous_id,event_name,event_json) VALUES (?,?,?,?,?)",
                        (_now_iso(), project_id, anonymous_id, event_name, json.dumps(event, ensure_ascii=False)))
            con.commit()

    def add_id_edge(self, project_id: str, src_type: str, src_value: str, dst_type: str, dst_value: str, confidence: float=1.0):
        with self._conn() as con:
            con.execute("INSERT INTO id_graph_edges(ts,project_id,src_type,src_value,dst_type,dst_value,confidence) VALUES (?,?,?,?,?,?,?)",
                        (_now_iso(), project_id, src_type, src_value, dst_type, dst_value, float(confidence)))
            con.commit()

    def resolve_ids(self, project_id: str, src_type: str, src_value: str, limit: int=50) -> List[Dict[str,Any]]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT ts, src_type, src_value, dst_type, dst_value, confidence "
                "FROM id_graph_edges WHERE project_id=? AND src_type=? AND src_value=? "
                "ORDER BY ts DESC LIMIT ?",
                (project_id, src_type, src_value, limit)
            ).fetchall()
        return [{"ts":r[0],"src_type":r[1],"src_value":r[2],"dst_type":r[3],"dst_value":r[4],"confidence":r[5]} for r in rows]

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V328 Ops Store (audit log, approvals, job queue, pixel, connector state)

V328 upgrades:
- connector_state_v329fh: production-grade state per connector
  - token_json: access/refresh/expiry and OAuth metadata
  - perms_json: granted scopes/roles snapshot
  - ratelimit_json: last call timestamps + simple token bucket counters
  - watermark_json: incremental cursor (time/page/id) for backfill + 증분 수집
- pixel_events: first-party event collection (browser + server-side)
- id_graph_edges: lightweight identity graph (anonymous_id <-> stable ids)

All stored in one SQLite db:
  workspace/data/ops_v329fh.db

Stdlib-only.
"""
from __future__ import annotations
import json, os, pathlib, sqlite3, time, secrets
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime

def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

class OpsStore:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.db_path = workspace/"data"/"ops_v329fh.db"
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
            cur.execute("""CREATE TABLE IF NOT EXISTS connector_state_v329fh(
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
            cur.execute("""CREATE TABLE IF NOT EXISTS pixel_events_v329fh(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              received_ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              source TEXT NOT NULL,                -- browser|s2s
              schema_version INTEGER NOT NULL,
              event_id TEXT NOT NULL,              -- client generated uuid
              anonymous_id TEXT,
              user_id TEXT,                        -- stable id (hashed)
              event_name TEXT NOT NULL,
              event_ts TEXT,                       -- event time (client)
              dedupe_key TEXT,                     -- optional server dedupe
              event_json TEXT NOT NULL,
              processed_ts TEXT                    -- pipeline processed timestamp
            );
            """)
            # Identity graph edges (lightweight)
            cur.execute("""CREATE UNIQUE INDEX IF NOT EXISTS ux_pixel_events_v329fh ON pixel_events_v329fh(project_id, event_id);""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_pixel_events_proj_rcv ON pixel_events_v329fh(project_id, received_ts);""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_pixel_events_anon_rcv ON pixel_events_v329fh(project_id, anonymous_id, received_ts);""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_pixel_events_user_rcv ON pixel_events_v329fh(project_id, user_id, received_ts);""")

            # Identity graph (SaaS-grade v329fh)
            cur.execute("""CREATE TABLE IF NOT EXISTS id_graph_edges_v329fh(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              project_id TEXT NOT NULL,
              src_type TEXT NOT NULL,
              src_value TEXT NOT NULL,
              dst_type TEXT NOT NULL,
              dst_value TEXT NOT NULL,
              confidence REAL NOT NULL,
              evidence TEXT
            );""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_id_edges_proj_src ON id_graph_edges_v329fh(project_id, src_type, src_value);""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_id_edges_proj_dst ON id_graph_edges_v329fh(project_id, dst_type, dst_value);""")

            cur.execute("""CREATE TABLE IF NOT EXISTS id_graph_nodes_v329fh(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              id_type TEXT NOT NULL,
              id_value TEXT NOT NULL,
              first_seen_ts TEXT NOT NULL,
              last_seen_ts TEXT NOT NULL,
              best_confidence REAL NOT NULL DEFAULT 0.0,
              group_id TEXT NOT NULL
            );""")
            cur.execute("""CREATE UNIQUE INDEX IF NOT EXISTS ux_id_nodes_v329fh ON id_graph_nodes_v329fh(project_id, id_type, id_value);""")
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_id_nodes_group ON id_graph_nodes_v329fh(project_id, group_id);""")


            con.commit()

    
    # ---------------- identity graph ----------------
    def get_id_graph_summary(self, project_id: str, limit_groups: int=50, limit_identities: int=10) -> Dict[str,Any]:
        with self._conn() as con:
            groups = con.execute(
                "SELECT group_id, MAX(best_confidence) as best, COUNT(*) as cnt FROM id_graph_nodes_v329fh WHERE project_id=? GROUP BY group_id ORDER BY best DESC, cnt DESC LIMIT ?",
                (project_id, int(limit_groups))
            ).fetchall()
            out=[]
            for g,best,cnt in groups:
                ids = con.execute(
                    "SELECT id_type, id_value, best_confidence, last_seen_ts FROM id_graph_nodes_v329fh WHERE project_id=? AND group_id=? ORDER BY best_confidence DESC, last_seen_ts DESC LIMIT ?",
                    (project_id, g, int(limit_identities))
                ).fetchall()
                out.append({
                    "group_id": g,
                    "best_confidence": float(best or 0.0),
                    "count": int(cnt or 0),
                    "identities": [{"type":t,"value":v,"confidence":float(c or 0.0),"last_seen":ls} for (t,v,c,ls) in ids]
                })
        return {"project_id": project_id, "items": out}

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
                "FROM connector_state_v329fh WHERE project_id=? AND connector=?",
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
                "INSERT INTO connector_state_v329fh(project_id,connector,last_run_at,watermark_json,token_json,perms_json,ratelimit_json) "
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
    def add_pixel_event(self, project_id: str, *, source: str, schema_version: int, event_id: str,
                      event_name: str, event: Dict[str,Any],
                      anonymous_id: str|None=None, user_id: str|None=None,
                      event_ts: str|None=None, dedupe_key: str|None=None) -> bool:
        """Insert a pixel event with idempotency.
        Returns True if inserted, False if deduped (already exists).
        """
        received_ts = _now_iso()
        payload = json.dumps(event, ensure_ascii=False)
        try:
            with self._conn() as con:
                con.execute(
                    """INSERT INTO pixel_events_v329fh(
                        received_ts, project_id, source, schema_version, event_id,
                        anonymous_id, user_id, event_name, event_ts, dedupe_key, event_json, processed_ts
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL)""",
                    (received_ts, project_id, source, int(schema_version), event_id,
                     anonymous_id, user_id, event_name, event_ts, dedupe_key, payload)
                )
                con.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def _upsert_id_node(self, project_id: str, id_type: str, id_value: str, *, confidence: float) -> str:
        """Upsert node and return its group_id."""
        now = _now_iso()
        with self._conn() as con:
            row = con.execute(
                "SELECT group_id, first_seen_ts, last_seen_ts, best_confidence FROM id_graph_nodes_v329fh WHERE project_id=? AND id_type=? AND id_value=?",
                (project_id, id_type, id_value)
            ).fetchone()
            if row:
                group_id, first_seen, last_seen, best = row
                best2 = max(float(best or 0.0), float(confidence))
                con.execute(
                    "UPDATE id_graph_nodes_v329fh SET last_seen_ts=?, best_confidence=? WHERE project_id=? AND id_type=? AND id_value=?",
                    (now, best2, project_id, id_type, id_value)
                )
                con.commit()
                return group_id
            # new node: group_id = stable synthetic key
            group_id = f"g_{secrets.token_hex(8)}"
            con.execute(
                "INSERT INTO id_graph_nodes_v329fh(project_id,id_type,id_value,first_seen_ts,last_seen_ts,best_confidence,group_id) VALUES (?,?,?,?,?,?,?)",
                (project_id, id_type, id_value, now, now, float(confidence), group_id)
            )
            con.commit()
            return group_id

    def merge_id_groups(self, project_id: str, group_a: str, group_b: str) -> str:
        """Merge two groups and return canonical group id."""
        if group_a == group_b:
            return group_a
        # choose canonical by lexicographic (stable) to avoid churn
        canon = min(group_a, group_b)
        other = group_b if canon == group_a else group_a
        with self._conn() as con:
            con.execute(
                "UPDATE id_graph_nodes_v329fh SET group_id=? WHERE project_id=? AND group_id=?",
                (canon, project_id, other)
            )
            con.commit()
        return canon

    def add_id_edge(self, project_id: str, src_type: str, src_value: str, dst_type: str, dst_value: str,
                    *, confidence: float=1.0, evidence: str|None=None) -> str:
        """Add identity edge and merge groups. Returns canonical group id."""
        # upsert nodes first
        g1 = self._upsert_id_node(project_id, src_type, src_value, confidence=confidence)
        g2 = self._upsert_id_node(project_id, dst_type, dst_value, confidence=confidence)
        canon = self.merge_id_groups(project_id, g1, g2)
        with self._conn() as con:
            con.execute(
                "INSERT INTO id_graph_edges_v329fh(ts,project_id,src_type,src_value,dst_type,dst_value,confidence,evidence) VALUES (?,?,?,?,?,?,?,?)",
                (_now_iso(), project_id, src_type, src_value, dst_type, dst_value, float(confidence), evidence)
            )
            con.commit()
        return canon


    def resolve_ids(self, project_id: str, src_type: str, src_value: str, limit: int=50) -> List[Dict[str,Any]]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT ts, src_type, src_value, dst_type, dst_value, confidence "
                "FROM id_graph_edges WHERE project_id=? AND src_type=? AND src_value=? "
                "ORDER BY ts DESC LIMIT ?",
                (project_id, src_type, src_value, limit)
            ).fetchall()
        return [{"ts":r[0],"src_type":r[1],"src_value":r[2],"dst_type":r[3],"dst_value":r[4],"confidence":r[5]} for r in rows]

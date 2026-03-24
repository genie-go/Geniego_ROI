#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V330 Ops Store

V330 "SaaS 점수 8.5~9.0" 초고효율 업그레이드 포인트:
- (Pixel/Compliance) 동의 로그, 보관기간(retention) 설정, 삭제요청(DSR) + 처리
- (ID Graph) 증거 기반 confidence 누적 + 충돌 규칙(email_hash ↔ 서로 다른 customer_id)
- (Monitoring) 에러/지연/누락 모니터링을 위한 event_log + job/ingest 상태 집계
- (Connector) SmartStore OAuth(Client Credentials + signature) 운영형 상태 저장

SQLite 단일 파일:
  workspace/data/ops_v330.db
"""
from __future__ import annotations
import json, os, pathlib, sqlite3, time, secrets, hashlib
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime, timedelta

def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

class OpsStore:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.db_path = workspace/"data"/"ops_v330.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path.as_posix())
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._conn() as conn:
            c = conn.cursor()
            # ---- config ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS config_kv (
              k TEXT PRIMARY KEY,
              v TEXT NOT NULL,
              updated_ts TEXT NOT NULL
            )""")
            # default retention: 180d
            c.execute("INSERT OR IGNORE INTO config_kv(k,v,updated_ts) VALUES(?,?,?)",
                      ("pixel_retention_days","180",_now_iso()))
            # ---- event log for monitoring ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS event_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              level TEXT NOT NULL,      -- INFO/WARN/ERROR
              component TEXT NOT NULL,  -- pixel/connector/ui/job/idgraph
              code TEXT NOT NULL,
              message TEXT NOT NULL,
              meta_json TEXT NOT NULL
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_event_log_ts ON event_log(ts)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_event_log_comp ON event_log(component, ts)")

            # ---- connector state (token/perms/ratelimit/watermark) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS connector_state_v330 (
              project_id TEXT NOT NULL,
              connector TEXT NOT NULL,
              token_json TEXT NOT NULL,
              perms_json TEXT NOT NULL,
              ratelimit_json TEXT NOT NULL,
              watermark_json TEXT NOT NULL,
              last_ok_ts TEXT,
              last_err_ts TEXT,
              last_err_code TEXT,
              last_err_msg TEXT,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, connector)
            )""")

            # ---- pixel events (idempotent) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS pixel_events_v330 (
              project_id TEXT NOT NULL,
              event_id TEXT NOT NULL,          -- idempotency key
              schema_version INTEGER NOT NULL,
              source TEXT NOT NULL,            -- browser|s2s
              ts TEXT NOT NULL,
              name TEXT NOT NULL,
              anonymous_id TEXT,
              user_id TEXT,                    -- stable id (hashed email/customer id)
              props_json TEXT NOT NULL,
              ip TEXT,
              user_agent TEXT,
              consent INTEGER NOT NULL,         -- 0/1
              received_ts TEXT NOT NULL,
              processed_ts TEXT,
              PRIMARY KEY(project_id, event_id)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_ts ON pixel_events_v330(project_id, ts)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_user ON pixel_events_v330(project_id, user_id, ts)")

            # ---- consent logs ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS consent_log_v330 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              anonymous_id TEXT,
              ts TEXT NOT NULL,
              consent INTEGER NOT NULL,
              ip TEXT,
              user_agent TEXT
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_consent_ts ON consent_log_v330(project_id, ts)")

            # ---- deletion requests (DSR) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS deletion_requests_v330 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              requested_ts TEXT NOT NULL,
              identifier_type TEXT NOT NULL,   -- email_hash|customer_id|anonymous_id
              identifier_value TEXT NOT NULL,
              status TEXT NOT NULL,            -- PENDING|DONE|REJECTED
              processed_ts TEXT,
              note TEXT
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_dsr_status ON deletion_requests_v330(project_id, status, requested_ts)")

            # ---- ID graph evidence + group ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_edges_v330 (
              project_id TEXT NOT NULL,
              src_type TEXT NOT NULL,   -- anonymous_id|email_hash|customer_id|phone_hash
              src_value TEXT NOT NULL,
              dst_type TEXT NOT NULL,
              dst_value TEXT NOT NULL,
              evidence_type TEXT NOT NULL,  -- login|purchase|s2s|manual
              weight REAL NOT NULL,
              first_ts TEXT NOT NULL,
              last_ts TEXT NOT NULL,
              count INTEGER NOT NULL,
              confidence REAL NOT NULL,
              PRIMARY KEY(project_id, src_type, src_value, dst_type, dst_value, evidence_type)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_edges_src ON id_graph_edges_v330(project_id, src_type, src_value)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_edges_dst ON id_graph_edges_v330(project_id, dst_type, dst_value)")
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_groups_v330 (
              project_id TEXT NOT NULL,
              group_id TEXT NOT NULL,
              created_ts TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              confidence REAL NOT NULL,
              flags_json TEXT NOT NULL,
              PRIMARY KEY(project_id, group_id)
            )""")
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_members_v330 (
              project_id TEXT NOT NULL,
              group_id TEXT NOT NULL,
              id_type TEXT NOT NULL,
              id_value TEXT NOT NULL,
              confidence REAL NOT NULL,
              PRIMARY KEY(project_id, group_id, id_type, id_value)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_members_id ON id_graph_members_v330(project_id, id_type, id_value)")

            # conflicts: same email_hash linked to multiple customer_id etc.
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_conflicts_v330 (
              project_id TEXT NOT NULL,
              conflict_key TEXT NOT NULL,      -- e.g. email_hash:<hash>
              ts TEXT NOT NULL,
              detail_json TEXT NOT NULL,
              PRIMARY KEY(project_id, conflict_key)
            )""")
            conn.commit()

    # -------------------- config --------------------
    def get_config(self, k: str, default: str|None=None) -> str|None:
        with self._conn() as conn:
            r = conn.execute("SELECT v FROM config_kv WHERE k=?", (k,)).fetchone()
            return (r["v"] if r else default)

    def set_config(self, k: str, v: str) -> None:
        with self._conn() as conn:
            conn.execute("INSERT INTO config_kv(k,v,updated_ts) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_ts=excluded.updated_ts",
                         (k, v, _now_iso()))
            conn.commit()

    # -------------------- monitoring log --------------------
    def log(self, level: str, component: str, code: str, message: str, meta: Dict[str,Any]|None=None) -> None:
        meta = meta or {}
        with self._conn() as conn:
            conn.execute("INSERT INTO event_log(ts,level,component,code,message,meta_json) VALUES(?,?,?,?,?,?)",
                         (_now_iso(), level.upper(), component, code, message, json.dumps(meta, ensure_ascii=False)))
            conn.commit()

    def list_recent_events(self, *, component: str|None=None, limit: int=200) -> List[Dict[str,Any]]:
        q = "SELECT * FROM event_log "
        params: List[Any] = []
        if component:
            q += "WHERE component=? "
            params.append(component)
        q += "ORDER BY ts DESC LIMIT ?"
        params.append(limit)
        with self._conn() as conn:
            rows = conn.execute(q, tuple(params)).fetchall()
        return [dict(r) for r in rows]

    # -------------------- connector state --------------------
    def upsert_connector_state(self, project_id: str, connector: str,
                              token: Dict[str,Any], perms: Dict[str,Any], ratelimit: Dict[str,Any], watermark: Dict[str,Any],
                              *, ok: bool=True, err_code: str|None=None, err_msg: str|None=None) -> None:
        now = _now_iso()
        with self._conn() as conn:
            conn.execute("""
            INSERT INTO connector_state_v330(project_id,connector,token_json,perms_json,ratelimit_json,watermark_json,last_ok_ts,last_err_ts,last_err_code,last_err_msg,updated_ts)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(project_id,connector) DO UPDATE SET
              token_json=excluded.token_json,
              perms_json=excluded.perms_json,
              ratelimit_json=excluded.ratelimit_json,
              watermark_json=excluded.watermark_json,
              last_ok_ts=CASE WHEN ? THEN excluded.last_ok_ts ELSE connector_state_v330.last_ok_ts END,
              last_err_ts=CASE WHEN ? THEN connector_state_v330.last_err_ts ELSE excluded.last_err_ts END,
              last_err_code=CASE WHEN ? THEN connector_state_v330.last_err_code ELSE excluded.last_err_code END,
              last_err_msg=CASE WHEN ? THEN connector_state_v330.last_err_msg ELSE excluded.last_err_msg END,
              updated_ts=excluded.updated_ts
            """, (project_id, connector,
                  json.dumps(token, ensure_ascii=False),
                  json.dumps(perms, ensure_ascii=False),
                  json.dumps(ratelimit, ensure_ascii=False),
                  json.dumps(watermark, ensure_ascii=False),
                  now if ok else None,
                  now if not ok else None,
                  err_code, err_msg,
                  now,
                  1 if ok else 0,
                  1 if ok else 0,
                  1 if ok else 0,
                  1 if ok else 0))
            conn.commit()

    def get_connector_state(self, project_id: str, connector: str) -> Optional[Dict[str,Any]]:
        with self._conn() as conn:
            r = conn.execute("SELECT * FROM connector_state_v330 WHERE project_id=? AND connector=?",
                             (project_id, connector)).fetchone()
        if not r:
            return None
        d = dict(r)
        for k in ("token_json","perms_json","ratelimit_json","watermark_json"):
            d[k] = json.loads(d[k] or "{}")
        return d

    def list_connectors(self, project_id: str) -> List[Dict[str,Any]]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM connector_state_v330 WHERE project_id=? ORDER BY connector", (project_id,)).fetchall()
        out=[]
        for r in rows:
            d=dict(r)
            for k in ("token_json","perms_json","ratelimit_json","watermark_json"):
                d[k]=json.loads(d[k] or "{}")
            out.append(d)
        return out

    # -------------------- pixel / compliance --------------------
    def record_consent(self, project_id: str, *, anonymous_id: str|None, consent: bool, ip: str|None, user_agent: str|None) -> None:
        with self._conn() as conn:
            conn.execute("INSERT INTO consent_log_v330(project_id,anonymous_id,ts,consent,ip,user_agent) VALUES(?,?,?,?,?,?)",
                         (project_id, anonymous_id, _now_iso(), 1 if consent else 0, ip, user_agent))
            conn.commit()

    def ingest_pixel_event(self, project_id: str, event: Dict[str,Any], *, source: str, ip: str|None, user_agent: str|None) -> None:
        # event_id required for idempotency; fallback
        event_id = event.get("event_id") or _sha256(json.dumps(event, sort_keys=True, ensure_ascii=False))
        schema_version = int(event.get("schema_version") or 2)
        ts = event.get("ts") or _now_iso()
        name = event.get("name") or "unknown"
        anon = event.get("anonymous_id")
        user_id = event.get("user_id")
        props = event.get("props") or {}
        consent = 1 if bool(event.get("consent", True)) else 0

        with self._conn() as conn:
            conn.execute("""
            INSERT OR IGNORE INTO pixel_events_v330(project_id,event_id,schema_version,source,ts,name,anonymous_id,user_id,props_json,ip,user_agent,consent,received_ts)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (project_id, event_id, schema_version, source, ts, name, anon, user_id,
                  json.dumps(props, ensure_ascii=False), ip, user_agent, consent, _now_iso()))
            conn.commit()

    def purge_old_pixel_events(self, project_id: str) -> int:
        days = int(self.get_config("pixel_retention_days","180") or "180")
        cutoff = datetime.utcnow() - timedelta(days=days)
        cutoff_iso = cutoff.replace(microsecond=0).isoformat()+"Z"
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM pixel_events_v330 WHERE project_id=? AND ts < ?", (project_id, cutoff_iso))
            conn.commit()
            return cur.rowcount

    def create_deletion_request(self, project_id: str, identifier_type: str, identifier_value: str) -> int:
        with self._conn() as conn:
            cur = conn.execute("""
            INSERT INTO deletion_requests_v330(project_id,requested_ts,identifier_type,identifier_value,status)
            VALUES(?,?,?,?,?)
            """, (project_id, _now_iso(), identifier_type, identifier_value, "PENDING"))
            conn.commit()
            return int(cur.lastrowid)

    def process_deletions(self, project_id: str, limit: int=50) -> Dict[str,Any]:
        """Admin-only: 실제 삭제 처리."""
        processed = 0
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT * FROM deletion_requests_v330
              WHERE project_id=? AND status='PENDING'
              ORDER BY requested_ts ASC LIMIT ?
            """, (project_id, limit)).fetchall()

            for r in rows:
                it = r["identifier_type"]
                iv = r["identifier_value"]
                if it == "anonymous_id":
                    conn.execute("DELETE FROM pixel_events_v330 WHERE project_id=? AND anonymous_id=?", (project_id, iv))
                    conn.execute("DELETE FROM consent_log_v330 WHERE project_id=? AND anonymous_id=?", (project_id, iv))
                    conn.execute("DELETE FROM id_graph_edges_v330 WHERE project_id=? AND (src_value=? OR dst_value=?)", (project_id, iv, iv))
                    conn.execute("DELETE FROM id_graph_members_v330 WHERE project_id=? AND id_value=?", (project_id, iv))
                else:
                    # treat as stable id (email_hash/customer_id/phone_hash)
                    conn.execute("DELETE FROM pixel_events_v330 WHERE project_id=? AND user_id=?", (project_id, iv))
                    conn.execute("DELETE FROM id_graph_edges_v330 WHERE project_id=? AND (src_value=? OR dst_value=?)", (project_id, iv, iv))
                    conn.execute("DELETE FROM id_graph_members_v330 WHERE project_id=? AND id_value=?", (project_id, iv))
                conn.execute("""
                  UPDATE deletion_requests_v330 SET status='DONE', processed_ts=?, note=? WHERE id=?
                """, (_now_iso(), "deleted related rows", r["id"]))
                processed += 1
            conn.commit()
        return {"processed": processed}

    # -------------------- ID graph (evidence/conflict aware) --------------------
    _BASE_WEIGHT = {
        "login": 1.0,
        "purchase": 1.3,
        "s2s": 1.1,
        "manual": 0.9,
    }
    _TYPE_STRENGTH = {
        "email_hash": 1.0,
        "customer_id": 0.95,
        "phone_hash": 0.9,
        "anonymous_id": 0.7,
    }

    def _edge_confidence(self, src_type: str, dst_type: str, evidence_type: str, count: int) -> float:
        base = self._BASE_WEIGHT.get(evidence_type, 0.8)
        st = self._TYPE_STRENGTH.get(src_type, 0.8)
        dt = self._TYPE_STRENGTH.get(dst_type, 0.8)
        # diminishing returns
        return min(0.99, base * (0.55 + 0.45 * (1 - pow(0.6, max(0, count-1)))) * (0.5 + 0.5*(st+dt)/2))

    def add_identity_evidence(self, project_id: str,
                              src_type: str, src_value: str,
                              dst_type: str, dst_value: str,
                              *, evidence_type: str, ts: str|None=None) -> None:
        ts = ts or _now_iso()
        # normalize direction: stable ids as dst when possible
        with self._conn() as conn:
            row = conn.execute("""
              SELECT count FROM id_graph_edges_v330
              WHERE project_id=? AND src_type=? AND src_value=? AND dst_type=? AND dst_value=? AND evidence_type=?
            """, (project_id, src_type, src_value, dst_type, dst_value, evidence_type)).fetchone()
            cnt = int(row["count"]) if row else 0
            cnt2 = cnt + 1
            weight = float(self._BASE_WEIGHT.get(evidence_type, 0.8))
            conf = float(self._edge_confidence(src_type, dst_type, evidence_type, cnt2))

            if row:
                conn.execute("""
                  UPDATE id_graph_edges_v330
                  SET last_ts=?, count=?, weight=?, confidence=?
                  WHERE project_id=? AND src_type=? AND src_value=? AND dst_type=? AND dst_value=? AND evidence_type=?
                """, (ts, cnt2, weight, conf, project_id, src_type, src_value, dst_type, dst_value, evidence_type))
            else:
                conn.execute("""
                  INSERT INTO id_graph_edges_v330(project_id,src_type,src_value,dst_type,dst_value,evidence_type,weight,first_ts,last_ts,count,confidence)
                  VALUES(?,?,?,?,?,?,?,?,?,?,?)
                """, (project_id, src_type, src_value, dst_type, dst_value, evidence_type, weight, ts, ts, 1, conf))

            conn.commit()

        # conflict rule example: same email_hash -> multiple customer_id
        if src_type == "email_hash" and dst_type == "customer_id":
            self._check_email_customer_conflict(project_id, src_value)

    def _check_email_customer_conflict(self, project_id: str, email_hash: str) -> None:
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT DISTINCT dst_value FROM id_graph_edges_v330
              WHERE project_id=? AND src_type='email_hash' AND src_value=? AND dst_type='customer_id'
            """, (project_id, email_hash)).fetchall()
        custs = sorted({r["dst_value"] for r in rows})
        if len(custs) <= 1:
            return
        detail = {"email_hash": email_hash, "customer_ids": custs}
        with self._conn() as conn:
            conn.execute("""
              INSERT INTO id_graph_conflicts_v330(project_id,conflict_key,ts,detail_json)
              VALUES(?,?,?,?)
              ON CONFLICT(project_id,conflict_key) DO UPDATE SET ts=excluded.ts, detail_json=excluded.detail_json
            """, (project_id, f"email_hash:{email_hash}", _now_iso(), json.dumps(detail, ensure_ascii=False)))
            conn.commit()
        self.log("WARN","idgraph","ID.CONFLICT", "email_hash is linked to multiple customer_id", detail)

    def rebuild_groups(self, project_id: str) -> Dict[str,Any]:
        """간단한 union-find 그룹 재구성(증거 confidence 누적).
        - 강한 엣지(conf>=0.75) 위주로 묶고
        - 충돌(conflict)에 해당하는 email_hash는 'flags'에 표시해 운영자가 확인.
        """
        with self._conn() as conn:
            edges = conn.execute("""
              SELECT * FROM id_graph_edges_v330 WHERE project_id=?
            """, (project_id,)).fetchall()
            conflicts = conn.execute("""
              SELECT * FROM id_graph_conflicts_v330 WHERE project_id=?
            """, (project_id,)).fetchall()

        nodes=set()
        strong=[]
        all_edges=[]
        for e in edges:
            a=(e["src_type"], e["src_value"])
            b=(e["dst_type"], e["dst_value"])
            nodes.add(a); nodes.add(b)
            all_edges.append((a,b,float(e["confidence"])))
            if float(e["confidence"]) >= 0.75:
                strong.append((a,b,float(e["confidence"])))

        # union find
        parent={n:n for n in nodes}
        rank={n:0 for n in nodes}
        def find(x):
            while parent[x]!=x:
                parent[x]=parent[parent[x]]
                x=parent[x]
            return x
        def union(x,y):
            rx,ry=find(x),find(y)
            if rx==ry: return
            if rank[rx]<rank[ry]:
                parent[rx]=ry
            elif rank[rx]>rank[ry]:
                parent[ry]=rx
            else:
                parent[ry]=rx
                rank[rx]+=1

        for a,b,_c in strong:
            union(a,b)

        groups={}
        for n in nodes:
            r=find(n)
            groups.setdefault(r, []).append(n)

        # compute group confidence as max edge confidence within group (simple)
        # and member confidence: max incident edge conf
        incident={}
        for a,b,c in all_edges:
            incident[a]=max(incident.get(a,0.0), c)
            incident[b]=max(incident.get(b,0.0), c)

        # write to db (replace)
        now=_now_iso()
        with self._conn() as conn:
            conn.execute("DELETE FROM id_graph_groups_v330 WHERE project_id=?", (project_id,))
            conn.execute("DELETE FROM id_graph_members_v330 WHERE project_id=?", (project_id,))
            for root, members in groups.items():
                gid = secrets.token_hex(8)
                gconf = max([incident.get(m,0.0) for m in members] or [0.0])
                flags={}
                # mark conflicts for members
                for cf in conflicts:
                    d=json.loads(cf["detail_json"])
                    if d.get("email_hash") and ("email_hash", d["email_hash"]) in members:
                        flags["conflict_email_hash"]=d["email_hash"]
                conn.execute("""
                  INSERT INTO id_graph_groups_v330(project_id,group_id,created_ts,updated_ts,confidence,flags_json)
                  VALUES(?,?,?,?,?,?)
                """, (project_id, gid, now, now, gconf, json.dumps(flags, ensure_ascii=False)))
                for (t,v) in members:
                    conn.execute("""
                      INSERT INTO id_graph_members_v330(project_id,group_id,id_type,id_value,confidence)
                      VALUES(?,?,?,?,?)
                    """, (project_id, gid, t, v, float(incident.get((t,v),0.0))))
            conn.commit()
        return {"groups": len(groups), "nodes": len(nodes)}

    def id_graph_summary(self, project_id: str, limit: int=50) -> Dict[str,Any]:
        with self._conn() as conn:
            gs = conn.execute("""
              SELECT * FROM id_graph_groups_v330 WHERE project_id=? ORDER BY confidence DESC LIMIT ?
            """, (project_id, limit)).fetchall()
            out=[]
            for g in gs:
                members = conn.execute("""
                  SELECT id_type,id_value,confidence FROM id_graph_members_v330
                  WHERE project_id=? AND group_id=?
                  ORDER BY confidence DESC
                """, (project_id, g["group_id"])).fetchall()
                out.append({
                    "group_id": g["group_id"],
                    "confidence": float(g["confidence"]),
                    "flags": json.loads(g["flags_json"] or "{}"),
                    "members": [dict(m) for m in members],
                })
            conflicts = conn.execute("SELECT * FROM id_graph_conflicts_v330 WHERE project_id=?", (project_id,)).fetchall()
        return {"groups": out, "conflicts": [dict(c) for c in conflicts]}

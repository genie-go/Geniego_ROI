#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V334 Ops Store

V330 "SaaS 점수 8.5~9.0" 초고효율 업그레이드 포인트:
- (Pixel/Compliance) 동의 로그, 보관기간(retention) 설정, 삭제요청(DSR) + 처리
- (ID Graph) 증거 기반 confidence 누적 + 충돌 규칙(email_hash ↔ 서로 다른 customer_id)
- (Monitoring) 에러/지연/누락 모니터링을 위한 event_log + job/ingest 상태 집계
- (Connector) SmartStore OAuth(Client Credentials + signature) 운영형 상태 저장

SQLite 단일 파일:
  workspace/data/ops_v334.db
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
        self.db_path = workspace/"data"/"ops_v334.db"
        # migration: if v334 db exists and v335 does not, copy forward for seamless upgrade
        v334_path = workspace/"data"/"ops_v334.db"
        if v334_path.exists() and (not self.db_path.exists()):
            try:
                import shutil
                shutil.copy2(v334_path.as_posix(), self.db_path.as_posix())
            except Exception:
                pass
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
            # ---- SLO / alert state ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS slo_state (
              k TEXT PRIMARY KEY,
              v TEXT NOT NULL,
              updated_ts TEXT NOT NULL
            )""")
            # default: pixel ingest max age 900s (15m)
            c.execute("INSERT OR IGNORE INTO slo_state(k,v,updated_ts) VALUES(?,?,?)",
                      ("pixel_ingest_max_age_s","900",_now_iso()))
            c.execute("INSERT OR IGNORE INTO slo_state(k,v,updated_ts) VALUES(?,?,?)",
                      ("connector_ok_max_age_s","10800",_now_iso()))  # 3h
            c.execute("INSERT OR IGNORE INTO slo_state(k,v,updated_ts) VALUES(?,?,?)",
                      ("alert_cooldown_s","1800",_now_iso()))        # 30m

            # ---- reprocess queue (backfill / recovery) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS reprocess_queue_v331 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              kind TEXT NOT NULL,          -- smartstore_orders / smartstore_products / pixel_replay / ...
              payload_json TEXT NOT NULL,
              status TEXT NOT NULL,        -- queued/running/done/failed
              attempts INTEGER NOT NULL DEFAULT 0,
              next_run_ts TEXT NOT NULL,
              created_ts TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              last_error TEXT NOT NULL
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_queue_next_run ON reprocess_queue_v331(project_id,status,next_run_ts)")

            # ---- id-graph conflict workflow ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_conflict_actions_v331 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              conflict_id INTEGER NOT NULL,
              action TEXT NOT NULL,        -- hold/split/verify/ignore
              note TEXT NOT NULL,
              actor TEXT NOT NULL,
              ts TEXT NOT NULL
            )""")


            # ---- ID graph split rules (V334) ----
            # conflict_key: e.g. "email_hash:<hash>"
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_split_rules_v332 (
              project_id TEXT NOT NULL,
              conflict_key TEXT NOT NULL,
              mode TEXT NOT NULL,
              params_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, conflict_key)
            )""")
            # ---- ID graph split requests (V334) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_split_requests_v333 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              conflict_key TEXT NOT NULL,
              mode TEXT NOT NULL,              -- virtual|detach
              note TEXT NOT NULL,
              status TEXT NOT NULL,            -- PENDING|APPROVED|REJECTED
              requested_by TEXT NOT NULL,
              requested_ts TEXT NOT NULL,
              approved_by TEXT,
              approved_ts TEXT,
              params_json TEXT NOT NULL
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_split_req ON id_graph_split_requests_v333(project_id,status,requested_ts)")

            # ---- Backfill jobs (V334) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS backfill_jobs_v333 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              kind TEXT NOT NULL,              -- smartstore_orders etc
              window_from TEXT NOT NULL,
              window_to TEXT NOT NULL,
              status TEXT NOT NULL,            -- QUEUED|RUNNING|DONE|FAILED
              created_ts TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              summary_json TEXT NOT NULL
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_backfill_jobs ON backfill_jobs_v333(project_id,status,created_ts)")

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
            CREATE TABLE IF NOT EXISTS connector_state_v331 (
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
            CREATE TABLE IF NOT EXISTS pixel_events_v331 (
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
            c.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_ts ON pixel_events_v331(project_id, ts)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_pixel_events_user ON pixel_events_v331(project_id, user_id, ts)")

            # ---- consent logs ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS consent_log_v331 (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id TEXT NOT NULL,
              anonymous_id TEXT,
              ts TEXT NOT NULL,
              consent INTEGER NOT NULL,
              ip TEXT,
              user_agent TEXT
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_consent_ts ON consent_log_v331(project_id, ts)")

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
            CREATE TABLE IF NOT EXISTS id_graph_edges_v331 (
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
            c.execute("CREATE INDEX IF NOT EXISTS idx_edges_src ON id_graph_edges_v331(project_id, src_type, src_value)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_edges_dst ON id_graph_edges_v331(project_id, dst_type, dst_value)")
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_groups_v331 (
              project_id TEXT NOT NULL,
              group_id TEXT NOT NULL,
              created_ts TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              confidence REAL NOT NULL,
              flags_json TEXT NOT NULL,
              PRIMARY KEY(project_id, group_id)
            )""")
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_members_v331 (
              project_id TEXT NOT NULL,
              group_id TEXT NOT NULL,
              id_type TEXT NOT NULL,
              id_value TEXT NOT NULL,
              confidence REAL NOT NULL,
              PRIMARY KEY(project_id, group_id, id_type, id_value)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_members_id ON id_graph_members_v331(project_id, id_type, id_value)")

            # conflicts: same email_hash linked to multiple customer_id etc.
            c.execute("""
            CREATE TABLE IF NOT EXISTS id_graph_conflicts_v331 (
              project_id TEXT NOT NULL,
              conflict_key TEXT NOT NULL,      -- e.g. email_hash:<hash>
              ts TEXT NOT NULL,
              detail_json TEXT NOT NULL,
              PRIMARY KEY(project_id, conflict_key)
            )""")

            # ---- V334: commerce + marketing normalized lake (lightweight) ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS product_master_v334 (
              project_id TEXT NOT NULL,
              sku TEXT NOT NULL,
              gtin TEXT NOT NULL,
              title TEXT NOT NULL,
              brand TEXT NOT NULL,
              category_path TEXT NOT NULL,
              currency TEXT NOT NULL,
              price REAL NOT NULL,
              sale_price REAL NOT NULL,
              stock INTEGER NOT NULL,
              images_json TEXT NOT NULL,
              attrs_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, sku)
            )""")
            c.execute("""
            CREATE TABLE IF NOT EXISTS channel_listing_v334 (
              project_id TEXT NOT NULL,
              channel TEXT NOT NULL,          -- smartstore/coupang/11st/amazon/shopee/...
              channel_sku TEXT NOT NULL,
              sku TEXT NOT NULL,
              listing_status TEXT NOT NULL,   -- active/paused/soldout/error
              last_sync_ts TEXT NOT NULL,
              last_error TEXT NOT NULL,
              meta_json TEXT NOT NULL,
              PRIMARY KEY(project_id, channel, channel_sku)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_listing_sku ON channel_listing_v334(project_id, sku)")

            c.execute("""
            CREATE TABLE IF NOT EXISTS orders_norm_v334 (
              project_id TEXT NOT NULL,
              order_id TEXT NOT NULL,
              channel TEXT NOT NULL,
              order_ts TEXT NOT NULL,
              last_changed_ts TEXT NOT NULL,
              customer_key TEXT NOT NULL,     -- hashed/opaque
              geo_country TEXT NOT NULL,
              geo_region TEXT NOT NULL,
              device_type TEXT NOT NULL,
              gender TEXT NOT NULL,
              age_band TEXT NOT NULL,
              gross_amount REAL NOT NULL,
              net_amount REAL NOT NULL,
              shipping_amount REAL NOT NULL,
              discount_amount REAL NOT NULL,
              currency TEXT NOT NULL,
              items_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, channel, order_id)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_orders_ts ON orders_norm_v334(project_id, order_ts)")

            c.execute("""
            CREATE TABLE IF NOT EXISTS reviews_norm_v334 (
              project_id TEXT NOT NULL,
              channel TEXT NOT NULL,
              review_id TEXT NOT NULL,
              sku TEXT NOT NULL,
              rating INTEGER NOT NULL,
              review_ts TEXT NOT NULL,
              sentiment REAL NOT NULL,
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              media_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, channel, review_id)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_reviews_sku ON reviews_norm_v334(project_id, sku)")

            c.execute("""
            CREATE TABLE IF NOT EXISTS settlements_norm_v334 (
              project_id TEXT NOT NULL,
              channel TEXT NOT NULL,
              settlement_id TEXT NOT NULL,
              period_start TEXT NOT NULL,
              period_end TEXT NOT NULL,
              payout_ts TEXT NOT NULL,
              gross_sales REAL NOT NULL,
              fees REAL NOT NULL,
              refunds REAL NOT NULL,
              net_payout REAL NOT NULL,
              currency TEXT NOT NULL,
              detail_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, channel, settlement_id)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_settlement_period ON settlements_norm_v334(project_id, period_start, period_end)")

            c.execute("""
            CREATE TABLE IF NOT EXISTS marketing_spend_norm_v334 (
              project_id TEXT NOT NULL,
              platform TEXT NOT NULL,         -- amazon_ads/meta_ads/tiktok_ads/google_ads/...
              account_id TEXT NOT NULL,
              campaign_id TEXT NOT NULL,
              adgroup_id TEXT NOT NULL,
              creative_id TEXT NOT NULL,
              day TEXT NOT NULL,              -- YYYY-MM-DD
              country TEXT NOT NULL,
              region TEXT NOT NULL,
              gender TEXT NOT NULL,
              age_band TEXT NOT NULL,
              impressions INTEGER NOT NULL,
              clicks INTEGER NOT NULL,
              spend REAL NOT NULL,
              conversions INTEGER NOT NULL,
              revenue REAL NOT NULL,
              currency TEXT NOT NULL,
              meta_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, platform, account_id, campaign_id, adgroup_id, creative_id, day, country, region, gender, age_band)
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_spend_day ON marketing_spend_norm_v334(project_id, day)")

            c.execute("""
            CREATE TABLE IF NOT EXISTS influencer_posts_norm_v334 (
              project_id TEXT NOT NULL,
              platform TEXT NOT NULL,          -- instagram/tiktok/youtube/...
              influencer_id TEXT NOT NULL,
              post_id TEXT NOT NULL,
              post_ts TEXT NOT NULL,
              content_type TEXT NOT NULL,      -- reel/story/post/live
              country TEXT NOT NULL,
              region TEXT NOT NULL,
              impressions INTEGER NOT NULL,
              clicks INTEGER NOT NULL,
              engagements INTEGER NOT NULL,
              attributed_orders INTEGER NOT NULL,
              attributed_revenue REAL NOT NULL,
              currency TEXT NOT NULL,
              meta_json TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, platform, influencer_id, post_id)
            )""")
            
# ---- V335 feed rule engine (minimal) ----
c.execute("""
CREATE TABLE IF NOT EXISTS feed_rules_v335 (
  project_id TEXT NOT NULL,
  rule_set_id TEXT NOT NULL,         -- e.g. default_v1
  name TEXT NOT NULL,
  rule_json TEXT NOT NULL,           -- JSON spec
  is_active INTEGER NOT NULL,        -- 1/0
  updated_ts TEXT NOT NULL,
  PRIMARY KEY(project_id, rule_set_id)
)""")

c.execute("""
CREATE TABLE IF NOT EXISTS feed_validation_v335 (
  project_id TEXT NOT NULL,
  run_id TEXT NOT NULL,              -- uuid/ts
  channel TEXT NOT NULL,
  item_id TEXT NOT NULL,             -- sku or listing id
  severity TEXT NOT NULL,            -- ERROR/WARN
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  field TEXT NOT NULL,
  updated_ts TEXT NOT NULL
)""")

# ---- V335 ingest jobs (CSV pipeline) ----
c.execute("""
CREATE TABLE IF NOT EXISTS ingest_jobs_v335 (
  project_id TEXT NOT NULL,
  job_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,              -- shopify_csv/meta_ads_csv/...
  file_name TEXT NOT NULL,
  status TEXT NOT NULL,              -- QUEUED/RUNNING/DONE/FAILED
  rows_total INTEGER NOT NULL,
  rows_ok INTEGER NOT NULL,
  rows_bad INTEGER NOT NULL,
  error TEXT NOT NULL,
  started_ts TEXT NOT NULL,
  finished_ts TEXT NOT NULL
)""")

# ---- V335 settlement validation ----
c.execute("""
CREATE TABLE IF NOT EXISTS settlement_validation_v335 (
  project_id TEXT NOT NULL,
  report_id TEXT NOT NULL,           -- uuid/ts
  channel TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metric TEXT NOT NULL,              -- e.g. revenue_gap
  value REAL NOT NULL,
  threshold REAL NOT NULL,
  severity TEXT NOT NULL,            -- OK/WARN/ERROR
  detail_json TEXT NOT NULL,
  created_ts TEXT NOT NULL,
  PRIMARY KEY(project_id, report_id, metric)
)""")

# ---- V337 channel sync jobs + failures ----
            c.execute("""
            CREATE TABLE IF NOT EXISTS sync_jobs_v337 (
              project_id TEXT NOT NULL,
              job_id TEXT PRIMARY KEY,
              channel TEXT NOT NULL,            -- smartstore/coupang
              job_type TEXT NOT NULL,           -- CREATE_PRODUCT/SYNC_STOCK_PRICE/POLL_APPROVAL/REFRESH_OPTION_MAP
              payload_json TEXT NOT NULL,
              status TEXT NOT NULL,             -- QUEUED/RUNNING/DONE/FAILED/RETRY
              attempts INTEGER NOT NULL,
              max_attempts INTEGER NOT NULL,
              next_run_ts TEXT NOT NULL,
              last_error TEXT NOT NULL,
              created_ts TEXT NOT NULL,
              updated_ts TEXT NOT NULL
            )""")

            c.execute("""
            CREATE TABLE IF NOT EXISTS sync_failures_v337 (
              project_id TEXT NOT NULL,
              id TEXT PRIMARY KEY,
              channel TEXT NOT NULL,
              job_id TEXT NOT NULL,
              reason TEXT NOT NULL,             -- AUTH/RATE_LIMIT/VALIDATION/APPROVAL_PENDING/NETWORK/SERVER/UNKNOWN
              http_status INTEGER NOT NULL,
              message TEXT NOT NULL,
              detail_json TEXT NOT NULL,
              created_ts TEXT NOT NULL
            )""")

            # Mapping helpers
            c.execute("""
            CREATE TABLE IF NOT EXISTS coupang_listing_map_v337 (
              project_id TEXT NOT NULL,
              sku TEXT NOT NULL,
              seller_product_id TEXT NOT NULL,
              vendor_item_id TEXT NOT NULL,
              status TEXT NOT NULL,
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, sku, vendor_item_id)
            )""")

            c.execute("""
            CREATE TABLE IF NOT EXISTS smartstore_option_map_v337 (
              project_id TEXT NOT NULL,
              sku TEXT NOT NULL,
              origin_product_no TEXT NOT NULL,
              option_no TEXT NOT NULL,
              option_key TEXT NOT NULL,         -- normalized option name/value key
              updated_ts TEXT NOT NULL,
              PRIMARY KEY(project_id, sku, option_no)
            )""")

c.execute("CREATE INDEX IF NOT EXISTS idx_influencer_ts ON influencer_posts_norm_v334(project_id, post_ts)")

            conn.commit()

    # Backward compatible alias (run_web_ui.py historically used log_event)
    def log_event(self, level: str, component: str, code: str, message: str, meta: Dict[str,Any]|None=None) -> None:
        self.log(level, component, code, message, meta)

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

    def list_conflicts(self, project_id: str) -> List[Dict[str,Any]]:
        """Return conflicts ordered by latest ts (desc)."""
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT project_id, conflict_key, ts, detail_json
              FROM id_graph_conflicts_v331
              WHERE project_id=?
              ORDER BY ts DESC
            """, (project_id,)).fetchall()
        out=[]
        for r in rows:
            d=dict(r)
            try:
                d["detail"]=json.loads(d.get("detail_json") or "{}")
            except Exception:
                d["detail"]={}
            out.append(d)
        return out

    def get_conflict_by_index(self, project_id: str, conflict_id: int) -> Optional[Dict[str,Any]]:
        """UI uses an integer conflict_id; map it to the conflict list order."""
        cs = self.list_conflicts(project_id)
        if conflict_id < 0 or conflict_id >= len(cs):
            return None
        return cs[conflict_id]

    def upsert_split_rule(self, project_id: str, conflict_key: str, *, mode: str="detach", params: Optional[Dict[str,Any]]=None) -> None:
        params = params or {}
        with self._conn() as conn:
            conn.execute("""
              INSERT INTO id_graph_split_rules_v332(project_id,conflict_key,mode,params_json,updated_ts)
              VALUES(?,?,?,?,?)
              ON CONFLICT(project_id,conflict_key) DO UPDATE SET mode=excluded.mode, params_json=excluded.params_json, updated_ts=excluded.updated_ts
            """, (project_id, conflict_key, mode, json.dumps(params, ensure_ascii=False), _now_iso()))
            conn.commit()

    def apply_conflict_action(self, project_id: str, conflict_id: int, action: str, note: str, actor: str) -> Dict[str,Any]:
        """Apply conflict action and (when relevant) trigger rebuild."""
        self.add_conflict_action(project_id, conflict_id, action, note, actor)
        out = {"ok": True, "action": action, "conflict_id": conflict_id}

        if action == "split":
            cf = self.get_conflict_by_index(project_id, conflict_id)
            if cf:
                self.upsert_split_rule(project_id, cf["conflict_key"], mode="detach", params={"note": note, "actor": actor})
                out["split_rule"] = cf["conflict_key"]
                out["rebuild"] = self.rebuild_groups(project_id)
                self.log("INFO","idgraph","SPLIT_APPLIED", f"split applied for {cf['conflict_key']}", {"note": note, "actor": actor})
            else:
                out["warning"] = "conflict_id_out_of_range"

        if action == "verify":
            out["rebuild"] = self.rebuild_groups(project_id)
            self.log("INFO","idgraph","VERIFY_REBUILD", "verify -> rebuild", {"note": note, "actor": actor})

        return out

    # -------------------- connector state --------------------
    def upsert_connector_state(self, project_id: str, connector: str,
                              token: Dict[str,Any], perms: Dict[str,Any], ratelimit: Dict[str,Any], watermark: Dict[str,Any],
                              *, ok: bool=True, err_code: str|None=None, err_msg: str|None=None) -> None:
        now = _now_iso()
        with self._conn() as conn:
            conn.execute("""
            INSERT INTO connector_state_v331(project_id,connector,token_json,perms_json,ratelimit_json,watermark_json,last_ok_ts,last_err_ts,last_err_code,last_err_msg,updated_ts)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(project_id,connector) DO UPDATE SET
              token_json=excluded.token_json,
              perms_json=excluded.perms_json,
              ratelimit_json=excluded.ratelimit_json,
              watermark_json=excluded.watermark_json,
              last_ok_ts=CASE WHEN ? THEN excluded.last_ok_ts ELSE connector_state_v331.last_ok_ts END,
              last_err_ts=CASE WHEN ? THEN connector_state_v331.last_err_ts ELSE excluded.last_err_ts END,
              last_err_code=CASE WHEN ? THEN connector_state_v331.last_err_code ELSE excluded.last_err_code END,
              last_err_msg=CASE WHEN ? THEN connector_state_v331.last_err_msg ELSE excluded.last_err_msg END,
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
            r = conn.execute("SELECT * FROM connector_state_v331 WHERE project_id=? AND connector=?",
                             (project_id, connector)).fetchone()
        if not r:
            return None
        d = dict(r)
        for k in ("token_json","perms_json","ratelimit_json","watermark_json"):
            d[k] = json.loads(d[k] or "{}")
        return d

    def list_connectors(self, project_id: str) -> List[Dict[str,Any]]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM connector_state_v331 WHERE project_id=? ORDER BY connector", (project_id,)).fetchall()
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
            conn.execute("INSERT INTO consent_log_v331(project_id,anonymous_id,ts,consent,ip,user_agent) VALUES(?,?,?,?,?,?)",
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
            INSERT OR IGNORE INTO pixel_events_v331(project_id,event_id,schema_version,source,ts,name,anonymous_id,user_id,props_json,ip,user_agent,consent,received_ts)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (project_id, event_id, schema_version, source, ts, name, anon, user_id,
                  json.dumps(props, ensure_ascii=False), ip, user_agent, consent, _now_iso()))
            conn.commit()

    def purge_old_pixel_events(self, project_id: str) -> int:
        days = int(self.get_config("pixel_retention_days","180") or "180")
        cutoff = datetime.utcnow() - timedelta(days=days)
        cutoff_iso = cutoff.replace(microsecond=0).isoformat()+"Z"
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM pixel_events_v331 WHERE project_id=? AND ts < ?", (project_id, cutoff_iso))
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
                    conn.execute("DELETE FROM pixel_events_v331 WHERE project_id=? AND anonymous_id=?", (project_id, iv))
                    conn.execute("DELETE FROM consent_log_v331 WHERE project_id=? AND anonymous_id=?", (project_id, iv))
                    conn.execute("DELETE FROM id_graph_edges_v331 WHERE project_id=? AND (src_value=? OR dst_value=?)", (project_id, iv, iv))
                    conn.execute("DELETE FROM id_graph_members_v331 WHERE project_id=? AND id_value=?", (project_id, iv))
                else:
                    # treat as stable id (email_hash/customer_id/phone_hash)
                    conn.execute("DELETE FROM pixel_events_v331 WHERE project_id=? AND user_id=?", (project_id, iv))
                    conn.execute("DELETE FROM id_graph_edges_v331 WHERE project_id=? AND (src_value=? OR dst_value=?)", (project_id, iv, iv))
                    conn.execute("DELETE FROM id_graph_members_v331 WHERE project_id=? AND id_value=?", (project_id, iv))
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
              SELECT count FROM id_graph_edges_v331
              WHERE project_id=? AND src_type=? AND src_value=? AND dst_type=? AND dst_value=? AND evidence_type=?
            """, (project_id, src_type, src_value, dst_type, dst_value, evidence_type)).fetchone()
            cnt = int(row["count"]) if row else 0
            cnt2 = cnt + 1
            weight = float(self._BASE_WEIGHT.get(evidence_type, 0.8))
            conf = float(self._edge_confidence(src_type, dst_type, evidence_type, cnt2))

            if row:
                conn.execute("""
                  UPDATE id_graph_edges_v331
                  SET last_ts=?, count=?, weight=?, confidence=?
                  WHERE project_id=? AND src_type=? AND src_value=? AND dst_type=? AND dst_value=? AND evidence_type=?
                """, (ts, cnt2, weight, conf, project_id, src_type, src_value, dst_type, dst_value, evidence_type))
            else:
                conn.execute("""
                  INSERT INTO id_graph_edges_v331(project_id,src_type,src_value,dst_type,dst_value,evidence_type,weight,first_ts,last_ts,count,confidence)
                  VALUES(?,?,?,?,?,?,?,?,?,?,?)
                """, (project_id, src_type, src_value, dst_type, dst_value, evidence_type, weight, ts, ts, 1, conf))

            conn.commit()

        # conflict rule example: same email_hash -> multiple customer_id
        if src_type == "email_hash" and dst_type == "customer_id":
            self._check_email_customer_conflict(project_id, src_value)

    def _check_email_customer_conflict(self, project_id: str, email_hash: str) -> None:
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT DISTINCT dst_value FROM id_graph_edges_v331
              WHERE project_id=? AND src_type='email_hash' AND src_value=? AND dst_type='customer_id'
            """, (project_id, email_hash)).fetchall()
        custs = sorted({r["dst_value"] for r in rows})
        if len(custs) <= 1:
            return
        detail = {"email_hash": email_hash, "customer_ids": custs}
        with self._conn() as conn:
            conn.execute("""
              INSERT INTO id_graph_conflicts_v331(project_id,conflict_key,ts,detail_json)
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
              SELECT * FROM id_graph_edges_v331 WHERE project_id=?
            """, (project_id,)).fetchall()
            conflicts = conn.execute("""
              SELECT * FROM id_graph_conflicts_v331 WHERE project_id=?
            """, (project_id,)).fetchall()
            split_rules = conn.execute("""
              SELECT conflict_key, mode, params_json FROM id_graph_split_rules_v332 WHERE project_id=?
            """, (project_id,)).fetchall()

        # Apply split rules (V334):
        # - mode=detach  : remove email_hash node from grouping (safe but loses linkage)
        # - mode=virtual : replace email_hash with per-customer virtual nodes (keeps linkage but avoids cross-merge)
        detach_email_hashes=set()
        virtual_maps={}  # email_hash -> {customer_id: virtual_value}
        for sr in split_rules:
            ck = sr["conflict_key"]
            if not ck.startswith("email_hash:"):
                continue
            eh = ck.split(":",1)[1]
            mode = (sr["mode"] or "detach").lower()
            params = {}
            try:
                params = json.loads(sr["params_json"] or "{}")
            except Exception:
                params = {}
            if mode == "virtual":
                m = params.get("map") or {}
                # ensure keys are strings
                virtual_maps[eh] = {str(k): str(v) for k,v in m.items()}
            else:
                detach_email_hashes.add(eh)

        nodes=set()
        strong=[]
        all_edges=[]
        for e in edges:
            a=(e["src_type"], e["src_value"])
            b=(e["dst_type"], e["dst_value"])

            # virtual split rewiring
            def _rewrite(x, y):
                # x is email_hash node, y is the other node
                eh = x[1]
                if eh not in virtual_maps:
                    return x, y, False
                # only rewire edges between email_hash <-> customer_id
                if y[0] != "customer_id":
                    return x, y, True  # skip
                cid = str(y[1])
                vv = virtual_maps.get(eh, {}).get(cid) or f"{eh}|{cid}"
                return ("email_hash_v", vv), y, False

            skip = False
            if a[0] == "email_hash":
                a, b, skip = _rewrite(a, b)
            elif b[0] == "email_hash":
                b, a, skip = _rewrite(b, a)  # rewrite b; keep (a,b) order later
                a, b = a, b
            if skip:
                continue

            if (a[0]=="email_hash" and a[1] in detach_email_hashes) or (b[0]=="email_hash" and b[1] in detach_email_hashes):
                continue

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
            conn.execute("DELETE FROM id_graph_groups_v331 WHERE project_id=?", (project_id,))
            conn.execute("DELETE FROM id_graph_members_v331 WHERE project_id=?", (project_id,))
            for root, members in groups.items():
                gid = secrets.token_hex(8)
                gconf = max([incident.get(m,0.0) for m in members] or [0.0])
                flags={}
                # mark conflicts for members
                for cf in conflicts:
                    d=json.loads(cf["detail_json"])
                    if d.get("email_hash") and ("email_hash", d["email_hash"]) in members:
                        flags["conflict_email_hash"]=d["email_hash"]
                        if (d["email_hash"] in detach_email_hashes) or (d["email_hash"] in virtual_maps):
                            flags["split_applied"]=True
                            flags["split_mode"]="virtual" if d["email_hash"] in virtual_maps else "detach"
                conn.execute("""
                  INSERT INTO id_graph_groups_v331(project_id,group_id,created_ts,updated_ts,confidence,flags_json)
                  VALUES(?,?,?,?,?,?)
                """, (project_id, gid, now, now, gconf, json.dumps(flags, ensure_ascii=False)))
                for (t,v) in members:
                    conn.execute("""
                      INSERT INTO id_graph_members_v331(project_id,group_id,id_type,id_value,confidence)
                      VALUES(?,?,?,?,?)
                    """, (project_id, gid, t, v, float(incident.get((t,v),0.0))))
            conn.commit()
        return {"groups": len(groups), "nodes": len(nodes)}

    def id_graph_summary(self, project_id: str, limit: int=50) -> Dict[str,Any]:
        with self._conn() as conn:
            gs = conn.execute("""
              SELECT * FROM id_graph_groups_v331 WHERE project_id=? ORDER BY confidence DESC LIMIT ?
            """, (project_id, limit)).fetchall()
            out=[]
            for g in gs:
                members = conn.execute("""
                  SELECT id_type,id_value,confidence FROM id_graph_members_v331
                  WHERE project_id=? AND group_id=?
                  ORDER BY confidence DESC
                """, (project_id, g["group_id"])).fetchall()
                out.append({
                    "group_id": g["group_id"],
                    "confidence": float(g["confidence"]),
                    "flags": json.loads(g["flags_json"] or "{}"),
                    "members": [dict(m) for m in members],
                })
            conflicts = conn.execute("SELECT * FROM id_graph_conflicts_v331 WHERE project_id=?", (project_id,)).fetchall()
        return {"groups": out, "conflicts": [dict(c) for c in conflicts]}


    # ---------------- SLO / Monitoring ----------------
    def get_slo_config(self) -> Dict[str, Any]:
        with self._conn() as conn:
            rows = conn.execute("SELECT k,v,updated_ts FROM slo_state").fetchall()
        return {r["k"]: {"v": r["v"], "updated_ts": r["updated_ts"]} for r in rows}

    def set_slo_config(self, k: str, v: str) -> None:
        with self._conn() as conn:
            conn.execute("INSERT INTO slo_state(k,v,updated_ts) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_ts=excluded.updated_ts",
                         (k, v, _now_iso()))
            conn.commit()

    def metric_last_pixel_event_ts(self, project_id: str) -> Optional[str]:
        with self._conn() as conn:
            r = conn.execute("SELECT MAX(ts) as ts FROM pixel_events_v331 WHERE project_id=?", (project_id,)).fetchone()
        return r["ts"] if r and r["ts"] else None

    def metric_last_connector_ok_ts(self, project_id: str, connector: str) -> Optional[str]:
        with self._conn() as conn:
            r = conn.execute("SELECT last_ok_ts FROM connector_state_v331 WHERE project_id=? AND connector=?",
                             (project_id, connector)).fetchone()
        return r["last_ok_ts"] if r and r["last_ok_ts"] else None

    def get_last_alert_ts(self, key: str) -> Optional[str]:
        with self._conn() as conn:
            r = conn.execute("SELECT v FROM slo_state WHERE k=?", (f"last_alert::{key}",)).fetchone()
        return r["v"] if r else None

    def set_last_alert_ts(self, key: str, iso_ts: str) -> None:
        with self._conn() as conn:
            conn.execute("INSERT INTO slo_state(k,v,updated_ts) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_ts=excluded.updated_ts",
                         (f"last_alert::{key}", iso_ts, _now_iso()))
            conn.commit()

    # ---------------- Queue ----------------
    def enqueue(self, project_id: str, kind: str, payload: Dict[str, Any], *, next_run_ts: Optional[str]=None) -> int:
        now = _now_iso()
        next_run_ts = next_run_ts or now
        with self._conn() as conn:
            cur = conn.execute("""
              INSERT INTO reprocess_queue_v331(project_id,kind,payload_json,status,attempts,next_run_ts,created_ts,updated_ts,last_error)
              VALUES(?,?,?,?,?,?,?,?,?)
            """, (project_id, kind, json.dumps(payload, ensure_ascii=False), "queued", 0, next_run_ts, now, now, ""))
            conn.commit()
            return int(cur.lastrowid)

    def list_queue(self, project_id: str, limit: int=200) -> List[Dict[str,Any]]:
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT * FROM reprocess_queue_v331 WHERE project_id=? ORDER BY id DESC LIMIT ?
            """, (project_id, limit)).fetchall()
        out=[]
        for r in rows:
            d=dict(r)
            try: d["payload"]=json.loads(d.pop("payload_json") or "{}")
            except Exception: d["payload"]={}
            out.append(d)
        return out

    def claim_queue_items(self, project_id: str, max_items: int=20) -> List[Dict[str,Any]]:
        # very small-scale "lease" model: claim queued items that are due
        now = _now_iso()
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT id FROM reprocess_queue_v331
              WHERE project_id=? AND status='queued' AND next_run_ts<=?
              ORDER BY id ASC LIMIT ?
            """, (project_id, now, max_items)).fetchall()
            ids=[r["id"] for r in rows]
            if not ids:
                return []
            conn.execute(f"UPDATE reprocess_queue_v331 SET status='running', updated_ts=? WHERE id IN ({','.join(['?']*len(ids))})",
                         (now, *ids))
            conn.commit()
            fetched = conn.execute(f"SELECT * FROM reprocess_queue_v331 WHERE id IN ({','.join(['?']*len(ids))})",
                                   ids).fetchall()
        out=[]
        for r in fetched:
            d=dict(r)
            d["payload"]=json.loads(d.pop("payload_json") or "{}")
            out.append(d)
        return out

    def finish_queue_item(self, item_id: int, status: str, *, error: str="") -> None:
        now = _now_iso()
        with self._conn() as conn:
            if status == "queued":  # retry
                conn.execute("""
                  UPDATE reprocess_queue_v331
                  SET status='queued', attempts=attempts+1, next_run_ts=?, updated_ts=?, last_error=?
                  WHERE id=?
                """, (now, now, error[:500], item_id))
            else:
                conn.execute("""
                  UPDATE reprocess_queue_v331
                  SET status=?, attempts=attempts+1, updated_ts=?, last_error=?
                  WHERE id=?
                """, (status, now, error[:500], item_id))
            conn.commit()

    # ---------------- Conflict workflow ----------------
    def add_conflict_action(self, project_id: str, conflict_id: int, action: str, note: str, actor: str) -> None:
        with self._conn() as conn:
            conn.execute("""
              INSERT INTO id_graph_conflict_actions_v331(project_id,conflict_id,action,note,actor,ts)
              VALUES(?,?,?,?,?,?)
            """, (project_id, conflict_id, action, note, actor, _now_iso()))
            conn.commit()

    def list_conflict_actions(self, project_id: str, conflict_id: int) -> List[Dict[str,Any]]:
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT * FROM id_graph_conflict_actions_v331
              WHERE project_id=? AND conflict_id=? ORDER BY id ASC
            """, (project_id, conflict_id)).fetchall()
        return [dict(r) for r in rows]

    # ---------------- V334: split approval workflow ----------------
    def create_split_request(self, project_id: str, conflict_key: str, *, mode: str="virtual", note: str="", requested_by: str="unknown", params: Optional[Dict[str,Any]]=None) -> int:
        mode = (mode or "virtual").lower()
        if mode not in ("virtual","detach"):
            raise ValueError("mode must be virtual|detach")
        params = params or {}
        now = _now_iso()
        with self._conn() as conn:
            cur = conn.execute("""
              INSERT INTO id_graph_split_requests_v333(project_id,conflict_key,mode,note,status,requested_by,requested_ts,params_json)
              VALUES(?,?,?,?,?,?,?,?)
            """, (project_id, conflict_key, mode, note, "PENDING", requested_by, now, json.dumps(params, ensure_ascii=False)))
            conn.commit()
            return int(cur.lastrowid)

    def list_split_requests(self, project_id: str, *, status: str="PENDING", limit: int=100) -> List[Dict[str,Any]]:
        status = (status or "PENDING").upper()
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT * FROM id_graph_split_requests_v333
              WHERE project_id=? AND status=?
              ORDER BY id DESC LIMIT ?
            """, (project_id, status, limit)).fetchall()
        return [dict(r) for r in rows]

    def approve_split_request(self, project_id: str, request_id: int, *, approve: bool, approved_by: str="unknown", note: str="") -> Dict[str,Any]:
        now=_now_iso()
        with self._conn() as conn:
            r = conn.execute("SELECT * FROM id_graph_split_requests_v333 WHERE project_id=? AND id=?", (project_id, request_id)).fetchone()
            if not r:
                raise ValueError("request not found")
            if r["status"] != "PENDING":
                return {"ok": False, "error": "already_processed", "status": r["status"]}
            new_status = "APPROVED" if approve else "REJECTED"
            # merge note into params
            params = json.loads(r["params_json"] or "{}")
            if note:
                params["approval_note"] = note
            conn.execute("""
              UPDATE id_graph_split_requests_v333
              SET status=?, approved_by=?, approved_ts=?, params_json=?
              WHERE project_id=? AND id=?
            """, (new_status, approved_by, now, json.dumps(params, ensure_ascii=False), project_id, request_id))
            conn.commit()

        out={"ok": True, "id": request_id, "status": new_status}
        if approve:
            # apply rule + rebuild
            ck = r["conflict_key"]
            mode = (r["mode"] or "virtual").lower()
            params = json.loads(r["params_json"] or "{}")
            # if virtual and missing mapping, derive from current conflict snapshot
            if mode == "virtual" and "map" not in params:
                cf = self.get_conflict_by_key(project_id, ck)
                if cf:
                    detail = json.loads(cf.get("detail_json") or "{}")
                    email_hash = detail.get("email_hash") or ck.split(":",1)[1]
                    custs = detail.get("customer_ids") or []
                    params = {**params, "email_hash": email_hash, "map": {c: f"{email_hash}|{c}" for c in custs}}
            self.upsert_split_rule(project_id, ck, mode=mode, params=params)
            out["split_rule"]=ck
            out["rebuild"]=self.rebuild_groups(project_id)
        return out

    def get_conflict_by_key(self, project_id: str, conflict_key: str) -> Optional[Dict[str,Any]]:
        with self._conn() as conn:
            r = conn.execute("SELECT * FROM id_graph_conflicts_v331 WHERE project_id=? AND conflict_key=?", (project_id, conflict_key)).fetchone()
        return dict(r) if r else None

    # ---------------- V334: backfill job tracking ----------------
    def create_backfill_job(self, project_id: str, kind: str, window_from: str, window_to: str, *, summary: Optional[Dict[str,Any]]=None) -> int:
        now=_now_iso()
        summary = summary or {}
        with self._conn() as conn:
            cur = conn.execute("""
              INSERT INTO backfill_jobs_v333(project_id,kind,window_from,window_to,status,created_ts,updated_ts,summary_json)
              VALUES(?,?,?,?,?,?,?,?)
            """, (project_id, kind, window_from, window_to, "QUEUED", now, now, json.dumps(summary, ensure_ascii=False)))
            conn.commit()
            return int(cur.lastrowid)

    def update_backfill_job(self, project_id: str, job_id: int, *, status: str, summary: Optional[Dict[str,Any]]=None) -> None:
        now=_now_iso()
        summary = summary or {}
        with self._conn() as conn:
            conn.execute("""
              UPDATE backfill_jobs_v333 SET status=?, updated_ts=?, summary_json=?
              WHERE project_id=? AND id=?
            """, (status, now, json.dumps(summary, ensure_ascii=False), project_id, job_id))
            conn.commit()

    def recent_errors(self, project_id: str, *, lookback_minutes: int=120, limit: int=20) -> List[Dict[str,Any]]:
        import datetime
        now = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
        since = now - datetime.timedelta(minutes=lookback_minutes)
        since_iso = since.replace(microsecond=0).isoformat().replace("+00:00","Z")
        like = f'%"project_id": "{project_id}"%'
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT ts, component, code, message FROM event_log
              WHERE ts>=? AND level='ERROR' AND meta_json LIKE ?
              ORDER BY ts DESC LIMIT ?
            """, (since_iso, like, limit)).fetchall()
        return [dict(r) for r in rows]

    def recent_error_summary(self, project_id: str, *, lookback_minutes: int=120, limit: int=5) -> List[Dict[str,Any]]:
        import datetime
        now = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
        since = now - datetime.timedelta(minutes=lookback_minutes)
        since_iso = since.replace(microsecond=0).isoformat().replace("+00:00","Z")
        like = f'%"project_id": "{project_id}"%'
        with self._conn() as conn:
            rows = conn.execute("""
              SELECT component, code, COUNT(*) as cnt, MAX(ts) as last_ts
              FROM event_log
              WHERE ts>=? AND level='ERROR' AND meta_json LIKE ?
              GROUP BY component, code
              ORDER BY cnt DESC, last_ts DESC
              LIMIT ?
            """, (since_iso, like, limit)).fetchall()
        return [dict(r) for r in rows]


    # ---------------- V334: commerce/marketing normalized ingestion helpers ----------------

    def upsert_product_master(self, project_id: str, product: Dict[str,Any]) -> None:
        """Upsert a product master record following templates/v334/product_schema_v1.json."""
        now = _now_iso()
        sku = str(product.get("sku","")).strip()
        if not sku:
            raise ValueError("product.sku required")
        with self._conn() as conn:
            conn.execute("""
              INSERT OR REPLACE INTO product_master_v334
              (project_id, sku, gtin, title, brand, category_path, currency, price, sale_price, stock,
               images_json, attrs_json, updated_ts)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                project_id, sku,
                str(product.get("gtin","") or ""),
                str(product.get("title","") or ""),
                str(product.get("brand","") or ""),
                str(product.get("category_path","") or ""),
                str(product.get("currency","KRW") or "KRW"),
                float(product.get("price",0.0) or 0.0),
                float(product.get("sale_price",0.0) or 0.0),
                int(product.get("stock",0) or 0),
                json.dumps(product.get("images",[]) or [], ensure_ascii=False),
                json.dumps(product.get("attributes",{}) or {}, ensure_ascii=False),
                now
            ))

    def upsert_channel_listing(self, project_id: str, listing: Dict[str,Any]) -> None:
        now = _now_iso()
        channel = str(listing.get("channel","")).strip()
        channel_sku = str(listing.get("channel_sku","")).strip()
        sku = str(listing.get("sku","")).strip()
        if not (channel and channel_sku and sku):
            raise ValueError("listing requires channel, channel_sku, sku")
        with self._conn() as conn:
            conn.execute("""
              INSERT OR REPLACE INTO channel_listing_v334
              (project_id, channel, channel_sku, sku, listing_status, last_sync_ts, last_error, meta_json)
              VALUES(?,?,?,?,?,?,?,?)
            """, (
                project_id, channel, channel_sku, sku,
                str(listing.get("listing_status","active")),
                str(listing.get("last_sync_ts", now)),
                str(listing.get("last_error","") or ""),
                json.dumps(listing.get("meta",{}) or {}, ensure_ascii=False),
            ))



def list_product_master_v334(self, project_id: str) -> List[Dict[str,Any]]:
    with self._conn() as conn:
        cur = conn.execute("""
          SELECT sku, gtin, title, brand, category_path, currency, price, sale_price, stock, images_json, attrs_json, updated_ts
          FROM product_master_v334 WHERE project_id=? ORDER BY updated_ts DESC
        """, (project_id,))
        out=[]
        for row in cur.fetchall():
            sku, gtin, title, brand, category_path, currency, price, sale_price, stock, images_json, attrs_json, updated_ts = row
            out.append({
                "sku": sku, "gtin": gtin, "title": title, "brand": brand, "category_path": category_path,
                "currency": currency, "price": float(price), "sale_price": float(sale_price),
                "stock": int(stock),
                "images": json.loads(images_json or "[]"),
                "attrs": json.loads(attrs_json or "{}"),
                "updated_ts": updated_ts,
            })
        return out

def get_channel_listing_meta(self, project_id: str, channel: str, sku: str) -> Dict[str,Any]:
    """Return meta_json for the latest listing matching (project_id, channel, sku), if any."""
    with self._conn() as conn:
        cur = conn.execute("""
          SELECT meta_json FROM channel_listing_v334
          WHERE project_id=? AND channel=? AND sku=?
          ORDER BY last_sync_ts DESC LIMIT 1
        """, (project_id, channel, sku))
        row = cur.fetchone()
        if not row:
            return {}
        try:
            return json.loads(row[0] or "{}")
        except Exception:
            return {}

    def ingest_orders_norm(self, project_id: str, rows: List[Dict[str,Any]]) -> Tuple[int,int]:
        """Insert/replace normalized order rows. Returns (ok, failed)."""
        ok=0; failed=0
        now=_now_iso()
        with self._conn() as conn:
            for r in rows:
                try:
                    conn.execute("""
                      INSERT OR REPLACE INTO orders_norm_v334
                      (project_id, order_id, channel, order_ts, last_changed_ts, customer_key,
                       geo_country, geo_region, device_type, gender, age_band,
                       gross_amount, net_amount, shipping_amount, discount_amount, currency,
                       items_json, updated_ts)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        project_id,
                        str(r.get("order_id","")),
                        str(r.get("channel","")),
                        str(r.get("order_ts","")),
                        str(r.get("last_changed_ts","") or r.get("order_ts","")),
                        str(r.get("customer_key","")),
                        str(r.get("geo_country","")),
                        str(r.get("geo_region","")),
                        str(r.get("device_type","")),
                        str(r.get("gender","unknown")),
                        str(r.get("age_band","unknown")),
                        float(r.get("gross_amount",0.0) or 0.0),
                        float(r.get("net_amount",0.0) or 0.0),
                        float(r.get("shipping_amount",0.0) or 0.0),
                        float(r.get("discount_amount",0.0) or 0.0),
                        str(r.get("currency","KRW") or "KRW"),
                        json.dumps(r.get("items",[]) or [], ensure_ascii=False),
                        now
                    ))
                    ok += 1
                except Exception:
                    failed += 1
        return ok, failed

    def ingest_reviews_norm(self, project_id: str, rows: List[Dict[str,Any]]) -> Tuple[int,int]:
        ok=0; failed=0
        now=_now_iso()
        with self._conn() as conn:
            for r in rows:
                try:
                    conn.execute("""
                      INSERT OR REPLACE INTO reviews_norm_v334
                      (project_id, channel, review_id, sku, rating, review_ts, sentiment, title, body, media_json, updated_ts)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        project_id,
                        str(r.get("channel","")),
                        str(r.get("review_id","")),
                        str(r.get("sku","")),
                        int(r.get("rating",0) or 0),
                        str(r.get("review_ts","")),
                        float(r.get("sentiment",0.0) or 0.0),
                        str(r.get("title","") or ""),
                        str(r.get("body","") or ""),
                        json.dumps(r.get("media",[]) or [], ensure_ascii=False),
                        now
                    ))
                    ok += 1
                except Exception:
                    failed += 1
        return ok, failed

    def ingest_settlements_norm(self, project_id: str, rows: List[Dict[str,Any]]) -> Tuple[int,int]:
        ok=0; failed=0
        now=_now_iso()
        with self._conn() as conn:
            for r in rows:
                try:
                    conn.execute("""
                      INSERT OR REPLACE INTO settlements_norm_v334
                      (project_id, channel, settlement_id, period_start, period_end, payout_ts,
                       gross_sales, fees, refunds, net_payout, currency, detail_json, updated_ts)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        project_id,
                        str(r.get("channel","")),
                        str(r.get("settlement_id","")),
                        str(r.get("period_start","")),
                        str(r.get("period_end","")),
                        str(r.get("payout_ts","")),
                        float(r.get("gross_sales",0.0) or 0.0),
                        float(r.get("fees",0.0) or 0.0),
                        float(r.get("refunds",0.0) or 0.0),
                        float(r.get("net_payout",0.0) or 0.0),
                        str(r.get("currency","KRW") or "KRW"),
                        json.dumps(r.get("detail",{}) or {}, ensure_ascii=False),
                        now
                    ))
                    ok += 1
                except Exception:
                    failed += 1
        return ok, failed

    def ingest_marketing_spend_norm(self, project_id: str, rows: List[Dict[str,Any]]) -> Tuple[int,int]:
        ok=0; failed=0
        now=_now_iso()
        with self._conn() as conn:
            for r in rows:
                try:
                    conn.execute("""
                      INSERT OR REPLACE INTO marketing_spend_norm_v334
                      (project_id, platform, account_id, campaign_id, adgroup_id, creative_id, day,
                       country, region, gender, age_band,
                       impressions, clicks, spend, conversions, revenue, currency, meta_json, updated_ts)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        project_id,
                        str(r.get("platform","")),
                        str(r.get("account_id","")),
                        str(r.get("campaign_id","")),
                        str(r.get("adgroup_id","")),
                        str(r.get("creative_id","")),
                        str(r.get("day","")),
                        str(r.get("country","")),
                        str(r.get("region","")),
                        str(r.get("gender","unknown")),
                        str(r.get("age_band","unknown")),
                        int(r.get("impressions",0) or 0),
                        int(r.get("clicks",0) or 0),
                        float(r.get("spend",0.0) or 0.0),
                        int(r.get("conversions",0) or 0),
                        float(r.get("revenue",0.0) or 0.0),
                        str(r.get("currency","USD") or "USD"),
                        json.dumps(r.get("meta",{}) or {}, ensure_ascii=False),
                        now
                    ))
                    ok += 1
                except Exception:
                    failed += 1
        return ok, failed

    def ingest_influencer_posts_norm(self, project_id: str, rows: List[Dict[str,Any]]) -> Tuple[int,int]:
        ok=0; failed=0
        now=_now_iso()
        with self._conn() as conn:
            for r in rows:
                try:
                    conn.execute("""
                      INSERT OR REPLACE INTO influencer_posts_norm_v334
                      (project_id, platform, influencer_id, post_id, post_ts, content_type,
                       country, region, impressions, clicks, engagements,
                       attributed_orders, attributed_revenue, currency, meta_json, updated_ts)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        project_id,
                        str(r.get("platform","")),
                        str(r.get("influencer_id","")),
                        str(r.get("post_id","")),
                        str(r.get("post_ts","")),
                        str(r.get("content_type","post")),
                        str(r.get("country","")),
                        str(r.get("region","")),
                        int(r.get("impressions",0) or 0),
                        int(r.get("clicks",0) or 0),
                        int(r.get("engagements",0) or 0),
                        int(r.get("attributed_orders",0) or 0),
                        float(r.get("attributed_revenue",0.0) or 0.0),
                        str(r.get("currency","USD") or "USD"),
                        json.dumps(r.get("meta",{}) or {}, ensure_ascii=False),
                        now
                    ))
                    ok += 1
                except Exception:
                    failed += 1
        return ok, failed


# ---------------------------
# V337: Channel sync job queue
# ---------------------------
def enqueue_sync_job(self, project_id: str, *, channel: str, job_type: str, payload: Dict[str,Any],
                     max_attempts: int = 8, delay_seconds: int = 0) -> str:
    job_id = secrets.token_hex(12)
    now = _now_iso()
    next_run = (datetime.utcnow() + timedelta(seconds=max(0, int(delay_seconds)))).replace(microsecond=0).isoformat()+"Z"
    with self._conn() as conn:
        conn.execute("""
          INSERT INTO sync_jobs_v337
          (project_id, job_id, channel, job_type, payload_json, status, attempts, max_attempts, next_run_ts, last_error, created_ts, updated_ts)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        """, (project_id, job_id, channel, job_type, json.dumps(payload, ensure_ascii=False),
              "QUEUED", 0, int(max_attempts), next_run, "", now, now))
    return job_id

def fetch_due_sync_jobs(self, project_id: str, *, limit: int = 50) -> List[Dict[str,Any]]:
    now = _now_iso()
    with self._conn() as conn:
        rows = conn.execute("""
          SELECT * FROM sync_jobs_v337
          WHERE project_id=? AND status IN ('QUEUED','RETRY') AND next_run_ts<=?
          ORDER BY next_run_ts ASC
          LIMIT ?
        """, (project_id, now, int(limit))).fetchall()
    out=[]
    for r in rows:
        d=dict(r)
        try:
            d["payload"]=json.loads(d.get("payload_json","{}") or "{}")
        except Exception:
            d["payload"]={}
        out.append(d)
    return out

def mark_sync_job_running(self, project_id: str, job_id: str) -> None:
    now=_now_iso()
    with self._conn() as conn:
        conn.execute("UPDATE sync_jobs_v337 SET status='RUNNING', updated_ts=? WHERE project_id=? AND job_id=?",
                     (now, project_id, job_id))

def finish_sync_job(self, project_id: str, job_id: str, *, ok: bool, error: str = "", retry_after_seconds: int = 0) -> None:
    now=_now_iso()
    with self._conn() as conn:
        row = conn.execute("SELECT attempts, max_attempts FROM sync_jobs_v337 WHERE project_id=? AND job_id=?",
                           (project_id, job_id)).fetchone()
        if not row:
            return
        attempts=int(row["attempts"] or 0)
        max_attempts=int(row["max_attempts"] or 0)
        attempts2 = attempts + (0 if ok else 1)
        if ok:
            conn.execute("""
              UPDATE sync_jobs_v337
              SET status='DONE', attempts=?, last_error=?, updated_ts=?
              WHERE project_id=? AND job_id=?
            """, (attempts2, "", now, project_id, job_id))
        else:
            if attempts2 >= max_attempts:
                conn.execute("""
                  UPDATE sync_jobs_v337
                  SET status='FAILED', attempts=?, last_error=?, updated_ts=?
                  WHERE project_id=? AND job_id=?
                """, (attempts2, (error or "")[:1200], now, project_id, job_id))
            else:
                next_run = (datetime.utcnow() + timedelta(seconds=max(1, int(retry_after_seconds)))).replace(microsecond=0).isoformat()+"Z"
                conn.execute("""
                  UPDATE sync_jobs_v337
                  SET status='RETRY', attempts=?, last_error=?, next_run_ts=?, updated_ts=?
                  WHERE project_id=? AND job_id=?
                """, (attempts2, (error or "")[:1200], next_run, now, project_id, job_id))

def record_sync_failure(self, project_id: str, *, job_id: str, channel: str, reason: str,
                        http_status: int = 0, message: str = "", detail: Dict[str,Any] | None = None) -> str:
    fid = secrets.token_hex(10)
    now=_now_iso()
    with self._conn() as conn:
        conn.execute("""
          INSERT INTO sync_failures_v337
          (project_id, id, channel, job_id, reason, http_status, message, detail_json, created_ts)
          VALUES(?,?,?,?,?,?,?,?,?)
        """, (project_id, fid, channel, job_id, reason, int(http_status or 0),
              (message or "")[:1000], json.dumps(detail or {}, ensure_ascii=False), now))
    return fid

# ---- mapping upserts ----
def upsert_coupang_map(self, project_id: str, *, sku: str, seller_product_id: str, vendor_item_id: str, status: str) -> None:
    now=_now_iso()
    with self._conn() as conn:
        conn.execute("""
          INSERT OR REPLACE INTO coupang_listing_map_v337
          (project_id, sku, seller_product_id, vendor_item_id, status, updated_ts)
          VALUES(?,?,?,?,?,?)
        """, (project_id, sku, seller_product_id, vendor_item_id, status, now))

def upsert_smartstore_option_map(self, project_id: str, *, sku: str, origin_product_no: str,
                                option_no: str, option_key: str) -> None:
    now=_now_iso()
    with self._conn() as conn:
        conn.execute("""
          INSERT OR REPLACE INTO smartstore_option_map_v337
          (project_id, sku, origin_product_no, option_no, option_key, updated_ts)
          VALUES(?,?,?,?,?,?)
        """, (project_id, sku, origin_product_no, option_no, option_key, now))

def get_smartstore_option_map(self, project_id: str, *, sku: str) -> List[Dict[str,Any]]:
    with self._conn() as conn:
        rows = conn.execute("""
          SELECT * FROM smartstore_option_map_v337
          WHERE project_id=? AND sku=?
          ORDER BY option_key ASC
        """, (project_id, sku)).fetchall()
    return [dict(r) for r in rows]

def get_coupang_vendor_items(self, project_id: str, *, sku: str) -> List[Dict[str,Any]]:
    with self._conn() as conn:
        rows = conn.execute("""
          SELECT * FROM coupang_listing_map_v337
          WHERE project_id=? AND sku=?
          ORDER BY updated_ts DESC
        """, (project_id, sku)).fetchall()
    return [dict(r) for r in rows]

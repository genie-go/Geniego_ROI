#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V331 Queue worker
- SmartStore backfill / incremental recovery via a small reprocess queue
- Runs inside the web server process (single-node demo), but can also be called from cron via /api/queue/run

Design goals:
- Deterministic, restart-safe (queue persisted in SQLite)
- Small-scale retry (attempts + requeue)
"""
from __future__ import annotations
import json, os, pathlib, time, datetime
from typing import Any, Dict, List, Optional, Tuple

from scripts.v331.ops_store import OpsStore
from scripts.v331.connectors_smartstore import SmartStoreClient, iso_utc, parse_any_dt
from scripts.v331 import notifier

def _now_iso() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

def _add_seconds(iso_ts: str, sec: int) -> str:
    dt = datetime.datetime.fromisoformat(iso_ts.replace("Z","+00:00"))
    dt2 = dt + datetime.timedelta(seconds=sec)
    return dt2.replace(microsecond=0).isoformat().replace("+00:00","Z")

class QueueWorker:
    def __init__(self, workspace: pathlib.Path, store: OpsStore):
        self.workspace = workspace
        self.store = store

    def _project_dir(self, project_id: str) -> pathlib.Path:
        p = self.workspace/"projects"/project_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def _smartstore_client(self, project_id: str) -> SmartStoreClient:
        # Prefer env vars (simple operational baseline). If you want per-project secrets,
        # extend OpsStore config_kv with encryption.
        cid = os.getenv("SMARTSTORE_CLIENT_ID","").strip()
        csec = os.getenv("SMARTSTORE_CLIENT_SECRET","").strip()
        acc = os.getenv("SMARTSTORE_ACCOUNT_ID","").strip()
        if not (cid and csec and acc):
            raise RuntimeError("SmartStore credentials missing (set SMARTSTORE_CLIENT_ID/SMARTSTORE_CLIENT_SECRET/SMARTSTORE_ACCOUNT_ID)")
        return SmartStoreClient(client_id=cid, client_secret=csec, account_id=acc, store=self.store, project_id=project_id)

    # -------- scheduling helpers --------
    def enqueue_smartstore_backfill(self, project_id: str, body: Dict[str,Any]) -> int:
        """
        body:
          - from: ISO or YYYY-MM-DD
          - to: ISO or YYYY-MM-DD
          - mode: "orders"|"products"|"both"
        Note: order API time window is constrained; this function slices into <=24h windows.
        """
        mode = (body.get("mode") or "both").lower()
        dt_from = parse_any_dt(body.get("from")) or (datetime.datetime.utcnow() - datetime.timedelta(days=7))
        dt_to = parse_any_dt(body.get("to")) or datetime.datetime.utcnow()
        # normalize
        if dt_from > dt_to:
            dt_from, dt_to = dt_to, dt_from

        job_id = self.store.enqueue(project_id, "backfill_root", {"mode": mode, "from": iso_utc(dt_from), "to": iso_utc(dt_to)})
        # slice orders into 24h windows (safe default)
        if mode in ("orders","both"):
            cur = dt_from
            while cur < dt_to:
                nxt = min(cur + datetime.timedelta(hours=24), dt_to)
                self.store.enqueue(project_id, "smartstore_orders", {"from": iso_utc(cur), "to": iso_utc(nxt)})
                cur = nxt

        if mode in ("products","both"):
            # products are paged search; we queue a "products_full_sync" item which will paginate.
            self.store.enqueue(project_id, "smartstore_products_fullsync", {"max_pages": int(body.get("max_pages", 200))})
        return job_id

    # -------- runner --------
    def run(self, project_id: str, *, max_items: int=20) -> Dict[str,Any]:
        done=0; failed=0; requeued=0
        items = self.store.claim_queue_items(project_id, max_items=max_items)
        results=[]
        for it in items:
            try:
                kind = it["kind"]
                payload = it["payload"]
                if kind == "smartstore_orders":
                    out = self._run_smartstore_orders(project_id, payload)
                elif kind == "smartstore_products_fullsync":
                    out = self._run_smartstore_products_fullsync(project_id, payload)
                else:
                    out = {"skipped": True, "kind": kind}
                self.store.finish_queue_item(int(it["id"]), "done")
                done += 1
                results.append({"id": it["id"], "kind": kind, "ok": True, "out": out})
            except Exception as e:
                err = str(e)
                # simple retry: up to 3 attempts, then fail.
                attempts = int(it.get("attempts",0))
                if attempts < 3:
                    self.store.finish_queue_item(int(it["id"]), "queued", error=err)
                    requeued += 1
                else:
                    self.store.finish_queue_item(int(it["id"]), "failed", error=err)
                    failed += 1
                self.store.log_event("ERROR","job","QUEUE_ITEM_FAIL", f"{it.get('kind')} failed: {err}", {"item": it})
                results.append({"id": it["id"], "kind": it.get("kind"), "ok": False, "error": err})
        return {"done": done, "failed": failed, "requeued": requeued, "results": results}

    # -------- implementations --------
    def _run_smartstore_orders(self, project_id: str, payload: Dict[str,Any]) -> Dict[str,Any]:
        cli = self._smartstore_client(project_id)
        dt_from = parse_any_dt(payload.get("from"))
        dt_to = parse_any_dt(payload.get("to"))
        if not (dt_from and dt_to):
            raise ValueError("payload missing from/to")
        rows = cli.fetch_orders_conditional(dt_from, dt_to)
        out_dir = self._project_dir(project_id)/"data"
        out_dir.mkdir(parents=True, exist_ok=True)
        fn = out_dir/f"smartstore_orders_{dt_from.strftime('%Y%m%dT%H%M%S')}_{dt_to.strftime('%Y%m%dT%H%M%S')}.jsonl"
        with fn.open("w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False)+"\n")
        # watermark advance
        st = self.store.get_connector_state(project_id, "smartstore") or {}
        wm = st.get("watermark_json") or {}
        wm["orders_last_to"] = iso_utc(dt_to)
        self.store.upsert_connector_state(project_id, "smartstore",
                                         token=(st.get("token_json") or {}),
                                         perms=(st.get("perms_json") or {}),
                                         ratelimit=(st.get("ratelimit_json") or {}),
                                         watermark=wm,
                                         ok=True, err_code="", err_msg="")
        return {"saved": fn.name, "rows": len(rows)}

    def _run_smartstore_products_fullsync(self, project_id: str, payload: Dict[str,Any]) -> Dict[str,Any]:
        cli = self._smartstore_client(project_id)
        max_pages = int(payload.get("max_pages", 200))
        out_dir = self._project_dir(project_id)/"data"
        out_dir.mkdir(parents=True, exist_ok=True)
        fn = out_dir/f"smartstore_products_{_now_iso().replace(':','').replace('-','')}.jsonl"
        total=0
        with fn.open("w", encoding="utf-8") as f:
            page=1
            while page <= max_pages:
                items, has_next = cli.search_products_page(page=page, size=100)
                if not items:
                    break
                for p in items:
                    f.write(json.dumps(p, ensure_ascii=False)+"\n")
                total += len(items)
                if not has_next:
                    break
                page += 1
        # watermark
        st = self.store.get_connector_state(project_id, "smartstore") or {}
        wm = st.get("watermark_json") or {}
        wm["products_fullsync_last_ts"] = _now_iso()
        self.store.upsert_connector_state(project_id, "smartstore",
                                         token=(st.get("token_json") or {}),
                                         perms=(st.get("perms_json") or {}),
                                         ratelimit=(st.get("ratelimit_json") or {}),
                                         watermark=wm,
                                         ok=True, err_code="", err_msg="")
        return {"saved": fn.name, "rows": total}

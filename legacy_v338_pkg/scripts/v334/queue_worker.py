#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V334 Queue worker
- SmartStore backfill / incremental recovery via a small reprocess queue
- Runs inside the web server process (single-node demo), but can also be called from cron via /api/queue/run

Design goals:
- Deterministic, restart-safe (queue persisted in SQLite)
- Small-scale retry (attempts + requeue)
"""
from __future__ import annotations
import json, os, pathlib, time, datetime
from typing import Any, Dict, List, Optional, Tuple

from scripts.v334.ops_store import OpsStore
from scripts.v334.connectors_smartstore import SmartStoreClient, iso_utc, parse_any_dt
from scripts.v334 import notifier

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
    def enqueue_smartstore_backfill(self, project_id: str, body: Dict[str,Any]) -> Dict[str,Any]:
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
        if dt_from > dt_to:
            dt_from, dt_to = dt_to, dt_from

        # V334: track a backfill job for reporting
        backfill_job_id = self.store.create_backfill_job(project_id, "smartstore_backfill", iso_utc(dt_from), iso_utc(dt_to),
                                                        summary={"mode": mode, "source": body.get("source") or "manual"})

        queue_root_id = self.store.enqueue(project_id, "backfill_root", {"mode": mode, "from": iso_utc(dt_from), "to": iso_utc(dt_to), "backfill_job_id": backfill_job_id})

        if mode in ("orders","both"):
            cur = dt_from
            while cur < dt_to:
                nxt = min(cur + datetime.timedelta(hours=24), dt_to)
                self.store.enqueue(project_id, "smartstore_orders", {"from": iso_utc(cur), "to": iso_utc(nxt), "backfill_job_id": backfill_job_id})
                cur = nxt

        if mode in ("products","both"):
            self.store.enqueue(project_id, "smartstore_products_fullsync", {"max_pages": int(body.get("max_pages", 200)), "backfill_job_id": backfill_job_id})

        return {"queue_root_id": queue_root_id, "backfill_job_id": backfill_job_id, "mode": mode, "from": iso_utc(dt_from), "to": iso_utc(dt_to)}

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
                self.store.log_event("ERROR","job","QUEUE_ITEM_FAIL", f"{it.get('kind')} failed: {err}", {"project_id": project_id, "item": it})
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


    # -------- SmartStore lastChangedDate 기반 누락 스캐너 (V334) --------
    def smartstore_missing_scan(self, project_id: str, *, drop_ratio: float=0.5, min_baseline: int=10) -> Dict[str,Any]:
        """Compare yesterday's LAST_CHANGED_DATETIME order count vs previous day and previous week.
        Returns a dict with counts and breach boolean.
        """
        import datetime
        try:
            from zoneinfo import ZoneInfo
            kst = ZoneInfo("Asia/Seoul")
        except Exception:
            kst = datetime.timezone(datetime.timedelta(hours=9))

        def kst_day_window(days_ago: int) -> tuple[datetime.datetime, datetime.datetime, str]:
            now_kst = datetime.datetime.now(tz=kst)
            day = (now_kst.date() - datetime.timedelta(days=days_ago))
            start_kst = datetime.datetime.combine(day, datetime.time(0,0,0), tzinfo=kst)
            end_kst = start_kst + datetime.timedelta(days=1)
            # convert to UTC for API
            start_utc = start_kst.astimezone(datetime.timezone.utc)
            end_utc = end_kst.astimezone(datetime.timezone.utc)
            return start_utc, end_utc, day.isoformat()

        cli = self._smartstore_client(project_id)

        y_from, y_to, y_day = kst_day_window(1)
        d_from, d_to, d_day = kst_day_window(2)
        w_from, w_to, w_day = kst_day_window(8)  # same weekday previous week

        y_orders = cli.fetch_orders_conditional(y_from, y_to, range_type="LAST_CHANGED_DATETIME")
        d_orders = cli.fetch_orders_conditional(d_from, d_to, range_type="LAST_CHANGED_DATETIME")
        w_orders = cli.fetch_orders_conditional(w_from, w_to, range_type="LAST_CHANGED_DATETIME")

        y = len(y_orders); d = len(d_orders); w = len(w_orders)
        baseline = max(d, w)
        breach = (baseline >= min_baseline) and (y < baseline * drop_ratio)

        out = {
            "project_id": project_id,
            "yesterday": {"date": y_day, "count": y},
            "prev_day": {"date": d_day, "count": d},
            "prev_week": {"date": w_day, "count": w},
            "baseline": baseline,
            "drop_ratio": drop_ratio,
            "min_baseline": min_baseline,
            "breach": breach,
        }
        if breach:
            # V334: auto backfill enqueue + quick run (bounded) + report attached to same Slack thread
            self.store.log_event("WARN","connector","SMARTSTORE_DROP","SmartStore order volume drop detected", {"project_id": project_id, **out})
            # enqueue yesterday window backfill (orders only, safe default)
            bf = self.enqueue_smartstore_backfill(project_id, {"from": y_from.isoformat(), "to": y_to.isoformat(), "mode": "orders", "source": "auto_missing_scan"})
            self.store.update_backfill_job(project_id, int(bf["backfill_job_id"]), status="RUNNING", summary={"scan": out, "queue_root_id": bf["queue_root_id"]})
            run_res = self.run(project_id, max_items=50)
            # if still requeued, leave RUNNING; else mark DONE/FAILED
            status = "DONE" if run_res.get("failed",0)==0 else "FAILED"
            if run_res.get("requeued",0) > 0:
                status = "RUNNING"
            summary = {"scan": out, "auto_backfill": bf, "run": run_res}
            self.store.update_backfill_job(project_id, int(bf["backfill_job_id"]), status=status, summary=summary)
            out2 = {**out, "auto_backfill": bf, "auto_backfill_run": run_res, "auto_backfill_status": status}
            notifier.notify("smartstore_missing_suspected", project_id=project_id,
                           title="SmartStore order missing suspected",
                           text=json.dumps(out2, ensure_ascii=False, indent=2),
                           extra=out2)
        else:
            self.store.log_event("INFO","connector","SMARTSTORE_DROP_CHECK","SmartStore drop check OK", {"project_id": project_id, **out})
        return out


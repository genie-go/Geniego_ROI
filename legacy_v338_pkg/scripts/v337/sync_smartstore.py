#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V337 SmartStore sync entrypoint
- Supports enqueueing jobs into sync_jobs_v337 (recommended)
- Supports batch apply with rate limit + retry/backoff via sync_worker

Usage:
  # enqueue sync tasks from product_master_v334
  python scripts/v337/sync_smartstore.py --workspace ./workspace --project myproj --enqueue

  # enqueue + immediately process once (local test)
  python scripts/v337/sync_smartstore.py --workspace ./workspace --project myproj --enqueue --run-once
"""
from __future__ import annotations
import argparse, json, os
from typing import Any, Dict, List

from .ops_store import OpsStore
from .sync_worker import run_once

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--enqueue", action="store_true", help="enqueue jobs instead of direct API calls")
    ap.add_argument("--run-once", action="store_true", help="after enqueue, process queue once")
    ap.add_argument("--limit", type=int, default=200)
    args = ap.parse_args()

    store = OpsStore(__import__("pathlib").Path(args.workspace))

    # pull items from product_master_v334 (minimal: attrs.smartstore_payload + listing meta)
    with store._conn() as conn:
        rows = conn.execute("""
          SELECT sku, title, attrs_json
          FROM product_master_v334
          WHERE project_id=?
          LIMIT ?
        """, (args.project, int(args.limit))).fetchall()

    enq=0
    for r in rows:
        sku = str(r["sku"] or "")
        try:
            attrs = json.loads(r["attrs_json"] or "{}")
        except Exception:
            attrs = {}
        payload = attrs.get("smartstore_payload")
        if not isinstance(payload, dict):
            continue
        # job 1: create product (optional; if already created, you can skip by putting originProductNo meta and only enqueue sync)
        store.enqueue_sync_job(args.project, channel="smartstore", job_type="CREATE_PRODUCT",
                              payload={"sku": sku, "product_payload": payload}, delay_seconds=0)
        enq += 1

        # optional: if originProductNo already known, enqueue option map refresh + stock/price sync
        meta = attrs.get("smartstore_meta") or {}
        origin_no = meta.get("originProductNo") or meta.get("origin_product_no")
        if origin_no:
            store.enqueue_sync_job(args.project, channel="smartstore", job_type="REFRESH_OPTION_MAP",
                                  payload={"sku": sku, "origin_product_no": origin_no}, delay_seconds=10)

            option_items = meta.get("option_items") or []
            if option_items:
                store.enqueue_sync_job(args.project, channel="smartstore", job_type="SYNC_STOCK_PRICE",
                                      payload={"sku": sku, "origin_product_no": origin_no, "option_items": option_items}, delay_seconds=20)

    print(f"[OK] enqueued smartstore jobs: {enq}")

    if args.run_once:
        n = run_once(store, args.project, limit=50)
        print(f"[OK] processed={n}")

if __name__ == "__main__":
    main()

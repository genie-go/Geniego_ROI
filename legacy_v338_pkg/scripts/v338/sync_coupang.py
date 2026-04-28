#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V337 Coupang sync entrypoint
- Enqueues create + approval polling + stock/price sync jobs

Usage:
  python scripts/v337/sync_coupang.py --workspace ./workspace --project myproj --enqueue
"""
from __future__ import annotations
import argparse, json
from typing import Any, Dict

from .ops_store import OpsStore
from .sync_worker import run_once

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--enqueue", action="store_true")
    ap.add_argument("--run-once", action="store_true")
    ap.add_argument("--limit", type=int, default=200)
    args = ap.parse_args()

    store = OpsStore(__import__("pathlib").Path(args.workspace))

    with store._conn() as conn:
        rows = conn.execute("""
          SELECT sku, attrs_json
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
        payload = attrs.get("coupang_payload")
        if not isinstance(payload, dict):
            continue
        store.enqueue_sync_job(args.project, channel="coupang", job_type="CREATE_PRODUCT",
                               payload={"sku": sku, "product_payload": payload}, delay_seconds=0)
        enq += 1

        # if vendorItemId already known, enqueue price/qty sync
        meta = attrs.get("coupang_meta") or {}
        vid = meta.get("vendorItemId")
        if vid:
            store.enqueue_sync_job(args.project, channel="coupang", job_type="SYNC_STOCK_PRICE",
                                   payload={"sku": sku, "vendor_item_id": str(vid),
                                            "price": meta.get("price"), "quantity": meta.get("quantity")}, delay_seconds=30)

    print(f"[OK] enqueued coupang jobs: {enq}")

    if args.run_once:
        n = run_once(store, args.project, limit=50)
        print(f"[OK] processed={n}")

if __name__ == "__main__":
    main()

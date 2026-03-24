#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V337: Channel sync worker (job queue + rate limit + retry/backoff)

Jobs are stored in sync_jobs_v337 (SQLite).
Supported channels:
- smartstore: CREATE_PRODUCT, SYNC_STOCK_PRICE, REFRESH_OPTION_MAP
- coupang: CREATE_PRODUCT, SYNC_STOCK_PRICE, POLL_APPROVAL

This worker is intentionally simple (single-process, batch loop).
Run via cron/systemd:
  python scripts/v337/sync_worker.py --workspace ./workspace --project myproj --once
  python scripts/v337/sync_worker.py --workspace ./workspace --project myproj
"""
from __future__ import annotations
import argparse, json, os, time
from typing import Any, Dict, List

from .ops_store import OpsStore
from .net_v337 import classify_failure, RateLimiter
from .connectors_smartstore import SmartStoreClient, create_product_v2, update_option_stock, get_origin_product_detail, extract_option_map
from .connectors_coupang import CoupangConnector

def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()

def build_smartstore_client(store: OpsStore, project_id: str) -> SmartStoreClient:
    cid = _env("NAVER_CLIENT_ID")
    secret = _env("NAVER_CLIENT_SECRET")
    account = _env("NAVER_ACCOUNT_ID") or _env("NAVER_SELLER_ACCOUNT_ID")
    if not (cid and secret and account):
        raise RuntimeError("SmartStore env missing: NAVER_CLIENT_ID/NAVER_CLIENT_SECRET/NAVER_ACCOUNT_ID")
    return SmartStoreClient(client_id=cid, client_secret=secret, account_id=account, store=store, project_id=project_id)

def build_coupang_connector() -> CoupangConnector:
    ak = _env("COUPANG_ACCESS_KEY")
    sk = _env("COUPANG_SECRET_KEY")
    vid = _env("COUPANG_VENDOR_ID")
    if not (ak and sk and vid):
        raise RuntimeError("Coupang env missing: COUPANG_ACCESS_KEY/COUPANG_SECRET_KEY/COUPANG_VENDOR_ID")
    # default rate limit conservative
    return CoupangConnector(ak, sk, vid, rate_per_sec=float(_env("COUPANG_RPS","4.0") or 4.0), burst=int(_env("COUPANG_BURST","8") or 8))

def job_backoff_seconds(attempts: int, base: int = 30, cap: int = 1800) -> int:
    # exponential backoff with cap
    s = min(cap, int(base * (2 ** max(0, attempts))))
    return max(base, s)

def handle_smartstore(store: OpsStore, project_id: str, job: Dict[str,Any]) -> None:
    client = build_smartstore_client(store, project_id)
    access = client._get_access_token()
    # simple rate limit bucket: 5 rps burst 10
    rl = RateLimiter().bucket("smartstore", float(_env("SMARTSTORE_RPS","5.0") or 5.0), int(_env("SMARTSTORE_BURST","10") or 10))
    payload = job.get("payload") or {}
    jt = job.get("job_type")

    if jt == "CREATE_PRODUCT":
        st, obj, raw = create_product_v2(access, payload.get("product_payload") or {}, rate_bucket=rl)
        if st == 200 or st == 201:
            # store originProductNo/channelProductNo if present
            data = obj.get("data") if isinstance(obj, dict) else None
            d = data if isinstance(data, dict) else obj
            origin_no = d.get("originProductNo") or d.get("origin_product_no")
            channel_no = d.get("channelProductNo") or d.get("channel_product_no")
            sku = str(payload.get("sku",""))
            if sku and origin_no:
                store.upsert_smartstore_option_map(project_id, sku=sku, origin_product_no=str(origin_no),
                                                   option_no="__BASE__", option_key="base")
            return

        reason = classify_failure(st, raw)
        store.record_sync_failure(project_id, job_id=job["job_id"], channel="smartstore", reason=reason, http_status=st,
                                  message=f"create_product failed", detail={"response": obj})
        raise RuntimeError(f"smartstore create_product failed status={st}")

    if jt == "REFRESH_OPTION_MAP":
        origin_no = int(payload.get("origin_product_no") or 0)
        sku = str(payload.get("sku",""))
        st, obj, raw = get_origin_product_detail(access, origin_no, rate_bucket=rl)
        if st == 200:
            opt = extract_option_map(obj if isinstance(obj, dict) else {})
            for it in opt:
                store.upsert_smartstore_option_map(project_id, sku=sku, origin_product_no=str(origin_no),
                                                   option_no=str(it.get("optionNo")), option_key=str(it.get("optionKey")))
            return
        reason = classify_failure(st, raw)
        store.record_sync_failure(project_id, job_id=job["job_id"], channel="smartstore", reason=reason, http_status=st,
                                  message="refresh_option_map failed", detail={"origin_product_no": origin_no, "response": obj})
        raise RuntimeError(f"smartstore refresh_option_map failed status={st}")

    if jt == "SYNC_STOCK_PRICE":
        origin_no = int(payload.get("origin_product_no") or 0)
        option_items = payload.get("option_items") or []
        st, obj, raw = update_option_stock(access, origin_no, option_items, rate_bucket=rl)
        if st == 200:
            return
        reason = classify_failure(st, raw)
        store.record_sync_failure(project_id, job_id=job["job_id"], channel="smartstore", reason=reason, http_status=st,
                                  message="sync_stock_price failed", detail={"origin_product_no": origin_no, "response": obj})
        raise RuntimeError(f"smartstore sync_stock_price failed status={st}")

    raise RuntimeError(f"unknown smartstore job_type={jt}")

def handle_coupang(store: OpsStore, project_id: str, job: Dict[str,Any]) -> None:
    cp = build_coupang_connector()
    payload = job.get("payload") or {}
    jt = job.get("job_type")

    if jt == "CREATE_PRODUCT":
        st, obj = cp.create_product(payload.get("product_payload") or {})
        if st in (200,201):
            sku = str(payload.get("sku",""))
            # sellerProductId commonly returned in data
            data = obj.get("data") if isinstance(obj, dict) else None
            d = data if isinstance(data, dict) else obj
            seller_pid = d.get("sellerProductId") or d.get("seller_product_id")
            if sku and seller_pid:
                # enqueue polling loop
                store.enqueue_sync_job(project_id, channel="coupang", job_type="POLL_APPROVAL",
                                       payload={"sku": sku, "seller_product_id": str(seller_pid)}, delay_seconds=60)
            return

        reason = classify_failure(st, json.dumps(obj, ensure_ascii=False)[:2000])
        store.record_sync_failure(project_id, job_id=job["job_id"], channel="coupang", reason=reason, http_status=st,
                                  message="create_product failed", detail={"response": obj})
        raise RuntimeError(f"coupang create_product failed status={st}")

    if jt == "POLL_APPROVAL":
        sku = str(payload.get("sku",""))
        seller_pid = str(payload.get("seller_product_id",""))
        st, obj = cp.get_seller_product(seller_pid)
        if st == 200:
            status = cp.extract_status(obj)
            vids = cp.extract_vendor_item_ids(obj)
            if vids:
                for vid in vids:
                    store.upsert_coupang_map(project_id, sku=sku, seller_product_id=seller_pid, vendor_item_id=vid, status=status or "OK")
                return
            # no vendorItemId yet -> approval pending
            store.record_sync_failure(project_id, job_id=job["job_id"], channel="coupang", reason="APPROVAL_PENDING",
                                      http_status=200, message="vendorItemId not ready (approval pending)", detail={"status": status, "seller_product_id": seller_pid})
            raise RuntimeError("approval pending")

        reason = classify_failure(st, json.dumps(obj, ensure_ascii=False)[:2000])
        store.record_sync_failure(project_id, job_id=job["job_id"], channel="coupang", reason=reason, http_status=st,
                                  message="poll_approval failed", detail={"seller_product_id": seller_pid, "response": obj})
        raise RuntimeError(f"coupang poll_approval failed status={st}")

    if jt == "SYNC_STOCK_PRICE":
        vendor_item_id = int(payload.get("vendor_item_id") or 0)
        price = payload.get("price")
        qty = payload.get("quantity")
        if price is not None:
            st, obj = cp.update_vendor_item_price(vendor_item_id, int(price))
            if st not in (200,201):
                reason = classify_failure(st, json.dumps(obj, ensure_ascii=False)[:2000])
                store.record_sync_failure(project_id, job_id=job["job_id"], channel="coupang", reason=reason, http_status=st,
                                          message="update_price failed", detail={"vendor_item_id": vendor_item_id, "response": obj})
                raise RuntimeError(f"coupang update_price failed status={st}")
        if qty is not None:
            st, obj = cp.update_vendor_item_quantity(vendor_item_id, int(qty))
            if st not in (200,201):
                reason = classify_failure(st, json.dumps(obj, ensure_ascii=False)[:2000])
                store.record_sync_failure(project_id, job_id=job["job_id"], channel="coupang", reason=reason, http_status=st,
                                          message="update_quantity failed", detail={"vendor_item_id": vendor_item_id, "response": obj})
                raise RuntimeError(f"coupang update_quantity failed status={st}")
        return

    raise RuntimeError(f"unknown coupang job_type={jt}")

def run_once(store: OpsStore, project_id: str, limit: int) -> int:
    jobs = store.fetch_due_sync_jobs(project_id, limit=limit)
    if not jobs:
        return 0
    processed = 0
    for job in jobs:
        jid = job["job_id"]
        store.mark_sync_job_running(project_id, jid)
        try:
            if job["channel"] == "smartstore":
                handle_smartstore(store, project_id, job)
            elif job["channel"] == "coupang":
                handle_coupang(store, project_id, job)
            else:
                raise RuntimeError(f"unknown channel={job['channel']}")
            store.finish_sync_job(project_id, jid, ok=True)
        except Exception as e:
            attempts = int(job.get("attempts") or 0) + 1
            wait = job_backoff_seconds(attempts)
            store.finish_sync_job(project_id, jid, ok=False, error=str(e), retry_after_seconds=wait)
        processed += 1
    return processed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--sleep", type=int, default=10)
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()

    store = OpsStore(__import__("pathlib").Path(args.workspace))
    if args.once:
        n = run_once(store, args.project, args.limit)
        print(f"[OK] processed={n}")
        return

    while True:
        n = run_once(store, args.project, args.limit)
        if n == 0:
            time.sleep(max(2, args.sleep))
        else:
            time.sleep(1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V336 Coupang 실제 업로드(상품 등록 + 재고/가격 동기화)

- 상품 생성: POST /v2/providers/seller_api/apis/api/v1/marketplace/seller-products
- 옵션(vendorItemId) 단위 가격 변경
- 옵션(vendorItemId) 단위 재고 변경

준비물(환경변수):
- COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY / COUPANG_VENDOR_ID

NOTE:
- 상품 생성 payload는 쿠팡 요구사항이 많아, V336은 product_master_v334.attrs.coupang_payload를 우선 사용합니다.
- 가격/재고 동기화는 listing meta.vendorItemIds(옵션별 vendorItemId 배열)가 있어야 합니다.
  (최초 상품 승인 후 발급되는 경우가 많으므로, 운영 프로세스상 1) 생성 2) 승인 3) vendorItemId 수집 단계를 거칩니다.)
"""
from __future__ import annotations
import argparse, json, os, sys
from typing import Any, Dict, List

from scripts.v336.ops_store import OpsStore
from scripts.v336.connectors_coupang import CoupangConnector

def _now_iso() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()

def _conn() -> CoupangConnector:
    ak = os.environ.get("COUPANG_ACCESS_KEY","").strip()
    sk = os.environ.get("COUPANG_SECRET_KEY","").strip()
    vid = os.environ.get("COUPANG_VENDOR_ID","").strip()
    if not (ak and sk and vid):
        raise SystemExit("Need COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID")
    return CoupangConnector(ak, sk, vid)

def _build_create_payload(p: Dict[str,Any]) -> Dict[str,Any]:
    attrs = p.get("attrs") or {}
    payload = attrs.get("coupang_payload")
    if not payload:
        raise ValueError(f"SKU {p.get('sku')} missing attrs.coupang_payload (required for product create)")
    return payload

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--mode", choices=["dry-run","apply"], default="dry-run")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    store = OpsStore(args.workspace)
    cp = _conn()

    products = store.list_product_master_v334(args.project)
    if args.limit and args.limit > 0:
        products = products[:args.limit]

    ok=0; failed=0
    for p in products:
        sku = p["sku"]
        meta = store.get_channel_listing_meta(args.project, "coupang", sku)
        vendor_item_ids = meta.get("vendorItemIds") or meta.get("vendor_item_ids") or []
        try:
            if not vendor_item_ids:
                payload = _build_create_payload(p)
                if args.mode == "dry-run":
                    print(f"[DRY] create coupang product sku={sku} title={p.get('title')}")
                    status=0; resp={"dry_run":True}
                else:
                    status, resp = cp.create_product(payload)
                if args.mode == "apply" and status in (200, 201):
                    new_meta = dict(meta)
                    new_meta["create_response"] = resp
                    store.upsert_channel_listing(args.project, {
                        "channel":"coupang",
                        "channel_sku": sku,
                        "sku": sku,
                        "listing_status":"active",
                        "last_sync_ts": _now_iso(),
                        "last_error":"",
                        "meta": new_meta
                    })
                ok += 1
            else:
                price = int(round(float(p.get("price",0))))
                qty = int(p.get("stock",0))
                if args.mode == "dry-run":
                    print(f"[DRY] sync coupang vendorItemIds={vendor_item_ids} sku={sku} price={price} qty={qty}")
                    status=0; resp={"dry_run":True}
                else:
                    # update each vendor item
                    r_all=[]
                    for vid in vendor_item_ids:
                        s1, r1 = cp.update_vendor_item_price(int(vid), price, force=True)
                        s2, r2 = cp.update_vendor_item_quantity(int(vid), qty)
                        r_all.append({"vendorItemId": vid, "price": {"status": s1, "resp": r1}, "qty": {"status": s2, "resp": r2}})
                    status=200
                    resp={"results": r_all}
                if args.mode == "apply":
                    new_meta = dict(meta)
                    new_meta["last_sync_response"] = resp
                    store.upsert_channel_listing(args.project, {
                        "channel":"coupang",
                        "channel_sku": sku,
                        "sku": sku,
                        "listing_status":"active",
                        "last_sync_ts": _now_iso(),
                        "last_error":"",
                        "meta": new_meta
                    })
                ok += 1
        except Exception as e:
            failed += 1
            err = f"{type(e).__name__}: {e}"
            print(f"[ERR] coupang sku={sku} {err}", file=sys.stderr)
            if args.mode == "apply":
                store.upsert_channel_listing(args.project, {
                    "channel":"coupang",
                    "channel_sku": sku,
                    "sku": sku,
                    "listing_status":"error",
                    "last_sync_ts": _now_iso(),
                    "last_error": err,
                    "meta": meta
                })

    print(json.dumps({"ok": ok, "failed": failed, "mode": args.mode}, ensure_ascii=False))

if __name__ == "__main__":
    main()

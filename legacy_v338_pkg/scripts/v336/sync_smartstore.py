#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V336 SmartStore 실제 업로드(상품 등록 + 재고/가격 동기화)

- 상품 등록: POST /v2/products
- 옵션 재고/가격/할인가: PUT /v1/products/origin-products/{originProductNo}/option-stock

준비물(환경변수):
- NAVER_CLIENT_ID / NAVER_CLIENT_SECRET  (token 발급) 또는
- NAVER_ACCESS_TOKEN  (이미 발급된 access token을 직접 주입)

NOTE:
- 상품 등록 payload는 채널 요구사항이 많아, V336은 기본적으로 product_master_v334.attrs.smartstore_payload를 우선 사용합니다.
  (피드 룰 엔진/템플릿으로 생성한 payload를 여기에 넣는 방식)
"""
from __future__ import annotations
import argparse, json, os, sys, time
from typing import Any, Dict, List

from scripts.v336.ops_store import OpsStore
from scripts.v336.connectors_smartstore import get_access_token, create_product_v2, update_option_stock

def _now_iso() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()

def _ensure_token() -> str:
    tok = os.environ.get("NAVER_ACCESS_TOKEN","").strip()
    if tok:
        return tok
    cid = os.environ.get("NAVER_CLIENT_ID","").strip()
    sec = os.environ.get("NAVER_CLIENT_SECRET","").strip()
    if not (cid and sec):
        raise SystemExit("Need NAVER_ACCESS_TOKEN or (NAVER_CLIENT_ID & NAVER_CLIENT_SECRET)")
    tok, _ = get_access_token(cid, sec)
    return tok

def _build_create_payload(p: Dict[str,Any]) -> Dict[str,Any]:
    attrs = p.get("attrs") or {}
    payload = attrs.get("smartstore_payload")
    if not payload:
        raise ValueError(f"SKU {p.get('sku')} missing attrs.smartstore_payload (required for product create)")
    return payload

def _build_option_stock_payload(p: Dict[str,Any], meta: Dict[str,Any]) -> List[Dict[str,Any]]:
    # 최소: 옵션 없는 단일상품이면 optionNo를 meta에 넣거나, payload 생성 시 포함
    attrs = p.get("attrs") or {}
    opt = attrs.get("smartstore_option_stock")
    if opt:
        # allow template to fully define optionStocks list
        return opt
    option_no = meta.get("optionNo") or meta.get("option_no")
    if not option_no:
        raise ValueError(f"SKU {p.get('sku')} missing optionNo for option-stock update (set listing meta.optionNo or attrs.smartstore_option_stock)")
    return [{
        "optionNo": int(option_no),
        "stockQuantity": int(p.get("stock",0)),
        "price": int(round(float(p.get('price',0)))),
        "salePrice": int(round(float(p.get('sale_price',0)))),
    }]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--mode", choices=["dry-run","apply"], default="dry-run")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    store = OpsStore(args.workspace)
    token = _ensure_token()

    products = store.list_product_master_v334(args.project)
    if args.limit and args.limit > 0:
        products = products[:args.limit]

    ok=0; failed=0
    for p in products:
        sku = p["sku"]
        meta = store.get_channel_listing_meta(args.project, "smartstore", sku)
        origin = meta.get("originProductNo") or meta.get("origin_product_no")
        try:
            if not origin:
                payload = _build_create_payload(p)
                if args.mode == "dry-run":
                    print(f"[DRY] create smartstore product sku={sku} title={p.get('title')}")
                    resp = {"dry_run": True}
                    status = 0
                else:
                    status, resp = create_product_v2(token, payload)
                if args.mode == "apply" and status == 200:
                    # 응답 구조는 API 버전에 따라 다를 수 있어 raw를 저장
                    new_meta = dict(meta)
                    new_meta["create_response"] = resp
                    # 흔히 originProductNo가 응답에 포함될 수 있음 → 존재하면 추출
                    if isinstance(resp, dict):
                        for k in ["originProductNo","origin_product_no","originProductNoList"]:
                            if k in resp:
                                new_meta["originProductNo"] = resp.get(k)
                    store.upsert_channel_listing(args.project, {
                        "channel":"smartstore",
                        "channel_sku": sku,
                        "sku": sku,
                        "listing_status":"active",
                        "last_sync_ts": _now_iso(),
                        "last_error": "",
                        "meta": new_meta
                    })
                ok += 1
            else:
                option_stocks = _build_option_stock_payload(p, meta)
                if args.mode == "dry-run":
                    print(f"[DRY] sync smartstore option-stock sku={sku} originProductNo={origin} stock={p.get('stock')} price={p.get('price')} sale={p.get('sale_price')}")
                    status=0; resp={"dry_run":True}
                else:
                    status, resp = update_option_stock(token, int(origin), option_stocks)
                if args.mode == "apply" and status == 200:
                    new_meta = dict(meta)
                    new_meta["last_option_stock_response"] = resp
                    store.upsert_channel_listing(args.project, {
                        "channel":"smartstore",
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
            print(f"[ERR] smartstore sku={sku} {err}", file=sys.stderr)
            if args.mode == "apply":
                store.upsert_channel_listing(args.project, {
                    "channel":"smartstore",
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

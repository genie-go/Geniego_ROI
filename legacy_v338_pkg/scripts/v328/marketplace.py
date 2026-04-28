#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V325 Marketplace (Open Market) integration scaffold

This module provides:
- Product catalog storage (project-local JSON) for basic "single source of truth"
- Channel feed exporters (CSV) for multiple marketplaces
- Publishing workflow via job queue (actual API calls are channel-specific and usually require SDKs)

Supported (export templates included):
- Naver SmartStore (CSV feed template)
- Coupang (CSV feed template)
- 11st / Gmarket / Auction (generic CSV template)
- Cafe24/Shopify-like store (generic)

For "정보수집":
- A simple "crawler input" interface (URL list) that can store collected fields.
  Real crawling/scraping is intentionally NOT included (legal/ToS sensitive).
  Instead, this accepts data that your approved crawler/ETL produces.

Project files:
  projects/<project_id>/data/products.json
  projects/<project_id>/out/feeds/<channel>/products_<date>.csv
"""
from __future__ import annotations
import csv, json, pathlib
from datetime import datetime
from typing import Any, Dict, List, Optional

def products_path(project_root: pathlib.Path) -> pathlib.Path:
    p = project_root/"data"
    p.mkdir(parents=True, exist_ok=True)
    return p/"products.json"

def load_products(project_root: pathlib.Path) -> Dict[str,Any]:
    p = products_path(project_root)
    if not p.exists():
        return {"version":1,"products":[], "sources":[]}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"version":1,"products":[], "sources":[]}

def save_products(project_root: pathlib.Path, meta: Dict[str,Any]):
    p = products_path(project_root)
    p.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

def upsert_product(project_root: pathlib.Path, product: Dict[str,Any]):
    meta = load_products(project_root)
    sku = (product.get("sku") or "").strip()
    if not sku:
        raise ValueError("sku required")
    products = meta.get("products") or []
    found=False
    for i,p in enumerate(products):
        if (p.get("sku") or "") == sku:
            products[i] = {**p, **product, "updated_at": datetime.utcnow().isoformat()+"Z"}
            found=True
            break
    if not found:
        product["created_at"] = datetime.utcnow().isoformat()+"Z"
        product["updated_at"] = datetime.utcnow().isoformat()+"Z"
        products.append(product)
    meta["products"]=products
    save_products(project_root, meta)

def add_info_source(project_root: pathlib.Path, source: Dict[str,Any]):
    meta = load_products(project_root)
    srcs = meta.get("sources") or []
    source["ts"] = datetime.utcnow().isoformat()+"Z"
    srcs.append(source)
    meta["sources"]=srcs
    save_products(project_root, meta)

# ---- Feed export templates ----

NAVER_COLUMNS = ["sku","name","price","stock","category","image_url","detail_url","brand","shipping_fee","status"]
COUPANG_COLUMNS = ["sku","name","price","stock","category","image_url","detail_url","brand","shipping_fee","status"]
GENERIC_COLUMNS = ["sku","name","price","stock","category","image_url","detail_url","brand","status"]

CHANNELS = {
    "naver_smartstore": NAVER_COLUMNS,
    "coupang": COUPANG_COLUMNS,
    "11st": GENERIC_COLUMNS,
    "gmarket": GENERIC_COLUMNS,
    "auction": GENERIC_COLUMNS,
    "shop": GENERIC_COLUMNS,
}

def export_feed_csv(project_root: pathlib.Path, channel: str, as_of_date: str|None=None) -> pathlib.Path:
    channel = channel.strip()
    cols = CHANNELS.get(channel)
    if not cols:
        raise ValueError("unknown channel")
    meta = load_products(project_root)
    products = meta.get("products") or []
    as_of_date = as_of_date or datetime.utcnow().date().isoformat()
    out_dir = project_root/"out"/"feeds"/channel
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir/f"products_{as_of_date}.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in products:
            row = {c: (p.get(c,"")) for c in cols}
            w.writerow(row)
    return out_path

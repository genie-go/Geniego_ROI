#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 Shopify CSV -> product_master_v334 / channel_listing_v334 자동 적재

입력 CSV: Shopify Admin에서 export한 products CSV를 가정.
주요 매핑(가능한 범위에서 자동):
- Variant SKU -> sku
- Title -> title
- Variant Price -> price
- Variant Inventory Qty -> stock
- Image Src -> images[0]
- Vendor -> brand
"""
from __future__ import annotations
import argparse, pathlib, csv, json
from typing import Dict, Any, List
from scripts.v335.ingest_common import open_db, new_job, finish_job, _now_iso

def _read_csv(p: pathlib.Path) -> List[Dict[str, str]]:
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        return [row for row in r]

def _first(*vals):
    for v in vals:
        if v is None: 
            continue
        s = str(v).strip()
        if s != "":
            return s
    return ""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", default="testclient")
    ap.add_argument("--csv", required=True)
    ap.add_argument("--channel", default="shopify")
    args = ap.parse_args()

    ws = pathlib.Path(args.workspace)
    conn = open_db(ws)
    job_id = new_job(conn, args.project, "shopify_csv", pathlib.Path(args.csv).name)

    rows = _read_csv(pathlib.Path(args.csv))
    ok = bad = 0

    for row in rows:
        try:
            sku = _first(row.get("Variant SKU"), row.get("SKU"), row.get("sku"))
            if not sku:
                bad += 1
                continue
            title = _first(row.get("Title"), row.get("title"))
            price = float(_first(row.get("Variant Price"), row.get("Price"), row.get("price")) or "0")
            stock = int(float(_first(row.get("Variant Inventory Qty"), row.get("Inventory"), row.get("stock")) or "0"))
            brand = _first(row.get("Vendor"), row.get("Brand"), row.get("brand"))
            img = _first(row.get("Image Src"), row.get("Image URL"), row.get("image"))
            images = [img] if img else []
            category_path = _first(row.get("Type"), row.get("Category"), "shopify")
            meta = {"raw": row, "source": "shopify_csv"}

            # upsert product_master_v334
            conn.execute("""
              INSERT INTO product_master_v334(project_id, sku, gtin, title, brand, category_path, currency, price, sale_price, stock, images_json, attrs_json, updated_ts)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(project_id, sku) DO UPDATE SET
                gtin=excluded.gtin,
                title=excluded.title,
                brand=excluded.brand,
                category_path=excluded.category_path,
                currency=excluded.currency,
                price=excluded.price,
                sale_price=excluded.sale_price,
                stock=excluded.stock,
                images_json=excluded.images_json,
                attrs_json=excluded.attrs_json,
                updated_ts=excluded.updated_ts
            """, (args.project, sku, "", title, brand, category_path, "KRW", price, 0.0, stock, json.dumps(images, ensure_ascii=False), json.dumps(meta, ensure_ascii=False), _now_iso()))

            
# upsert channel listing (shopify)
channel_sku = f"{sku}"
conn.execute("""
  INSERT INTO channel_listing_v334(project_id, channel, channel_sku, sku, listing_status, last_sync_ts, last_error, meta_json)
  VALUES(?,?,?,?,?,?,?,?)
  ON CONFLICT(project_id, channel, channel_sku) DO UPDATE SET
    sku=excluded.sku,
    listing_status=excluded.listing_status,
    last_sync_ts=excluded.last_sync_ts,
    last_error=excluded.last_error,
    meta_json=excluded.meta_json
""", (args.project, args.channel, channel_sku, sku, "active", _now_iso(), "", json.dumps(meta, ensure_ascii=False)))

            ok += 1
        except Exception:
            bad += 1

    conn.commit()
    finish_job(conn, job_id, "DONE" if bad == 0 else "DONE", len(rows), ok, bad, "")
    print(json.dumps({"job_id": job_id, "rows_total": len(rows), "rows_ok": ok, "rows_bad": bad}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 Meta Ads CSV -> marketing_spend_norm_v334 자동 적재

- Meta Ads Manager export CSV를 입력으로 받습니다.
- 컬럼명은 계정/언어에 따라 다를 수 있어 alias를 넉넉히 지원합니다.
- marketing_spend_norm_v334 스키마는 "ID 기반"이라,
  이름(campaign/adset/ad)은 meta_json에 보존하고, ID는 이름 기반 해시로 생성합니다.
"""
from __future__ import annotations
import argparse, pathlib, csv, json, hashlib
from typing import Dict, Any, List
from scripts.v335.ingest_common import open_db, new_job, finish_job, _now_iso

def _read_csv(p: pathlib.Path) -> List[Dict[str, str]]:
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        return [row for row in r]

def _first(row: Dict[str, str], keys: List[str]) -> str:
    for k in keys:
        if k in row and str(row[k]).strip() != "":
            return str(row[k]).strip()
    return ""

def _to_int(x: str) -> int:
    try: return int(float(str(x).replace(",","")))
    except: return 0

def _to_float(x: str) -> float:
    try: return float(str(x).replace(",",""))
    except: return 0.0

def _hid(s: str) -> str:
    return hashlib.sha1((s or "").encode("utf-8")).hexdigest()[:16]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", default="testclient")
    ap.add_argument("--csv", required=True)
    ap.add_argument("--currency", default="KRW")
    ap.add_argument("--account-id", default="meta_account")
    args = ap.parse_args()

    ws = pathlib.Path(args.workspace)
    conn = open_db(ws)
    job_id = new_job(conn, args.project, "meta_ads_csv", pathlib.Path(args.csv).name)

    rows = _read_csv(pathlib.Path(args.csv))
    ok = bad = 0

    for row in rows:
        try:
            day = _first(row, ["date", "day", "Date", "Day"])
            if not day:
                bad += 1
                continue

            campaign_name = _first(row, ["campaign_name","Campaign name","Campaign","campaign"])
            adset_name    = _first(row, ["adset_name","Ad set name","Ad set","adset","Adset"])
            ad_name       = _first(row, ["ad_name","Ad name","Ad","ad"])

            # If explicit IDs exist, use them; else generate stable hash IDs
            campaign_id = _first(row, ["campaign_id","Campaign ID","Campaign id"]) or f"cmp_{_hid(campaign_name)}"
            adgroup_id  = _first(row, ["adset_id","adgroup_id","Ad set ID","Adset ID","Ad set id"]) or f"asg_{_hid(adset_name)}"
            creative_id = _first(row, ["ad_id","creative_id","Ad ID","Ad id"]) or f"ad_{_hid(ad_name)}"

            spend = _to_float(_first(row, ["spend","Amount spent (KRW)","Amount spent","Spend","Cost"]))
            impressions = _to_int(_first(row, ["impressions","Impressions"]))
            clicks = _to_int(_first(row, ["clicks","Link clicks","Clicks"]))
            conversions = _to_int(_first(row, ["purchases","Purchases","Results","Conversions"]))
            revenue = _to_float(_first(row, ["purchase_value","Purchase conversion value","Revenue","revenue","Value","Conversion value"]))

            age_band = _first(row, ["age","Age","Age range","age_band"])
            gender   = _first(row, ["gender","Gender"])
            country  = _first(row, ["country","Country","Country/Region"]) or ""
            region   = _first(row, ["region","Region","DMA","State"]) or ""

            meta = {
                "source": "meta_ads_csv",
                "campaign_name": campaign_name,
                "adset_name": adset_name,
                "ad_name": ad_name,
                "raw": row
            }

            conn.execute("""
              INSERT INTO marketing_spend_norm_v334(
                project_id, platform, account_id, campaign_id, adgroup_id, creative_id, day,
                country, region, gender, age_band,
                impressions, clicks, spend, conversions, revenue, currency, meta_json, updated_ts
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(project_id, platform, account_id, campaign_id, adgroup_id, creative_id, day, country, region, gender, age_band)
              DO UPDATE SET
                impressions=excluded.impressions,
                clicks=excluded.clicks,
                spend=excluded.spend,
                conversions=excluded.conversions,
                revenue=excluded.revenue,
                currency=excluded.currency,
                meta_json=excluded.meta_json,
                updated_ts=excluded.updated_ts
            """, (args.project, "meta_ads", args.account_id, campaign_id, adgroup_id, creative_id, day,
                  country, region, gender, age_band,
                  impressions, clicks, spend, conversions, revenue, args.currency,
                  json.dumps(meta, ensure_ascii=False), _now_iso()))
            ok += 1
        except Exception:
            bad += 1

    conn.commit()
    finish_job(conn, job_id, "DONE", len(rows), ok, bad, "")
    print(json.dumps({"job_id": job_id, "rows_total": len(rows), "rows_ok": ok, "rows_bad": bad}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

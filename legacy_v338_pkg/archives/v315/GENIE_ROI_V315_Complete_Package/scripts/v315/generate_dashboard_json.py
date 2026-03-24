#!/usr/bin/env python3
"""SQLite -> 대시보드용 JSON 산출 (BI/웹 대시보드로 넘기기 좋게)

출력:
  out/dashboard_ads_kpi.json
  out/dashboard_influencer_kpi.json (인플루언서 모듈 사용 시)

"""
from __future__ import annotations
import argparse, json, sqlite3
from pathlib import Path
import pandas as pd

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--outdir", default="out")
    args=ap.parse_args()

    outdir=Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    conn=sqlite3.connect(args.db)

    ads=pd.read_sql_query("SELECT * FROM v315_ads_kpi_daily ORDER BY date, channel, campaign_id", conn)
    # 요약 KPI
    summary = {
      "spend": float(ads["spend"].sum()) if len(ads) else 0.0,
      "revenue": float(ads["revenue"].sum()) if len(ads) else 0.0,
      "conversions": int(ads["conversions"].sum()) if len(ads) else 0,
    }
    summary["roas"] = (summary["revenue"]/summary["spend"]) if summary["spend"] else 0.0
    summary["cpa"] = (summary["spend"]/summary["conversions"]) if summary["conversions"] else 0.0

    payload = {
      "summary": summary,
      "rows": ads.to_dict(orient="records")
    }
    (outdir/"dashboard_ads_kpi.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # influencer optional
    try:
        inf=pd.read_sql_query("SELECT * FROM v315_influencer_content_kpi ORDER BY date, influencer_id", conn)
        (outdir/"dashboard_influencer_kpi.json").write_text(json.dumps(inf.to_dict(orient="records"), ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    print(f"OK: wrote {outdir}/dashboard_ads_kpi.json")

if __name__=='__main__':
    main()

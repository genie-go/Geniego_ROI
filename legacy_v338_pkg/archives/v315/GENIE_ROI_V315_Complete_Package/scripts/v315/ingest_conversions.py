#!/usr/bin/env python3
"""전환/매출 CSV 적재 스크립트 (간단 버전)

CSV 컬럼 예시:
  date,source,channel,campaign_id,utm_campaign,promo_code,conversions,revenue
"""
from __future__ import annotations
import argparse, sqlite3
from pathlib import Path
import pandas as pd

def ensure_schema(conn, schema_sql: str):
    conn.executescript(schema_sql)
    conn.commit()

def normalize_date(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce").dt.strftime("%Y-%m-%d")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--csv", required=True)
    ap.add_argument("--schema", default="db/migrations/0040_v315_complete.sql")
    args=ap.parse_args()

    root=Path(__file__).resolve().parents[2]
    df=pd.read_csv(args.csv)
    df["date"]=normalize_date(df["date"])
    df["conversions"]=pd.to_numeric(df.get("conversions",0), errors="coerce").fillna(0).astype(int)
    df["revenue"]=pd.to_numeric(df.get("revenue",0), errors="coerce").fillna(0).astype(float)

    conn=sqlite3.connect(args.db)
    ensure_schema(conn,(root/args.schema).read_text(encoding="utf-8"))
    cols=["date","source","channel","campaign_id","utm_campaign","promo_code","conversions","revenue"]
    for c in cols:
        if c not in df.columns:
            df[c] = "" if c in ["channel","campaign_id","utm_campaign","promo_code"] else (0 if c=="conversions" else 0.0)
    conn.executemany(
      """INSERT INTO conversions_daily
         (date, source, channel, campaign_id, utm_campaign, promo_code, conversions, revenue)
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(date, source, COALESCE(channel,''), COALESCE(campaign_id,''), COALESCE(utm_campaign,''), COALESCE(promo_code,'')) DO UPDATE SET
           conversions=excluded.conversions,
           revenue=excluded.revenue
      """, df[cols].itertuples(index=False, name=None)
    )
    conn.commit()
    print(f"OK: {len(df)} rows ingested into conversions_daily")

if __name__=="__main__":
    main()

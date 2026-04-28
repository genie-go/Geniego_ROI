#!/usr/bin/env python3
"""GENIE_ROI V315 - 채널 CSV 업로드 -> SQLite 적재(통합 스키마)

사용 예:
  python scripts/v315/unified_ingest.py --db genie_roi.db --channel google_ads --csv sample_data/google_ads_export.csv --cost_unit currency
  python scripts/v315/unified_ingest.py --db genie_roi.db --channel google_ads --csv sample_data/google_ads_export_micros.csv --cost_unit micros

채널 매핑 수정:
  templates/v315/channel_mappers.json
"""

from __future__ import annotations
import argparse, json, sqlite3
from pathlib import Path
import pandas as pd

def load_mappers(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def normalize_date(series: pd.Series) -> pd.Series:
    # 다양한 형식 지원
    return pd.to_datetime(series, errors="coerce").dt.strftime("%Y-%m-%d")

def ensure_schema(conn: sqlite3.Connection, schema_sql_path: Path) -> None:
    conn.executescript(schema_sql_path.read_text(encoding="utf-8"))
    conn.commit()

def map_columns(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    req = mapping["required_columns"]
    opt = mapping.get("optional_columns", {})
    needed = set(req.keys()) | set(opt.keys())
    missing = [c for c in req.keys() if c not in df.columns]
    if missing:
        raise ValueError(f"필수 컬럼 누락: {missing}. 현재 컬럼: {list(df.columns)[:30]}")
    keep = [c for c in df.columns if c in needed]
    out = df[keep].rename(columns={**req, **opt})
    # 기본 컬럼 보장
    for col in ["account_id","campaign_name","adgroup_id","adgroup_name","creative_id","creative_name"]:
        if col not in out.columns:
            out[col] = None
    out["impressions"] = pd.to_numeric(out.get("impressions", 0), errors="coerce").fillna(0).astype(int)
    out["clicks"] = pd.to_numeric(out.get("clicks", 0), errors="coerce").fillna(0).astype(int)
    out["spend"] = pd.to_numeric(out.get("spend", 0), errors="coerce").fillna(0.0).astype(float)
    out["date"] = normalize_date(out["date"])
    return out

def apply_cost_unit(df: pd.DataFrame, cost_unit: str) -> pd.DataFrame:
    # google cost가 micros로 나오는 경우 대비
    if cost_unit == "micros":
        df["spend"] = df["spend"] / 1_000_000.0
    return df

def upsert_ads_daily(conn: sqlite3.Connection, df: pd.DataFrame, channel: str) -> None:
    df = df.copy()
    df["channel"] = channel
    cols = ["date","channel","account_id","campaign_id","campaign_name","adgroup_id","adgroup_name","creative_id","creative_name","impressions","clicks","spend"]
    df = df[cols]
    conn.executemany(
        """INSERT INTO ads_campaign_daily
           (date, channel, account_id, campaign_id, campaign_name, adgroup_id, adgroup_name, creative_id, creative_name, impressions, clicks, spend)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(date, channel, campaign_id, COALESCE(adgroup_id,''), COALESCE(creative_id,'')) DO UPDATE SET
             impressions=excluded.impressions,
             clicks=excluded.clicks,
             spend=excluded.spend,
             campaign_name=excluded.campaign_name,
             adgroup_name=excluded.adgroup_name,
             creative_name=excluded.creative_name
        """, df.itertuples(index=False, name=None)
    )
    conn.commit()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True, help="SQLite DB 경로")
    ap.add_argument("--channel", required=True, help="google_ads/meta_ads/tiktok_ads/naver_ads")
    ap.add_argument("--csv", required=True, help="채널 CSV 경로")
    ap.add_argument("--mappers", default="templates/v315/channel_mappers.json")
    ap.add_argument("--schema", default="db/migrations/0040_v315_complete.sql")
    ap.add_argument("--cost_unit", default="currency", choices=["currency","micros"], help="spend 단위(google_ads용)")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[2]
    db_path = Path(args.db)
    mappers = load_mappers(root/args.mappers)
    if args.channel not in mappers:
        raise SystemExit(f"지원하지 않는 channel: {args.channel}. 사용 가능: {list(mappers.keys())}")

    df = pd.read_csv(args.csv)
    mapped = map_columns(df, mappers[args.channel])
    mapped = apply_cost_unit(mapped, args.cost_unit)

    conn = sqlite3.connect(db_path)
    ensure_schema(conn, root/args.schema)
    upsert_ads_daily(conn, mapped, args.channel)
    print(f"OK: {len(mapped)} rows ingested into ads_campaign_daily (channel={args.channel})")

if __name__ == "__main__":
    main()

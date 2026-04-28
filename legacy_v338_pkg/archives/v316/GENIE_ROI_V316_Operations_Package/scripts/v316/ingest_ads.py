#!/usr/bin/env python3
import argparse, pathlib, sqlite3
from scripts.v316._common_ingest import load_mappers, read_csv_rows, detect_field_map, safe_int, safe_float

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--channel", required=True)
    p.add_argument("--mappers", default="templates/v316/channel_mappers.json")
    args = p.parse_args()

    mappers = load_mappers(args.mappers)
    if args.channel not in mappers:
        raise SystemExit(f"Unknown channel: {args.channel}. Available: {', '.join(mappers.keys())}")

    headers, rows = read_csv_rows(args.csv)
    cfg = mappers[args.channel]
    fmap = detect_field_map(headers, cfg["aliases"])

    missing = [f for f in cfg["required"] if f not in fmap]
    if missing:
        raise SystemExit(f"CSV header mapping failed. Missing fields: {missing}. Headers: {headers}")

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    inserted = 0
    for r in rows:
        date = r.get(fmap["date"])
        campaign_id = str(r.get(fmap["campaign_id"]) or "").strip()
        campaign_name = str(r.get(fmap["campaign_name"]) or "").strip()
        impressions = safe_int(r.get(fmap["impressions"]))
        clicks = safe_int(r.get(fmap["clicks"]))
        cost = safe_float(r.get(fmap["cost"]))
        cur.execute(
            """INSERT INTO ads_campaign_daily(date, channel, campaign_id, campaign_name, impressions, clicks, cost)
                 VALUES(?,?,?,?,?,?,?)
                 ON CONFLICT(date, channel, campaign_id) DO UPDATE SET
                   campaign_name=excluded.campaign_name,
                   impressions=excluded.impressions,
                   clicks=excluded.clicks,
                   cost=excluded.cost
            """,
            (date, args.channel, campaign_id, campaign_name, impressions, clicks, cost),
        )
        inserted += 1

    db.commit()
    db.close()
    print(f"[OK] ingested ads rows={inserted} from {pathlib.Path(args.csv).name} ({args.channel})")

if __name__ == "__main__":
    main()

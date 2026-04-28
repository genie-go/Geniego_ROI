#!/usr/bin/env python3
import argparse, pathlib, sqlite3, csv

def safe_float(x) -> float:
    try:
        if x is None: return 0.0
        s = str(x).replace(",","").strip()
        if s == "": return 0.0
        return float(s)
    except Exception:
        return 0.0

def safe_int(x) -> int:
    try:
        if x is None: return 0
        s = str(x).replace(",","").strip()
        if s == "": return 0
        return int(float(s))
    except Exception:
        return 0

def pick(row, keys):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return ""

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    args = p.parse_args()

    with open(args.csv, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        rows = list(r)

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    inserted = 0
    for row in rows:
        date = pick(row, ["date","Date","날짜","day"])
        campaign_id = pick(row, ["campaign_id","Campaign ID","캠페인ID"])
        utm_campaign = pick(row, ["utm_campaign","UTM Campaign","utm","utmCampaign"]) or campaign_id
        conversions = safe_int(pick(row, ["conversions","Conversions","전환","purchase"]))
        revenue = safe_float(pick(row, ["revenue","Revenue","매출","conversion_value","Conversion value"]))
        cur.execute(
            """INSERT INTO conversions_daily(date, campaign_id, utm_campaign, conversions, revenue)
                 VALUES(?,?,?,?,?)
                 ON CONFLICT(date, campaign_id, utm_campaign) DO UPDATE SET
                   conversions=excluded.conversions,
                   revenue=excluded.revenue
            """,
            (date, campaign_id, utm_campaign, conversions, revenue),
        )
        inserted += 1

    db.commit()
    db.close()
    print(f"[OK] ingested conversions rows={inserted} from {pathlib.Path(args.csv).name}")

if __name__ == "__main__":
    main()

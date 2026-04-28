#!/usr/bin/env python3
import argparse, pathlib, sqlite3
import sys, pathlib
_ROOT = pathlib.Path(__file__).resolve().parents[2]
if _ROOT.as_posix() not in sys.path: sys.path.insert(0, _ROOT.as_posix())

from scripts.v322._common import read_csv_dicts, safe_int, safe_float

def pick(row, keys):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return ""

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--templates", default="templates/v322", help="(reserved) templates dir")
    args = p.parse_args()

    headers, rows = read_csv_dicts(args.csv)

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    inserted = 0
    for row in rows:
        date = str(pick(row, ["date","Date","날짜","day","일자"])).strip()
        campaign_id = str(pick(row, ["campaign_id","Campaign ID","캠페인ID","캠페인 ID"])).strip()
        utm_campaign = str(pick(row, ["utm_campaign","UTM Campaign","utm","utmCampaign","utm_campaign_name"])).strip()
        ad_id = str(pick(row, ["ad_id","Ad ID","소재ID","광고ID","creative_id"])).strip()
        conversions = safe_int(pick(row, ["conversions","Conversions","전환","purchase","orders"]))
        revenue = safe_float(pick(row, ["revenue","Revenue","매출","conversion_value","Conversion value","sales"]))

        cur.execute(
            """INSERT INTO conversions_daily(date, campaign_id, utm_campaign, ad_id, conversions, revenue)
                 VALUES(?,?,?,?,?,?)
                 ON CONFLICT(date, campaign_id, utm_campaign, ad_id) DO UPDATE SET
                   conversions=excluded.conversions,
                   revenue=excluded.revenue
            """,
            (date, campaign_id, utm_campaign, ad_id, conversions, revenue)
        )
        inserted += 1

    db.commit()
    db.close()
    print(f"[OK] ingested conversions rows={inserted} from {pathlib.Path(args.csv).name}")

if __name__ == "__main__":
    main()
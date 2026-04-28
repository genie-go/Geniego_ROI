#!/usr/bin/env python3
import argparse, sqlite3
from datetime import datetime

VALID = {"campaign_id","utm_campaign","ad_id"}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--rule", required=True, choices=sorted(VALID))
    args = p.parse_args()

    db = sqlite3.connect(args.db)
    cur = db.cursor()
    cur.execute("UPDATE attribution_config SET rule=?, updated_at=? WHERE id=1", (args.rule, datetime.utcnow().isoformat()+"Z"))
    db.commit()
    db.close()
    print(f"[OK] set attribution rule: {args.rule}")

if __name__ == "__main__":
    main()

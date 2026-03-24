#!/usr/bin/env python3
import argparse, sqlite3, json
from datetime import datetime

VALID = {"campaign_id","utm_campaign","ad_id"}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--chain", required=True, help="comma-separated, e.g. ad_id,campaign_id,utm_campaign")
    args = p.parse_args()

    chain = [x.strip() for x in args.chain.split(",") if x.strip()]
    chain = [x for x in chain if x in VALID]
    if not chain:
        chain = ["campaign_id"]

    db = sqlite3.connect(args.db)
    cur = db.cursor()
    cur.execute("UPDATE attribution_config SET rule_chain=?, updated_at=? WHERE id=1", (json.dumps(chain), datetime.utcnow().isoformat()+"Z"))
    db.commit()
    db.close()
    print(f"[OK] set attribution chain: {' > '.join(chain)}")

if __name__ == "__main__":
    main()

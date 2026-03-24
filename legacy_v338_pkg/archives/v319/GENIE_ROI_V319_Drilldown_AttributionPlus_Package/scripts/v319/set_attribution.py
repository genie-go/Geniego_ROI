#!/usr/bin/env python3
import argparse, sqlite3, json
from datetime import datetime

VALID = {"campaign_id","utm_campaign","ad_id"}
FB_VALID = {"contains","startswith"}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--chain", required=True)   # comma list
    p.add_argument("--fb-ad-id", default="")
    p.add_argument("--fb-campaign-id", default="")
    p.add_argument("--fb-utm-campaign", default="")
    args = p.parse_args()

    chain = [x.strip() for x in args.chain.split(",") if x.strip() and x.strip() in VALID]
    if not chain:
        chain = ["campaign_id"]

    def parse_fb(s):
        modes = ["exact"]
        for x in [t.strip() for t in s.split(",") if t.strip()]:
            if x in FB_VALID:
                modes.append(x)
        # dedupe keep order
        out=[]
        for m in modes:
            if m not in out: out.append(m)
        return out

    cfg = {
        "chain": chain,
        "fallback": {
            "ad_id": parse_fb(args.fb_ad_id),
            "campaign_id": parse_fb(args.fb_campaign_id),
            "utm_campaign": parse_fb(args.fb_utm_campaign),
        }
    }

    db = sqlite3.connect(args.db)
    cur = db.cursor()
    cur.execute("UPDATE attribution_config SET config_json=?, updated_at=? WHERE id=1",
                (json.dumps(cfg, ensure_ascii=False), datetime.utcnow().isoformat()+"Z"))
    db.commit()
    db.close()
    print(f"[OK] set attribution: chain={' > '.join(chain)}")

if __name__ == "__main__":
    main()

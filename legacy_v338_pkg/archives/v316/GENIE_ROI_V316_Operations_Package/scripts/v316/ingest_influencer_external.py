#!/usr/bin/env python3
import argparse, csv, sqlite3
from datetime import datetime

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--audience")
    p.add_argument("--fraud")
    args = p.parse_args()

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    if args.audience:
        with open(args.audience, "r", encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            rows = list(r)
        for row in rows:
            cur.execute(
                """INSERT INTO audience_demographics(influencer_id, dimension, key, pct)
                     VALUES(?,?,?,?)
                     ON CONFLICT(influencer_id, dimension, key) DO UPDATE SET pct=excluded.pct
                """,
                (row["influencer_id"], row["dimension"], row["key"], float(row.get("pct") or 0)),
            )

    if args.fraud:
        with open(args.fraud, "r", encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            rows = list(r)
        for row in rows:
            cur.execute(
                """INSERT INTO fraud_estimates(influencer_id, fake_follower_pct, suspicious_engagement_pct, notes, source, collected_at)
                     VALUES(?,?,?,?,?,?)
                """,
                (
                    row["influencer_id"],
                    float(row.get("fake_follower_pct") or 0),
                    float(row.get("suspicious_engagement_pct") or 0),
                    (row.get("notes") or "").strip(),
                    (row.get("source") or "manual").strip(),
                    (row.get("collected_at") or datetime.utcnow().date().isoformat()).strip(),
                ),
            )

    db.commit()
    db.close()
    print("[OK] ingested influencer external inputs")

if __name__ == "__main__":
    main()

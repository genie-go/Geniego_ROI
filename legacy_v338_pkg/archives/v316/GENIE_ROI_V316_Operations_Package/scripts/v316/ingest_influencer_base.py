#!/usr/bin/env python3
import argparse, csv, sqlite3

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--influencers", required=True)
    p.add_argument("--results")
    args = p.parse_args()

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    with open(args.influencers, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        rows = list(r)
    for row in rows:
        cur.execute(
            """INSERT INTO influencers(influencer_id, handle, platform, category, follower_count)
                 VALUES(?,?,?,?,?)
                 ON CONFLICT(influencer_id) DO UPDATE SET
                   handle=excluded.handle, platform=excluded.platform, category=excluded.category, follower_count=excluded.follower_count
            """,
            (row["influencer_id"], row["handle"], row.get("platform"), row.get("category"), int(float(row.get("follower_count") or 0))),
        )

    if args.results:
        with open(args.results, "r", encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            rows = list(r)
        for row in rows:
            cur.execute(
                """INSERT INTO influencer_campaign_results(influencer_id, date, campaign_id, link_clicks, conversions, revenue)
                     VALUES(?,?,?,?,?,?)
                """,
                (
                    row["influencer_id"], row["date"], row.get("campaign_id"),
                    int(float(row.get("link_clicks") or 0)),
                    int(float(row.get("conversions") or 0)),
                    float(row.get("revenue") or 0),
                ),
            )

    db.commit()
    db.close()
    print("[OK] ingested influencer base/results")

if __name__ == "__main__":
    main()

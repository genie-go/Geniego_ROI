#!/usr/bin/env python3
import argparse, sqlite3, json, pathlib
from datetime import datetime
from scripts.v318._common import load_json, save_json

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--channel", required=True)
    p.add_argument("--mapping-json", required=True, help="JSON string or @path")
    p.add_argument("--export", default="templates/v318/custom_mappers.json")
    args = p.parse_args()

    if args.mapping_json.startswith("@"):
        mapping = json.loads(pathlib.Path(args.mapping_json[1:]).read_text(encoding="utf-8"))
    else:
        mapping = json.loads(args.mapping_json)

    db = sqlite3.connect(args.db)
    cur = db.cursor()
    cur.execute(
        "INSERT INTO custom_mappers(channel, mapping_json, updated_at) VALUES(?,?,?) "
        "ON CONFLICT(channel) DO UPDATE SET mapping_json=excluded.mapping_json, updated_at=excluded.updated_at",
        (args.channel, json.dumps(mapping, ensure_ascii=False), datetime.utcnow().isoformat()+"Z"),
    )
    db.commit()

    # export to file for portability
    cur.execute("SELECT channel, mapping_json FROM custom_mappers")
    channels = {}
    for ch, mj in cur.fetchall():
        channels[ch] = json.loads(mj)
    save_json(args.export, {"version":1, "channels": channels})
    db.close()
    print("[OK] saved mapper")

if __name__ == "__main__":
    main()

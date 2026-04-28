#!/usr/bin/env python3
import argparse, sqlite3, pathlib, sys

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--migration", default="db/migrations/0050_v316_ops.sql")
    args = p.parse_args()

    db_path = pathlib.Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    mig = pathlib.Path(args.migration)
    if not mig.exists():
        print(f"[ERR] migration not found: {mig}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path.as_posix())
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.executescript(mig.read_text(encoding="utf-8"))
    conn.commit()
    conn.close()
    print(f"[OK] initialized db: {db_path}")

if __name__ == "__main__":
    main()

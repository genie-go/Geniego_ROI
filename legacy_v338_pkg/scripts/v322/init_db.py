#!/usr/bin/env python3
import argparse, sqlite3, pathlib, sys, json
import sys, pathlib
_ROOT = pathlib.Path(__file__).resolve().parents[2]
if _ROOT.as_posix() not in sys.path: sys.path.insert(0, _ROOT.as_posix())

from datetime import datetime

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--migration", default="db/migrations/0110_v322_ops_ui.sql")
    p.add_argument("--default-attribution", default="templates/v322/default_attribution.json")
    args = p.parse_args()

    db_path = pathlib.Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    mig = pathlib.Path(args.migration)
    if not mig.exists():
        # allow running from anywhere
        mig2 = _ROOT / args.migration
        if mig2.exists():
            mig = mig2
        else:
            print(f"[ERR] migration not found: {mig} (also tried {mig2})", file=sys.stderr)
            sys.exit(1)

    conn = sqlite3.connect(db_path.as_posix())
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.executescript(mig.read_text(encoding="utf-8"))

    # seed default attribution config
    da = pathlib.Path(args.default_attribution)
    if not da.exists():
        da2 = _ROOT / args.default_attribution
        if da2.exists(): da = da2
    if da.exists():
        cfg = json.loads(da.read_text(encoding="utf-8"))
        conn.execute("UPDATE attribution_config SET config_json=?, updated_at=? WHERE id=1",
                     (json.dumps(cfg, ensure_ascii=False), datetime.utcnow().isoformat()+"Z"))
    conn.commit()
    conn.close()
    print(f"[OK] initialized db: {db_path}")

if __name__ == "__main__":
    main()
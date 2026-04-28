#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 CSV 자동 적재 워처(최소버전)

- workspace/inbox 폴더에 CSV를 넣으면 자동 적재
  - shopify_*.csv  -> ingest_shopify_csv.py
  - meta_ads_*.csv -> ingest_meta_ads_csv.py
- 처리 후 workspace/processed 로 이동

주의: 운영에서는 cron(매 5분) 또는 systemd로 실행 권장.
"""
from __future__ import annotations
import argparse, pathlib, shutil, subprocess, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", default="testclient")
    args = ap.parse_args()

    ws = pathlib.Path(args.workspace)
    inbox = ws/"inbox"
    processed = ws/"processed"
    inbox.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)

    files = sorted([p for p in inbox.glob("*.csv") if p.is_file()])
    if not files:
        print("no files")
        return

    for f in files:
        name = f.name.lower()
        try:
            if name.startswith("shopify_"):
                cmd = [sys.executable, "scripts/v335/ingest_shopify_csv.py", "--workspace", ws.as_posix(), "--project", args.project, "--csv", f.as_posix()]
            elif name.startswith("meta_ads_"):
                cmd = [sys.executable, "scripts/v335/ingest_meta_ads_csv.py", "--workspace", ws.as_posix(), "--project", args.project, "--csv", f.as_posix()]
            else:
                # unknown, skip
                continue
            print("RUN:", " ".join(cmd))
            subprocess.check_call(cmd)
            shutil.move(f.as_posix(), (processed/f.name).as_posix())
        except Exception as e:
            print("ERR:", f.name, str(e))

if __name__ == "__main__":
    main()

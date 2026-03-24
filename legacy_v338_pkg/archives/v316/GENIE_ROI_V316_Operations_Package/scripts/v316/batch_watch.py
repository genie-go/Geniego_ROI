#!/usr/bin/env python3
import argparse, pathlib, time, shutil, sys, subprocess, re
from datetime import datetime

def ensure_dirs(*paths):
    for p in paths:
        pathlib.Path(p).mkdir(parents=True, exist_ok=True)

def infer_channel_from_name(name: str):
    m = re.match(r"^([a-z0-9_]+)__", name)
    return m.group(1) if m else None

def run(cmd):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

def process_ads(db, fp, archive_dir):
    channel = infer_channel_from_name(fp.name)
    if not channel:
        raise RuntimeError("채널 추론 실패: 파일명을 '채널__*.csv' 형태로 저장하세요.")
    code, out = run([sys.executable, "scripts/v316/ingest_ads.py", "--db", db, "--csv", fp.as_posix(), "--channel", channel])
    if code != 0:
        raise RuntimeError(out)
    shutil.move(fp.as_posix(), (archive_dir/fp.name).as_posix())
    return out

def process_conv(db, fp, archive_dir):
    code, out = run([sys.executable, "scripts/v316/ingest_conversions.py", "--db", db, "--csv", fp.as_posix()])
    if code != 0:
        raise RuntimeError(out)
    shutil.move(fp.as_posix(), (archive_dir/fp.name).as_posix())
    return out

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--watch-ads", default="inbox/ads")
    p.add_argument("--watch-conversions", default="inbox/conversions")
    p.add_argument("--interval", type=int, default=30)
    p.add_argument("--auto-generate-json", action="store_true")
    p.add_argument("--out", default="out")
    args = p.parse_args()

    watch_ads = pathlib.Path(args.watch_ads)
    watch_conv = pathlib.Path(args.watch_conversions)
    archive = pathlib.Path("archive")
    failed = pathlib.Path("failed")
    ensure_dirs(watch_ads, watch_conv, archive, failed, pathlib.Path(args.out))

    print("[OK] batch watcher started")
    print(f"  ads inbox: {watch_ads.resolve()}")
    print(f"  conv inbox: {watch_conv.resolve()}")
    print(f"  interval: {args.interval}s")

    while True:
        for folder, kind in [(watch_ads, "ads"), (watch_conv, "conv")]:
            for fp in sorted(folder.glob("*.csv")):
                try:
                    print(f"[{datetime.now().isoformat(timespec='seconds')}] processing {kind}: {fp.name}")
                    out = process_ads(args.db, fp, archive) if kind == "ads" else process_conv(args.db, fp, archive)
                    print(out.strip())
                except Exception as e:
                    dst = failed / fp.name
                    try:
                        shutil.move(fp.as_posix(), dst.as_posix())
                    except Exception:
                        pass
                    (failed / (fp.stem + ".log.txt")).write_text(str(e), encoding="utf-8")
                    print(f"[ERR] failed {fp.name}: {e}")

        if args.auto_generate_json:
            code, out = run([sys.executable, "scripts/v316/generate_dashboard_json.py", "--db", args.db, "--out", args.out])
            print(out.strip())

        time.sleep(args.interval)

if __name__ == "__main__":
    main()

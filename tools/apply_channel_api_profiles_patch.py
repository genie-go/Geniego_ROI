#!/usr/bin/env python3
"""Apply a JSON patch to /admin/channels/api-profiles/apply.

Usage:
  python tools/apply_channel_api_profiles_patch.py --base-url http://localhost:8000 --token <JWT> --patch-file specs/shopee_patch.json --dry-run
"""
import argparse, json, sys, urllib.request

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--patch-file", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args=ap.parse_args()

    patch=json.load(open(args.patch_file, "r", encoding="utf-8"))
    url=args.base_url.rstrip("/") + "/admin/channels/api-profiles/apply?dry_run=" + ("true" if args.dry_run else "false")
    req=urllib.request.Request(url, method="POST", data=json.dumps(patch).encode("utf-8"))
    req.add_header("Content-Type","application/json")
    req.add_header("Authorization","Bearer "+args.token)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            sys.stdout.write(resp.read().decode("utf-8"))
    except Exception as e:
        if hasattr(e, "read"):
            sys.stderr.write(e.read().decode("utf-8"))
        else:
            raise

if __name__=="__main__":
    main()

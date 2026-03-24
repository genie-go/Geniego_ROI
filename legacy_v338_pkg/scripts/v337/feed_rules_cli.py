#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 Feed Rule CLI

Examples:
  python scripts/v335/feed_rules_cli.py validate --channel smartstore --rules templates/v335/feed_rules_minimal.json --items products.json
  python scripts/v335/feed_rules_cli.py price --op percent --value 5 --round 10 --items products.json --out products_out.json
  python scripts/v335/feed_rules_cli.py discount --type sale_price --value 10 --unit percent --items products.json --out products_out.json
"""
import argparse, json, pathlib, sys
from scripts.v335.feed_rules import load_rule_spec, validate_items, apply_price_adjustment, apply_discount, apply_coupon, issues_to_rows

def _load_items(path: str):
    p = pathlib.Path(path)
    obj = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(obj, dict):
        return obj.get("items") or []
    return obj

def _save(path: str, obj):
    pathlib.Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("validate")
    v.add_argument("--channel", required=True)
    v.add_argument("--rules", required=True)
    v.add_argument("--items", required=True)

    p = sub.add_parser("price")
    p.add_argument("--op", choices=["percent","fixed"], required=True)
    p.add_argument("--value", type=float, required=True)
    p.add_argument("--round", type=int, default=1)
    p.add_argument("--selection-skus", default="")
    p.add_argument("--items", required=True)
    p.add_argument("--out", required=True)

    d = sub.add_parser("discount")
    d.add_argument("--type", default="sale_price")
    d.add_argument("--value", type=float, required=True)
    d.add_argument("--unit", choices=["percent","fixed"], default="percent")
    d.add_argument("--selection-skus", default="")
    d.add_argument("--items", required=True)
    d.add_argument("--out", required=True)

    c = sub.add_parser("coupon")
    c.add_argument("--type", default="cart_coupon")
    c.add_argument("--value", type=float, required=True)
    c.add_argument("--unit", choices=["percent","fixed"], default="percent")
    c.add_argument("--min-order", type=float, default=0)
    c.add_argument("--selection-skus", default="")
    c.add_argument("--items", required=True)
    c.add_argument("--out", required=True)

    args = ap.parse_args()
    if args.cmd == "validate":
        rules = load_rule_spec(pathlib.Path(args.rules).read_text(encoding="utf-8"))
        items = _load_items(args.items)
        issues = validate_items(items, args.channel, rules)
        rows = issues_to_rows(issues)
        print(json.dumps({"ok": len([r for r in rows if r["severity"]=="ERROR"])==0, "issues": rows}, ensure_ascii=False, indent=2))
        return

    items = _load_items(args.items)
    sel = [s.strip() for s in (args.selection_skus or "").split(",") if s.strip()] or None

    if args.cmd == "price":
        items2, meta = apply_price_adjustment(items, args.op, args.value, args.round, sel)
        _save(args.out, {"meta": meta, "items": items2})
        print(json.dumps(meta, ensure_ascii=False, indent=2))
        return

    if args.cmd == "discount":
        items2, meta = apply_discount(items, args.type, args.value, args.unit, sel)
        _save(args.out, {"meta": meta, "items": items2})
        print(json.dumps(meta, ensure_ascii=False, indent=2))
        return

    if args.cmd == "coupon":
        coupon = {"type": args.type, "value": args.value, "unit": args.unit, "min_order": args.min_order}
        items2, meta = apply_coupon(items, coupon, sel)
        _save(args.out, {"meta": meta, "items": items2})
        print(json.dumps(meta, ensure_ascii=False, indent=2))
        return

if __name__ == "__main__":
    main()

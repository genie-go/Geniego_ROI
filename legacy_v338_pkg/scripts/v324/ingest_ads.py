#!/usr/bin/env python3
import argparse, pathlib, sqlite3, json
import sys, pathlib
_ROOT = pathlib.Path(__file__).resolve().parents[2]
if _ROOT.as_posix() not in sys.path: sys.path.insert(0, _ROOT.as_posix())

# ---- incremental ingest (V324) ----
import hashlib
def file_hash(p: str) -> str:
        h=hashlib.sha256()
        with open(p,'rb') as f:
            for chunk in iter(lambda: f.read(1024*1024), b''):
                h.update(chunk)
        return h.hexdigest()
    

from scripts.v322._common import load_json, read_csv_dicts, safe_int, safe_float, infer_currency_from_filename

CANONICAL_REQUIRED = ["date","campaign_id","campaign_name","impressions","clicks","cost"]

def compute_costs(cost, cost_micros, tax_rate, cost_tax, cost_includes_tax):
    raw = cost
    if cost_micros and cost_micros > 0:
        raw = float(cost_micros) / 1_000_000.0
    tax_rate = float(tax_rate or 0.0)
    cost_tax = float(cost_tax or 0.0)
    includes = 1 if cost_includes_tax else 0
    if cost_tax > 0:
        net = max(raw - cost_tax, 0.0) if includes else raw
    elif tax_rate > 0:
        net = raw / (1.0 + tax_rate) if includes else raw
    else:
        net = raw
    return raw, net

def convert_to_base(net_cost, currency, fx):
    base = fx.get("base_currency","KRW")
    rates = fx.get("rates_to_base",{})
    rate = float(rates.get(currency, 0.0) or 0.0)
    if rate <= 0:
        rate = 1.0
        currency = base
    return net_cost * rate, base

def load_custom_mapper(db_path: str, channel: str):
    db = sqlite3.connect(db_path)
    cur = db.cursor()
    cur.execute("SELECT mapping_json FROM custom_mappers WHERE channel=?", (channel,))
    row = cur.fetchone()
    db.close()
    return json.loads(row[0]) if row else None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--channel", required=True)
    p.add_argument("--templates", default="templates/v322", help="templates dir (project scoped)")
    p.add_argument("--fx", default="", help="override fx json path")
    p.add_argument("--settings", default="", help="override settings json path")
    args = p.parse_args()

    templates_dir = pathlib.Path(args.templates)
    fx_path = pathlib.Path(args.fx) if args.fx else (templates_dir/"fx_rates.json")
    settings_path = pathlib.Path(args.settings) if args.settings else (templates_dir/"default_settings.json")
    fx = load_json(fx_path.as_posix())
    settings = load_json(settings_path.as_posix())
    headers, rows = read_csv_dicts(args.csv)

    fmap = load_custom_mapper(args.db, args.channel)
    if not fmap:
        # fallback to default channel_mappers.json for quick start / sample data
        cm = load_json((templates_dir/"channel_mappers.json").as_posix())
        cfg = cm.get(args.channel) or cm.get(f"{args.channel}_ads") or (cm.get("channels") or {}).get(args.channel) or {}
        # channel_mappers.json은 aliases 형태로 제공될 수 있습니다.
        if isinstance(cfg, dict) and ("aliases" in cfg) and not cfg.get("date"):
            aliases = cfg.get("aliases") or {}
            fmap = {}
            hdr_set = set(headers)
            for canon, cand_list in aliases.items():
                for cand in (cand_list or []):
                    if cand in hdr_set:
                        fmap[canon] = cand
                        break
        else:
            fmap = cfg if isinstance(cfg, dict) else {}
    if not fmap:
        raise SystemExit("No mapper for this channel. UI에서 매핑을 저장하거나 templates/channel_mappers.json을 확인하세요.")

    missing = [f for f in CANONICAL_REQUIRED if f not in fmap or not fmap[f]]
    if missing:
        raise SystemExit(f"CSV mapping missing required fields: {missing}. Headers: {headers}")

    inferred_cur = infer_currency_from_filename(pathlib.Path(args.csv).name)
    default_currency = inferred_cur or settings.get("default_currency","KRW")
    default_tax_rate = float(settings.get("default_tax_rate", 0.0) or 0.0)
    assume_includes_tax = 1 if settings.get("assume_cost_includes_tax", False) else 0

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    inserted = 0
    for r in rows:
        def get(field):
            h = fmap.get(field,"")
            return r.get(h) if h else ""

        date = str(get("date") or "").strip()
        campaign_id = str(get("campaign_id") or "").strip()
        campaign_name = str(get("campaign_name") or "").strip()
        utm_campaign = str(get("utm_campaign") or "").strip()

        impressions = safe_int(get("impressions"))
        clicks = safe_int(get("clicks"))
        cost = safe_float(get("cost"))
        cost_micros = safe_int(get("cost_micros")) if fmap.get("cost_micros") else 0

        currency = (str(get("currency") or "").strip().upper() or default_currency)

        tax_rate = safe_float(get("tax_rate")) if fmap.get("tax_rate") else 0.0
        if tax_rate == 0.0:
            tax_rate = default_tax_rate

        cost_tax = safe_float(get("cost_tax")) if fmap.get("cost_tax") else 0.0
        includes = assume_includes_tax

        ad_group_id = str(get("ad_group_id") or "").strip()
        ad_group_name = str(get("ad_group_name") or "").strip()
        ad_id = str(get("ad_id") or "").strip()
        ad_name = str(get("ad_name") or "").strip()

        raw, net = compute_costs(cost, cost_micros, tax_rate, cost_tax, includes)
        cost_base, _ = convert_to_base(net, currency, fx)

        cur.execute(
            """INSERT INTO ads_daily(
                 date, channel, campaign_id, campaign_name, utm_campaign,
                 ad_group_id, ad_group_name, ad_id, ad_name,
                 impressions, clicks, cost, cost_micros, currency,
                 tax_rate, cost_tax, cost_includes_tax, cost_net, cost_base
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(date, channel, campaign_id, ad_group_id, ad_id) DO UPDATE SET
                 campaign_name=excluded.campaign_name,
                 utm_campaign=excluded.utm_campaign,
                 ad_group_name=excluded.ad_group_name,
                 ad_name=excluded.ad_name,
                 impressions=excluded.impressions,
                 clicks=excluded.clicks,
                 cost=excluded.cost,
                 cost_micros=excluded.cost_micros,
                 currency=excluded.currency,
                 tax_rate=excluded.tax_rate,
                 cost_tax=excluded.cost_tax,
                 cost_includes_tax=excluded.cost_includes_tax,
                 cost_net=excluded.cost_net,
                 cost_base=excluded.cost_base
            """,
            (date, args.channel, campaign_id, campaign_name, utm_campaign,
             ad_group_id, ad_group_name, ad_id, ad_name,
             impressions, clicks, raw, cost_micros, currency,
             tax_rate, cost_tax, includes, net, cost_base)
        )
        inserted += 1

    db.commit()
    db.close()
    print(f"[OK] ingested ads rows={inserted} from {pathlib.Path(args.csv).name} ({args.channel})")

if __name__ == "__main__":
    main()
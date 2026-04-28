#!/usr/bin/env python3
import argparse, pathlib, sqlite3, json
from scripts.v318._common import load_json, read_csv_dicts, detect_field_map, safe_int, safe_float, infer_currency_from_filename

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
    if not row:
        return None
    return json.loads(row[0])

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--channel", required=True)
    p.add_argument("--mappers", default="templates/v318/channel_mappers.json")
    p.add_argument("--fx", default="templates/v318/fx_rates.json")
    p.add_argument("--settings", default="templates/v318/default_settings.json")
    args = p.parse_args()

    fx = load_json(args.fx)
    settings = load_json(args.settings)

    headers, rows = read_csv_dicts(args.csv)

    # 1) custom mapper (UI saved) has priority
    custom = load_custom_mapper(args.db, args.channel)
    if custom:
        fmap = custom
    else:
        mappers = load_json(args.mappers)
        if args.channel not in mappers:
            raise SystemExit(f"Unknown channel: {args.channel}. Available: {', '.join(mappers.keys())}")
        cfg = mappers[args.channel]
        fmap = detect_field_map(headers, cfg["aliases"])

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
                 impressions, clicks,
                 cost, cost_micros, currency,
                 tax_rate, cost_tax, cost_includes_tax,
                 cost_net, cost_base
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(date, channel, campaign_id, COALESCE(ad_id,''), COALESCE(ad_group_id,'')) DO UPDATE SET
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
             impressions, clicks,
             raw, cost_micros, currency,
             tax_rate, cost_tax, includes,
             net, cost_base)
        )
        inserted += 1

    db.commit()
    db.close()
    print(f"[OK] ingested ads rows={inserted} from {pathlib.Path(args.csv).name} ({args.channel})")

if __name__ == "__main__":
    main()

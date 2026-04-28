#!/usr/bin/env python3
import argparse, pathlib, sqlite3
from scripts.v317._common import load_json, read_csv_dicts, detect_field_map, safe_int, safe_float, infer_currency_from_filename

def compute_costs(cost, cost_micros, tax_rate, cost_tax, cost_includes_tax):
    # Prefer micros if present
    raw = cost
    if cost_micros and cost_micros > 0:
        raw = float(cost_micros) / 1_000_000.0

    # Normalize tax
    tax_rate = float(tax_rate or 0.0)
    cost_tax = float(cost_tax or 0.0)
    includes = 1 if cost_includes_tax else 0

    if cost_tax > 0:
        # if explicit tax amount, cost_net = raw - tax (when raw includes tax) else raw
        if includes:
            net = max(raw - cost_tax, 0.0)
        else:
            net = raw
    elif tax_rate > 0:
        if includes:
            net = raw / (1.0 + tax_rate)
        else:
            net = raw
    else:
        net = raw
    return raw, net

def convert_to_base(net_cost, currency, fx):
    base = fx.get("base_currency","KRW")
    rates = fx.get("rates_to_base",{})
    rate = float(rates.get(currency, 0.0) or 0.0)
    if rate <= 0:
        # unknown currency; treat as base
        rate = 1.0
        currency = base
    return net_cost * rate, base

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--channel", required=True)
    p.add_argument("--mappers", default="templates/v317/channel_mappers.json")
    p.add_argument("--fx", default="templates/v317/fx_rates.json")
    p.add_argument("--settings", default="templates/v317/default_settings.json")
    args = p.parse_args()

    mappers = load_json(args.mappers)
    if args.channel not in mappers:
        raise SystemExit(f"Unknown channel: {args.channel}. Available: {', '.join(mappers.keys())}")

    fx = load_json(args.fx)
    settings = load_json(args.settings)

    headers, rows = read_csv_dicts(args.csv)
    cfg = mappers[args.channel]
    fmap = detect_field_map(headers, cfg["aliases"])

    missing = [f for f in cfg["required"] if f not in fmap]
    if missing:
        raise SystemExit(f"CSV header mapping failed. Missing fields: {missing}. Headers: {headers}")

    inferred_cur = infer_currency_from_filename(pathlib.Path(args.csv).name)
    default_currency = inferred_cur or settings.get("default_currency","KRW")
    default_tax_rate = float(settings.get("default_tax_rate", 0.0) or 0.0)
    assume_includes_tax = 1 if settings.get("assume_cost_includes_tax", False) else 0

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    inserted = 0
    for r in rows:
        date = (r.get(fmap["date"]) or "").strip()
        campaign_id = str(r.get(fmap["campaign_id"]) or "").strip()
        campaign_name = str(r.get(fmap["campaign_name"]) or "").strip()
        impressions = safe_int(r.get(fmap["impressions"]))
        clicks = safe_int(r.get(fmap["clicks"]))
        cost = safe_float(r.get(fmap["cost"]))
        cost_micros = safe_int(r.get(fmap.get("cost_micros","")) if "cost_micros" in fmap else 0)

        currency = default_currency
        if "currency" in fmap:
            currency = (r.get(fmap["currency"]) or "").strip().upper() or default_currency

        tax_rate = default_tax_rate
        if "tax_rate" in fmap:
            tax_rate = safe_float(r.get(fmap["tax_rate"])) or default_tax_rate

        cost_tax = 0.0
        if "cost_tax" in fmap:
            cost_tax = safe_float(r.get(fmap["cost_tax"]))

        includes = assume_includes_tax
        if "cost_includes_tax" in r:
            includes = 1 if str(r.get("cost_includes_tax")).strip() in ("1","true","True","Y","y") else includes

        ad_group_id = str(r.get(fmap.get("ad_group_id","")) or "").strip() if "ad_group_id" in fmap else ""
        ad_group_name = str(r.get(fmap.get("ad_group_name","")) or "").strip() if "ad_group_name" in fmap else ""
        ad_id = str(r.get(fmap.get("ad_id","")) or "").strip() if "ad_id" in fmap else ""
        ad_name = str(r.get(fmap.get("ad_name","")) or "").strip() if "ad_name" in fmap else ""

        raw, net = compute_costs(cost, cost_micros, tax_rate, cost_tax, includes)
        cost_base, base_cur = convert_to_base(net, currency, fx)

        cur.execute(
            """INSERT INTO ads_daily(
                 date, channel, campaign_id, campaign_name,
                 ad_group_id, ad_group_name, ad_id, ad_name,
                 impressions, clicks,
                 cost, cost_micros, currency,
                 tax_rate, cost_tax, cost_includes_tax,
                 cost_net, cost_base
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(date, channel, campaign_id, COALESCE(ad_id,''), COALESCE(ad_group_id,'')) DO UPDATE SET
                 campaign_name=excluded.campaign_name,
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
            (date, args.channel, campaign_id, campaign_name,
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

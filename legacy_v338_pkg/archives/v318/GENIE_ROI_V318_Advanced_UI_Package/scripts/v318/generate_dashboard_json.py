#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib
from datetime import datetime
from collections import defaultdict

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--out", default="out")
    p.add_argument("--fx", default="templates/v318/fx_rates.json")
    args = p.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    fx_source = args.fx
    fx = json.loads(pathlib.Path(args.fx).read_text(encoding="utf-8"))
    base_currency = fx.get("base_currency","KRW")

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    rule_chain_row = cur.execute("SELECT rule_chain FROM attribution_config WHERE id=1").fetchone()
    chain = json.loads(rule_chain_row[0]) if rule_chain_row and rule_chain_row[0] else ["campaign_id"]

    # Load conversions and attribute each row to first available key in chain
    conv_rows = cur.execute("SELECT date, campaign_id, utm_campaign, ad_id, conversions, revenue FROM conversions_daily").fetchall()

    conv_by_key = defaultdict(lambda: [0,0.0])  # (rule, date, key) -> [conv, rev]
    for date, campaign_id, utm_campaign, ad_id, conv, rev in conv_rows:
        date = date or ""
        keys = {"campaign_id": campaign_id or "", "utm_campaign": utm_campaign or "", "ad_id": ad_id or ""}
        chosen_rule = None
        chosen_key = None
        for r in chain:
            k = keys.get(r, "")
            if k:
                chosen_rule = r
                chosen_key = k
                break
        if not chosen_rule:
            continue
        conv_by_key[(chosen_rule, date, chosen_key)][0] += int(conv or 0)
        conv_by_key[(chosen_rule, date, chosen_key)][1] += float(rev or 0.0)

    # Load ads rows
    ads_rows = cur.execute("""
      SELECT date, channel, campaign_id, campaign_name, utm_campaign, ad_id,
             impressions, clicks, cost_base
      FROM ads_daily
    """).fetchall()

    # Attach conversions to ads rows based on chain:
    # For each ads row, look up conversions if its key matches a conv group (same date).
    # We then sum at campaign level (date, channel, campaign_id)
    camp_agg = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_name":""})
    for date, channel, campaign_id, campaign_name, utm_campaign, ad_id, impr, clk, cost_base in ads_rows:
        date = date or ""
        campaign_id = campaign_id or ""
        campaign_name = campaign_name or ""
        utm_campaign = utm_campaign or ""
        ad_id = ad_id or ""
        impr = int(impr or 0); clk = int(clk or 0); cost_base = float(cost_base or 0.0)

        conv = 0; rev = 0.0
        # Try to match by chain order, but only if the conversion group is attributed to that rule.
        for r in chain:
            if r == "ad_id" and ad_id:
                v = conv_by_key.get(("ad_id", date, ad_id))
            elif r == "campaign_id" and campaign_id:
                v = conv_by_key.get(("campaign_id", date, campaign_id))
            elif r == "utm_campaign" and utm_campaign:
                v = conv_by_key.get(("utm_campaign", date, utm_campaign))
            else:
                v = None
            if v:
                conv += v[0]; rev += v[1]
                break

        key = (date, channel, campaign_id)
        a = camp_agg[key]
        a["campaign_name"] = a["campaign_name"] or campaign_name
        a["impressions"] += impr
        a["clicks"] += clk
        a["cost_base"] += cost_base
        a["conversions"] += conv
        a["revenue"] += rev

    # Build KPI rows
    kpi_rows = []
    for (date, channel, campaign_id), a in camp_agg.items():
        impr = a["impressions"]; clk = a["clicks"]; cost = a["cost_base"]; conv = a["conversions"]; rev = a["revenue"]
        ctr = (clk/impr) if impr>0 else None
        cvr = (conv/clk) if clk>0 else None
        roas = (rev/cost) if cost>0 else None
        cpa = (cost/conv) if conv>0 else None
        kpi_rows.append({
            "date": date, "channel": channel, "campaign_id": campaign_id, "campaign_name": a["campaign_name"],
            "impressions": impr, "clicks": clk, "cost_base": cost, "conversions": conv, "revenue": rev,
            "ctr": ctr, "cvr": cvr, "roas": roas, "cpa": cpa
        })
    kpi_rows.sort(key=lambda r: (r["date"], r["channel"], r["campaign_id"]))

    # Summary
    if kpi_rows:
        date_from = min(r["date"] for r in kpi_rows)
        date_to = max(r["date"] for r in kpi_rows)
    else:
        date_from = None; date_to = None

    total_cost = sum(r["cost_base"] for r in kpi_rows)
    total_rev = sum(r["revenue"] for r in kpi_rows)
    total_conv = sum(r["conversions"] for r in kpi_rows)
    roas = (total_rev/total_cost) if total_cost>0 else None
    cpa = (total_cost/total_conv) if total_conv>0 else None

    summary = {"date_from": date_from, "date_to": date_to, "total_cost_base": total_cost, "total_revenue": total_rev, "roas": roas, "cpa": cpa}

    # daily trend
    daily = defaultdict(lambda: {"cost_base":0.0,"revenue":0.0,"conversions":0})
    for r in kpi_rows:
        d = daily[r["date"]]
        d["cost_base"] += r["cost_base"]
        d["revenue"] += r["revenue"]
        d["conversions"] += r["conversions"]
    daily_rows = []
    for d in sorted(daily.keys()):
        cost = daily[d]["cost_base"]; rev = daily[d]["revenue"]
        daily_rows.append({"date": d, "cost_base": cost, "revenue": rev, "conversions": daily[d]["conversions"], "roas": (rev/cost) if cost>0 else 0})

    # top campaigns
    camp_sum = defaultdict(lambda: {"campaign_name":"","channel":"","cost_base":0.0,"revenue":0.0})
    for r in kpi_rows:
        k = (r["channel"], r["campaign_id"])
        s = camp_sum[k]
        s["channel"] = r["channel"]
        s["campaign_name"] = s["campaign_name"] or r["campaign_name"]
        s["cost_base"] += r["cost_base"]
        s["revenue"] += r["revenue"]
    top = []
    for (ch, cid), s in camp_sum.items():
        cost = s["cost_base"]; rev = s["revenue"]
        top.append({"channel": ch, "campaign_name": s["campaign_name"], "cost_base": cost, "revenue": rev, "roas": (rev/cost) if cost>0 else 0})
    top.sort(key=lambda x: x["roas"], reverse=True)
    top = top[:10]

    ads_json = {
      "generated_at": datetime.utcnow().isoformat()+"Z",
      "meta": {"base_currency": base_currency, "fx_source": fx_source, "attribution_chain": chain},
      "summary": summary,
      "trends": {"daily": daily_rows},
      "tables": {"top_campaigns": top}
    }
    (out/"dashboard_ads_kpi.json").write_text(json.dumps(ads_json, ensure_ascii=False, indent=2), encoding="utf-8")

    db.close()
    print(f"[OK] wrote JSON to {out.resolve()} (chain={' > '.join(chain)})")

if __name__ == "__main__":
    main()

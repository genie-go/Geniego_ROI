#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib
from datetime import datetime
from collections import defaultdict

def load_attribution(cur):
    row = cur.execute("SELECT config_json FROM attribution_config WHERE id=1").fetchone()
    if not row or not row[0]:
        return {"chain":["campaign_id"],"fallback":{"campaign_id":["exact"],"utm_campaign":["exact"],"ad_id":["exact"]}}
    try:
        return json.loads(row[0])
    except Exception:
        return {"chain":["campaign_id"],"fallback":{"campaign_id":["exact"],"utm_campaign":["exact"],"ad_id":["exact"]}}

def match_value(modes, ads_value, candidates_dict, candidates_list):
    # candidates_dict: exact lookup key->(conv,rev)
    # candidates_list: list of (key,(conv,rev)) for fallback scans
    if not ads_value:
        return None
    if "exact" in modes:
        if ads_value in candidates_dict:
            return candidates_dict[ads_value]
    for m in modes:
        if m == "contains":
            av = str(ads_value)
            for k, v in candidates_list:
                if not k: 
                    continue
                if (k in av) or (av in k):
                    return v
        if m == "startswith":
            av = str(ads_value)
            for k, v in candidates_list:
                if not k:
                    continue
                if av.startswith(k) or k.startswith(av):
                    return v
    return None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--out", default="out")
    p.add_argument("--fx", default="templates/v319/fx_rates.json")
    args = p.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    fx = json.loads(pathlib.Path(args.fx).read_text(encoding="utf-8"))
    base_currency = fx.get("base_currency","KRW")

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    attr = load_attribution(cur)
    chain = attr.get("chain") or ["campaign_id"]
    fallback = attr.get("fallback") or {}
    fb_summary = "; ".join([f"{k}:{'>'.join(v)}" for k,v in fallback.items()])

    # 1) conversions attributed to first available key in chain (no duplicates)
    conv_rows = cur.execute("SELECT date, campaign_id, utm_campaign, ad_id, conversions, revenue FROM conversions_daily").fetchall()

    # (rule,date) -> exact dict and list for fallback
    conv_exact = defaultdict(dict)   # (rule,date) -> {key:(conv,rev)}
    conv_list = defaultdict(list)    # (rule,date) -> [(key,(conv,rev))]
    for date, campaign_id, utm_campaign, ad_id, conv, rev in conv_rows:
        keys = {"campaign_id": campaign_id or "", "utm_campaign": utm_campaign or "", "ad_id": ad_id or ""}
        chosen_rule = None
        chosen_key = None
        for r in chain:
            k = keys.get(r, "")
            if k:
                chosen_rule = r; chosen_key = k; break
        if not chosen_rule:
            continue
        dkey = (chosen_rule, date or "")
        cur_dict = conv_exact[dkey]
        if chosen_key not in cur_dict:
            cur_dict[chosen_key] = (0, 0.0)
        cur_dict[chosen_key] = (cur_dict[chosen_key][0] + int(conv or 0), cur_dict[chosen_key][1] + float(rev or 0.0))

    # build list for fallback scanning
    for dkey, m in conv_exact.items():
        conv_list[dkey] = list(m.items())

    # 2) ads rows
    ads_rows = cur.execute("""
      SELECT date, channel, campaign_id, campaign_name, utm_campaign, ad_group_id, ad_group_name, ad_id, ad_name,
             impressions, clicks, cost_base
      FROM ads_daily
    """).fetchall()

    # aggregations
    camp = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_name":"","channel":""})
    adg = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_id":"","ad_group_name":"","channel":""})
    ad = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_id":"","ad_name":"","channel":""})

    for row in ads_rows:
        date, channel, campaign_id, campaign_name, utm_campaign, ad_group_id, ad_group_name, ad_id, ad_name, impr, clk, cost_base = row
        date = date or ""; channel = channel or ""; campaign_id = campaign_id or ""
        campaign_name = campaign_name or ""; utm_campaign = utm_campaign or ""
        ad_group_id = ad_group_id or ""; ad_group_name = ad_group_name or ""
        ad_id = ad_id or ""; ad_name = ad_name or ""
        impr = int(impr or 0); clk = int(clk or 0); cost_base = float(cost_base or 0.0)

        conv = 0; rev = 0.0
        # match by chain with fallback modes per rule
        for r in chain:
            modes = fallback.get(r, ["exact"])
            dkey = (r, date)
            exact = conv_exact.get(dkey, {})
            lst = conv_list.get(dkey, [])
            if r == "ad_id":
                v = match_value(modes, ad_id, exact, lst)
            elif r == "campaign_id":
                v = match_value(modes, campaign_id, exact, lst)
            else: # utm_campaign
                v = match_value(modes, utm_campaign, exact, lst)
            if v:
                conv += v[0]; rev += v[1]
                break

        # campaign level
        k1 = (date, channel, campaign_id)
        a1 = camp[k1]
        a1["channel"] = channel
        a1["campaign_name"] = a1["campaign_name"] or campaign_name
        a1["impressions"] += impr; a1["clicks"] += clk; a1["cost_base"] += cost_base
        a1["conversions"] += conv; a1["revenue"] += rev

        # ad group level
        k2 = (date, channel, campaign_id, ad_group_id)
        a2 = adg[k2]
        a2["channel"] = channel; a2["campaign_id"] = campaign_id
        a2["ad_group_name"] = a2["ad_group_name"] or ad_group_name
        a2["impressions"] += impr; a2["clicks"] += clk; a2["cost_base"] += cost_base
        a2["conversions"] += conv; a2["revenue"] += rev

        # ad level
        k3 = (date, channel, campaign_id, ad_id)
        a3 = ad[k3]
        a3["channel"] = channel; a3["campaign_id"] = campaign_id
        a3["ad_name"] = a3["ad_name"] or ad_name
        a3["impressions"] += impr; a3["clicks"] += clk; a3["cost_base"] += cost_base
        a3["conversions"] += conv; a3["revenue"] += rev

    def to_rows(agg, level):
        rows=[]
        for key, a in agg.items():
            cost=a["cost_base"]; rev=a["revenue"]; conv=a["conversions"]; clk=a["clicks"]; impr=a["impressions"]
            roas = (rev/cost) if cost>0 else 0.0
            cpa = (cost/conv) if conv>0 else None
            rows.append((key, {
                "level": level,
                "date": key[0],
                "channel": a.get("channel",""),
                "campaign_id": key[2] if len(key)>2 else a.get("campaign_id",""),
                "campaign_name": a.get("campaign_name",""),
                "ad_group_id": key[3] if level=="ad_group" else "",
                "ad_group_name": a.get("ad_group_name","") if level=="ad_group" else "",
                "ad_id": key[3] if level=="ad" else "",
                "ad_name": a.get("ad_name","") if level=="ad" else "",
                "impressions": impr, "clicks": clk, "cost_base": cost, "conversions": conv, "revenue": rev,
                "roas": roas, "cpa": cpa
            }))
        rows.sort(key=lambda kv: kv[1]["roas"], reverse=True)
        return [r for _, r in rows]

    campaign_rows = to_rows(camp, "campaign")
    adgroup_rows = to_rows(adg, "ad_group")
    ad_rows = to_rows(ad, "ad")

    # summary based on campaign rows (date+campaign)
    if campaign_rows:
        date_from = min(r["date"] for r in campaign_rows)
        date_to = max(r["date"] for r in campaign_rows)
    else:
        date_from = None; date_to = None
    total_cost = sum(r["cost_base"] for r in campaign_rows)
    total_rev = sum(r["revenue"] for r in campaign_rows)
    total_conv = sum(r["conversions"] for r in campaign_rows)
    roas = (total_rev/total_cost) if total_cost>0 else None
    cpa = (total_cost/total_conv) if total_conv>0 else None

    # daily trend (from campaign rows)
    daily = defaultdict(lambda: {"cost_base":0.0,"revenue":0.0,"conversions":0})
    for r in campaign_rows:
        d = daily[r["date"]]
        d["cost_base"] += r["cost_base"]; d["revenue"] += r["revenue"]; d["conversions"] += r["conversions"]
    daily_rows=[]
    for d in sorted(daily.keys()):
        cost=daily[d]["cost_base"]; rev=daily[d]["revenue"]
        daily_rows.append({"date": d, "cost_base": cost, "revenue": rev, "conversions": daily[d]["conversions"], "roas": (rev/cost) if cost>0 else 0})

    # top_any across levels
    top_any=[]
    for r in (campaign_rows[:10] + adgroup_rows[:10] + ad_rows[:10]):
        name = r.get("campaign_name") or r.get("ad_group_name") or r.get("ad_name") or r.get("campaign_id") or "-"
        lvl = r["level"]
        top_any.append({"level": lvl, "name": name, "roas": r["roas"], "cost_base": r["cost_base"], "revenue": r["revenue"], "conversions": r["conversions"]})
    top_any.sort(key=lambda x: x["roas"], reverse=True)
    top_any = top_any[:10]

    ads_json = {
      "generated_at": datetime.utcnow().isoformat()+"Z",
      "meta": {
        "base_currency": base_currency,
        "fx_source": args.fx,
        "attribution": {"chain": chain, "fallback": fallback, "fallback_summary": fb_summary}
      },
      "summary": {
        "date_from": date_from, "date_to": date_to,
        "total_cost_base": total_cost, "total_revenue": total_rev,
        "roas": roas, "cpa": cpa
      },
      "trends": {"daily": daily_rows},
      "tables": {"top_any": top_any},
      "drilldown": {
        "campaigns": campaign_rows[:200],
        "ad_groups": adgroup_rows[:200],
        "ads": ad_rows[:200]
      }
    }

    (out/"dashboard_ads_kpi.json").write_text(json.dumps(ads_json, ensure_ascii=False, indent=2), encoding="utf-8")
    db.close()
    print(f"[OK] wrote JSON to {out.resolve()} (chain={' > '.join(chain)})")

if __name__ == "__main__":
    main()

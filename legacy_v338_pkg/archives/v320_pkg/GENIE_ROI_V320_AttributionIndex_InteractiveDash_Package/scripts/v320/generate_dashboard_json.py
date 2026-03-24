#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib, re
from datetime import datetime
from collections import defaultdict

TOKEN_RE = re.compile(r"[A-Za-z0-9가-힣]+")

def load_attribution(cur, default_path="templates/v320/default_attribution.json"):
    row = cur.execute("SELECT config_json FROM attribution_config WHERE id=1").fetchone()
    if row and row[0]:
        try:
            return json.loads(row[0])
        except Exception:
            pass
    p = pathlib.Path(default_path)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {"chain":["campaign_id"],"min_score":0.8,"prefix_len":4,"rules":{}}

def apply_normalize(value: str, normalize_rules):
    v = value or ""
    for rr in normalize_rules or []:
        try:
            pat = re.compile(rr.get("pattern",""))
            rep = rr.get("replace","")
            v2 = pat.sub(rep, v)
            if v2 != v:
                v = v2
        except Exception:
            continue
    return v

def build_indexes(keys, prefix_len: int):
    # keys: iterable of strings
    exact = {}
    prefix = defaultdict(list)
    token = defaultdict(list)
    for k, val in keys:
        exact[k] = val
        pre = (k[:prefix_len] if k else "")
        if pre:
            prefix[pre].append(k)
        for t in TOKEN_RE.findall(k or ""):
            if t:
                token[t].append(k)
    return exact, prefix, token

def candidate_keys_for_contains(ads_value: str, token_index):
    cand=set()
    for t in TOKEN_RE.findall(ads_value or ""):
        for k in token_index.get(t, []):
            cand.add(k)
    return cand

def candidate_keys_for_startswith(ads_value: str, prefix_len: int, prefix_index):
    pre = (ads_value[:prefix_len] if ads_value else "")
    return set(prefix_index.get(pre, [])) if pre else set()

def regex_allow(candidate: str, regex_rules):
    # if rules empty -> allow
    if not regex_rules:
        return True
    for rr in regex_rules:
        try:
            pat = re.compile(rr.get("pattern",""))
            applies_to = rr.get("applies_to","candidate")
            if applies_to != "candidate":
                continue
            if pat.search(candidate or ""):
                return True
        except Exception:
            continue
    return False

def best_match_with_score(rule_cfg, ads_value, idx_exact, idx_prefix, idx_token, prefix_len):
    # returns (conv,rev,score,matched_key,mode) or None
    if not ads_value:
        return None

    weights = (rule_cfg.get("weights") or {})
    w_exact = float(weights.get("exact", 1.0))
    w_sw = float(weights.get("startswith", 0.9))
    w_cont = float(weights.get("contains", 0.7))
    w_regex = float(weights.get("regex", 0.85))

    whitelist = set(rule_cfg.get("whitelist") or [])
    normalize_rules = rule_cfg.get("normalize") or []
    regex_rules = rule_cfg.get("regex") or []

    av_raw = ads_value
    av = apply_normalize(av_raw, normalize_rules)

    best = None

    def consider(k, val, score, mode):
        nonlocal best
        if whitelist and k not in whitelist:
            return
        if not regex_allow(k, regex_rules):
            return
        item = (score, k, mode, val)
        if best is None or item[0] > best[0]:
            best = item

    # exact
    if av in idx_exact:
        consider(av, idx_exact[av], w_exact, "exact")

    # regex on ads_value: if match, try exact after normalize; also allow gives weight
    for rr in regex_rules:
        try:
            pat = re.compile(rr.get("pattern",""))
            applies_to = rr.get("applies_to","candidate")
            if applies_to == "ads":
                if pat.search(av_raw or ""):
                    # boost: if normalized exists in exact
                    if av in idx_exact:
                        consider(av, idx_exact[av], max(w_exact, w_regex), "regex+exact")
                    else:
                        # just mark as candidate-less; ignore
                        pass
        except Exception:
            continue

    # startswith (indexed)
    for k in candidate_keys_for_startswith(av, prefix_len, idx_prefix):
        if k and (av.startswith(k) or k.startswith(av)):
            if k in idx_exact:
                consider(k, idx_exact[k], w_sw, "startswith")

    # contains (token indexed)
    for k in candidate_keys_for_contains(av, idx_token):
        if not k:
            continue
        if (k in av) or (av in k):
            if k in idx_exact:
                consider(k, idx_exact[k], w_cont, "contains")

    if best is None:
        return None
    score, k, mode, val = best
    return (val[0], val[1], score, k, mode)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--out", default="out")
    p.add_argument("--fx", default="templates/v320/fx_rates.json")
    p.add_argument("--default-attribution", default="templates/v320/default_attribution.json")
    args = p.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    fx = json.loads(pathlib.Path(args.fx).read_text(encoding="utf-8"))
    base_currency = fx.get("base_currency","KRW")

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    attr = load_attribution(cur, args.default_attribution)
    chain = attr.get("chain") or ["campaign_id"]
    min_score = float(attr.get("min_score", 0.8) or 0.8)
    prefix_len = int(attr.get("prefix_len", 4) or 4)
    rules = attr.get("rules") or {}

    # 1) conversions attributed to first available key in chain (no duplicates)
    conv_rows = cur.execute("SELECT date, campaign_id, utm_campaign, ad_id, conversions, revenue FROM conversions_daily").fetchall()

    # first-pass attribution of conversion records to one rule
    conv_by = defaultdict(lambda: defaultdict(lambda: [0,0.0]))  # (rule,date)-> key -> [conv,rev]
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
        d = conv_by[(chosen_rule, date or "")]
        d[chosen_key][0] += int(conv or 0)
        d[chosen_key][1] += float(rev or 0.0)

    # 2) build indexes per (rule,date)
    indexes = {}
    for (rule, date), mp in conv_by.items():
        items = [(k, (v[0], v[1])) for k, v in mp.items()]
        exact, pre, tok = build_indexes(items, prefix_len)
        indexes[(rule, date)] = (exact, pre, tok)

    index_summary = f"prefix_len={prefix_len}, token_index=on"

    # 3) ads rows
    ads_rows = cur.execute("""
      SELECT date, channel, campaign_id, campaign_name, utm_campaign, ad_group_id, ad_group_name, ad_id, ad_name,
             impressions, clicks, cost_base
      FROM ads_daily
    """).fetchall()

    camp = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_name":"","channel":""})
    adg = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_id":"","ad_group_name":"","channel":""})
    ad = defaultdict(lambda: {"impressions":0,"clicks":0,"cost_base":0.0,"conversions":0,"revenue":0.0,"campaign_id":"","ad_group_name":"","ad_name":"","channel":""})

    for row in ads_rows:
        date, channel, campaign_id, campaign_name, utm_campaign, ad_group_id, ad_group_name, ad_id, ad_name, impr, clk, cost_base = row
        date = date or ""; channel = channel or ""; campaign_id = campaign_id or ""
        campaign_name = campaign_name or ""; utm_campaign = utm_campaign or ""
        ad_group_id = ad_group_id or ""; ad_group_name = ad_group_name or ""
        ad_id = ad_id or ""; ad_name = ad_name or ""
        impr = int(impr or 0); clk = int(clk or 0); cost_base = float(cost_base or 0.0)

        conv = 0; rev = 0.0
        for r in chain:
            rule_cfg = rules.get(r, {"weights":{"exact":1.0,"startswith":0.9,"contains":0.7,"regex":0.85},"whitelist":[],"normalize":[],"regex":[]})
            idx = indexes.get((r, date))
            if not idx:
                continue
            exact, pre, tok = idx
            val = None
            if r == "ad_id":
                val = best_match_with_score(rule_cfg, ad_id, exact, pre, tok, prefix_len)
            elif r == "campaign_id":
                val = best_match_with_score(rule_cfg, campaign_id, exact, pre, tok, prefix_len)
            else:
                val = best_match_with_score(rule_cfg, utm_campaign, exact, pre, tok, prefix_len)

            if val and val[2] >= min_score:
                conv += val[0]; rev += val[1]
                break

        k1 = (date, channel, campaign_id)
        a1 = camp[k1]
        a1["channel"] = channel
        a1["campaign_name"] = a1["campaign_name"] or campaign_name
        a1["impressions"] += impr; a1["clicks"] += clk; a1["cost_base"] += cost_base
        a1["conversions"] += conv; a1["revenue"] += rev

        k2 = (date, channel, campaign_id, ad_group_id)
        a2 = adg[k2]
        a2["channel"] = channel; a2["campaign_id"] = campaign_id
        a2["ad_group_name"] = a2["ad_group_name"] or ad_group_name
        a2["impressions"] += impr; a2["clicks"] += clk; a2["cost_base"] += cost_base
        a2["conversions"] += conv; a2["revenue"] += rev

        k3 = (date, channel, campaign_id, ad_group_id, ad_id)
        a3 = ad[k3]
        a3["channel"] = channel; a3["campaign_id"] = campaign_id
        a3["ad_group_name"] = a3["ad_group_name"] or ad_group_name
        a3["ad_name"] = a3["ad_name"] or ad_name
        a3["impressions"] += impr; a3["clicks"] += clk; a3["cost_base"] += cost_base
        a3["conversions"] += conv; a3["revenue"] += rev

    def to_rows_campaign(agg):
        rows=[]
        for (date, channel, campaign_id), a in agg.items():
            cost=a["cost_base"]; rev=a["revenue"]; conv=a["conversions"]
            roas=(rev/cost) if cost>0 else 0.0
            cpa=(cost/conv) if conv>0 else None
            rows.append({"date":date,"channel":channel,"campaign_id":campaign_id,"campaign_name":a["campaign_name"],
                         "impressions":a["impressions"],"clicks":a["clicks"],"cost_base":cost,"conversions":conv,"revenue":rev,
                         "roas":roas,"cpa":cpa})
        rows.sort(key=lambda r: r["roas"], reverse=True)
        return rows

    def to_rows_adgroup(agg):
        rows=[]
        for (date, channel, campaign_id, ad_group_id), a in agg.items():
            cost=a["cost_base"]; rev=a["revenue"]; conv=a["conversions"]
            roas=(rev/cost) if cost>0 else 0.0
            cpa=(cost/conv) if conv>0 else None
            rows.append({"date":date,"channel":channel,"campaign_id":campaign_id,"ad_group_id":ad_group_id,"ad_group_name":a["ad_group_name"],
                         "impressions":a["impressions"],"clicks":a["clicks"],"cost_base":cost,"conversions":conv,"revenue":rev,
                         "roas":roas,"cpa":cpa})
        rows.sort(key=lambda r: r["roas"], reverse=True)
        return rows

    def to_rows_ad(agg):
        rows=[]
        for (date, channel, campaign_id, ad_group_id, ad_id), a in agg.items():
            cost=a["cost_base"]; rev=a["revenue"]; conv=a["conversions"]
            roas=(rev/cost) if cost>0 else 0.0
            cpa=(cost/conv) if conv>0 else None
            rows.append({"date":date,"channel":channel,"campaign_id":campaign_id,"ad_group_id":ad_group_id,"ad_id":ad_id,
                         "ad_group_name":a["ad_group_name"],"ad_name":a["ad_name"],
                         "impressions":a["impressions"],"clicks":a["clicks"],"cost_base":cost,"conversions":conv,"revenue":rev,
                         "roas":roas,"cpa":cpa})
        rows.sort(key=lambda r: r["roas"], reverse=True)
        return rows

    campaign_rows = to_rows_campaign(camp)
    adgroup_rows = to_rows_adgroup(adg)
    ad_rows = to_rows_ad(ad)

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

    daily = defaultdict(lambda: {"cost_base":0.0,"revenue":0.0,"conversions":0})
    for r in campaign_rows:
        d = daily[r["date"]]
        d["cost_base"] += r["cost_base"]; d["revenue"] += r["revenue"]; d["conversions"] += r["conversions"]
    daily_rows=[]
    for d in sorted(daily.keys()):
        cost=daily[d]["cost_base"]; rev=daily[d]["revenue"]
        daily_rows.append({"date":d,"cost_base":cost,"revenue":rev,"conversions":daily[d]["conversions"],"roas":(rev/cost) if cost>0 else 0})

    top_any=[]
    def add_top(rows, level, name_fn):
        for r in rows[:10]:
            top_any.append({"level":level, "name":name_fn(r), "roas":r["roas"], "cost_base":r["cost_base"], "revenue":r["revenue"], "conversions":r["conversions"]})
    add_top(campaign_rows, "campaign", lambda r: r.get("campaign_name") or r.get("campaign_id") or "-")
    add_top(adgroup_rows, "ad_group", lambda r: r.get("ad_group_name") or r.get("ad_group_id") or "-")
    add_top(ad_rows, "ad", lambda r: r.get("ad_name") or r.get("ad_id") or "-")
    top_any.sort(key=lambda x: x["roas"], reverse=True)
    top_any = top_any[:10]

    out_json = {
      "generated_at": datetime.utcnow().isoformat()+"Z",
      "meta": {
        "base_currency": base_currency,
        "fx_source": args.fx,
        "attribution": {
          "chain": chain,
          "min_score": min_score,
          "prefix_len": prefix_len,
          "index_summary": index_summary
        }
      },
      "summary": {"date_from":date_from,"date_to":date_to,"total_cost_base":total_cost,"total_revenue":total_rev,"roas":roas,"cpa":cpa},
      "trends": {"daily": daily_rows},
      "tables": {"top_any": top_any},
      "drilldown": {
        "campaigns": campaign_rows[:500],
        "ad_groups": adgroup_rows[:1000],
        "ads": ad_rows[:2000]
      }
    }
    (out/"dashboard_ads_kpi.json").write_text(json.dumps(out_json, ensure_ascii=False, indent=2), encoding="utf-8")

    db.close()
    print(f"[OK] wrote JSON to {out.resolve()} (chain={' > '.join(chain)}, min_score={min_score})")

if __name__ == "__main__":
    main()

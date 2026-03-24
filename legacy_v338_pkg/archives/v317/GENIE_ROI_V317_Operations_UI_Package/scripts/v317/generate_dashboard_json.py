#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib
from datetime import datetime

def qone(cur, sql, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    if not row:
        return None
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))

def qall(cur, sql, params=()):
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--out", default="out")
    p.add_argument("--fx", default="templates/v317/fx_rates.json")
    args = p.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    fx_source = args.fx
    fx = json.loads(pathlib.Path(args.fx).read_text(encoding="utf-8"))
    base_currency = fx.get("base_currency","KRW")

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    rule_row = qone(cur, "SELECT rule FROM attribution_config WHERE id=1") or {"rule":"campaign_id"}
    rule = rule_row["rule"]

    # Build join condition based on rule
    if rule == "campaign_id":
        join_cond = "c.date = a.date AND c.campaign_id = a.campaign_id"
    elif rule == "utm_campaign":
        join_cond = "c.date = a.date AND c.utm_campaign != '' AND c.utm_campaign = a.campaign_id"
        # Note: 운영에서는 ads CSV에 utm_campaign을 별도 컬럼으로 넣는 경우도 많습니다.
        # 데모에서는 a.campaign_id와 utm_campaign을 맞추는 단순 규칙을 사용합니다.
    else:  # ad_id
        join_cond = "c.date = a.date AND c.ad_id != '' AND c.ad_id = a.ad_id"

    kpi_sql = f"""
      SELECT
        a.date,
        a.channel,
        a.campaign_id,
        a.campaign_name,
        SUM(a.impressions) AS impressions,
        SUM(a.clicks) AS clicks,
        SUM(a.cost_base) AS cost_base,
        COALESCE(SUM(c.conversions),0) AS conversions,
        COALESCE(SUM(c.revenue),0) AS revenue,
        CASE WHEN SUM(a.impressions) > 0 THEN CAST(SUM(a.clicks) AS REAL)/SUM(a.impressions) ELSE NULL END AS ctr,
        CASE WHEN SUM(a.clicks) > 0 THEN CAST(COALESCE(SUM(c.conversions),0) AS REAL)/SUM(a.clicks) ELSE NULL END AS cvr,
        CASE WHEN SUM(a.cost_base) > 0 THEN COALESCE(SUM(c.revenue),0)/SUM(a.cost_base) ELSE NULL END AS roas,
        CASE WHEN COALESCE(SUM(c.conversions),0) > 0 THEN SUM(a.cost_base)/COALESCE(SUM(c.conversions),0) ELSE NULL END AS cpa
      FROM ads_daily a
      LEFT JOIN conversions_daily c
        ON {join_cond}
      GROUP BY a.date, a.channel, a.campaign_id
    """

    # Summary
    summary = qone(cur, f"""
      SELECT
        MIN(date) AS date_from,
        MAX(date) AS date_to,
        SUM(cost_base) AS total_cost_base,
        SUM(revenue) AS total_revenue,
        CASE WHEN SUM(cost_base) > 0 THEN SUM(revenue)/SUM(cost_base) ELSE NULL END AS roas,
        CASE WHEN SUM(conversions) > 0 THEN SUM(cost_base)/SUM(conversions) ELSE NULL END AS cpa
      FROM ({kpi_sql})
    """) or {"date_from":None,"date_to":None,"total_cost_base":0,"total_revenue":0,"roas":None,"cpa":None}

    daily = qall(cur, f"""
      SELECT date,
             SUM(cost_base) AS cost_base,
             SUM(revenue) AS revenue,
             CASE WHEN SUM(cost_base) > 0 THEN SUM(revenue)/SUM(cost_base) ELSE 0 END AS roas,
             SUM(conversions) AS conversions
      FROM ({kpi_sql})
      GROUP BY date
      ORDER BY date
    """)

    top_campaigns = qall(cur, f"""
      SELECT channel, campaign_name,
             SUM(cost_base) AS cost_base,
             SUM(revenue) AS revenue,
             CASE WHEN SUM(cost_base) > 0 THEN SUM(revenue)/SUM(cost_base) ELSE 0 END AS roas
      FROM ({kpi_sql})
      GROUP BY channel, campaign_id
      ORDER BY roas DESC
      LIMIT 10
    """)

    ads_json = {
      "generated_at": datetime.utcnow().isoformat()+"Z",
      "meta": {
        "base_currency": base_currency,
        "fx_source": fx_source,
        "attribution_rule": rule
      },
      "summary": summary,
      "trends": {"daily": daily},
      "tables": {"top_campaigns": top_campaigns}
    }
    (out/"dashboard_ads_kpi.json").write_text(json.dumps(ads_json, ensure_ascii=False, indent=2), encoding="utf-8")

    db.close()
    print(f"[OK] wrote JSON to {out.resolve()} (rule={rule})")

if __name__ == "__main__":
    main()

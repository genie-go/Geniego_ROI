#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib
from datetime import datetime

def qall(cur, sql, params=()):
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]

def qone(cur, sql, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    if not row:
        return None
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--out", default="out")
    args = p.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    summary = qone(cur, """
      SELECT
        MIN(date) AS date_from,
        MAX(date) AS date_to,
        SUM(cost) AS total_cost,
        SUM(revenue) AS total_revenue,
        CASE WHEN SUM(cost) > 0 THEN SUM(revenue)/SUM(cost) ELSE NULL END AS roas,
        CASE WHEN SUM(conversions) > 0 THEN SUM(cost)/SUM(conversions) ELSE NULL END AS cpa
      FROM v316_ads_kpi_daily
    """) or {"date_from":None,"date_to":None,"total_cost":0,"total_revenue":0,"roas":None,"cpa":None}

    daily = qall(cur, """
      SELECT date,
             SUM(cost) AS cost,
             SUM(revenue) AS revenue,
             CASE WHEN SUM(cost) > 0 THEN SUM(revenue)/SUM(cost) ELSE 0 END AS roas,
             SUM(conversions) AS conversions
      FROM v316_ads_kpi_daily
      GROUP BY date
      ORDER BY date
    """)

    top_campaigns = qall(cur, """
      SELECT channel, campaign_name, SUM(cost) AS cost, SUM(revenue) AS revenue,
             CASE WHEN SUM(cost) > 0 THEN SUM(revenue)/SUM(cost) ELSE 0 END AS roas
      FROM v316_ads_kpi_daily
      GROUP BY channel, campaign_id
      ORDER BY roas DESC
      LIMIT 10
    """)

    ads_json = {
      "generated_at": datetime.utcnow().isoformat()+"Z",
      "summary": summary,
      "trends": {"daily": daily},
      "tables": {"top_campaigns": top_campaigns}
    }
    (out/"dashboard_ads_kpi.json").write_text(json.dumps(ads_json, ensure_ascii=False, indent=2), encoding="utf-8")

    # Influencer optional
    has_table = qone(cur, "SELECT name FROM sqlite_master WHERE type='table' AND name='influencer_scores'")
    if has_table:
        infl = qall(cur, "SELECT handle, total, fit, risk, performance FROM influencer_scores ORDER BY total DESC LIMIT 50")
        avg = qone(cur, "SELECT AVG(total) AS avg_total, AVG(fit) AS avg_fit, AVG(risk) AS avg_risk, AVG(performance) AS avg_perf FROM influencer_scores") or               {"avg_total":0,"avg_fit":0,"avg_risk":0,"avg_perf":0}
        infl_json = {"generated_at": datetime.utcnow().isoformat()+"Z", "summary": avg, "tables": {"influencers": infl}}
        (out/"dashboard_influencer_kpi.json").write_text(json.dumps(infl_json, ensure_ascii=False, indent=2), encoding="utf-8")

    db.close()
    print(f"[OK] wrote JSON to {out.resolve()}")

if __name__ == "__main__":
    main()

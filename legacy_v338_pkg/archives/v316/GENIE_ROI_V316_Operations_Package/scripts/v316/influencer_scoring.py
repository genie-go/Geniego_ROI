#!/usr/bin/env python3
import argparse, json, sqlite3, pathlib

def load_json(path):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def fit_score(target: dict, actual: dict) -> float:
    if not target:
        return 50.0
    scores = []
    for k, req in target.items():
        req = float(req or 0)
        if req <= 0:
            continue
        act = float(actual.get(k, 0) or 0)
        scores.append(clamp(act/req, 0.0, 1.0))
    if not scores:
        return 50.0
    return sum(scores)/len(scores)*100.0

def load_demo(cur, influencer_id: str, dim: str):
    cur.execute("SELECT key, pct FROM audience_demographics WHERE influencer_id=? AND dimension=?", (influencer_id, dim))
    return {k: float(p) for (k,p) in cur.fetchall()}

def perf_score(cur, influencer_id: str) -> float:
    cur.execute(
        """SELECT COALESCE(SUM(link_clicks),0), COALESCE(SUM(conversions),0), COALESCE(SUM(revenue),0)
             FROM influencer_campaign_results WHERE influencer_id=?""",
        (influencer_id,),
    )
    clicks, conv, rev = cur.fetchone()
    s = 0.0
    s += min(clicks/500.0, 1.0)*40.0
    s += min(conv/50.0, 1.0)*30.0
    s += min(rev/5000000.0, 1.0)*30.0
    return s

def risk_score(cur, influencer_id: str, w_fake: float, w_susp: float) -> float:
    cur.execute(
        """SELECT fake_follower_pct, suspicious_engagement_pct
             FROM fraud_estimates WHERE influencer_id=? ORDER BY collected_at DESC LIMIT 1""",
        (influencer_id,),
    )
    row = cur.fetchone()
    if not row:
        return 20.0
    fake, susp = row
    return clamp(w_fake*float(fake) + w_susp*float(susp), 0.0, 100.0)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--weights", default="templates/v316/weights.json")
    p.add_argument("--target", default="templates/v316/target_demographics.json")
    args = p.parse_args()

    W = load_json(args.weights)["influencer_scoring"]
    T = load_json(args.target)

    db = sqlite3.connect(args.db)
    db.execute("PRAGMA foreign_keys=ON;")
    cur = db.cursor()

    cur.execute("DELETE FROM influencer_scores")
    cur.execute("SELECT influencer_id, handle FROM influencers ORDER BY influencer_id")
    infls = cur.fetchall()

    for influencer_id, handle in infls:
        country_fit = fit_score(T.get("country",{}), load_demo(cur, influencer_id, "country"))
        gender_fit = fit_score(T.get("gender",{}), load_demo(cur, influencer_id, "gender"))
        age_fit = fit_score(T.get("age_band",{}), load_demo(cur, influencer_id, "age_band"))

        fit = (W["fit"]["w_country"]*country_fit +
               W["fit"]["w_gender"]*gender_fit +
               W["fit"]["w_age"]*age_fit)

        risk = risk_score(cur, influencer_id, W["risk"]["w_fake_follower"], W["risk"]["w_suspicious_engagement"])
        perf = perf_score(cur, influencer_id)

        total = W["w_fit"]*fit + W["w_perf"]*perf - W["w_risk"]*risk

        cur.execute(
            "INSERT INTO influencer_scores(influencer_id, handle, total, fit, risk, performance) VALUES(?,?,?,?,?,?)",
            (influencer_id, handle, total, fit, risk, perf),
        )

    db.commit()
    db.close()
    print(f"[OK] scored influencers={len(infls)}")

if __name__ == "__main__":
    main()

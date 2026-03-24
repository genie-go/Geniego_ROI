#!/usr/bin/env python3
"""인플루언서 점수 자동 계산 엔진(가중치 파일 기반)

- weights.json의 상위 가중치(fit/quality/performance/risk)를 읽어 점수 합산
- 입력 데이터는 DB(v315_influencer_content_kpi, influencers 등)를 참조
- 결과는 influencer_scores 테이블에 run_id 단위로 저장

주의:
  실제 'audience_match', 'fake_follower_signals' 등은 외부 데이터(크리에이터 인사이트/툴)에서 들어오는 값이므로
  여기서는 'placeholder' 규칙(간단한 휴리스틱)으로 예시를 제공합니다.
"""
from __future__ import annotations
import argparse, json, sqlite3, uuid
from pathlib import Path
import pandas as pd
import numpy as np

def load_weights(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, float(x)))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--weights", default="templates/v315/weights.json")
    ap.add_argument("--run_note", default="auto scoring")
    args=ap.parse_args()

    root=Path(__file__).resolve().parents[2]
    w=load_weights(root/args.weights)["influencer_scoring"]
    W_fit, W_quality, W_perf, W_risk = w["fit"], w["quality"], w["performance"], w["risk"]

    conn=sqlite3.connect(args.db)

    # 콘텐츠 KPI 집계(인플루언서별)
    df=pd.read_sql_query("""
      SELECT influencer_id,
             AVG(engagement_rate) AS avg_er,
             SUM(views) AS views,
             SUM(link_clicks) AS link_clicks
      FROM v315_influencer_content_kpi
      GROUP BY influencer_id
    """, conn)

    if df.empty:
        raise SystemExit("인플루언서 콘텐츠 데이터가 없습니다. influencer_content / influencers를 먼저 적재하세요.")

    # 간단 휴리스틱 예시(0~100 스케일)
    # fit: 카테고리/브랜드 일치 여부는 외부 입력이 필요 -> 여기서는 category 존재 여부로 60~80 랜덤 보정
    inf=pd.read_sql_query("SELECT influencer_id, category, followers FROM influencers", conn)
    merged=df.merge(inf, on="influencer_id", how="left")

    # quality: ER 기반(ER*1000 정도를 0~100에 매핑)
    merged["score_quality"]= (merged["avg_er"]*1000).clip(0,100)

    # performance: views/link_clicks를 로그스케일로 정규화
    merged["score_performance"]= ( (merged["views"].apply(lambda x: 10*np.log10(max(x,1))) +
                                     merged["link_clicks"].apply(lambda x: 20*np.log10(max(x,1))) )
                                   ).clip(0,100)

    # fit placeholder
    merged["score_fit"]= merged["category"].apply(lambda c: 75.0 if isinstance(c,str) and c.strip() else 60.0)

    # risk placeholder: 팔로워 대비 ER이 너무 낮으면 리스크 점수(낮을수록 좋음) 높게(=감점) 처리
    # 여기서는 risk 점수 자체를 0~100(높을수록 좋음)로 두고, 이상치면 감소
    merged["score_risk"]= (100 - (merged["followers"].fillna(0).apply(lambda f: 0) + (0.02 - merged["avg_er"]).clip(lower=0)*5000)).clip(0,100))

    merged["score_total"]= (merged["score_fit"]*W_fit + merged["score_quality"]*W_quality + merged["score_performance"]*W_perf + merged["score_risk"]*W_risk)

    run_id=str(uuid.uuid4())
    conn.execute("INSERT INTO influencer_vetting_runs(run_id, notes) VALUES (?,?)", (run_id, args.run_note))
    conn.executemany(
      """INSERT INTO influencer_scores(run_id, influencer_id, score_total, score_fit, score_quality, score_performance, score_risk)
         VALUES (?,?,?,?,?,?,?)""",
      [(run_id, r.influencer_id, float(r.score_total), float(r.score_fit), float(r.score_quality), float(r.score_performance), float(r.score_risk))
       for r in merged.itertuples(index=False)]
    )
    conn.commit()
    print(f"OK: scored {len(merged)} influencers (run_id={run_id})")

if __name__=='__main__':
    main()

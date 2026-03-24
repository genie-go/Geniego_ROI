# V316 인플루언서 Risk/Fit 스키마

V316은 인플루언서 점수화를 “운영 가능한 입력 구조”로 고정합니다.

## 1) 오디언스 분포(audience_demographics)
- dimension: country / gender / age_band
- key: KR/US, female/male, 18-24/25-34 등
- pct: 0~100

## 2) 사기 추정치(fraud_estimates)
- fake_follower_pct (가짜 팔로워 %)
- suspicious_engagement_pct (의심 참여율 %)

## 3) 점수 엔진 개념
- Fit(적합도): 타겟 분포와의 일치 정도(0~100)
- Risk(리스크): fake/suspicious 결합(0~100, 높을수록 위험)
- Performance(성과): 클릭/전환/매출 기반(데모에서는 soft cap으로 정규화)

총점:
Total = w_fit*Fit + w_perf*Performance - w_risk*Risk

가중치:
templates/v316/weights.json 에서 조정

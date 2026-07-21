# ADR — MEA Part 020 Enterprise ROI Optimization & Continuous Improvement Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part020 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 020은 ROI Optimization & Continuous Improvement(분석→예측→의사결정→실행 Closed-Loop·ROI Platform 마지막 계층). ★코드베이스에는 **폐루프 최적화가 이미 실재**: `AutoRecommend.php`(자가학습 폐루프·EWMA prior 누적·per-tenant·shrinkage·251차 marketing self-learning·실행 성과→다음 추천 정밀화·★무회귀 MIN_PRIOR_SAMPLE·GT①)·`Mmm::optimize`(POST /v424/mmm/optimize·greedy budget reallocation·GT①)·`Mmm::frontier`(ROI 최적화)·`AutoCampaign`(auto_campaign)·`AbTesting`(개선 측정). 본 Part는 Part 013~019/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013~019/Data Platform 재정의 금지):** ROI/이익 값(Part 013/016)·KPI(Part 015)·Forecast(Part 017)·Decision(Part 018)·Dashboard(Part 019)를 준수·인용. Optimization 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (폐루프 최적화 = AutoRecommend/Mmm 승격·★중복 최적화 절대 금지):** 폐루프 = `AutoRecommend`(자가학습·EWMA prior·per-tenant·251차)·Budget Reallocation=`Mmm::optimize`(greedy allocate)·ROI 최적화=`Mmm::frontier`. ★"실행 결과=다음 Cycle 입력"(§7)=이미 `AutoRecommend` 자가학습으로 구현(성과→prior 정밀화). ★무회귀(MIN_PRIOR_SAMPLE 미만=전역 benchmark) 준수. ★중복 최적화/추천 엔진 신설 절대 금지(값 분산=회귀). 형식 Continuous Improvement Manager는 폐루프를 래핑(최적화 재구현 아님).
- **D-3 (Goal Management = objective 승격·형식 신설):** Goal seed = objective 퍼널(220차)+`AutoRecommend`(objective). ★Goal은 KPI/ROI 연결(Part 015·Part 013). 형식 Goal Management Service(Strategic/Business Goal·Alignment/Tracking)=순신설(Part 019 Strategic Objective ABSENT 정합·중복 KPI 집계 금지).
- **D-4 (Improvement Tracking/Monitoring = 기존 승격·형식 신설):** 실측 성과=`Rollup`/`Pnl`(SSOT)·개선 측정=`AbTesting`·Risk=`Alerting`/`AnomalyDetection`. ★형식 Performance Improvement Tracker(Planned vs Actual·Benefit Realization·Continuous Improvement Score)=순신설(중복 성과 계산 금지·기존 SSOT 파생).
- **D-5 (Security/AI/Approval = 헌법·무후퇴 정합):** Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`·Approval Control=헌법 V5(안전 자동화·검증데이터+승인정책+로그+롤백). AI(개선 추천/ROI 예측/Resource 최적화)=`AutoRecommend`/`Mmm`·Explainability=헌법 V4·★AI 개선 계획 자동 승인/운영 직접 적용 불가=헌법 V5+V3+`CHANGE_GATE`(Human Approval). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013~019/Data Platform/헌법 상속·재정의 금지·폐루프 최적화(`AutoRecommend`/`Mmm`)·개선 측정(`AbTesting`)·실측 성과(`Rollup`/`Pnl`)·`SecurityAudit` 재사용(★중복 최적화/추천 절대 금지)·형식 Continuous Improvement Manager·Goal Management Service·Improvement Tracker만 신설(최적화 재구현 없이). 실행은 선행 Part 001~019 종속. ★ROI Intelligence Platform(Part 013~020) 설계 완료.

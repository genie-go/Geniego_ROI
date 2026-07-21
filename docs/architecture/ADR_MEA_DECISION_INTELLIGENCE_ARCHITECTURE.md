# ADR — MEA Part 018 Enterprise Decision Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part018 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 018은 Decision Intelligence(최적 의사결정 지원·최상위 계층). ★코드베이스에는 **추천/룰엔진/의사결정이 이미 실재**: `AutoRecommend.php`(/v424/marketing/auto-recommend·budget/objective/guardrails·benchmark·learned prior·GT①)·`RuleEngine.php`(IF-THEN 범용 룰엔진·rule_engine·ACTIONS[alert/webhook/pause_channel/reorder]·rule_log·tenant 격리·GT①)·`Decisioning.php`(v418.1 decisioning score=performance*reachable audience·no-PII·GT①)·`Mmm::frontier`(budget allocation)·`Insights`(aggregate 근거). ★단 289차 EPIC 06-A에서 **Approval/Decision Authority 개념 자체가 ABSENT**로 판정됨(11회차). 본 Part는 Part 013~017/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013~017/Data Platform 재정의 금지):** ROI/이익 값(Part 013/016)·KPI(Part 015)·Forecast(Part 017)·Metadata(Part 004)·Certification/Trust First(Part 006/008)를 준수·인용. Decision 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (추천 = AutoRecommend/Mmm 승격·★중복 추천 절대 금지):** 추천 = `AutoRecommend`(ROI 기반·benchmark·learned prior·guardrails)·Budget Allocation=`Mmm`(frontier·T*)·Pricing=`PriceOpt`. ★근거(Evidence) 필수=`Insights`(aggregate)+XAI(헌법 V4). ★마케팅 폐루프(251차 self-learning)·learned prior 재사용. ★중복 추천 엔진 신설 절대 금지(값 분산=회귀). 형식 통합 Decision Engine은 추천을 래핑(추천 재구현 아님).
- **D-3 (Rule Engine = RuleEngine 승격):** Business Rule Engine = `RuleEngine`(IF-THEN·rule_engine 테이블·ACTIONS·rule_log·tenant 격리·GT①). ★마케팅 RuleEngine=KEEP_SEPARATE(289차 Part3-5 판정)이나 Decision Rule seed로 인용. 형식 Business Rule Version/Conflict 탐지=순신설(중복 룰엔진 금지).
- **D-4 (Governance = 승인정책·★Decision Authority ABSENT 명시):** Decision Policy/Approval=EPIC 06-A(승인정책·헌법 V5 안전 자동화·검증데이터+승인정책+로그+롤백)·Delegation=RBAC 부여상한(289차 12회차). ★**Decision/Approval Authority 개념 자체=ABSENT**(289차 11회차 재확인·오탐 금지). 형식 Decision Governance Manager=순신설(선행 Authority foundation 종속).
- **D-5 (Simulation/KB/AI/Security = 헌법·무후퇴 정합):** Simulation seed=`Mmm`(PROFIT(T))+Part 017 Forecast·KB=`RuleEngine`(rule_log)+learned prior+챗봇 지식(270차)·Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`·Encryption=`Crypto`. AI(추천/패턴/위험)=`AutoRecommend`/`AnomalyDetection`·Explainability=헌법 V4·★AI 최종 의사결정 승인/자동 실행 불가=헌법 V5+V3+`CHANGE_GATE`(Human-in-the-Loop). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013~017/Data Platform/헌법 상속·재정의 금지·추천(`AutoRecommend`/`Mmm`)·룰엔진(`RuleEngine`)·의사결정 스코어(`Decisioning`)·근거(`Insights`)·`SecurityAudit` 재사용(★중복 추천/룰엔진 절대 금지)·형식 통합 Decision Engine·Knowledge Repository·Simulation·Governance Manager만 신설(추천 재구현 없이·Decision Authority foundation 선행 종속). 실행은 선행 Part 001~017 + EPIC 06-A Authority foundation 종속.

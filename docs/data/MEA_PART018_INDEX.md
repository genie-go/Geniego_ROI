# MEA Part 018 — Enterprise Decision Intelligence Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART018_DECISION_INTELLIGENCE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§18 |
| 2 | ADR | `docs/architecture/ADR_MEA_DECISION_INTELLIGENCE_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART018_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART018_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART018_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§16 |
| 6 | GOVERNANCE | `docs/data/MEA_PART018_GOVERNANCE_MECHANISMS.md` | §7~§18 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART018_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL / ABSENT-formal.** ★추천·룰엔진·의사결정 스코어는 **실재**: `AutoRecommend`(ROI 기반·benchmark·learned prior·guardrails·마케팅 폐루프 251차)·`Mmm`(budget allocation frontier)·`RuleEngine`(IF-THEN·rule_engine·ACTIONS·rule_log·tenant 격리)·`Decisioning`(segment score·no-PII)·`Insights`(aggregate 근거·XAI 헌법 V4)이나, **형식 통합 Enterprise Decision Engine·Decision Knowledge Repository·Simulation Engine·Governance Manager는 미완이며 ★Decision/Approval Authority 개념 자체가 ABSENT**(289차 EPIC 06-A 11회차 판정). ★중복 추천/룰엔진 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·★AI 최종 의사결정 승인/자동 실행 불가(V5+V3+CHANGE_GATE·Human-in-the-Loop). 코드 변경 0.

## 상속·다음
- 상속: MEA Part 013(ROI)+014(Calc)+015(KPI)+016(Profit)+017(Forecast)+Data Platform(001~012)+EPIC 06-A(Authority)+헌법 V3/V4/V5.
- 다음: **MEA Part 019 — Enterprise Executive Intelligence & Strategic Dashboard Architecture**(본 Decision Intelligence 상속·확장).

## ROI Intelligence Platform 진행 (Part 013~018 완료)
Part 013 ROI Foundation · 014 Calc Engine · 015 KPI Management · 016 Profit Intelligence · 017 Forecast & Predictive · **018 Decision Intelligence** → 다음 019 Executive Intelligence.

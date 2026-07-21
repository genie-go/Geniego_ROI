# MEA Part 017 — Enterprise Forecast & Predictive Intelligence Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART017_FORECAST_PREDICTIVE_INTELLIGENCE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§18 |
| 2 | ADR | `docs/architecture/ADR_MEA_FORECAST_PREDICTIVE_INTELLIGENCE_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART017_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART017_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART017_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§16 |
| 6 | GOVERNANCE | `docs/data/MEA_PART017_GOVERNANCE_MECHANISMS.md` | §7~§18 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART017_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal.** ★예측은 **실 강함**: `DemandForecast`(Holt-Winters/Holt/MA 자동선택·sMAPE·"날조 금지"·계절)·`ModelMonitor`(ml_models/ml_model_metrics/ml_retrain_log·drift_score·auto_retrain·retrain_threshold=0.15·drift-report/check API)·`CustomerAI`(churn/purchase_prob·Klaviyo 수준)·`Mmm`(이익/ROI frontier)·`AnomalyDetection`(이상)이나, **형식 통합 Enterprise Forecast Engine(도메인별 산재)·완전 Prediction Model Registry(Version/Owner)·Scenario Prediction Engine(Best/Worst/Monte Carlo)·Forecast Scheduler·Event 표준은 미완**(Part 013~016 동일). ★중복 예측/모델 모니터 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·AI 모델 자동 배포/승인 불가(V3+CHANGE_GATE). 코드 변경 0.

## 상속·다음
- 상속: MEA Part 013(ROI)+014(Calc)+015(KPI)+016(Profit)+Data Platform(001~012)+헌법 V3/V4.
- 다음: **MEA Part 018 — Enterprise Decision Intelligence Architecture**(본 Forecast/Predictive 상속·확장).

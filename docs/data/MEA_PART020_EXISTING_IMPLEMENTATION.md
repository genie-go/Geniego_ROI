# MEA Part 020 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 020 SPEC/ADR.

## 전수조사 방법
optimize/closed-loop/self-learn/improvement/reallocat/guardrail/rollback/objective/ab-test 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★폐루프 최적화·자가학습)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| 자가학습 폐루프 | ★EWMA prior 누적·per-tenant | `AutoRecommend.php`(자가학습:171~177·LEARN_WINDOW·무회귀 MIN_PRIOR_SAMPLE) | PARTIAL-strong |
| Budget Reallocation | greedy 반응곡선 배분 | `Mmm.php`(optimize:209~241) | PARTIAL-strong |
| ROI 최적화 | 이익 효율 프론티어 | `Mmm.php`(frontier·T*) | PARTIAL-strong |
| Campaign 최적화 | auto_campaign | `AutoCampaign.php`(:45) | PARTIAL |
| 개선 측정 | A/B 테스트 | `AbTesting.php` | PARTIAL |
| Pricing 최적화 | 가격 최적화 | `PriceOpt.php` | PARTIAL |
| AI Model 최적화 | 재학습 | `ModelMonitor.php`(retrain) | PARTIAL |
| 실측 성과(SSOT) | ROI/KPI/Profit | `Rollup.php`·`Pnl.php` | PARTIAL-strong |
| Goal seed | objective 퍼널 | (220차 objective)·`AutoRecommend` | PARTIAL-informal |
| Risk/안전 | 알림·이상·승인정책 | `Alerting`·`AnomalyDetection`·헌법 V5 | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Continuous Improvement (grep 0 또는 산재)
형식 Enterprise ROI Optimization Engine(통합)·Continuous Improvement Manager·Goal Management Service(Strategic Goal·Alignment/Tracking)·Performance Improvement Tracker(Planned vs Actual·Benefit Realization·Cost/Time Saving)·Continuous Improvement Score·Optimization Simulation Engine(형식)·Optimization Plan/Status 형식 관리·Event 표준(ImprovementGoalCreated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★폐루프 최적화·자가학습은 **실재**: `AutoRecommend`(자가학습 폐루프·EWMA prior 누적·per-tenant·shrinkage·251차 marketing self-learning·실행 성과→다음 추천 정밀화·★무회귀)·`Mmm::optimize`(greedy budget reallocation)·`Mmm::frontier`(ROI 최적화)·`AbTesting`(개선 측정)·`Rollup`/`Pnl`(실측 성과 SSOT)이나, **형식 Enterprise ROI Optimization Engine·Continuous Improvement Manager·Goal Management Service·Improvement Tracker(Planned vs Actual/Benefit Realization)는 부재**(Part 013~019 동일). 실행은 선행 Part 001~019 + 형식 Continuous Improvement 계층 신설(최적화 재구현 없이) 종속. ★ROI Platform 마지막 계층.

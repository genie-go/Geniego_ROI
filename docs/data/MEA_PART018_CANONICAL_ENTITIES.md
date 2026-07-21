# MEA Part 018 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★AutoRecommend/Mmm/RuleEngine/Decisioning/Insights 재사용·형식 통합 Decision Engine greenfield·Part 013~017 상속·Approval Authority ABSENT.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DECISION | 코드 내재 의사결정 | `Decisioning.php`·`AutoRecommend.php` | PARTIAL |
| 2 | DECISION_REQUEST | 추천 요청(budget/objective) | `AutoRecommend.php`(:31) | PARTIAL |
| 3 | DECISION_RESULT | 추천안·액션 | `AutoRecommend`·`RuleEngine`(rule_log) | PARTIAL |
| 4 | DECISION_OPTION | 채널/예산 옵션 | `Mmm.php`(frontier) | PARTIAL |
| 5 | DECISION_SCENARIO | PROFIT(T) 시나리오 | `Mmm`·Part 017 | PARTIAL |
| 6 | DECISION_POLICY | 승인정책·guardrails | EPIC 06-A·`AutoRecommend`(guardrails) | PARTIAL(원칙) |
| 7 | DECISION_RULE | IF-THEN 규칙 | `RuleEngine.php`(rule_engine:41) | PARTIAL-strong |
| 8 | DECISION_SCORE | decisioning score | `Decisioning.php`(:307) | PARTIAL |
| 9 | DECISION_PRIORITY | ROI 우선순위 | `AutoRecommend`(ROI 기반) | PARTIAL |
| 10 | DECISION_APPROVAL | 승인(★Authority ABSENT) | EPIC 06-A(11회차) | ABSENT-formal |
| 11 | DECISION_REASON | 근거(Evidence)·XAI | `Insights.php`·헌법 V4 | PARTIAL |
| 12 | DECISION_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 13 | DECISION_KNOWLEDGE | rule_log·learned prior | `RuleEngine`·`AutoRecommend`(:199) | PARTIAL-informal |
| 14 | DECISION_RECOMMENDATION | ROI 추천 | `AutoRecommend.php` | PARTIAL-strong |
| 15 | DECISION_STATUS | 규칙 활성/토글 | `RuleEngine`(toggle) | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(12)**: Marketing=AutoRecommend/Mmm·Commerce/Logistics=RuleEngine(reorder/pause_channel)·Customer=Decisioning·Financial=Pnl/Mmm.
- **§7 Workflow(10)**: AutoRecommend(요청→추천)·RuleEngine(평가→액션→log)·승인=EPIC 06-A·형식 통합 Workflow Manager=부분.
- **§8 Recommendation(10)**: ROI 우선순위/Budget=AutoRecommend/Mmm·Pricing=PriceOpt·근거 필수=Insights/XAI. 실재 강함.
- **§9 Simulation(8)**: Mmm PROFIT(T)·Part 017 Forecast·형식 Decision Simulation Engine(Monte Carlo)=ABSENT.
- **§10 Governance(8)**: 승인정책(V5)·Delegation=RBAC·★Decision/Approval Authority=ABSENT(11회차)·형식 Governance Manager=ABSENT.
- **§11 Knowledge Base(8)**: rule_log·learned prior·챗봇 지식(270차)·형식 Knowledge Repository=ABSENT.
- **§12 Security**: Tenant/RBAC/Audit/Encryption/Policy Protection(Part 001~017 상속).
- **§16 AI**: 추천=AutoRecommend·이상=AnomalyDetection·Explainability=헌법 V4·★최종 의사결정 승인/자동 실행 불가=헌법 V5+V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§7 DECISION_RULE·§12·§14=룰/감사/추천) / PARTIAL(§1~9·§11·§13·§15) / ABSENT-formal(§10 DECISION_APPROVAL=Authority ABSENT·형식 통합 Decision Engine/Knowledge Repository/Simulation/Governance Manager).** 코드 0. ★추천(`AutoRecommend`/`Mmm`)·룰엔진(`RuleEngine`)·의사결정 스코어(`Decisioning`)·근거(`Insights`) 재사용(★중복 추천/룰엔진 절대 금지)·형식 통합 Decision Engine 신설(추천 재구현 없이·Authority foundation 종속)·Part 013~017 상속·★AI 최종 의사결정 승인/자동 실행 불가(V5+V3+CHANGE_GATE).

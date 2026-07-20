# DSAR — EACIF Ground-Truth ① Existing Implementation (Part 3-32)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR: Part 3-32 계보. 본 문서는 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH).

## 전수조사 방법
innovation/experiment/ab-test/feature-flag/pilot/rollout/canary/backlog/idea/kpi 키워드로 `backend/src`·`frontend/src`·`docs` 전수 grep + 판독.

## 실존 substrate (형식 Innovation Governance 아님·실험 자산 실재·강함)
| EACIF 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Experimentation(A/B) | 베이지안 A/B `pickBest`·다목표 UCB | `Handlers/AbTesting.php` | PARTIAL-strong(공용 실험 엔진 실재) |
| Tenant Pilot/Experiment | onsite CRO 변형배정/전환 | `Handlers/Onsite.php` | PARTIAL(원장+레이트리밋) |
| Feature Preview/A-B | 웹팝업 A/B(264차) | `Handlers/WebPopupCampaign.php` | PARTIAL |
| Approval Workflow | pending_approval(캠페인/가격)·maker-checker·high_value | `Handlers/Catalog.php`·`Alerting.php` | PARTIAL(Innovation 승인단계 부재) |
| Feature Flag(비형식) | plan 게이트·IS_DEMO | `PlanPolicy.php`·프론트 IS_DEMO | PARTIAL(owner/expiration/retirement 부재) |
| Idea/Backlog | 세션 인계 백로그 | `NEXT_SESSION.md`·`docs/` | 비형식 |
| Opportunity(AI Recommendation) | AutoRecommend·Decisioning | `AutoRecommend.php`·`Decisioning.php` | KEEP_SEPARATE(마케팅·오흡수 주의) |
| Evidence/Isolation | 해시체인·격리 | `SecurityAudit.php`·`Db.php` | 실재 |

## 부재(ABSENT) — 형식 EACIF 엔티티 (grep 0)
Innovation Registry · Innovation Governance · Innovation Lifecycle Engine(Discover~Standardize) · Idea Management(Duplicate Detection/Category) · Opportunity Discovery(통합) · Innovation Backlog Manager(형식) · Feature Evaluation/Business Value/Technical Feasibility/Risk Assessment Engine · Innovation Approval Workflow(형식 7단계) · Pilot Management(형식) · Controlled Rollout(Canary/Blue-Green 형식·죽은 terraform=KEEP_SEPARATE) · Feature Flag Governance · Innovation KPI(velocity/MTTI) · Snapshot/Digest · Innovation Analytics/Drift/Revalidation.

## 판정
**PARTIAL-strong / ABSENT-formal.** AbTesting(베이지안 A/B)·Onsite CRO·WebPopup A/B·pending_approval·plan 게이트·SecurityAudit·Db 격리는 실재(실험 자산 강함)하나, 형식 Innovation Lifecycle·Idea Management·Feature Flag Governance·Innovation KPI는 전무. 실행은 선행 Part 인증 종속.

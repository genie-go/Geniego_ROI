# DSAR — EACIF Canonical Entities Design & Judgment (Part 3-32 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_INNOVATION_REGISTRY | 부재 | — | ABSENT |
| 2 | APPROVAL_IDEA | 비형식 백로그 | `NEXT_SESSION.md` | PARTIAL-informal |
| 3 | APPROVAL_OPPORTUNITY | AI Recommendation(마케팅=KEEP_SEPARATE) | `AutoRecommend.php` | ABSENT-formal |
| 4 | APPROVAL_INNOVATION_BACKLOG | 세션 인계 백로그 | `NEXT_SESSION.md` | PARTIAL-informal |
| 5 | APPROVAL_EXPERIMENT | ★베이지안 A/B `pickBest`·다목표 UCB | `AbTesting.php` | PARTIAL-strong(공용 엔진 재사용) |
| 6 | APPROVAL_PILOT | onsite CRO·웹팝업 A/B | `Onsite.php`·`WebPopupCampaign.php` | PARTIAL |
| 7 | APPROVAL_FEATURE_FLAG | plan 게이트·IS_DEMO(비형식) | `PlanPolicy.php` | PARTIAL(owner/expiration 신설) |
| 8 | APPROVAL_VALUE_ASSESSMENT | 부재 | — | ABSENT |
| 9 | APPROVAL_FEASIBILITY_REPORT | 부재 | — | ABSENT |
| 10 | APPROVAL_RISK_ASSESSMENT | 부재(비즈니스 Risk=KEEP_SEPARATE) | — | ABSENT-formal |
| 11 | APPROVAL_INNOVATION_DECISION | pending_approval·maker-checker | `Catalog.php`·`Alerting.php` | PARTIAL(Innovation 결정단계 신설) |
| 12 | APPROVAL_INNOVATION_KPI | 부재(velocity/MTTI 미집계) | — | ABSENT |
| 13 | APPROVAL_INNOVATION_SNAPSHOT | 부재 | — | ABSENT |
| 14 | APPROVAL_INNOVATION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 15 | APPROVAL_INNOVATION_DIGEST | 부재 | — | ABSENT |
| 16 | APPROVAL_INNOVATION_ANALYTICS | 부재 | — | ABSENT |
| 17 | APPROVAL_INNOVATION_DRIFT | 부재(ModelMonitor=KEEP_SEPARATE) | — | ABSENT |
| 18 | APPROVAL_INNOVATION_REVALIDATION | 부재 | — | ABSENT |
| 19 | APPROVAL_INNOVATION_VERSION | 부재 | — | ABSENT |
| 20 | APPROVAL_INNOVATION_STATUS | 부재 | — | ABSENT |

## 도메인 설계 계약(§3~§22 요지)
- **§3 Innovation Lifecycle(Discover~Standardize)**: 11단계 상태머신 순신설. 현 실험(AbTesting)은 Validate/Pilot/Measure 단계 substrate.
- **§7 Experimentation Framework**: ★`AbTesting` 베이지안 엔진 재사용(A/B·Canary·Shadow). Shadow Deployment/Regional Pilot은 인프라 종속 신설.
- **§12 Approval Workflow(7단계)**: pending_approval/maker-checker/high_value 확장(Technical/Security/Compliance/Executive Review 단계 신설).
- **§14 Controlled Rollout·§15 Feature Flag Governance**: plan 게이트 형식화 + ★죽은 terraform blue-green(PRESENT 오판 금지)·Feature Flag owner/expiration/retirement 신설.
- **§16 Innovation KPI**: Innovation Velocity·Deployment Frequency·MTTI 순신설(현 배포는 수동 pscp라 Deployment Frequency 미집계).

## 판정
**PARTIAL-strong(§5 Experiment=AbTesting·§6 Pilot=Onsite/WebPopup·§7 Flag=plan게이트·§11 Decision=pending_approval·§14 Evidence=SecurityAudit) / ABSENT-formal(Lifecycle·Idea Management·Value/Feasibility/Risk Assessment·KPI velocity/MTTI·Analytics/Drift).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 AbTesting/Onsite/pending_approval/plan 게이트 확장(별도 실험/승인 엔진 신설 금지).

# ADR — Enterprise Authorization Continuous Innovation Framework (Part 3-32)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_32_CONTINUOUS_INNOVATION_FRAMEWORK_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EACIF_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EACIF_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-32는 운영 이후 지속 적응(Continuous Discovery/Experimentation/Delivery/Learning/Governance)을 Innovation Lifecycle로 통합한다. 본 ADR은 설계 결정과 현행 실험 substrate(비교적 강함) 대비 판정을 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 Innovation Governance 순신설)**: Innovation Registry/Lifecycle Engine(Discover~Standardize)·Idea Management·Feature Flag Governance·Innovation KPI(velocity/MTTI)는 신설(grep 0).
- **D-2 (실험 엔진 재사용·중복 신설 금지)**:
  - Experimentation Framework → `AbTesting`(베이지안 `pickBest`·다목표 UCB) 공용 엔진 재사용(A/B/Canary 실험). Onsite CRO(`Onsite.php`)·WebPopup A/B(`WebPopupCampaign.php`)=Tenant Pilot substrate.
  - Approval Workflow → pending_approval(캠페인/가격·`Catalog.php`)·maker-checker(`Alerting.php`)·requiresHighValueApproval 재사용.
  - Feature Flag(비형식) → plan 게이트(`PlanPolicy`)·IS_DEMO 형식화(owner/expiration/retirement 계층 신설).
  - Idea/Backlog → `NEXT_SESSION.md` 형식화. Evidence → `SecurityAudit::verify`. Isolation → `Db.php`.
- **D-3 (Innovation History Immutable)**: 실험/승인/KPI 이력=append-only+무결성. SecurityAudit 확장.
- **D-4 (Runtime Guard 배치)**: Unauthorized Feature Activation·Expired Flag·High Risk Rollout 차단은 기존 plan 게이트·`index.php` RBAC·`deploy.yml` 위 배치(신규 게이트 신설 금지).
- **D-5 (무후퇴)**: 기존 AbTesting/Onsite/pending_approval/plan 게이트는 EACIF 신설 시 흡수·보존(중복 실험/승인 엔진 신설 금지).

## KEEP_SEPARATE (오흡수 금지)
- 마케팅 A/B(캠페인 소재 최적화) ≠ 플랫폼 Innovation Experiment(단 엔진 `AbTesting`는 공용 재사용).
- AutoRecommend/Decisioning(마케팅 의사결정) ≠ Innovation Decision · 비즈니스 ROI(`Pnl`) ≠ Innovation ROI/KPI · ModelMonitor drift ≠ Innovation Drift.

## 결과 (Consequences)
- 판정 = PARTIAL-strong(AbTesting 베이지안 A/B·Onsite CRO·pending_approval·plan 게이트 substrate 실재·강함) / ABSENT-formal(Innovation Lifecycle·Idea Management·Feature Flag Governance·KPI velocity/MTTI 순신설).
- 실행 순서: 선행 Part 인증 → Innovation Registry+Lifecycle 신설 → AbTesting/Onsite/pending_approval/plan 게이트 승격 배선 → Feature Flag Governance/KPI → Analytics. 코드 0.

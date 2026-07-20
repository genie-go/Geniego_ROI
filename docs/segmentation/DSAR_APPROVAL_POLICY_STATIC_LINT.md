# DSAR — PDP/PEP Governance: 정적 린트 (Part 3-12 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §26은 코드베이스에서 다음 6종 안티패턴을 **정적 탐지**할 것을 요구한다: **Direct Permission Check**(핸들러 if 분기 직접판정), **Hardcoded Authorization**(admin 문자열/역할 하드코딩), **Missing PDP**(중앙 PDP 미경유), **Missing PEP**(강제점 부재), **Missing Audit**(감사 누락), **Missing Snapshot**(결정 스냅샷 누락). ★핵심 대상 = **하드코딩 authz 61+12개소**(GT② §4). 이는 라이브 결함이 아니라 **아키텍처 부채**(중앙 PDP 수렴 대상·ADR D-2·D-8 부채≠결함).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Lint 규칙 | 판정 | 탐지 대상 근거(GT②) |
|---|---|---|
| Static Lint 엔진 자체 | **ABSENT** | 하드코딩 authz lint 전무(GT② §2). 순신규 |
| Direct Permission Check / Hardcoded Authorization | **탐지대상 PRESENT** | admin 문자열 직접비교 **61개소/14핸들러** — 대표 `UserAdmin.php`·`Payment.php`·`AdminMenu.php`·`Keys.php`, PDP-side `UserAuth.php:81`(`auth_role==='admin'`)·`:1138`(`plan==='admin'`)·`:1179`·`TeamPermissions.php:132`(isAdmin) |
| Direct Permission Check(auth_role 판독) | **탐지대상 PRESENT** | auth_role 직접판독 **12개소/9핸들러** — `Pnl.php`·`Alerting.php`·`AdminMenu.php`·`EventPopup.php`·`DbAdmin.php`·`AccessReview.php`·`AutoRecommend.php`·`PM/Shared.php`(GT② §4) |
| Missing PDP | **탐지대상 PRESENT** | 위 61+12개소가 통합 PDP 미경유·각 if 분기 산재 = Missing PDP 직접증거(GT② §4·ADR 2.3) |
| Missing PEP | **PARTIAL** | 중앙 PEP(`index.php:69-619`)·분산 PEP(`requireTeamWrite` `UserAuth.php:1134`·`guardWarehouse` `Wms.php:557`) 실존하나 PDP 미배선(GT② §2) |
| Missing Audit / Missing Snapshot | **PARTIAL** | SecurityAudit 체인(`SecurityAudit.php:12-68`)·auth_audit_log(`UserAuth.php:4174`)는 문자열 detail만·rule/scope trace 미기록(GT① §G) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **Hardcoded Authorization 룰(§26)**: `auth_role==='admin'`류 문자열 상수 비교(`UserAuth.php:81`·`:1138`·`:1179`·`TeamPermissions.php:132`)와 61개소/14핸들러를 정적 스캔·경고. 정본 = PDP 호출로 수렴(ADR D-2).
2. **Direct Permission Check 룰**: auth_role 직접판독 12개소/9핸들러를 탐지·`effectiveForUser`(`TeamPermissions.php:393-421`) 중앙 PDP 호출로 대체 권고.
3. **Missing PDP/PEP 룰**: mutating 경로에서 PDP 결정 토큰·PEP 강제점(`index.php:78-89`) 부재 시 CI 경고. `scopeSql`(`TeamPermissions.php:286-322`) 강제 미적용 SQL 경로 플래그.
4. **Missing Audit/Snapshot 룰**: 결정 경로에서 SecurityAudit(`SecurityAudit.php:12-53`) 기록·Immutable Snapshot 누락 탐지.
5. **부채 원장화**: 61+12개소는 **일괄 수정 대상 아님**(설계만·비파괴). Lint는 수렴 진척률만 측정, 무후퇴 보장(ADR D-8 재플래그 금지).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

Static Lint는 **authz 하드코딩** 전용이다. 마케팅/ops의 정책 판정 코드는 lint authz 대상 아님(GT② §5): Catalog `evaluatePolicy`/`requiresHighValueApproval`(`Catalog.php:1104`·`:1159`)·RuleEngine(`RuleEngine.php:24`)·Decisioning(`Decisioning.php:12`·`:432`)·PlanPolicy `requirePlan`(`UserAuth.php:364`·entitlement)·Risk.php. 이들 if 분기는 정당한 도메인 로직이며 "Hardcoded Authorization" 위반이 아니다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** Lint 엔진 = **ABSENT(순신규)**. 탐지대상(하드코딩 61+12개소·중앙/분산 PEP·SecurityAudit)은 **PRESENT/PARTIAL**로 실측 확정(GT② §4). 61+12개소는 부채≠결함 — 재플래그 금지(ADR D-8). 선행의존: 중앙 PDP·Decision Snapshot(ADR D-1·D-3·D-5) 구축 후 수렴이 가능(BLOCKED_PREREQUISITE). Part 1~3-11 인증 후 RP-track 실구현.

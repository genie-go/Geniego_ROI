# DSAR — PDP/PEP Governance: 테스트 계약 (Unit·Integration·Performance·Security·Compliance·Regression) (Part 3-12 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §33은 6개 테스트 범주를 요구한다: **Unit**(PDP/PEP/PIP/PAP/Decision Engine)·**Integration**(Effective Role Resolution/JIT/SoD/Dynamic Role/Runtime Authorization)·**Performance**(500K/sec·100M cache·5M session)·**Security**(PDP Bypass/PEP Disable/Cache Poisoning/Context Manipulation/Policy Injection)·**Compliance**(NIST SP 800-162/Zero Trust/XACML/ISO 27001/SOC 2)·**Regression**(RBAC/Workflow/Approval/Audit).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 테스트 범주 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unit — PDP/PEP/PIP/PAP | **ABSENT(대상 부재)** | 통합 PDP 부재(GT②§1). 단위 테스트 대상=proto-PDP `effectiveForUser`(`TeamPermissions.php:393-421`)·scopeSql(`:286-322`)·PIP(`:39-41`) 뿐 |
| Integration — Effective Role/JIT/SoD | **PARTIAL(입력원 실존)** | ERRE `effectiveForUser`(`:393-421`)·`effectiveScope`(`:236-265`) 실존이나 통합 결정 경로 미배선(GT①§C·ADR§D-6) |
| Performance | **ABSENT** | Decision Cache 부재(`TeamPermissions.php:202-225` 매 호출 재계산). 처리량 벤치 대상 없음 |
| Security — PDP Bypass/Cache Poison | **PARTIAL** | 중앙 PEP(`index.php:78-89`)·guardWarehouse(`Wms.php:557`) fail-closed 실존이나 하드코딩 authz 61+12개소(GT②§4·`UserAuth.php:81`·`TeamPermissions.php:132`)가 우회 표면 |
| Compliance — NIST/XACML/ZT | **미검증(ABSENT)** | 선언적 정책·중앙 PDP 부재로 XACML/800-162 준거 검증 대상 없음(GT②§2) |
| Regression — RBAC/Approval/Audit | **PARTIAL(재활용 SSOT)** | SecurityAudit verify(`SecurityAudit.php:56-68`)·auth_audit_log(`UserAuth.php:4174-4197`)·acl_permission(`TeamPermissions.php:152-166`) 회귀 앵커 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Unit**: PDP 결정론(동일 입력→동일 출력·§4)·scopeSql `__deny__` fail-closed(`TeamPermissions.php:234`·`:286-322`)·clamp 위임상한(`:356-373`·`:423-429`)·PIP 속성 해석(`:39-41`).
- **Integration**: ERRE(3-7 `effectiveForUser`)·JIT(3-9)·SoD(3-10) 산출을 PDP 입력으로 결합 검증(ADR§D-6·중복 엔진 금지).
- **Security**: PDP Bypass·PEP Disable(중앙 PEP `index.php:78-89` 우회 차단·§25)·Cache Poisoning·하드코딩 authz 61+12개소(GT②§4)가 §26 Static Lint로 탐지됨을 회귀 검증.
- **Regression 100%**: RBAC/Workflow/Approval/Audit 무후퇴 — SecurityAudit 체인 verify(`SecurityAudit.php:56-68`)·auth_audit_log(`UserAuth.php:4174`) SSOT 유지(ADR§4 무후퇴).

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE(GT②§5)**: Catalog evaluatePolicy(`Catalog.php:1104`)·RuleEngine·Decisioning·action_request policy 테스트는 마케팅/알림 테스트로 authz PDP 테스트 아님. 흡수 금지.
- **선행의존**: 레포에 구성된 PHPUnit 스위트 없음(CLAUDE.md — 수동/배포 검증). 테스트 계약 실 구현은 Part 1~3-11 인증·PDP 신설 후(BLOCKED_PREREQUISITE·ADR§4).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**Unit/Integration/Performance/Compliance 테스트 대상(통합 PDP·Decision Cache·선언적 정책) = ABSENT.** Security/Regression은 재활용 앵커(중앙 PEP `index.php:78-89`·SecurityAudit verify `:56-68`·acl_permission `:152-166`)만 PARTIAL. 6범주 테스트 스위트·Regression 100%는 PDP 실 구현 후 **RP-track 실구현 조건**(코드0·NOT_CERTIFIED). 마케팅 정책 테스트 흡수 금지·Part 1~3-11 인증 선행 의존.

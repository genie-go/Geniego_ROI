# DSAR — PDP/PEP Governance: 인가 정책 본문 (APPROVAL_POLICY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

- **APPROVAL_POLICY** = 인가 판정의 **단일 선언적 정책 본문**. Subject×Resource×Action×Environment(§3 Policy Request Model)에 대해 PDP(§4)가 평가하는 규칙 단위(Effective Role/Scope/Constraint/Explicit Deny/Dynamic Rule/Risk/SoD/JIT/Compliance).
- SPEC §1(구현목표 Policy), §2(Canonical Entity `APPROVAL_POLICY`), §4(PDP가 평가하는 Policy 항목)가 근거.
- 목적: 현행 **코드 if 분기·DB 권한행에 흩어진 암묵정책을 선언적 정책본으로 승격**(GT② §2·ADR D-3). 정책은 레지스트리(APPROVAL_POLICY_REGISTRY) 등록·버전(APPROVAL_POLICY_VERSION) 봉인 대상.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| 선언적 authz 정책본 | **ABSENT (grep 0)** | XACML식 선언 정책 계층은 그린필드 (GT② §1·§2) |
| 암묵 정책 — 통합결정 최근접(proto-PDP) | **PARTIAL·미배선** | `effectiveForUser`(`TeamPermissions.php:393-421`) owner/admin→full·manager→팀권한·member→명시권한∩팀상한 clamp. private·전역경로 미배선 (GT① §C) |
| 암묵 정책 — RBAC/ABAC 속성원 | **PRESENT** | `acl_permission`(`TeamPermissions.php:152-159`)·`data_scope`(`:160-166`) = 정책이 내장된 DB 권한행 (GT② §2) |
| 암묵 정책 — Explicit Deny | **PRESENT(국소)** | `DENY_SCOPE`(`TeamPermissions.php:234`·`__deny__` 센티넬·`AND 1=0`) = 전 코드베이스 유일 fail-closed deny (GT① §E) |
| 암묵 정책 — 하드코딩 authz | **PARTIAL(부채)** | admin 문자열 61개소·auth_role 12개소(대표 `UserAuth.php:81`·`:1138`·`TeamPermissions.php:132`) = Missing PDP 증거·Static Lint 대상 (GT② §B) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(안)**: `policy_id`·`registry_ref`·`target{subject,resource,action,environment}`(§3)·`effect{permit|deny|challenge|require_mfa|require_approval|read_only|time_limited}`(§9)·`combining{deny_overrides…}`(§10)·`bundle_ref`(§12)·`tenant_id`.
- **상태**: 정책본은 게시 시 APPROVAL_POLICY_VERSION으로 봉인(불변·§30 Immutable Policy Version). 활성/폐기 전이는 PAP(§7)만.
- **제약**: PDP 출력 Deterministic(§4). 기본 결합 Deny Overrides(§10). fail-closed(`__deny__` 승격·ADR D-4). §30 Tenant Isolation.
- **소비**: PDP(§4)가 정책본을 Decision Pipeline(§8 고정순서)에 로드. Explain(§16)은 Which Policy/Which Rule을 정책본에서 역참조.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz policy ≠ 마케팅 policy(GT② §5). 아래는 동음이의로 흡수·개명 금지.

| 분리대상 | 근거(파일:라인) | 사유 |
|---|---|---|
| 상품 리스팅 정책 | `Catalog.php:1104`(evaluatePolicy)·`:1159` | 커머스 컴플라이언스·고액승인 (GT② §C-1) |
| 캠페인 룰/의사결정 | `RuleEngine.php:24`·`Decisioning.php:12`·`:432` | daypart/pause/frequency·추천 (GT② §C-1) |
| 알림 정책 | `action_request.policy_id`(`Db.php:576`) | 알림 액션정책(authz 아님) (GT② §C-2) |
| entitlement 게이트 | `requirePlan`(`UserAuth.php:364`)·PlanPolicy | 구매등급(authz와 직교) (GT② §C-4) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(선언 정책본) / PARTIAL(암묵정책 proto-PDP `effectiveForUser`·acl_permission/data_scope·`__deny__`)**. 재활용: effectiveForUser→중앙 PDP 승격(ADR D-1)·`__deny__`→deny-overrides(ADR D-4).
- **NOT_CERTIFIED · 코드 변경 0**: 계약 확정 설계물. 하드코딩 61+12개소는 **부채≠결함**(재플래그 금지·ADR D-8).
- **선행의존**: Part 1~3-11(특히 3-7 ERRE) 인증 후 실 구현. 정책본은 레지스트리·버전 엔티티에 의존.

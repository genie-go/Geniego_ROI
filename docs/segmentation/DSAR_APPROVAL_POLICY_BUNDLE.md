# DSAR — PDP/PEP Governance: 정책 모델 번들 (APPROVAL_POLICY_BUNDLE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

- **APPROVAL_POLICY_BUNDLE** = 인가 정책을 **모델 유형별로 묶은 결합 단위**. RBAC/ABAC/SoD/JIT/Risk/Compliance 정책을 하나의 무결성 번들(§30 Bundle Integrity)로 결합해 PDP가 통합 평가.
- SPEC §12(Policy Bundle — RBAC/ABAC/SoD/JIT/Risk/Compliance Policy), §2(Canonical Entity `APPROVAL_POLICY_BUNDLE`), §4(PDP가 Effective Role/Scope/Deny/Dynamic Rule/Risk/SoD/JIT/Compliance 통합 평가), §30(**Bundle Integrity**·Tenant Isolation)이 근거.
- 목적: RBAC/ABAC/SoD/JIT/Risk/Compliance 정책모델을 응집 결합해 Decision Pipeline(§8 고정순서)에 일괄 주입. 순신규(ADR D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 번들 구성 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Policy Bundle 구조 | **ABSENT (grep 0)** | `policy_bundle` authz 매치 0건 (GT② §1·§2) |
| RBAC 모델 substrate | **PRESENT** | `acl_permission`·`subjectPerms`·`effectiveForUser`(`TeamPermissions.php:152-159`·`:393-421`) (GT① §C·§D) |
| ABAC 모델 substrate | **PRESENT** | `data_scope`·`effectiveScope`·`scopeSql`(`TeamPermissions.php:160-166`·`:236-265`·`:286-293`) (GT① §D·§E) |
| Explicit Deny(deny-overrides 씨앗) | **PRESENT(국소)** | `DENY_SCOPE`(`TeamPermissions.php:234`·`__deny__`) = 단일 스코프 fail-closed·병합규칙 부재 (GT① §E·GT② §2) |
| Risk 모델 substrate | **PARTIAL(미소비)** | `risk` 컬럼(`UserAuth.php:4165`·`:4172`) = 정적 문자열·PDP 미소비 (GT① §D) |
| SoD/JIT/Compliance 정책 결합 | **ABSENT(결합계층)** | Part 3-9 JIT·3-10 SoD 산출은 ADR D-6 읽기입력·번들 결합계층 순신규 (GT② §2·ADR D-6) |

★번들 구성요소(RBAC/ABAC/Deny)는 실존하나 **모델별 응집 결합·통합 평가 계층은 부재**(GT②). PDP가 번들을 통합 평가하도록 하는 결합·병합(§10 Deny Overrides)이 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(안)**: `bundle_id`·`model_refs{rbac,abac,sod,jit,risk,compliance}`(§12)·`combining_algorithm`(§10 기본 Deny Overrides)·`integrity_hash`·`policy_version_ref`(→APPROVAL_POLICY_VERSION)·`tenant_id`.
- **상태**: 번들은 구성 정책버전 봉인 후 결합·게시. PDP는 번들 활성버전을 결정론적 평가(§4 Deterministic).
- **제약**: §30 **Bundle Integrity** — `integrity_hash`로 결합 무결성 검증(SecurityAudit `SecurityAudit.php:12-68` 재활용). 기본 결합 **Deny Overrides**(§10·`__deny__` `TeamPermissions.php:234` 승격·ADR D-4). §30 Tenant Isolation(`index.php:619`). SoD/JIT/Compliance는 각 엔진 재구현 금지·읽기입력(ADR D-6).
- **소비**: PDP(§4)는 번들을 Decision Pipeline(§8: Effective Role→Scope→Policy→SoD→Risk→Compliance) 순서로 평가·deny-overrides 병합.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

번들 구성명(Risk/Compliance)이 겹치나 아래는 authz 번들 아님(GT② §5).

| 분리대상 | 근거(파일:라인) | 사유 |
|---|---|---|
| 공급망 fraud risk | `Risk.php`(GT② §C-4) | 마케팅/공급망 risk(PDP Risk 정책 아님) (GT② §C-4) |
| 마케팅 룰/의사결정 | `RuleEngine.php:24`·`Decisioning.php:36` | 캠페인 규칙(ABAC 번들 아님) (GT② §C-1) |
| 시뮬레이션 | `PriceOpt.php:927`·`AdminGrowth.php:1239` | 가격/그로스 시뮬(authz Simulation 아님) (GT② §C-3) |
| entitlement | `requirePlan`(`UserAuth.php:364`)·PlanPolicy | 구매등급(RBAC 번들과 직교) (GT② §C-4) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(결합·병합계층 순신규) / PRESENT(RBAC `acl_permission`·ABAC `data_scope`·Deny `__deny__` 구성요소)**. 재활용: 구성 모델 그대로 사용·`__deny__`→deny-overrides 병합 승격(ADR D-4)·번들 무결성 SecurityAudit 확장(ADR D-5).
- **NOT_CERTIFIED · 코드 변경 0**: 계약 설계물. Risk 컬럼(`UserAuth.php:4165`)은 PDP 미소비 정직표기.
- **선행의존**: APPROVAL_POLICY_VERSION·SoD(3-10)·JIT(3-9) 산출 확정 후 결합. ERRE(3-7) 핵심입력. Part 1~3-11 인증(BLOCKED_PREREQUISITE).

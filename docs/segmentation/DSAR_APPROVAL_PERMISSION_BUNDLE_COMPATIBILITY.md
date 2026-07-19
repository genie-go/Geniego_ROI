# DSAR — Permission Bundle Compatibility (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_BUNDLE_COMPATIBILITY`는 [`BUNDLE`](DSAR_APPROVAL_PERMISSION_BUNDLE.md)이 **어떤 actor/client/tenant/domain에 부여 가능한가**와 **어떤 조합이 금지되는가**를 규정하는 규칙 엔티티다. Human vs Service Account 구분, System Actor 제한, Client Type 제약, Conflict/Exclusion, Required Dependency, Risk Threshold, Temp/Emergency 금지, SoD·Approval Authority Hook을 담는다. **Critical Conflict가 감지되면 Bundle Grant 자체를 차단**(fail-closed)하는 것이 이 엔티티의 핵심 방어 역할이다.

예: Payment Operations Bundle은 `HUMAN`에만 부여 가능하고 `SERVICE_ACCOUNT`·`SYSTEM_ACTOR`에는 금지 — Compatibility가 이를 강제한다(§20 원문 "고위험 Human Approval을 Service Account가 대신 결정하지 못하게 한다"와 정합).

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `compatibility_id` | Canonical 식별자 |
| `bundle_version_id` | 대상 [`BUNDLE_VERSION`](DSAR_APPROVAL_PERMISSION_BUNDLE_VERSION.md) |
| `allowed_actor_types` | 부여 가능 actor type |
| `human_vs_service_rule` | HUMAN_ONLY / SERVICE_ONLY / BOTH |
| `system_actor_restriction` | SYSTEM_ACTOR 부여 금지/허용 |
| `allowed_client_types` | 허용 Client Type |
| `tenant_scope_rule` | 특정 tenant/전역 표준 적용 규칙 |
| `domain_scope_rule` | 적용 도메인 제한 |
| `conflict_bundle_refs` | 공존 금지 Bundle |
| `exclusion_permission_refs` | 공존 금지 Permission |
| `required_dependency_refs` | 선행 필요 Permission/Bundle |
| `risk_threshold` | 부여 허용 risk 상한 |
| `temp_emergency_prohibited` | Temp/Emergency 부여 금지 플래그 |
| `sod_hook_ref` | SoD(P6) 검증 진입점 |
| `approval_authority_hook_ref` | Approval Authority(P5) 검증 진입점 |
| `conflict_severity` | ③ 열거형 |
| `on_critical_conflict` | BLOCK_GRANT(고정) |

## ③ 열거형

**`conflict_severity`**: `NONE` · `INFO` · `WARNING` · `CRITICAL`
- **CRITICAL** → `on_critical_conflict = BLOCK_GRANT`(Bundle Grant 차단·fail-closed).

**`human_vs_service_rule`**: `HUMAN_ONLY` · `SERVICE_ONLY` · `BOTH`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| tenant 격리(부여 스코프) | `index.php` 중앙 RBAC tenant 강제주입 | CANONICAL(PEP) | `index.php:619` |
| 부여상한(위임 초과 차단·Conflict 인접) | `putMemberPermissions`(403 DELEGATION_EXCEEDED)·`assignableMap` | 위임상한 확장점 | `TeamPermissions.php:628-647`, `:354-360` |
| Human/Service 구분 **재료**(열거형은 부재) | api_key(프로그래매틱) vs user 세션 접두 | PARTIAL | `index.php:577`(scopes), api_key scopes `Keys.php:191,204` |
| admin bypass 판정 | `resolveAdminByToken` | CANONICAL(admin SSOT) | `UserAuth.php:2998` |
| SoD Hook / 2-eyes | **ABSENT** — "진짜 2-eyes 승인 워크플로 부재" | — | 전수조사 §1.1(`putMemberPermissions :628-647` 위임상한은 있으나 SoD 아님) |
| Approval Authority Hook | **ABSENT** | — | Authority(P5) 개념 부재 |
| **actor_type / client_type 열거형** | — | — | **ABSENT** (actor_type grep 0 · Human/Service 구분 게이트 없음) |
| **Compatibility 규칙 테이블** | — | — | **ABSENT** |

★현행에 Human/Service를 구분할 **재료**(api_key vs user 세션)는 있으나, 이를 판정에 쓰는 **열거형·게이트는 부재** — API 키 2개로도 Maker-Checker가 충족될 수 있는 상태(전수조사 §1.1: "approve=action grant일 뿐 진짜 2-eyes 부재"). Compatibility는 이 gap을 닫는 순신규 방어층.

## ⑤ 설계원칙

- **Critical Conflict → BLOCK_GRANT**: fail-closed. Conflict/Exclusion/System Actor Restriction 위반 시 Bundle Grant 자체를 차단 — 부분 부여로 얼버무리지 않음.
- **Golden Rule**: tenant 격리는 실존 `index.php:619` PEP 재사용, 부여상한은 `:628-647`(DELEGATION_EXCEEDED) 확장 — 별도 격리/상한 엔진 신설 금지. SoD·Authority는 **Hook 참조만** 제공(P5/P6 엔진 소유 금지).
- **Permission ≠ Role ≠ Authority**: `approval_authority_hook_ref`는 금액/통화/법인 한도 검증을 P5로 위임하는 진입점일 뿐 — Compatibility가 Authority를 판정하지 않음. `human_vs_service_rule`은 actor 정체성(P3-1) 축.
- **Temp/Emergency 금지 명시**: 고위험 Bundle은 `temp_emergency_prohibited=true`로 임시/긴급 부여 경로를 원천 차단.
- **정직**: 하드코딩 email/user-id authz·FULL_ACCESS/MANAGE_ALL 백도어는 **전무**(전수조사 §4) — Compatibility가 막을 대상이 아니라 애초에 부재. 날조 금지.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: actor_type/client_type 열거형·SoD Hook·Approval Authority Hook 실 배선은 선행 P3(RBAC)·P5(Authority)·P6(SoD) 신설 후. Compatibility는 Hook 진입점 계약만 선언.
- Compatibility 규칙 테이블·actor/client 열거형·conflict/exclusion/dependency = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.

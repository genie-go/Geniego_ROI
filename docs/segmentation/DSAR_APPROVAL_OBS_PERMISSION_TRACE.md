# DSAR — Authorization Observability & Forensics: 유효권한 추적 (APPROVAL_PERMISSION_TRACE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_PERMISSION_TRACE`(SPEC §2·§13, "Effective Permission Trace")는 특정 결정 시점의 **유효 권한 해석 결과를 6요소로 기록**한다. SPEC §13 규정:

| SPEC §13 요소 | 의미 |
|---|---|
| Effective Role | 결정에 유효했던 역할 |
| Effective Permission | 유효 권한 |
| Effective Scope | 유효 스코프(데이터/테넌트 경계) |
| Constraint | 정적 제약 |
| Explicit Deny | 명시적 거부(deny override) |
| Runtime Constraint | 런타임 조건부 제약 |

목적은 SPEC §0의 "특정 시점의 Effective Permission은 무엇이었는가"에 답하는 것이며, 이는 Digital Twin(SPEC §7 time-travel)의 핵심 입력이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §13 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| Effective Scope(현재 상태) | **PARTIAL(time-travel 부재)** | `effectiveScope`(`TeamPermissions.php:236`)는 **현재 상태만** 산출(GT② §2). 과거 시점 복원 경로 없음 |
| Effective Role/Permission(현재) | **PARTIAL** | effective route(`routes.php:1605`)=현재 상태만(GT② §2). 시점별 스냅샷 미보존 |
| Constraint/Explicit Deny/Runtime Constraint 시점기록 | **ABSENT** | 구조화 permission trace grep 0(GT② §2 "Permission Trace = ABSENT"). 결정 시점 유효권한 스냅샷 substrate 전무 |
| 무결성 앵커(재활용) | **PRESENT** | `SecurityAudit.php:14-68`(append-only+verify)=유일 tamper-evident. permission trace 증거를 이 위에 참조(`AccessReview.php:225` 선례) |

★핵심 격차: 현행은 **"지금의 유효권한"만 계산**(`TeamPermissions.php:236`·`routes.php:1605`)하고, **"그때의 유효권한"을 이벤트 스토어에서 재구성하는 경로가 없다**(GT② §2 Replay/Digital Twin ABSENT).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(SPEC §3 + §13): Event/Correlation/Trace ID·Effective Role Version·Effective Permission Version·`effective_role`·`effective_permission`·`effective_scope`·`constraint[]`·`explicit_deny[]`·`runtime_constraint[]`·Runtime Context Version.
- **Time-travel 계약**: permission trace는 Digital Twin(SPEC §7 User/Role/Assignment/Scope/Permission 시점 복원)·Replay(§8 read-only simulation)의 소스. 실 리소스 접근 없이 재구성(ADR D-3).
- **불변성·무결성**: Immutable Event Store(SPEC §18)에 append·`SecurityAudit` 해시체인(`SecurityAudit.php:25-27`)에 참조·`verify`(`:56-68`) 확산.
- **테넌트 격리**: fail-closed(`Compliance.php:176`) 재사용. Cross-tenant effective permission 열람 금지.
- **오류 계약**(SPEC §30): `DIGITAL_TWIN_BUILD_FAILED`·`TRACE_NOT_FOUND`.

## 4. KEEP_SEPARATE (마케팅 trace 흡수금지)

- **마케팅 attribution/percentile** — `AttributionEngine.php:1522`·`:1546`·`:1553`은 마케팅 신뢰구간(GT② §5 B-2), 유효권한 아님. 흡수 금지.
- **인프라 관측성** — `SystemMetrics.php:1-60`(latency/uptime)은 인프라 헬스(GT② §5 B-3), authz permission trace 아님. KEEP_SEPARATE.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(현재상태 effective scope/role) / ABSENT(시점 복원·constraint/deny trace)**. Time-travel·Constraint·Explicit Deny·Runtime Constraint 시점기록 순신규.
- **재활용(흡수 아님·참조/확장)**: `TeamPermissions.php:236`·`routes.php:1605`(현재상태 계산을 시점 스냅샷으로 확장, ADR D-3)·`SecurityAudit.php:14-68`(앵커·verify)·`Compliance.php:176`(격리).
- **선행 의존**: BLOCKED_PREREQUISITE — RBAC/Scope(3-4)·PDP(3-12) 결정이 관측 대상(ADR D-6, 재구현 금지). 실 엔진은 Part 1~3-13 인증 후 RP-track. 코드 변경 0 · NOT_CERTIFIED.

---
### file:line 인용 목록 (전체)
`TeamPermissions.php:236` · `routes.php:1605` · `SecurityAudit.php:14-68` · `SecurityAudit.php:25-27` · `SecurityAudit.php:56-68` · `AccessReview.php:225` · `Compliance.php:176` · `AttributionEngine.php:1522` · `AttributionEngine.php:1546` · `AttributionEngine.php:1553` · `SystemMetrics.php:1-60`

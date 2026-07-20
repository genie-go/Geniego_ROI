# DSAR — Effective Service Permission 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Effective Service Permission · 스펙 §17)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §17 Effective Service Permission은 비인간 주체의 **Permission · Scope · Constraint · Runtime Policy** 4축을 결합해 판정 시점의 "최종 발효 권한"을 산출하는 계층이다. EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT 어디에도 이 4축을 결합 산출하는 로직 인용은 없다 — api_key role/scope는 원자값으로만 존재하고 이를 하나의 Effective 값으로 결합·평가하는 로직은 index.php 게이트 내부의 즉석 비교뿐이다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective permission id | 산출 결과 식별자 |
| 2 | service identity id | 대상 비인간 주체 |
| 3 | permission axis | 아래 §3 열거형 |
| 4 | resolved value | 결합 산출된 최종값 |
| 5 | evaluated at | 산출 시각 |
| 6 | source | 결합에 사용된 role/scope/policy 참조 |

## 3. 열거형 / 타입

**Effective Axis**(스펙 §17 원문): `PERMISSION` · `SCOPE` · `CONSTRAINT` · `RUNTIME_POLICY`

## 4. 실 substrate 매핑 (ABSENT — 결합 산출 로직 grep 0)

| Effective Axis | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| PERMISSION | `api_key.role`(rank) — 원자값 | `Keys.php:81-133,95`·`Db.php:942-958` | **ABSENT(결합 미수행)** — role 원자값 조회는 있으나 Scope/Constraint/Policy와 결합해 "Effective"로 산출하는 로직 없음 |
| SCOPE | `api_key.scopes_json` — 원자값 | `Keys.php:99-114,201-210` | **ABSENT(결합 미수행)** — 동일 사유 |
| CONSTRAINT | 없음 — Runtime Scope/Constraint 개념(namespace/cluster/queue 등 스펙 §10 Runtime Scope) grep 0 | — | **ABSENT** |
| RUNTIME_POLICY | 없음 — Allow/Deny/ReadOnly/Require mTLS 등 정책 열거형(스펙 §11) grep 0 | — | **ABSENT** |

**근접 결합 지점(단, Effective Permission 산출로 승격 불가)**: `index.php:572-598`가 role rank·scope를 요청 1건에 대해 순차 비교(`if` 체인)하지만, 이는 (a) 결과를 별도 엔티티로 영속화하지 않고 (b) Constraint/Runtime Policy를 전혀 참조하지 않으므로 §17이 정의하는 4축 결합 Effective Permission이 아니다.

## 5. 설계 원칙

- ★4축 전체가 ABSENT — Permission Projection(별편)의 Static/Scope 근접값조차 "결합"되지 않은 원자값이므로, Effective Service Permission은 substrate 재사용 대상이 없는 순신규 계층이다.
- `index.php:572-598`의 순차 `if` 게이트를 "Effective Permission 엔진"으로 오판하지 않는다 — 요청마다 휘발되는 조건분기이지, Permission·Scope·Constraint·Runtime Policy를 하나의 판정 결과로 결합·저장하는 계층이 아니다.
- 신설 시 §16 Service Permission Projection(별편)의 STATIC_PERMISSION/SERVICE_SCOPE를 입력으로 삼되, Constraint·Runtime Policy는 §10 Runtime Scope·§11 Runtime Policy(모두 ABSENT) 선행 설계 이후에만 채워질 수 있다.
- 인간 RBAC의 `effectiveScope`(TeamPermissions.php — Part 3-5 DUPLICATE_AUDIT §D-2 소관)는 인간 주체 대상이며 비인간 Service Identity와 별개 계층이다 — 혼동·오흡수 금지(경계 보존).

## 6. Gap / BLOCKED_PREREQUISITE

- PERMISSION·SCOPE·CONSTRAINT·RUNTIME_POLICY 4축 전부 ABSENT. 결합 산출 로직 grep 0.
- Effective Service Permission 엔티티(영속화·조회 API §34) = 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

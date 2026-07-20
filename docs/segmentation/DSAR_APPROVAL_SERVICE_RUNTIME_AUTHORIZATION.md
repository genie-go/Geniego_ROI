# DSAR — Runtime Authorization 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Authorization · 스펙 §22)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §22 Runtime Authorization은 비인간 주체의 요청을 **Role · Scope · Runtime · Policy** 4축으로 판정 시점에 승인/거부하는 계층이다. EXISTING_IMPLEMENTATION §1이 명시하는 `index.php:477-622` 인증 게이트 중 RBAC rank+scope 비교 구간(`:572-598`)이 4축 중 Role·Scope 2축의 실 동작 근접 substrate다. Runtime(§9 Environment/Namespace/Cluster 등)·Policy(§11 Allow/Deny/ReadOnly/Require mTLS 등) 2축은 완전 부재다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | authorization id | Runtime Authorization 판정 식별자 |
| 2 | service identity id | 대상 비인간 주체(api_key) |
| 3 | authorization axis | 아래 §3 열거형 |
| 4 | decision | Allow/Deny 등 판정 결과 |
| 5 | evaluated at | 판정 시각(현재는 매 요청) |

## 3. 열거형 / 타입

**Authorization Axis**(스펙 §22 원문): `ROLE` · `SCOPE` · `RUNTIME` · `POLICY`

## 4. 실 substrate 매핑 (ABSENT — 4축 중 2축만 게이트 조회 근접)

| Authorization Axis | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| ROLE | RBAC role rank 비교(viewer < connector < analyst < admin) — 쓰기(POST/PUT/PATCH/DELETE)는 analyst+ 또는 `write:*` 요구, ingest는 connector+ 또는 `write:ingest`, `/v421/keys/*`는 `admin:keys` 또는 admin 요구 | `index.php:572-598` | **근접(즉석 게이트 비교)** — 매 요청 role rank 비교는 실동작하나, 이는 인증 미들웨어 내부 조건분기이지 별도 Runtime Authorization 엔티티로 영속화되는 판정이 아님 |
| SCOPE | `api_key.scopes_json` 화이트리스트 비교(동일 게이트 구간) | `index.php:572-598`·`Keys.php:99-114,201-210` | **근접(즉석 게이트 비교)** — ROLE과 동일 사유 |
| RUNTIME | 없음 — Runtime Context(스펙 §9: Environment/Namespace/Cluster/Node/Container/Pod/Pipeline/Application) 기반 판정 grep 0 | — | **ABSENT** |
| POLICY | 없음 — Allow/Deny/ReadOnly/Require mTLS/Require Certificate/Require Vault/Require Rotation(스펙 §11) 열거형 자체 grep 0 | — | **ABSENT** |

**경계 보존**: 테넌트 바인딩(`index.php:609-619`·헤더 위조 차단)은 멀티테넌시 격리 게이트이며 스펙 §22의 4축(Role/Scope/Runtime/Policy)과는 별개 관심사 — Runtime Authorization 근접 substrate로 혼입 금지(단, 동일 미들웨어 파일 내 인접 구간임은 참고).

## 5. 설계 원칙

- ★ROLE·SCOPE 2축은 "매 요청 즉석 비교"로 실동작하지만, RUNTIME·POLICY 2축은 완전 ABSENT — "인증 게이트가 있으니 Runtime Authorization도 있다"고 오판하지 않는다. 현재 게이트는 **정적 role/scope 대조**이며, 스펙이 요구하는 Runtime Context(namespace/cluster 등) 기반 판정이나 명시적 Policy 열거형(Require mTLS 등)은 존재하지 않는다.
- `index.php:572-598`을 "Runtime Authorization 엔진"으로 승격 서술하지 않는다 — 판정 결과가 별도 엔티티(§23 Snapshot 등)로 영속화되지 않고 요청마다 휘발된다.
- 신설 시 ROLE/SCOPE 축은 기존 게이트 로직을 입력 substrate로 재사용(병렬 신규 RBAC 체크 신설 금지 — Golden Rule), RUNTIME/POLICY 축은 §9 Runtime Context·§11 Runtime Policy(둘 다 순신규) 선행 설계 후 결합.
- §17 Effective Service Permission(별편)과의 경계: Effective Permission은 "권한 값의 결합 산출"이고 Runtime Authorization은 "그 값을 근거로 한 Allow/Deny 최종 판정"이다 — 두 계층을 동일시하지 않는다(PDP/PEP 분리 원칙, 인간 RBAC 계열 DSAR와 동형 원칙 적용).

## 6. Gap / BLOCKED_PREREQUISITE

- 4축 중 ROLE·SCOPE는 즉석 게이트 비교로 근접, RUNTIME·POLICY는 완전 ABSENT.
- Runtime Authorization 판정 결과의 영속화(Snapshot/Evidence 연계) = 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

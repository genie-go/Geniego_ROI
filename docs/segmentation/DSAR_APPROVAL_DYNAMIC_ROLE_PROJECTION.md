# DSAR — Dynamic Role Projection 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Projection · 스펙 §21)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · PEP≠PDP · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §21 Dynamic Projection은 Effective Role · Effective Permission · Effective Scope · Effective Constraint 4축을 **판정 시점의 투영값**으로 산출하는 계층이다. EXISTING_IMPLEMENTATION §3·DUPLICATE_AUDIT §D-2가 명시하는 `effectiveScope`(ABAC data_scope 라이브 재계산)가 4축 중 유일하게 "이미 라이브로 계산되는" 근접 substrate다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | projection id | Dynamic Projection 식별자 |
| 2 | subject id | 투영 대상 |
| 3 | projection axis | 아래 §3 열거형 |
| 4 | computed value | 투영 산출값 |
| 5 | computed at | 산출 시각(현재는 매 요청) |
| 6 | source rule / decision | 이 투영을 발생시킨 Rule Evaluation(§9)/Policy Decision(§18) 참조 |

## 3. 열거형 / 타입

**Projection Axis**(스펙 §21 원문): `EFFECTIVE_ROLE` · `EFFECTIVE_PERMISSION` · `EFFECTIVE_SCOPE` · `EFFECTIVE_CONSTRAINT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT — 4축 중 1축만 라이브 근접)

| Projection Axis | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| EFFECTIVE_SCOPE | `effectiveScope`(DATA_SCOPES 9차원 필터·fail-closed DENY_SCOPE) + `scopeSql`/`scopeSqlNamed`/`scopeChannelProduct` 행필터 SQL | `TeamPermissions.php:236-265,286-322`(ADR §D-1·EXISTING_IMPLEMENTATION §3·DUPLICATE_AUDIT §D-2) | **근접(라이브 재계산)** — 매 요청 즉석 산출·저장(Projection으로서의 영속) 없음 |
| EFFECTIVE_ROLE | `effectiveForUser`(owner/manager/member 3단 위계 + team clamp) | `TeamPermissions.php:366-394`(DUPLICATE_AUDIT §D-2) | **근접(정적 위계 clamp)** — 그러나 이는 **정적** team_role의 3단 위계 적용일 뿐, Context(§5 Runtime Context)에 따라 Role이 달라지는 Dynamic Projection이 아니다(EXISTING_IMPLEMENTATION §1: team_role은 로그인 시 세션 스냅샷된 정적값) |
| EFFECTIVE_PERMISSION | 없음 — 이번 ground-truth 2편에 permission 투영/산출 로직 인용 없음(§4 EXISTING_IMPLEMENTATION 매치는 전부 "role/permission 문자열 전무"류 부재 서술) | — | **ABSENT** |
| EFFECTIVE_CONSTRAINT | 없음 — §16 Runtime Constraint 자체가 ABSENT(별편 `DSAR_APPROVAL_DYNAMIC_RUNTIME_CONSTRAINT.md`) | — | **ABSENT** |

**보조 substrate**: `roleOf`/`isAdmin` 헬퍼(`TeamPermissions.php:120-136`·DUPLICATE_AUDIT §D-3)는 정적 team_role을 12개소에서 재사용하는 **읽기 중앙화**이지, Context 기반 재계산을 수행하는 Projection 로직이 아니다.

## 5. 설계 원칙

- ★4축 중 **EFFECTIVE_SCOPE 1축만** 진짜 "요청마다 재계산되는 라이브 투영"에 근접한다(ADR §3 "effectiveScope 라이브 재계산" 명시) — 나머지 3축(ROLE/PERMISSION/CONSTRAINT)은 정적 스냅샷이거나(ROLE) 완전 부재(PERMISSION/CONSTRAINT)다. 4축을 동등한 성숙도로 서술하지 않는다(실재 과신 금지).
- EFFECTIVE_ROLE을 "이미 Dynamic하다"고 오판하지 않는다 — `effectiveForUser`의 owner/manager/member clamp는 **정적 team_role에 대한 위계 적용**이며, 로그인 이후 세션 동안 Context(risk/time/device 등)에 따라 재평가되지 않는다(EXISTING_IMPLEMENTATION §1).
- 신설 시 EFFECTIVE_SCOPE(`effectiveScope`)를 Projection의 입력 소스로 재사용하고(병렬 신규 조회 경로 신설 금지), EFFECTIVE_ROLE은 §12 Session Role·§13 Conditional Role 설계(현재 ABSENT)가 선행된 후에만 진짜 "Context 기반 투영"으로 승격 가능하다.
- Version/Snapshot/Digest 기반 영속화(ADR §3 Canonical Interface)가 없는 현재 상태에서는 Projection이 요청마다 휘발되며, 이는 Cache(§22·별편) ABSENT와 직결된다.

## 6. Gap / BLOCKED_PREREQUISITE

- 4축 중 EFFECTIVE_SCOPE만 라이브 근접, EFFECTIVE_ROLE은 정적 clamp 근접(Dynamic 아님), EFFECTIVE_PERMISSION·EFFECTIVE_CONSTRAINT는 완전 ABSENT.
- Projection 영속(Version/Snapshot/Digest) = 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

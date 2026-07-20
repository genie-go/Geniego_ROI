# DSAR — Approval Scope Cache (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Cache + Cache Invalidation · 스펙 §38+§39)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · **Cache는 Version 기반**(§38 명문) · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §38 Scope Cache는 **Scope Projection · Effective Scope · Runtime Scope**를 **Version 기반**으로 캐시하는 엔티티다. §39 Cache Invalidation은 **Scope · Organization · Project · Assignment · Policy** 5개 트리거로 무효화를 강제한다. **현재는 effectiveScope가 요청마다 라이브 재계산되어 캐시 자체가 없다**(EXISTING_IMPLEMENTATION §9 "effectiveScope 라이브 재계산·매 요청 SELECT·캐시/버전/스냅샷 diff 없음").

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | cache id / key | Cache 키(Subject+Version 기반) |
| 2 | subject id | 대상 Subject |
| 3 | cached type | 아래 §3 열거형 |
| 4 | scope version id | 캐시 기준 Version(스펙 §38 "Version 기반") |
| 5 | cached value / payload | 캐시된 산출값 |
| 6 | computed at | 산출 시각 |
| 7 | invalidated at | 무효화 시각 |
| 8 | invalidation trigger | 아래 §3 열거형(§39) |
| 9 | ttl / expiry | 설계 시 결정 |
| 10 | status | Cache 상태 |

## 3. 열거형 / 타입

**Cached Type**(스펙 §38 원문): `SCOPE_PROJECTION` · `EFFECTIVE_SCOPE` · `RUNTIME_SCOPE`

**Invalidation Trigger**(스펙 §39 원문): `SCOPE_CHANGED` · `ORGANIZATION_CHANGED` · `PROJECT_CHANGED` · `ASSIGNMENT_CHANGED` · `POLICY_CHANGED`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Cache 저장체(전용) | — | `TeamPermissions.php:236-265` | **ABSENT** — effectiveScope는 요청마다 라이브 재계산·캐시 없음 |
| EFFECTIVE_SCOPE 산출 로직(캐시 없이 매번 계산) | effectiveScope | `TeamPermissions.php:236-265` | 근접(산출 로직 자체는 실재) — 그러나 version 무관·저장/무효화 개념 없음 |
| SCOPE_PROJECTION | — | — | **ABSENT** — Projection 자체 순신규(ADR §D-4) |
| RUNTIME_SCOPE(근접) | scopeSql/scopeSqlNamed/scopeChannelProduct(요청별 WHERE절 즉석 생성) | `TeamPermissions.php:286-293,299-307,315-322` | 근접(runtime scope SQL 생성 자체는 실재)이나 그 결과를 캐시하지 않고 매 쿼리 재생성 |
| Version 기반 캐시 키 | — | — | **ABSENT** — Scope Version 자체 ABSENT(ADR §D-4) |
| SCOPE_CHANGED/ASSIGNMENT_CHANGED 트리거 이벤트 소스(근접) | `replaceScope`(DELETE→INSERT) | `TeamPermissions.php:337-346` | 근접(변경 이벤트 자체는 실재) — 그러나 이를 소비해 캐시를 무효화하는 대상 캐시가 없으므로 트리거 개념 자체가 성립하지 않음 |
| ORGANIZATION_CHANGED 트리거 이벤트 소스(근접) | ORG_PRESET `seedOrg` | `TeamPermissions.php:706-722` | 근접(조직 변경 이벤트는 실재)이나 캐시 무효화 대상 없음 |
| PROJECT_CHANGED | — | — | **ABSENT** — PM 미연동(`PM/Shared.php:59-89`) |
| POLICY_CHANGED 트리거 이벤트 소스(근접) | HIGH_VALUE_KRW 상수 변경 시나리오 | `Catalog.php:1036` | 근접이나 캐시 무효화 대상 없음 |

## 5. 설계 원칙

- Cache는 반드시 Version 기반(§38 명문) — Scope Version이 바뀌면 캐시 키도 바뀐다(stale read 방지).
- 현재 effectiveScope/scopeSql류가 "캐시 없이 매 요청 라이브 재계산"하는 것은 정확성 관점에서는 안전(항상 최신)하지만, Cache 도입 시에는 §39의 5개 트리거 전부가 무효화를 강제해야 하며, PROJECT_CHANGED는 PM↔Scope 연동 신설 후에만 의미를 갖는다.
- Cache 신설은 성능 최적화이지 정합성 완화가 아니다 — 무효화 트리거 누락 시 stale scope 노출(권한상승) 위험이므로 Mandatory Control 후보로 취급한다. 특히 manager scope 위임상한 실결함(DUPLICATE_AUDIT §D-5·`TeamPermissions.php:648-653`)이 해소되지 않은 채 Cache만 신설되면, 잘못 부여된 scope가 TTL 동안 고착되는 위험이 추가된다 — Cache는 Expansion Guard(§29) 이후 신설 권장.

## 6. Gap / BLOCKED_PREREQUISITE

- Cache 저장체·Version 기반 키 = ABSENT(Scope Version 자체 ABSENT).
- SCOPE_PROJECTION = ABSENT(Projection 순신규).
- 5개 Invalidation Trigger 중 PROJECT_CHANGED = PM↔Scope 연동 신설 후에만 성립.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

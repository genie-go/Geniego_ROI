# DSAR — Scope API Contract (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope API Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Historical 수정 API 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§44(API)는 **Scope 생성 · 수정 · 조회 · Simulation · Effective Scope 조회 · Scope Drift 조회**(6종)를 정의한다. ★이 저장소에는 전용 Scope API 표면(`/scope/*` 류 REST 엔드포인트) 자체가 없다 — 현행 scope 쓰기·읽기는 Team Permissions API(`replaceScope`/`effectiveForUser`)에 **비전용 부작용**으로 얹혀 있다(EXISTING_IMPLEMENTATION §1). 본 문서는 6개 API 항목 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

API 항목:
- **Create** — Scope Definition 신규 등록
- **Update** — 기존 Scope Definition 변경(버전 신설 필요)
- **Read** — Scope Definition/Assignment 조회
- **Simulation** — 변경 전 영향도 시뮬레이션(what-if)
- **Effective Scope 조회** — 특정 Subject의 실효 Scope 산출 결과 조회
- **Scope Drift 조회** — 정의값 대비 실효값 불일치 조회

## 3. 열거형 / 타입

§44 API 6종(원문 그대로): `SCOPE_CREATE` · `SCOPE_UPDATE` · `SCOPE_READ` · `SCOPE_SIMULATION` · `EFFECTIVE_SCOPE_READ` · `SCOPE_DRIFT_READ`. Write API 공통요구(원문): 생성·수정 API는 **Historical(과거 버전) 수정 금지** — 신규 버전 추가만 허용.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §44 API | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Create | **PARTIAL** | `replaceScope`(`TeamPermissions.php:337-346`)의 INSERT 절반이 근접 — 단 전용 Create API가 아니라 team permissions 저장 흐름의 부작용이며, Scope Definition/Registry 엔티티 자체가 없어 "정의를 생성"하는 것이 아니라 subject별 값을 즉시 기록 |
| 2 | Update | **PARTIAL(무버전)** | 동일 `replaceScope`의 DELETE→INSERT(`:337-346`)가 근접 — Update가 아니라 **전량교체**(이전 값 물리 소실). §44 Write API 공통요구인 "Historical 수정 금지"는 현행에 애초에 준수·위반 판정 대상이 없음(버전이 없으므로) |
| 3 | Read | **PARTIAL** | `effectiveForUser` 응답(`TeamPermissions.php:366-394`)에 scope 값이 포함되나, 전용 Scope Definition 조회 API가 아니라 팀원 권한 조회 응답의 일부 |
| 4 | Simulation | **ABSENT** | Scope 변경 전 영향도 시뮬레이션 grep 0(EXISTING_IMPLEMENTATION §9) |
| 5 | Effective Scope 조회 | **PARTIAL** | `effectiveScope()`(`TeamPermissions.php:236-265`) 함수 자체는 실재하나 **내부 헬퍼 호출**(`scopeSql`/`scopeSqlNamed`/`scopeChannelProduct` 등 `:272-322`)이지 독립된 조회 전용 REST 엔드포인트가 아님 — 4개 소비 핸들러(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,62,64,90,92,115,117,134`) 내부에서만 간접 소비 |
| 6 | Scope Drift 조회 | **ABSENT** | drift 판정 로직 grep 0(EXISTING_IMPLEMENTATION §9 확정) |

## 5. 설계 원칙

1. **비전용 부작용 API를 전용 Scope API로 승격, 대체 아님** — `replaceScope`/`effectiveForUser`가 소비하는 기존 team permissions 엔드포인트는 무후퇴 유지하고, 그 위에 독립된 `/scope/*` 표면을 신설해 Canonical Scope Registry를 직접 조회·조작하게 한다(ADR D-1).
2. **Update API는 실 구현 시 반드시 Historical 수정 금지를 강제** — 현행 `replaceScope`의 DELETE→INSERT 패턴이 정확히 §44가 금지하는 "과거 버전 파괴" 사례(Static Lint #4 Missing Version과 동일 근거). 신규 Update API는 새 버전 추가 방식으로 재설계(대체가 아니라 그 위에 버전 레이어).
3. **Simulation/Scope Drift 조회 API는 순신규, 근접 substrate로 오분류 금지** — 두 항목은 이 저장소에 어떤 근접값도 없음을 정직 유지.
4. **Effective Scope 조회 API는 `effectiveScope()` 로직을 재구현하지 않고 REST 표면만 신설** — 4개 소비 핸들러가 내부 호출하는 동일 함수를 외부에서 직접 조회 가능하게 노출(중복 Resolver 신설 금지).
5. **Write API 공통요구(생성·수정)는 Default Intersection·Scope 자동확대 금지와 결합** — 신규 Create/Update가 상위 scope로 자동 확장되지 않도록 Runtime Guard(#2 Expanded Scope)와 API 계층에서 이중 검증.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 6종 전부 Canonical Scope Registry/Version 실구현 + 전용 API 표면 신설 이후에 실 API 발동 가능.
- **ABSENT(순신규)**: Simulation(#4)·Scope Drift 조회(#6).
- **PARTIAL(근접·비전용)**: Create(#1)·Update(#2, 무버전)·Read(#3)·Effective Scope 조회(#5) — 전부 team permissions API의 부작용이지 전용 Scope API 아님.
- **판정**: NOT_CERTIFIED · 실 API = Canonical Scope Registry/Version 신설 + 전용 `/scope/*` 표면 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SCOPE_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]

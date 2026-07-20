# DSAR — Dynamic Role API Contract (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role API Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical(과거 Rule Version) 수정 API 금지 · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§32(API)는 **Dynamic Role 조회 · Rule 조회 · Rule Simulation · Runtime Projection 조회 · Effective Dynamic Role 조회**(5종)를 정의한다. ★이 저장소에는 전용 Dynamic Role API 표면(`/dynamic-role/*`·`/rule/*` 류 REST 엔드포인트) 자체가 없다 — 현행 role 조회는 `authedUser`/`authedTenant`(정적 team_role/plan 반환)와 `effectiveScope`/`effectiveForUser`(data_scope 값 조회)에 **비전용 부작용**으로 얹혀 있다(EXISTING_IMPLEMENTATION §1·§5). 본 문서는 5개 API 항목 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

API 항목:
- **Dynamic Role 조회** — 현재 활성 Runtime/Session/Conditional Role 목록 조회
- **Rule 조회** — Rule 정의/버전 조회
- **Rule Simulation** — 변경 전 영향도 시뮬레이션(what-if)
- **Runtime Projection 조회** — Rule 평가 결과로 산출된 Permission/Scope Projection 조회
- **Effective Dynamic Role 조회** — 특정 Subject의 실효 Dynamic Role 산출 결과 조회

## 3. 열거형 / 타입

§32 API 5종(원문 그대로): `DYNAMIC_ROLE_READ` · `RULE_READ` · `RULE_SIMULATION` · `RUNTIME_PROJECTION_READ` · `EFFECTIVE_DYNAMIC_ROLE_READ`. Write API 공통요구(ADR §3·Historical 수정 금지 원칙 계승): Rule 생성·수정은 **과거 Rule Version 수정 금지** — 신규 버전 추가만 허용.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §32 API | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Dynamic Role 조회 | **ABSENT(대상 자체 없음)** | Dynamic/Runtime/Session/Conditional Role 개념 자체가 grep 0(EXISTING_IMPLEMENTATION §1). 근접값으로 `authedUser`/`authedTenant`(정적 team_role/plan 반환·`UserAuth.php:1019,191,1022`)가 있으나 이는 **정적 role 조회**이지 Dynamic Role 조회가 아니므로 오분류 금지 |
| 2 | Rule 조회 | **ABSENT** | RBAC용 Rule Engine/Registry 자체가 grep 0(EXISTING_IMPLEMENTATION §2). `RuleEngine.php`(`:12,24`)의 마케팅 rule 조회는 별개 도메인(KEEP_SEPARATE, ADR D-4)이라 이 API의 substrate 아님 |
| 3 | Rule Simulation | **ABSENT** | Rule 평가 자체가 없으므로 시뮬레이션 대상도 없음(EXISTING_IMPLEMENTATION §2) |
| 4 | Runtime Projection 조회 | **ABSENT** | Dynamic Permission/Scope Projection 자체가 순신규(ADR §3 Canonical Interface, §거버넌스 계층 완전 부재) |
| 5 | Effective Dynamic Role 조회 | **PARTIAL(근접·오분류 주의)** | `effectiveScope()`(`TeamPermissions.php:236-265`)·`effectiveForUser`(`:366-394`)가 근접 substrate — 단 이는 **정적 data_scope 값의 라이브 재계산**(ABAC 행필터)이지 Dynamic Role(Runtime/Session/Conditional) 평가 결과가 아니다. "Effective"라는 명명 유사성에 속아 Dynamic Role API로 오분류 금지(ADR D-1 근접 substrate 표) |

## 5. 설계 원칙

1. **비전용 부작용 API를 전용 Dynamic Role API로 승격, 대체 아님** — `authedUser`/`authedTenant`/`effectiveScope`가 소비하는 기존 인증·팀권한 엔드포인트는 무후퇴 유지하고, 그 위에 독립된 `/dynamic-role/*` 표면을 신설한다(ADR D-1).
2. **Effective Dynamic Role 조회(#5)는 effectiveScope()를 재구현하지 않고 결정 입력으로 편입** — ABAC(data_scope) 산출값을 Dynamic Role Rule Evaluation의 attribute source 중 하나로 조립(ADR D-1 표 ABAC_SUBSTRATE), 중복 Resolver 신설 금지.
3. **Dynamic Role 조회(#1)/Rule 조회(#2)는 순신규, 근접 substrate로 오분류 금지** — 정적 team_role/api_key/admin_level 조회를 Dynamic Role 조회의 대체 근거로 사용하지 않는다(EXISTING_IMPLEMENTATION §1 "전부 정적(fixed) role" 확정).
4. **Rule Simulation(#3)/Runtime Projection 조회(#4)는 어떤 근접값도 없음을 정직 유지** — 거버넌스 계층 완전 부재(ADR §)를 그대로 반영.
5. **Historical 수정 금지 원칙은 Rule Write API 신설 시 최우선 강제** — Rule Version이 순신규이므로 첫 구현부터 "과거 버전 파괴" 패턴(예: Scope Registry의 `replaceScope` DELETE→INSERT 전량교체 안티패턴, Part 3-4 대응)을 반복하지 않는 설계 요구.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 5종 전부 Canonical Rule Registry/Version + Dynamic Role Projection 실구현 + 전용 API 표면 신설 이후에 실 API 발동 가능.
- **ABSENT(순신규)**: Dynamic Role 조회(#1)·Rule 조회(#2)·Rule Simulation(#3)·Runtime Projection 조회(#4).
- **PARTIAL(근접·오분류 주의)**: Effective Dynamic Role 조회(#5) — `effectiveScope()`/`effectiveForUser`가 근접이나 ABAC 정적 값 조회이지 Dynamic Role 평가 결과 아님.
- **판정**: NOT_CERTIFIED · 실 API = Canonical Rule Registry/Version/Projection 신설 + 전용 `/dynamic-role/*` 표면 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]

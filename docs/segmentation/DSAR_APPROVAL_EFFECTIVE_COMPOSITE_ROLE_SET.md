# DSAR — Approval Effective Composite Role Set (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Effective Composite Role Set)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_EFFECTIVE_COMPOSITE_ROLE_SET`은 하나의 Composite Role(§21) Version이 Mandatory/Optional/Excluded/Nested Component(§23)를 전개(flatten)한 최종 결과를 캐시한다. Component Path(각 Component가 어느 Nested 경로로 유입됐는지)·Effective Permission/Deny Set(§25 Aggregation 결과)·Effective Actor Eligibility(§27 교집합 결과)·Risk/Criticality Result(§28 상향 결과)를 하나의 Resolved 스냅샷으로 묶어, Runtime이 매번 Component를 재귀 전개하지 않도록 한다.

★근접 주의: `ORG_PRESET`(`TeamPermissions.php:706-722` — 15개 팀유형별 기본 권한셋)이 "여러 Permission을 묶어 미리 정의한다"는 형태상 Composite Role과 가장 근접해 보이나, GROUND_TRUTH §5가 명시하듯 이는 **team 생성 시 적용되는 정적 템플릿(preset)이지 여러 Role Definition을 조합·전개하는 Composite Role이 아니다**(§6.3 혼동 금지 — "팀 템플릿이지 role 조합 아님"). Effective Composite Role Set을 `ORG_PRESET` 전개로 오인하지 말 것.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| effective composite set id | Set PK |
| tenant id | 소속 테넌트 |
| composite role id | 상위 Composite Role(§21) 참조 |
| composite role version id | 상위 Composite Role Version(§22) 참조(Version Binding) |
| mandatory components | 필수 Component(§23 MANDATORY) 전개 목록 |
| optional components included | 실제 포함된 Optional Component(§23 OPTIONAL) 목록 |
| excluded components | 제외된 Component(§23 EXCLUDED) 목록 |
| nested components | Nested Composite(§24) 전개 목록 |
| component paths | 각 Component의 Nested 유입 경로 |
| effective permission set | §25 Aggregation 최종 Allow 집합 |
| effective deny set | §25 Explicit Deny Always Propagate 최종 집합 |
| effective scope requirements | §26 Scope Aggregation(기본 INTERSECTION) 최종 결과 |
| effective actor eligibility | §27 Actor Eligibility 교집합 최종 결과 |
| effective validity | Validity Intersection 최종 결과 |
| risk result | §28 Risk Aggregation(최대값/상향) 최종 결과 |
| criticality result | Criticality Aggregation 최종 결과 |
| conflict result | §18 Role Conflict 판정 결과 |
| dependency result | §17 Role Dependency 충족 여부 |
| effective digest | 이 Set의 Canonical Digest |
| resolved at | 계산 시각 |
| valid until | 만료 시각(Cache Invalidation 대상) |
| status | 생명주기 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

Effective Composite Role Set 자체는 별도 열거형이 스펙에 명시되지 않는다(§35). 내부 참조 요소는 §23 Component Type(MANDATORY/OPTIONAL/EXCLUDED/CONDITIONAL_REFERENCE/BASE/SPECIALIZATION/RESTRICTION/CUSTOM)·§25 Permission Aggregation Strategy·§26 Scope Aggregation Strategy를 그대로 인용한다.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Set 자체(Component 전개·Aggregation 결과 캐시) | ABSENT(순신규) | GROUND_TRUTH §4 "Composite Role / Component / Nested Composite = 전무" |
| **근접 "권한 묶음 프리셋"(Composite 아님)** | Role 묶음 프리셋(role bundle 최근접·단 team template) | `ORG_PRESET`(`TeamPermissions.php:706-722`) — 15개 팀유형별 정적 기본 권한셋. **Composite Role Component 전개가 아니라 team 생성 시 1회 적용되는 템플릿**(§6.3 혼동 금지·GROUND_TRUTH §5) |
| effective permission set / effective deny set | Permission Group Candidate(묶음) | team_role→acl_permission(`TeamPermissions.php:152`)은 Role→Permission 정적 매핑이지 Component Aggregation 결과 아님 |
| mandatory / optional / excluded components | ABSENT(순신규) | Composite Role Component(§23) 개념 자체가 부재 |

## 5. 설계 원칙

- `ORG_PRESET`은 Effective Composite Role Set의 구현 기반으로 재사용하지 않는다 — 팀 생성 시 1회성 값 복사(preset apply)와 Composite Role의 Version-bound 재귀 전개(Component가 바뀌면 모든 참조 Composite가 재계산 대상)는 근본적으로 다른 메커니즘이다(§6.3·§24 Nested Composite).
- `effective permission set`은 §25 "Allow=Deduplicated Restricted Union·Explicit Deny=Always Propagate·Excluded=Remove from Effective Allow" 순서를 그대로 따른다 — 단순 Union 금지.
- `risk result`는 구성 Component 중 최대 Risk보다 낮아질 수 없다(§28·§6.10) — `ORG_PRESET`처럼 정적으로 낮은 권한을 재부여하는 방식과 혼동하지 않는다.
- Nested Component가 순환(Composite A includes B & B includes A)하면 이 Set 계산 자체를 차단한다(§44 Composite Circular Detection).

## 6. Gap / BLOCKED_PREREQUISITE

Effective Composite Role Set은 상위 Composite Role(§21)·Composite Role Version(§22)·Composite Role Component(§23)가 모두 ABSENT이므로 **완전 ABSENT(순신규) · BLOCKED_PREREQUISITE** 판정이다. 유일한 근접 패턴(`ORG_PRESET`)은 팀 템플릿이며 Composite Role 조합이 아니므로 확장 기반으로 재사용할 수 없다(§6.3). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.

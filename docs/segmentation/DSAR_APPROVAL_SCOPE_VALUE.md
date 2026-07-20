# DSAR — Approval Scope Value (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Value)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Value는 Scope Type 안에서 **실제로 허용되는 구체 값 집합**이다(스펙 §2 `APPROVAL_SCOPE_VALUE`). 예: `scope_type=WAREHOUSE`일 때 value는 특정 창고 ID 목록. 현행 이 역할의 substrate는 `data_scope.scope_values` 컬럼이다(EXISTING_IMPLEMENTATION §1) — subject(user/team)별로 scope_type 하나에 대응하는 값 목록을 저장한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_value_id` | Value 식별자(PK) |
| `scope_definition_id` | 소속 Scope Definition 참조 |
| `value` | 구체 값(예: 창고ID, 채널명, SKU) |
| `value_source` | 값 출처(수동 입력/프리셋/동적 계산) |
| `is_wildcard` | 와일드카드 여부(무제한 표시) |

## 3. 열거형 / 타입

- **`value_source`**: `MANUAL` · `PRESET`(예: `ORG_PRESET`) · `DYNAMIC`(§26 Dynamic Scope 참조 — Part 3-5 실구현).
- **`is_wildcard`**: `true`/`false` — 현행 `company=null`(EXISTING_IMPLEMENTATION §1)이 사실상 wildcard의 유일한 실 사례.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| `scope_values` 컬럼(값 저장소) | **PARTIAL/PRESENT** | `data_scope(...,scope_values,...)` 스키마(`TeamPermissions.php:160-166`·EXISTING_IMPLEMENTATION §1) |
| 값 강제 헬퍼(4차원만) | **PARTIAL(저강도)** | `scopeSql`(`TeamPermissions.php:286-293`)·`scopeSqlNamed`(`:299-307`)·`scopeChannelProduct`(`:315-322`)·`scopeValuesFor`(`:272-280`) — 소비 4개소(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134`) |
| wildcard 값(company) | **PRESENT(암묵)** | `TeamPermissions.php:258` — company=null(무제한), 명시 `*` 기호 없음 |
| api_key scope 값(별개 축) | **PRESENT(별개)** | `write:*`(`UserAuth.php:4307`·강제 `index.php:589`) — 명시 wildcard 문자열, data_scope.scope_values와 다른 값체계(DUPLICATE_AUDIT D-4) |
| ORG_PRESET 시드 값 | **PRESENT(위험 시드)** | `TeamPermissions.php:706-722` — 재무팀 프리셋 `scope='company'`(전사 무제한), idempotent 재실행 시 승인 없이 재적용(DUPLICATE_AUDIT D-5) |
| `value_source`/`is_wildcard` 명시 필드 | **ABSENT** | 별도 컬럼 없음 — `scope_values`가 원시 값만 저장 |
| Dynamic 값 계산 | **ABSENT(설계 참조만)** | 스펙 §26 Dynamic Scope는 Part 3-5로 위임(순신규) |

★`scope_values`는 값 저장소로 실재하나, 값의 출처(수동/프리셋/동적)를 구분하는 메타데이터·wildcard 명시 플래그는 없다. `company=null`이 유일한 암묵 wildcard 사례이며 api_key의 `write:*`(명시 wildcard)와는 다른 값체계다.

## 5. 설계 원칙

1. **Extend not Replace** — `data_scope.scope_values`를 Scope Value의 원시 substrate로 흡수, 스키마 변경 없이 메타데이터(value_source/is_wildcard) 레이어만 추가.
2. **Wildcard 명시화** — 암묵 wildcard(company=null)와 명시 wildcard(api_key write:*)를 하나의 `is_wildcard` 개념으로 통합 표기하되 값체계는 분리 유지(DUPLICATE_AUDIT D-4).
3. **ORG_PRESET 승인 Hook 필요** — 재무팀 `company` 전사 무제한 프리셋(`:706-722`)은 seed 재실행 시 승인 절차 없이 즉시 적용되는 설계 리스크로 등재(ADR §5 D-5 부기). 이번 차수 수정 안 함.
4. **Default Intersection 정합** — 다중 Scope Value가 병합될 때 Scope Policy(§9)의 Intersection 기본값을 따름.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Scope Value가 Role/Assignment Version과 결합하는 지점은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(ABSENT)**: value_source/is_wildcard 명시 메타데이터 전무 — 순신설.
- **Gap-2(구조 제약 상속)**: `data_scope` UNIQUE(tenant,subject_type,subject_id) 제약으로 subject당 scope_type 1개의 scope_values만 저장 가능(EXISTING_IMPLEMENTATION §1) — Scope Value 다중 Type 동시 보유 모델은 스키마 확장 필요.
- **Gap-3(위험 시드)**: `ORG_PRESET` 재무팀 `company` 프리셋(`TeamPermissions.php:706-722`)이 승인 절차 없이 전사 무제한 부여 — Scope Value 설계 시 seed 값에도 승인 Hook 적용 필요(수정은 별도 fix 세션).
- **정직 부재**: Dynamic value 계산 substrate ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).

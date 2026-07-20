# DSAR — Approval Scope Mapping (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Mapping)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Mapping은 Scope Policy(§9)의 `Explicit Mapping` 전략을 지원하는 엔티티다(스펙 §2 `APPROVAL_SCOPE_MAPPING`) — 서로 다른 Scope Type/축 간의 명시적 대응 관계(예: `warehouse` 축 값 ↔ `wms_permissions.warehouses` 값의 등가 매핑)를 선언한다. ADR D-1·DUPLICATE_AUDIT D-2가 지목한 **warehouse 이중구현**(`scopeSql` vs `guardWarehouse`)이 바로 Scope Mapping이 통합해야 할 1순위 대상이다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_mapping_id` | Mapping 식별자(PK) |
| `source_scope_type` | 매핑 출발 Scope Type/축 |
| `target_scope_type` | 매핑 대상 Scope Type/축 |
| `mapping_rule` | 값 대응 규칙(1:1/1:N/변환식) |
| `bidirectional` | 양방향 매핑 여부 |
| `owner` | Mapping 소유자 |

## 3. 열거형 / 타입

- **`mapping_rule`**(설계 제안): `IDENTITY`(값 동일) · `TRANSFORM`(변환 필요) · `SUBSET`(한쪽이 다른 쪽의 부분집합).
- 스펙 §9는 `Explicit Mapping`을 Policy 전략 중 하나로만 언급(구체 필드 정의는 §2 Canonical Entity 나열까지) — 본 문서 필드는 이를 근거로 한 설계 확장.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| 통합 Mapping 엔티티 | **ABSENT** | grep 0 — Explicit Mapping을 계약으로 명시하는 코드 없음 |
| ★1순위 매핑 대상(warehouse 이중구현) | **PRESENT(미통합 상태로 실재)** | `scopeSql($req,'warehouse','wh_id')`(`Wms.php:1291`) **vs** `guardWarehouse`(`wms_permissions.warehouses` 독자 조회) — 같은 "창고 접근 판정"을 2개 코드경로가 각자 수행, 상호 매핑/동기화 로직 grep 0(DUPLICATE_AUDIT D-2) |
| api_key defaultScopes 값 중복(매핑 후보) | **PRESENT(2곳 독립정의·매핑 없음)** | `UserAuth.php:4305-4311`(apiKeyDefaultScopes) vs `Keys.php:189-195`(동일 값 재정의) — 값은 일치하나 단일 소스 매핑/참조 관계 없음(DUPLICATE_AUDIT D-3) |
| data_scope ↔ api_key scope 교집합 매핑 | **ABSENT** | 두 축이 별개로 존재하며 상호 매핑 로직 grep 0(EXISTING_IMPLEMENTATION §3) |

★"매핑이 필요한 지점"은 실재(warehouse 이중구현·api_key defaultScopes 2곳)하지만, 그 지점들을 **연결하는 Mapping 엔티티 자체는 ABSENT**다. 현재는 두 독립 구현이 값 우연 일치에 의존할 뿐, 구조적 매핑 계약이 없어 한쪽만 갱신되면 drift가 발생한다(DUPLICATE_AUDIT D-2 위험 지적).

## 5. 설계 원칙

1. **warehouse 이중구현 최우선 통합** — Scope Mapping의 첫 적용 대상은 `scopeSql(warehouse)` ↔ `wms_permissions.warehouses`(ADR D-1 표·DUPLICATE_AUDIT D-2). 두 경로를 대체하지 않고 Mapping 레이어로 동기화 계약을 신설.
2. **api_key defaultScopes 2곳 통합** — `UserAuth.php:4305-4311`과 `Keys.php:189-195`를 Mapping의 단일 참조 소스로 정합(DUPLICATE_AUDIT D-3).
3. **Explicit Mapping은 Intersection의 대안이지 대체 아님** — 기본 Policy는 여전히 Intersection(§9), Mapping은 명시적으로 필요한 축 간 대응에만 적용.
4. **Golden Rule** — 신규 Mapping 테이블은 두 산재 구현을 대체하지 않고 그 사이를 중개하는 순신규 레이어.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Mapping이 Role/Assignment/Permission과 결합하는 지점은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(ABSENT)**: Mapping 엔티티·mapping_rule·bidirectional 계약 전무 — 순신설.
- **Gap-2(★이중구현 drift 위험)**: warehouse 두 경로(`Wms.php:1291` vs `wms_permissions.warehouses` 독자 조회) 간 매핑 부재로 한쪽만 갱신 시 불일치 발생 가능(DUPLICATE_AUDIT D-2) — Mapping 신설 전까지 잔존 위험.
- **Gap-3(값 중복 2곳)**: api_key defaultScopes(`UserAuth.php:4305-4311`·`Keys.php:189-195`)가 구조적으로 2곳 유지보수 상태(DUPLICATE_AUDIT D-3) — 현재 drift 없음이나 Mapping 부재로 재발 가능.
- **정직 부재**: mapping_rule/bidirectional 대응 실코드 ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).

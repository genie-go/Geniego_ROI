# DSAR — Approval Scope Definition (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Definition)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Definition은 개별 Scope의 **정체(코드·이름·타입·부모·경로·활성버전·소유·상태)를 선언하는 단위 레코드**다(스펙 §5). Scope Registry가 컨테이너라면 Definition은 그 안의 개별 항목이다. 현재 이 역할에 가장 근접한 substrate는 `data_scope` 테이블의 9차원 정의(`DATA_SCOPES` enum·EXISTING_IMPLEMENTATION §1)다. 본 엔티티는 data_scope 정의를 대체하지 않고 그 위에 **Scope Code/Path/Owner/Status 계약을 신설·정형화**한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_definition_id` | Definition 식별자(PK) |
| `scope_code` | Scope Canonical Code(테넌트/타입 단위 유일) |
| `scope_name` | 표시명 |
| `scope_type` | Scope Type 참조(§ Scope Type 문서·§3) |
| `parent_scope` | 상위 Scope 참조(FLAT substrate에서는 대부분 null) |
| `scope_path` | 계층 경로(Scope Hierarchy 신설 시 사용·§13) |
| `active_version` | 현재 유효 Version 참조(§ Scope Version 문서) |
| `owner` | Definition 소유자 |
| `status` | Lifecycle 상태 |

## 3. 열거형 / 타입

- **`status`**(제안, Role Definition 선례 준용): `DRAFT` · `ACTIVE` · `DEPRECATED` · `ARCHIVED`.
- **`scope_type`**: § Scope Type 문서의 33종 열거를 참조(스펙 §3).
- `parent_scope`/`scope_path`는 §13 Scope Hierarchy(순신규)가 정의되기 전까지 실질적으로 미사용(§4 참조).

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| `scope_code`/`scope_type`/`scope_values` 등가물 | **PARTIAL/PRESENT** | `data_scope(tenant_id,subject_type,subject_id,scope_type,scope_values,updated_at)` 스키마(`TeamPermissions.php:160-166`)·9차원 enum(`:41`)(EXISTING_IMPLEMENTATION §1) |
| `scope_type` 열거값(9종) | **PARTIAL(4/9 실강제)** | `TeamPermissions.php:41` — channel/product/brand/warehouse만 SQL 강제(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134`) |
| 기본값 | **PRESENT** | 기본 `'own'`(`TeamPermissions.php:342`) |
| UNIQUE(tenant,subject_type,subject_id) 구조 제약 | **PRESENT(구조적 한계)** | `TeamPermissions.php:160-166` — subject당 scope_type 1개만, 다차원 동시부여 불가(EXISTING_IMPLEMENTATION §1) |
| `scope_name`/`scope_code`(유일 코드 체계) | **ABSENT** | 별도 코드/이름 컬럼 없음 — scope_type enum 값 자체가 코드 역할 겸용 |
| `parent_scope`/`scope_path` | **ABSENT** | data_scope 9차원=FLAT(부모-자식 없음·`company`만 특례)·team 테이블도 평면(`TeamPermissions.php:145-151`·parent_team_id 없음)(ADR D-3) |
| `active_version`/`owner`/`status` | **ABSENT** | 버전·소유·lifecycle 개념 전무(EXISTING_IMPLEMENTATION §9) |

★data_scope는 Scope Definition의 **값 substrate**(scope_type + scope_values)로 가장 근접하나, 코드/이름/부모/경로/버전/소유/상태 계약이 없어 정식 Definition 레코드가 아니다.

## 5. 설계 원칙

1. **Extend not Replace** — data_scope의 scope_type/scope_values를 Definition의 값 substrate로 흡수.
2. **Scope Hierarchy ≠ Organization Hierarchy** — `parent_scope`/`scope_path`는 team 테이블 parent_team_id 부재·menu_tree.parent_id(UI 위계)와 물리 분리 유지(ADR D-3).
3. **company=wildcard 특례 명시** — `company` 차원은 사실상 무제한(`TeamPermissions.php:258`)이므로 Definition 설계 시 별도 경고 플래그 필요(자동확대 금지 원칙과 충돌 지점).
4. **UNIQUE 구조 제약 인지** — 현행 subject당 scope_type 1개 제약(다차원 동시부여 불가)은 Definition 다중 인스턴스 모델로 흡수해야 함(구조 변경 없이 설계만 확장).
5. **Versioned** — Definition 변경은 In-place 아니라 § Scope Version 문서의 신규 버전으로(현행 replaceScope DELETE→INSERT는 이력 소실·개선 대상).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Definition의 Role/Permission Version 결합은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(ABSENT)**: scope_code/scope_name/owner/status/active_version 전무 — 순신설.
- **Gap-2(구조 제약)**: UNIQUE(tenant,subject_type,subject_id)로 다차원 동시부여 불가 — Definition 다중 레코드 모델 시 스키마 확장 필요(순신규 컬럼/테이블·기존 파괴 금지).
- **Gap-3(5차원 미완성)**: company/team/campaign/partner/own 5차원은 정의만·SQL 강제 경로 없음(EXISTING_IMPLEMENTATION §1) — Definition 계약상 "정의됨"과 "강제됨"을 분리 표기 필요.
- **정직 부재**: parent_scope/scope_path 대응 실코드 ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).

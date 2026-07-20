# DSAR — Approval Dynamic Attribute-based Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Attribute-based Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Attribute-based Role은 스펙 §1 구현범위 8번(Attribute-based Role)이 정의하는, 사용자/조직 속성(Attribute)을 조건으로 role을 결정하는 Dynamic Role 유형이다. ADR D-1·ground-truth §3·§10은 **ABAC=data_scope 9차원 행필터가 Attribute-based 결정의 유일한 실재 근접 substrate**라고 확정한다(★PARTIAL). 단, ADR·ground-truth가 반복 강조하는 핵심 단서는 — **data_scope는 "role을 활성화"하지 않고 "이미 활성인 role의 데이터 행을 필터링"할 뿐**이라는 점이다. 본 엔티티는 이 근접이지만 동일하지 않은 관계를 정직하게 등재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `attribute_role_id` | Attribute-based Role 식별자(PK) |
| `attribute_source_ref` | 결정 입력 속성 참조(별도 엔티티 — Attribute Source) |
| `attribute_predicate` | 속성 조건식(예: `scope_type=warehouse AND scope_values IN (...)`) |
| `target_role_ref` | Part 3-1 Role Registry 참조 |
| `resolution_mode` | `ROLE_ACTIVATION`(스펙 정의 목표) vs `DATA_ROW_FILTER`(현행 근접 substrate 실동작) |

## 3. 열거형 / 타입

- **`resolution_mode`**(설계 판정 축, ADR D-1 반영): `ROLE_ACTIVATION`(스펙이 요구하는 목표 동작 — role 자체를 켜고 끔) · `DATA_ROW_FILTER`(현행 `effectiveScope`의 실동작 — role은 정적으로 이미 부여된 채 데이터 행만 제한).
- **`attribute_dimension`**(현행 근접 substrate의 실제 축): `DATA_SCOPES` 9차원(스펙 아님·`TeamPermissions.php:41` 정의).

## 4. 실 substrate 매핑 (PARTIAL·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| ABAC 리터럴 실사용 | **PRESENT(단일목적)** | `Wms.php:600,1290`·`AdPerformance.php:12-13,22,25,134`·`OrderHub.php:260`·`Catalog.php:1000`·`routes.php:1582`·`TeamPermissions.php:10,227` |
| Attribute 기반 결정 핵심(근접) | **PARTIAL(★유일 실재)** | `effectiveScope`(`TeamPermissions.php:236-265`)·DATA_SCOPES 9차원(`:41`)·fail-closed DENY_SCOPE(`:234,251,263`)·행필터 `scopeSql`/`scopeSqlNamed`/`scopeChannelProduct`(`:286-322`) |
| `resolution_mode` 실동작 | **DATA_ROW_FILTER(스펙 목표=ROLE_ACTIVATION과 상이)** | ground-truth §3 — "attribute=scope_type/scope_values로 행단위 접근 결정=ABAC 최근접이나 단일목적(데이터 행필터) 축소판" |
| Position/Department/Device/Network/Time을 결정 입력으로 쓰는 범용 ABAC 정책 엔진 | **ABSENT** | ground-truth §3 — "범용 ABAC 정책 엔진=부재" |
| Attribute-based **Role**(role 자체 활성/비활성) | **ABSENT** | 정적 role(`team_role`/`admin_level`/`api_key.role`) 전부 로그인 시 세션 스냅샷 고정값(`UserAuth.php:1019,191,1022`·`Db.php:942-955`·`index.php:573-576`) — 속성 변화가 role을 재계산하는 경로 grep 0(EXISTING_IMPLEMENTATION §1) |

★핵심 정직 판정: **data_scope는 Attribute-based Role의 "role" 부분이 아니라 "attribute" 부분만 실재**한다. Attribute(scope_type/scope_values)는 존재하고 행필터로 강제되지만, 그 결과로 "role이 활성화되거나 비활성화"되는 동작은 시스템에 없다 — role은 여전히 로그인 시 고정된 정적값이다.

## 5. 설계 원칙

1. **ABAC data_scope를 Attribute Role의 Attribute Source로 편입(확장), Role 자체는 순신설** — 단일목적(행필터) 축소판을 범용 Attribute-based Role 결정 입력으로 승격하되, 기존 `effectiveScope` 판정 결과·API 계약은 무회귀 유지(ADR D-1 표).
2. **`resolution_mode` 구분을 코드/문서 어디서나 명시** — DATA_ROW_FILTER(현행)와 ROLE_ACTIVATION(목표)을 동일시하는 과신 금지.
3. **9차원 외 속성(Position/Department/Device/Network/Time) 결정 입력화는 순신규** — Attribute Source 엔티티(별도 문서)가 이 갭을 등재.
4. **Golden Rule** — 새 Attribute-based Role 엔진은 `TeamPermissions.php`의 `effectiveScope`/`scopeSql` 계열을 재구현하지 않고 결정 입력으로 재사용(호출)한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Attribute-based Role이 Part 3-1 Role Registry·Part 2 Permission Engine과 실제로 결합해 role을 활성화하는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(role 활성화 자체 ABSENT)**: data_scope는 데이터 행필터일 뿐 role을 켜고 끄지 않음 — "Attribute-based Role 구현 완료"로 과신 금지(정직 근사, 동일물 아님).
- **Gap-2(단일목적 축소판)**: DATA_SCOPES 9차원 중 SQL 강제는 채널/상품/브랜드/창고 등 소수 차원뿐(EXISTING_IMPLEMENTATION §3 인용 범위) — Position/Department/Device/Network/Time 등 스펙 §4 속성은 결정 입력으로 미연결.
- **정직 부재**: 범용 ABAC 정책 엔진(속성 다축 결합 평가) 자체가 부재 — 결함으로 날조 금지. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).

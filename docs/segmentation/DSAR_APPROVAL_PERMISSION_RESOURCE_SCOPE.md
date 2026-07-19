# DSAR — Permission Resource Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 적용되는 **대상 리소스**를 세 층위로 정형화하는 축: (a) **Resource Type Scope**(리소스 종류 전체), (b) **Resource Instance Scope**(특정 인스턴스), (c) **Resource Version binding**(특정 버전). 핵심 불변식은 **Type Scope가 다른 Instance에 암묵 적용되지 않음** — "APPROVAL_CASE 전체 view" 권한이 자동으로 특정 case의 무제한 접근을 뜻하지 않으며, Instance는 tenant·legal entity·owning org·scope source를 함께 검증한다. 신설이 아니라 실존 `TeamPermissions` `menu_key`(리소스 종류의 최근접)를 Canonical Resource Type substrate로 흡수·정규화한다.

## 2. Canonical 필드

### Resource Type Scope
| 필드 | 설명 |
|---|---|
| `resource_type` | 리소스 종류(§3 열거) |
| `applies_all_instances` | Boolean(종류 전체 대상 여부·기본 false) |

### Resource Instance Scope
| 필드 | 설명 |
|---|---|
| `resource_type` | 인스턴스의 종류 |
| `resource_id` | 인스턴스 식별자 |
| `resource_version` | 바인딩된 버전(§Resource Version) |
| `tenant` | 인스턴스 귀속 테넌트 |
| `legal_entity` | 인스턴스 귀속 법인(없으면 ABSENT) |
| `owning_organization` | 소유 조직 |
| `scope_source` | 이 Scope가 파생된 출처(DIRECT/TYPE_DERIVED/INHERITED) |
| `digest` | Instance Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**resource_type**: `APPROVAL_CASE` · `DECISION` · `WORK_ITEM` · `ASSIGNMENT` · `PAYMENT_REQUEST` · `SETTLEMENT` · `REBATE` · `CLAIM` · `CONTRACT` · `REPORT` · `CONFIGURATION` · `PERMISSION` · `ROLE` · `AUDIT_RECORD` · `CUSTOM`.
**scope_source**: `DIRECT`(직접 인스턴스 지정) · `TYPE_DERIVED`(Type Scope에서 파생·명시 필요) · `INHERITED`(Org/Version 상속).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Resource Type 종류 어휘 | `TeamPermissions` `menu_key`(26 MENU_CATALOG) | CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화) | `TeamPermissions.php:55-82` |
| Type × Action 결합 | `acl_permission`(menu_key × actions CSV·UNIQUE `uq_acl`) | 정형화 | `TeamPermissions.php:152-159`·`:170` |
| Instance 행 경계(부분) | `data_scope`(scope_values로 특정 id 집합 제한 가능) | 부분 substrate(row 수준) | `TeamPermissions.php:160-166`·`:286-293` |
| `resource_id`/`resource_version` binding·`owning_organization`·`scope_source`·Type→Instance 암묵 차단·`digest` | — | **ABSENT(순신규)** | Instance/Version first-class 엔티티 부재 |

★현행 substrate는 **리소스 "종류"를 `menu_key`로 UI 지향 표현**할 뿐, `{DOMAIN}:{RESOURCE}` Canonical Type도, per-instance/per-version binding도 없다. `menu_key`(UI 메뉴)를 Resource Type로 오승격하지 않고 정규화 매핑한다.

## 5. 설계 원칙 / 결정

- **Type ≠ Instance**: Type Scope는 다른 Instance에 **암묵 적용 금지**. Instance 접근은 `scope_source=TYPE_DERIVED`를 명시하고 tenant/legal entity/owning org를 재검증해야 한다.
- **Version binding**: Resource Version이 지정되면 해당 버전에만 유효(과거 버전 재해석 금지·Snapshot 정합).
- **menu_key는 Canonical 아님**: Legacy Permission Mapping으로 `{DOMAIN}:{RESOURCE}:{ACTION}` 정규화(confidence 기록).
- Golden Rule: 중복 Resource Registry 신설 금지 — MENU_CATALOG 흡수 후 Instance/Version 상위 신설.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Resource Instance Scope(`resource_id`/`resource_version`/`owning_organization`/`scope_source`)·Type→Instance 암묵 차단·`digest` = 순신규 ABSENT.
- **PARTIAL substrate**: 리소스 종류(menu_key)·row 수준 인스턴스 제한(data_scope)은 부분 실재.
- **BLOCKED_PREREQUISITE**: 실 Resource Type/Instance/Version Registry는 선행 Canonical Resource Registry + Decision Core 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.

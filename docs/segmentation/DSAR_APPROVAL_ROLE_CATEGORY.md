# DSAR — Approval Role Category (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Category)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Category는 **Role을 사람이 이해·검색·그룹핑하기 위한 편의 분류축**이다. Type이 actor 적격·enforcement 성격을 좌우하는 반면, Category는 "이 Role이 대략 어떤 일을 하는가"(뷰어/운영/편집/검토/승인/감사/관리자 등)를 표시·필터링하는 용도다. 현재 team_role(owner/manager/member)이나 api_key role(viewer~admin)에 대응 개념이 부분적으로 암시되나 명시 Category enum은 없다. 본 엔티티는 Category를 **표시·조직화 목적**으로 정의하되, **Enforcement(실 인가 판정)를 직접 대체하지 않는다**(판정은 Permission/Type/Scope로).

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_category_id` | Category 식별자(PK) |
| `category_code` | Category Canonical Code(§3 enum) |
| `category_name` / `description` | 이름·설명 |
| `display_group` | UI 그룹핑 힌트 |
| `sort_order` | 표시 정렬 |
| `enforcement_authoritative` | Enforcement 근거 여부(항상 false) |
| `owner` | Category 소유자 |
| `digest` | Category 정의 digest |

## 3. 열거형 / 타입

- **`category_code`**: `VIEWER` · `OPERATOR` · `CREATOR` · `EDITOR` · `REVIEWER` · `APPROVER` · `AUDITOR` · `ADMINISTRATOR` · `CONFIGURATOR` · `ANALYST` · `EXPORTER` · `SUPPORT` · `SECURITY` · `COMPLIANCE` · `INTEGRATION` · `SYSTEM` · `CUSTOM`.
- **`enforcement_authoritative`**: 항상 `false` — Category는 편의 분류. 실 인가 판정은 Permission Mapping·Type·Scope가 담당(Category로 접근 허용/차단 금지).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Category(명시 분류) | **ABSENT → 신설** | Category enum 없음 |
| team_role(위계) | 편의 분류 암시(정형화 대상) | `TeamPermissions.php:120-131` — owner≈ADMINISTRATOR·manager≈OPERATOR·member≈VIEWER 성격(명시 매핑 없음) |
| api_key role | 편의 분류 암시 | `Keys.php:95` — viewer≈VIEWER·analyst≈ANALYST·admin≈ADMINISTRATOR 성격(명시 매핑 없음) |
| `category_code` / `display_group` / `enforcement_authoritative` | **ABSENT** | 없음 |

★현행 team_role/api_key role 문자열은 Category를 **암시**할 뿐 명시 Category enum이 없다. 값의 성격(owner→관리자, viewer→뷰어)은 유추 가능하나 정형 매핑은 순신설이며, 어느 경우도 Category로 인가를 판정하지 않는다(판정은 acl_permission·rank·scope).

## 5. 설계 원칙

1. **Category ≠ Enforcement** — 편의 분류일 뿐 접근 판정 근거 아님(`enforcement_authoritative=false`). 실 판정은 Permission/Type/Scope.
2. **Category ≠ Type** — Type은 actor 적격·enforcement 성격, Category는 표시·그룹핑(중복 정의 금지).
3. **표시 안정성** — Category 변경은 표시·검색에만 영향, 실 권한 불변.
4. **Extend not Replace** — team_role/api_key role의 암시 성격을 Category로 매핑하되 판정 코드 무변경(회귀 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Category와 실 Permission의 정합 표시는 선행 Part 2 Permission Engine 이후 의미 있음. 본 차수 코드 0(설계).
- **Gap-1(ABSENT)**: category_code enum·display_group·enforcement 플래그 전무 — 순신설.
- **Gap-2**: team_role/api_key role의 Category 성격은 암시만 존재(명시 매핑 없음) → 정형 매핑 후속.
- **정직 부재**: 승인자/검토자 등 Category 기반 조직 개념 현행 없음(ABSENT). isApprover/isManager 하드코딩 전무. admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

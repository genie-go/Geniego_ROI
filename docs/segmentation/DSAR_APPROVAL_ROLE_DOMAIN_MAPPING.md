# DSAR — Approval Role Domain Mapping (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Domain Mapping)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Domain Mapping은 **Role이 소속·적용되는 업무 Domain을 규정하고, 한 Role이 여러 Domain에 걸칠 때 다중 Domain을 Mapping Table로 표현**하는 엔티티다. Canonical Code의 `{DOMAIN}` 분절과 정합되며, 승인·정산·리베이트·클레임·계약·보안 등 도메인별로 Role이 갈리는 엔터프라이즈 요구를 지지한다. 현재 team_role은 테넌트 내부 위계일 뿐 도메인 개념이 없고, data_scope(9dims 행필터)가 도메인 스코프의 가장 가까운 인접이나 Role↔Domain 매핑은 아니다. 본 엔티티는 Role Definition에 Domain을 결합하고, 다중 Domain Role은 Mapping Table로 정규화한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_domain_mapping_id` | 매핑 식별자(PK) |
| `role_definition_id` | 대상 Role Definition 참조 |
| `domain_code` | Domain Canonical Code(§3 enum) |
| `primary_domain` | 주 Domain 여부(다중 시 1개 primary) |
| `secondary_domains` | 부 Domain 집합(다중 Domain Role) |
| `mapping_reason` | 매핑 근거 |
| `scope_binding_ref` | Domain별 Scope 결합 참조(실 Scope=Part 3-4) |
| `mutual_exclusivity_group` | 상호배타 Domain 그룹(SoD 힌트·실 SoD=Part 5) |
| `owner` | 매핑 소유자 |
| `valid_from` / `valid_to` | 유효 구간 |
| `digest` | 매핑 정의 digest |

## 3. 열거형 / 타입

- **`domain_code`**: `APPROVAL_DECISION` · `ASSIGNMENT` · `DELEGATION` · `PAYMENT` · `SETTLEMENT` · `REBATE` · `CLAIM` · `CONTRACT` · `CUSTOMER` · `VENDOR` · `REPORTING` · `DATA_ACCESS` · `SECURITY` · `COMPLIANCE` · `LEGAL` · `USER_ADMINISTRATION` · `SYSTEM_CONFIGURATION` · `INTEGRATION` · `CUSTOM`.
- **다중 Domain**: 한 Role이 복수 Domain일 때 `primary_domain` 1개 + `secondary_domains` N개를 **Mapping Table**로 표현(단일 컬럼 나열 금지).
- **상호배타**: `mutual_exclusivity_group`으로 SoD가 필요한 Domain 조합 표기(예 APPROVAL_DECISION ↔ 자기 SETTLEMENT). 실 SoD 강제는 Part 5.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Domain Mapping | **ABSENT → 신설** | Role↔Domain 매핑 개념 없음 |
| Domain 스코프 최근접 | data_scope(행필터·정형화 대상) | data_scope 9dims 행필터(`TeamPermissions.php:41,218-322`) — Domain 매핑 아님 |
| 메뉴×동작 매핑 | acl_permission(부분 인접) | acl_permission menu×8action(`TeamPermissions.php:39,152-159`) — 메뉴 단위, Domain enum 아님 |
| AdminMenu required_role | 메뉴 게이트(Domain 아님) | `AdminMenu.php:247` |
| `domain_code` / `primary_domain` / `secondary_domains` / `mutual_exclusivity_group` | **ABSENT** | 없음 |

★현행에서 Role↔Domain 매핑은 **부재**다. data_scope(9dims 행필터)와 acl_permission(menu×action)이 스코프/권한의 실 substrate이나 업무 Domain(APPROVAL/SETTLEMENT/REBATE 등)으로 Role을 가르는 개념은 없다. 다중 Domain Mapping Table은 순신설이다.

## 5. 설계 원칙

1. **Role은 Domain에 귀속** — Canonical Code `{DOMAIN}` 분절과 정합(Namespace/Code Standard 연동).
2. **다중 Domain=Mapping Table** — primary 1 + secondary N을 정규화(단일 컬럼 나열 금지).
3. **Domain ≠ Scope** — Domain은 업무 영역, Scope(tenant/data_scope/team)는 데이터 범위(Part 3-4). data_scope를 Domain으로 오혼입 금지.
4. **SoD 힌트만** — mutual_exclusivity_group은 표기·힌트, 실 Maker-Checker/SoD 강제는 Part 5(Role≠Authority).
5. **Tenant Isolation** — Domain 매핑은 테넌트 격리·Custom Domain은 테넌트 스코프.
6. **Extend not Replace** — data_scope/acl_permission을 Scope/Permission substrate로 유지, Domain 매핑만 상위 신설(회귀 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Domain별 Permission 결합·SoD 강제는 선행 Part 2 Permission Engine·Part 5 Approval Authority 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: domain_code enum·primary/secondary·Mapping Table·mutual_exclusivity 전무 — 순신설.
- **Gap-2**: Domain의 최근접 인접은 data_scope(9dims)이나 이는 행필터 스코프이지 업무 Domain 매핑 아님(오혼입 금지).
- **정직 부재**: 승인/정산/리베이트 Domain별 Role 분리 현행 없음(ABSENT). Job Title 기반 Domain 귀속 개념 전무. admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

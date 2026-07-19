# DSAR — Approval Role Type (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Type)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Type은 **Role의 근본 성격(어떤 종류의 역할인가)을 규정하는 분류축**이다. 특히 actor 성격(Human/Service/System/API Client)과 결합되어, 예컨대 APPROVAL Type은 Human 결정을 전제하고 SERVICE_ACCOUNT는 interactive 로그인을 금지한다. 현재 api_key role은 프로그래매틱 API 축으로 존재하나(=API_CLIENT/INTEGRATION 성격) Type이라는 명시 개념은 없고, team_role/admin_level도 Type 태그가 없다. 본 엔티티는 Role Definition에 결합되는 Type enum과 그에 따른 actor 적격 규칙을 정의한다. Type은 Category(편의 분류)와 달리 **actor 적격·enforcement 성격을 좌우**한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_type_id` | Type 식별자(PK) |
| `type_code` | Type Canonical Code(§3 enum) |
| `type_name` / `description` | 이름·설명 |
| `default_actor_type` | 기본 actor(HUMAN/SERVICE_ACCOUNT/SYSTEM_ACTOR/API_CLIENT) |
| `human_allowed` / `service_allowed` / `system_allowed` / `api_client_allowed` | actor 적격 Boolean |
| `interactive_login_allowed` | interactive 로그인 허용(SERVICE_ACCOUNT=false) |
| `human_decision_allowed` | human decision 허용(SYSTEM_ACTOR=false) |
| `approval_capable` | 승인 결정 수행 적격 |
| `assignable_to_person` | 사람에게 부여 가능 여부 |
| `owner` | Type 소유자 |
| `digest` | Type 정의 digest |

## 3. 열거형 / 타입

- **`type_code`**: `BUSINESS` · `FUNCTIONAL` · `OPERATIONAL` · `APPROVAL` · `REVIEW` · `AUDIT` · `ADMINISTRATIVE` · `SECURITY` · `COMPLIANCE` · `DATA_ACCESS` · `REPORTING` · `SUPPORT` · `INTEGRATION` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `TEMPORARY_TEMPLATE` · `EMERGENCY_TEMPLATE` · `COMPOSITE_REFERENCE` · `DYNAMIC_REFERENCE` · `CUSTOM`.
- **actor 적격 규칙(핵심)**:
  - `APPROVAL` = **Human 기본**(`human_allowed=true`·`human_decision_allowed=true`). 자동/기계 승인 대체 금지.
  - `SERVICE_ACCOUNT` = **interactive 로그인 금지**(`interactive_login_allowed=false`).
  - `SYSTEM_ACTOR` = **human decision 금지**(`human_decision_allowed=false`).
  - `API_CLIENT` = 프로그래매틱 접근 전용(사람 부여 부적격).
- Category(편의 분류·별도 문서)와 구분: **Type은 actor 적격·enforcement 성격**, Category는 표시/그룹핑.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Type(명시 분류축) | **ABSENT → 신설** | Type 개념 없음 |
| api_key role | **CANONICAL(API_CLIENT/INTEGRATION 축)** | `api_key.role`(`Keys.php:95`)·roleRank(`index.php:573`) — 프로그래매틱 API rank |
| team_role | Type 태그 없음(정형화 대상) | `TeamPermissions.php:120-131` — 테넌트 내 위계(Type 미태그) |
| admin_level | Type 태그 없음 | `UserAdmin.php:43-46` |
| `human/service/system/api_client_allowed` | **ABSENT** | actor 적격 Boolean 개념 없음 |
| `interactive_login_allowed` / `human_decision_allowed` / `approval_capable` | **ABSENT** | 없음 |

★api_key role이 Type축의 실 substrate로 **API_CLIENT/INTEGRATION 성격**에 대응한다(프로그래매틱 rank). team_role/admin_level은 위계 문자열이나 Type 태그가 없어 Type enum은 순신설이다.

## 5. 설계 원칙

1. **Type이 actor 적격 결정** — APPROVAL=Human·SERVICE_ACCOUNT=non-interactive·SYSTEM_ACTOR=non-human-decision 강제(§6.16 Machine Actor Eligibility).
2. **Type ≠ Category** — Type은 enforcement 성격, Category는 편의 분류(직접 대체 금지·Category 문서 연동).
3. **api_key role = API_CLIENT축 흡수** — 별개 actor로 정규화(사람 부여 부적격).
4. **APPROVAL Human 원칙** — 승인 Role은 기계 자동집행으로 대체 불가(Role≠Authority·실 승인 정책=Part 5).
5. **Extend not Replace** — 실 api_key role 판정 유지, Type 태그만 상위 신설(회귀 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Type별 actor 적격·enforcement 실 강제는 선행 Part 2 Permission Engine·Part 3-6 Service/System Role 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: Role Type enum·actor 적격 Boolean·interactive/human_decision 계약 전무 — 순신설.
- **Gap-2**: api_key role은 API_CLIENT 성격의 실 substrate이나 Type이라는 명시 태그·다른 Type(APPROVAL/AUDIT 등)과의 대비 개념 없음.
- **정직 부재**: SERVICE_ACCOUNT/SYSTEM_ACTOR interactive 금지 등 machine actor 적격 규칙 현행 강제 없음(ABSENT·enforcement=후속). admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

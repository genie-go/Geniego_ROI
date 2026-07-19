# DSAR — Approval Role Definition (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Definition)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 폐기 admin_roles 재부활 금지 · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Definition은 **개별 Role 하나의 정의 구조체** — Registry에 등록되는 실체다. 현재 Role 정의는 `team_role` 문자열 상수(owner/manager/member)·api_key role 상수·admin_level 상수로 **문자열 const 비교로만 존재**하며, 이름·목적·책임·risk·criticality·actor 적격·owner·version 같은 정의 메타가 전무하다. 본 엔티티는 각 Role을 **Canonical Code로 식별되고 목적·책임·risk·actor 적격성·소유자·버전을 갖는 정형 정의**로 구조화한다. Definition은 Permission을 직접 담지 않고(Assignment=Part 3-3, Permission Mapping=별개), "이 Role이 무엇이며 누가 소유하고 어떤 actor가 받을 수 있는가"를 선언한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_definition_id` | 정의 식별자(PK) |
| `role_code` | Canonical Code(`{DOMAIN}:{FUNCTION}:{ROLE}`) |
| `role_name` / `short_name` / `description` | 표시 이름·약칭·설명 |
| `purpose` / `responsibility` | Role의 목적·책임 서술 |
| `role_type` | Role Type(별도 Type 문서 §3) |
| `role_category` | Role Category(별도 Category 문서 §3) |
| `domain` | 소속 Domain(별도 Domain Mapping 문서) |
| `actor_type` | 대상 actor(HUMAN/SERVICE_ACCOUNT/SYSTEM_ACTOR/API_CLIENT) |
| `risk` / `criticality` | 위험도·중요도 등급 |
| `human_allowed` / `service_allowed` / `system_allowed` / `api_client_allowed` | actor 적격 Boolean |
| `direct_assignment_allowed` / `temp_assignment_allowed` / `emergency_assignment_allowed` | 부여 방식 적격 |
| `delegation_allowed` / `impersonation_allowed` | 위임·대행 적격(실 정책=Part 5) |
| `composite_allowed` / `child_allowed` / `parent_allowed` / `dynamic_allowed` | 구성/위계/동적 적격(Part 3-2/3-5) |
| `scoped_required` | Scope 요구 여부(Part 3-4) |
| `approval_required` / `certification_required` | 부여 승인·인증 필수 여부 |
| `current_version` | 현재 유효 Definition Version |
| `business_owner` / `technical_owner` / `security_owner` | 3 소유자 |
| `status` | Definition Lifecycle(DRAFT~ARCHIVED) |
| `digest` | 정의 불변 digest |

## 3. 열거형 / 타입

- **`actor_type`**: `HUMAN` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT`.
- **`risk`**: `LOW` · `MEDIUM` · `HIGH` · `CRITICAL`.
- **`criticality`**: `ROUTINE` · `SENSITIVE` · `PRIVILEGED` · `PLATFORM_CRITICAL`.
- **`status`**: `DRAFT` · `ACTIVE` · `LOCKED` · `DEPRECATED` · `RETIRED` · `ARCHIVED`.
- **actor 적격 규칙(§ Type 문서 연동)**: APPROVAL 성격 Role은 `human_allowed=true` 기본·SERVICE_ACCOUNT는 interactive 금지·SYSTEM_ACTOR는 human decision 금지.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Definition(정형 구조체) | **PARTIAL → 정형화** | 문자열 const로만 존재 |
| team_role 문자열 정의 | Definition substrate(정형화) | `team_role` 비교(`TeamPermissions.php:123`) — owner/manager/member |
| api_key role 정의 | 별개 actor(API_CLIENT) | validRoles(`Keys.php:95`) |
| admin_level 정의 | SUB_ROLE_CANDIDATE | `UserAdmin.php:43-46` — master/sub |
| AdminMenu ROLE_ENUM 정의 | CONSOLIDATION_REQUIRED | `AdminMenu.php:247` |
| `role_code`(Canonical) / `purpose` / `responsibility` / `risk` / `criticality` | **ABSENT** | 없음 |
| `actor_type` 적격 Boolean(human/service/system/api_client) | **ABSENT** | 없음 |
| owner(3) / `current_version` / `digest` | **ABSENT** | 소유·버전·digest 개념 전무 |

★현행 정의는 `if role=='owner'` 식 **문자열 const 비교의 소비지**(`TeamPermissions.php:123`)로 산재한다. 이는 중앙 정책의 미러이지 중복 Registry가 아니며(§D-3), risk/criticality/owner/version 메타가 없어 정형 Definition이 아니다.

## 5. 설계 원칙

1. **Definition ≠ Permission ≠ Assignment** — Definition은 Role 정체성만. Permission Mapping·Assignment는 분리(§6.1~6.2).
2. **Role ≠ Job Title** — 직책/Position/HR position을 Role로 사용 금지(레포 전무·유지).
3. **actor 적격 명시** — human/service/system/api_client_allowed로 machine actor eligibility 강제(§6.16). SERVICE_ACCOUNT interactive 금지.
4. **Owner 필수** — Business/Technical/Security Owner 없는 Definition 금지.
5. **모호 단독 Role 자동활성 금지** — ADMIN/ALL_ACCESS류 단독 정의 금지(Namespace 문서 §3 연동·Least Privilege).
6. **Versioned & Immutable** — 정의 변경은 순신규 Version(Definition Version 문서)·digest 봉인.
7. **Extend not Replace** — team_role/api_key role/admin_level 문자열을 Definition substrate로 흡수, 판정 의미 변경 금지(회귀 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Definition의 approval_required/certification_required 실 강제 및 Permission 결합은 선행 Part 2 Permission Engine·Part 3-3 Assignment 필요. 본 차수 코드 0.
- **Gap-1(PARTIAL→정형화)**: 문자열 const(`TeamPermissions.php:123`·`Keys.php:95`·`AdminMenu.php:247`)만 존재 — role_code/purpose/responsibility/risk/criticality/actor 적격/owner/version 전부 ABSENT.
- **Gap-2(§6.5 후속 정합)**: plan god flag가 Definition 밖에서 전역 우회(`TeamPermissions.php:132`) — admin 판정 plan 분리 후속.
- **정직 부재**: isManager/isApprover/job_title/jobTitle 개념 전무(ABSENT) — Role로의 직책 사용 없음. 결함 날조·admin_roles 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

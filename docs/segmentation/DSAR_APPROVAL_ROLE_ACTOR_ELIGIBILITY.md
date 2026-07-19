# DSAR — Role Actor Eligibility (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Role Definition에 **어떤 종류의 actor에게 부여 가능한지**를 선언하는 Eligibility 명세. Role은 Permission을 묶는 상위 개념(≠Permission)이며 직책/Position(≠JobTitle)도, Subscription Plan(≠Plan)도 아니다. Actor Eligibility는 Role Definition의 **부여 가능 대상 집합**을 규정 — Assignment(Part 3-3)의 fail-closed 선행 게이트다. ★핵심 불변: **Human Approval Role(사람이 결재/승인하는 역할)을 Service Account / System Actor / API Client / Batch Actor에 부여 금지** — 기계 actor가 인간 결재권을 가장하는 것을 원천 차단.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code(`{DOMAIN}:{FUNCTION}:{ROLE}`) |
| `allowed_actor_types` | 부여 가능 actor 종류 집합(§3) |
| `prohibited_actor_types` | 명시적 금지 actor 종류(우선 적용·기본 deny 위 추가 차단) |
| `employment_type_required` | 요구 고용유형(정규/계약 등·인간 actor 한정) |
| `account_type_required` | 요구 계정유형 |
| `external_user_allowed` | 외부 사용자 허용 여부 |
| `contractor_allowed` | 계약직 허용 여부 |
| `employee_allowed` | 임직원 허용 여부 |
| `service_account_allowed` | 서비스 계정 허용 여부(Human Approval Role은 false 강제) |
| `system_actor_allowed` | 시스템 actor 허용 여부 |
| `api_client_allowed` | API Client 허용 여부 |
| `required_tenant_membership` | 요구 테넌트 소속 |
| `required_legal_entity` | 요구 법인 소속 |
| `required_org_membership` | 요구 조직 소속 |
| `required_identity_assurance_ref` | 요구 신원 확증 수준 참조 |
| `required_auth_assurance_ref` | 요구 인증 확증 수준(AAL 등) 참조 |

## 3. 열거형 / 타입

**actor_type**: `HUMAN` · `EMPLOYEE` · `CONTRACTOR` · `EXTERNAL_USER` · `PARTNER_USER` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `INTEGRATION_CLIENT` · `BATCH_ACTOR`.

**machine actor 하위집합**(Human Approval Role 부여 금지 대상): `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `INTEGRATION_CLIENT` · `BATCH_ACTOR`.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| HUMAN actor Role 축 | `app_user.team_role`(owner/manager/member) | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188`·`TeamPermissions.php:120-131` |
| API_CLIENT actor Role 축 | `api_key.role`(viewer~admin) | CANONICAL(별개 actor) | `Keys.php:95`·`index.php:573` |
| EXTERNAL_USER(IdP 인증) actor | `sso_group_role_map`→team_role | VALIDATED_IAM(Adapter) | `EnterpriseAuth.php:70-88` |
| ADMINISTRATIVE actor 세분 | `app_user.admin_level`(master/sub) | SUB_ROLE_CANDIDATE | `UserAdmin.php:43-46` |

★**정직**: `allowed_actor_types`/`prohibited_actor_types`/`employment_type_required`/`account_type_required`/`external·contractor·employee·service·system·api_client allowed`/`required_legal_entity`/`required_org_membership`/`identity·auth assurance ref` 필드 = **순신규 ABSENT**. 현 substrate는 actor 종류를 저장소로만 암묵 분리(team_role=인간 컬럼·api_key.role=키 테이블)할 뿐, Role Definition 차원의 명시적 actor eligibility 선언·기계 actor 금지 게이트 전무. EMPLOYEE/CONTRACTOR/PARTNER_USER/INTEGRATION_CLIENT/BATCH_ACTOR 구분·legal entity·assurance level = 개념 ABSENT.

## 5. 설계 원칙 / 결정

- **Human Approval Role → machine actor 부여 금지**: `service_account_allowed=false`·`api_client_allowed=false` 강제. 위반 Assignment는 fail-closed 거부.
- **매핑 정본**: `api_key.role`은 `API_CLIENT` actor로만 정규화(프로그래매틱 축)·`team_role`은 `HUMAN` actor로 정규화. 두 축은 병합하지 않고 actor eligibility로 분리 유지(값 `admin` 충돌은 Namespace로 해소).
- **기본 deny + prohibited 우선**: `allowed_actor_types` 미선언 시 부여 불가(fail-closed). `prohibited_actor_types`는 allow와 교차 시 금지가 우선.
- Golden Rule: team_role / api_key role / admin_level substrate를 actor eligibility로 확장 — 별도 actor registry 신설 금지.
- Role ≠ Permission ≠ Authority ≠ JobTitle ≠ Plan: eligibility는 부여 대상만 규정·권한 내용(Permission)·결재권(Authority)·직책은 별 엔티티.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: actor_type 10종 열거·기계 actor 금지 게이트·assurance/legal entity 요구 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: identity/auth assurance ref 결합은 선행 Actor Identity·Permission Engine(Part 2) 실 구현 부재로 공회전.
- **§6.5 후속 정합**: `plan 'admin'` god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)가 actor 판정을 Subscription Plan에 묶어 actor eligibility를 우회 — Role/admin_level 기반 분리는 후속 enforcement Part. 재플래그 금지.
- 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.

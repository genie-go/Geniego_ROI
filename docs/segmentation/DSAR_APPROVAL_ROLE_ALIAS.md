# DSAR — Role Alias (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role Code(`{DOMAIN}:{FUNCTION}:{ROLE}`)에 대한 **별칭(Alias) 매핑**을 정의한다. Alias는 레거시 코드·외부 시스템 코드(IAM/ERP/Workflow)·표시명·마이그레이션 임시명 등 **Canonical Code가 아닌 명칭**을 Canonical Role에 **연결·해석(resolve-in)** 하기 위한 구조다. 5개 무관 role 어휘(team_role/api_key role/admin_level/AdminMenu enum/SSO group)와 향후 외부 IdP·ERP 코드를 Canonical Role로 흡수·정규화하는 통로가 Alias다.

★**Alias를 Canonical Code 대신 저장/authz에 사용 금지.** Alias는 오직 **입력 해석(외부→Canonical)** 및 표시용이며, 저장·인가 판정·감사 식별자는 항상 Canonical Role Code여야 한다. Alias를 Runtime authz Identifier로 사용하면 값충돌('admin' 3중복 같은)·재정규화 붕괴가 재발한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 해석 대상 Canonical Role(코드+버전) 참조 |
| `alias_type` | 별칭 유형(③ 열거형) |
| `alias_value` | 별칭 값(외부/레거시/표시 문자열) |
| `source_system` | 별칭 출처 시스템(IdP/ERP/Workflow/Legacy 식별) |
| `language` | 표시 별칭의 언어(DISPLAY_ALIAS용·Localization과 구별) |
| `valid_from` / `valid_to` | 별칭 유효기간(마이그레이션/폐기 별칭 시한) |
| `confidence` | 해석 신뢰도(자동 매핑 vs 검증된 매핑) |
| `is_active` | 현재 해석에 사용 가능 여부(폐기 별칭 비활성) |

## ③ 열거형

**`alias_type`**:
`LEGACY_CODE` · `EXTERNAL_SYSTEM_CODE` · `IAM_ROLE_NAME` · `ERP_ROLE_NAME` · `WORKFLOW_ROLE_NAME` · `DISPLAY_ALIAS` · `MIGRATION_ALIAS` · `CUSTOM`

- `LEGACY_CODE`: 5 무관 어휘의 원시 값(team_role owner/manager/member·api_key viewer~admin·admin_level master/sub·AdminMenu admin/super_admin/moderator)을 Canonical Code로 흡수할 때의 legacy 별칭.
- `IAM_ROLE_NAME`: 외부 IdP/SSO 그룹명 → Canonical Role.
- `DISPLAY_ALIAS`: UI 표시명(언어별은 Localization·Part 3-1 Localization으로 위임, 단순 표시명만 여기).
- `MIGRATION_ALIAS`: Replacement(Part 3-1) 진행 중 임시 병행 별칭.

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| **SSO group → role (IAM_ROLE_NAME 별칭)** | **`sso_group_role_map` · `roleForGroups`** | **`EnterpriseAuth.php:70-72`(map) · `:78-88`(roleForGroups·IdP 그룹→manager/member) · `:50`(default_role)** | ★IdP 그룹명을 team_role 어휘로 매핑 = **IAM alias substrate**(ADR §5.2 VALIDATED_IAM Adapter). 단 Canonical Code가 아직 없어 alias 대상이 team_role 문자열(정규화 미완). |
| LEGACY_CODE(5 어휘 원시값) | team_role · api_key role · admin_level · AdminMenu enum | `TeamPermissions.php:120-131` · `Keys.php:95` · `UserAdmin.php:43-46` · `AdminMenu.php:247` | 원시 어휘 실재(향후 Canonical Code의 legacy 별칭 후보)이나 alias 매핑 레이어 자체 ABSENT |
| EXTERNAL/ERP/WORKFLOW alias | — | **ABSENT** | ERP/Workflow role 코드 연계 없음 |
| DISPLAY_ALIAS | (인접) FE 정책 미러 | `teamRolePolicy.js`(참조: GROUND_TRUTH §1.1·§1.7) | FE 표시 정규화일 뿐 별칭 저장·해석 레이어 아님 |
| MIGRATION_ALIAS | — | **ABSENT** | 마이그레이션 병행 별칭 없음(admin_roles 폐기는 별칭 아님) |
| confidence / 해석 신뢰도 | — | **ABSENT** | 매핑 신뢰도 개념 없음 |

→ Alias 레이어는 **순신규**이나, **SSO group→role(`EnterpriseAuth.php:78-88`)이 유일한 실 IAM alias substrate**로 실재. 나머지 유형은 ABSENT.

## ⑤ 설계원칙

- **★Alias ≠ Canonical Code · authz 사용 금지**: 저장·인가·감사 식별자는 Canonical Role Code로만. Alias는 외부 입력 해석(inbound resolve)·표시용. Alias를 인가 판정에 직접 사용 금지(§규율).
- **Golden Rule(VALIDATED_IAM Adapter)**: SSO group→role(`EnterpriseAuth.php:70-88`)을 **재발명하지 않고** IAM_ROLE_NAME Alias의 정본 substrate로 흡수·확장. 별도 IdP 매핑 테이블 신설 금지.
- **값충돌 방지**: 'admin' 값이 team_role/api_key/AdminMenu 3체계에 중복(ADR §1)되므로 Alias는 반드시 `source_system`+`alias_type`로 네임스페이스를 분리 저장. flat 문자열 재사용 금지.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: Alias는 명칭 매핑일 뿐 권한·직책·Plan을 부여하지 않는다. IAM 그룹 별칭이 곧 Permission이 아니다(Permission은 Role→Permission Mapping·Part 2).
- **폐기 별칭 비활성**: `valid_to` 경과·`is_active=false` 별칭은 해석에서 제외. 폐기 별칭으로의 authz 유입 차단(fail-closed).

## ⑥ Gap

- **엔진 전무**: Alias 저장·inbound resolve·네임스페이스 분리·신뢰도·폐기 비활성 미구현(코드 0). SSO map은 실재하나 Canonical Role Registry로의 정규화 매핑 미완.
- **BLOCKED_PREREQUISITE (RP-002)**: Alias의 해석 목적지인 Canonical Role Code/Registry(Part 3-1 본체 ABSENT) 선행. Canonical Code가 없으면 별칭이 가리킬 정본이 없다(현재 SSO map은 team_role 문자열로만 착지).
- **cover: 부분(SSO IAM alias만)** — `EnterpriseAuth.php:70-88` 실재. 그 외 유형 cover 0. NOT_CERTIFIED.
- **289차 재플래그 금지**: SSO map은 285~289 검증된 정상 Adapter, admin_roles 폐기는 별건. Alias 미비를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_LOCALIZATION]] · [[DSAR_APPROVAL_ROLE_REPLACEMENT]] · [[DSAR_APPROVAL_ROLE_METADATA]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].

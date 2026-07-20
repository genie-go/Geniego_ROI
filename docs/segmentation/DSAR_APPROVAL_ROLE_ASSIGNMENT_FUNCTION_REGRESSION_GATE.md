# DSAR — Assignment Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Function Regression Gate)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§40(Regression: 기존 Approval·기존 Permission·기존 RBAC·기존 Workflow)의 **기존 기능 회귀 게이트**를 정의한다. Canonical Assignment Registry는 5분산 즉시-write(team_role 3핸들러·api_key 2경로·admin_level·wms_permissions·pm_task_assignees)를 **대체·재구현이 아니라 단일 진입점으로 중개**하므로(ADR D-1), **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Canonical Assignment Registry 실구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. Canonical 필드

- **기능 표면 ID** — 아래 §3 표 번호
- **검증 기준(회귀 0)** — 도입 전/후 판정 동일성 조건
- **현행 substrate** — 근접 인용(file:line)
- **회귀 위험도** — `HIGH`(5분산 write 직접 접촉) / `MEDIUM`(간접 참조) / `LOW`(별개 도메인·참조만)

## 3. 열거형 / 타입 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) | 위험도 |
|---|---|---|---|---|
| 1 | **팀원 초대/역할변경/비활성** | `createTeamMember`/`updateTeamMember`/`deleteTeamMember` 판정·owner 보호 불변 | `UserAuth.php:1281-1451,1384-1386` | **HIGH**(5분산 write #1 직접 접촉) |
| 2 | **SSO/SCIM 프로비저닝** | `provisionUser` role 매핑·owner 강등 금지 불변 | `EnterpriseAuth.php:483-511,495` | **HIGH**(5분산 write #2 직접 접촉) |
| 3 | **api_key 발급/회전/폐기(`/v421/keys`)** | 생성/폐기/rotate 판정·scope 상한 불변 | `Keys.php:81-187` | **HIGH**(5분산 write #3-a 직접 접촉) |
| 4 | **api_key 발급/회전/폐기(`/auth/api-keys`)** | 동일 자원 2번째 경로 판정 불변(통합 시에도 응답 동일) | `UserAuth.php:4340-4399` | **HIGH**(5분산 write #3-b 직접 접촉) |
| 5 | **sub-admin 발급/승격** | `createSubAdmin` admin_level='sub' 강제·권한상승 차단 불변 | `UserAuth.php:1561-1658,1352-1353` | **HIGH**(SUB_AXIS 직접 접촉) |
| 6 | **wms_permissions 저장/삭제** | `savePermission`/`deletePermission` 동작 불변(무검증 현행 특성 포함) | `Wms.php:505-526` | **MEDIUM**(DOMAIN_ASSIGNMENT 흡수 대상) |
| 7 | **pm_task_assignees 부여/해제** | `add`/`remove` 판정·UNIQUE 409·audit 불변 | `Assignees.php:17-72` | **MEDIUM**(DOMAIN_ASSIGNMENT 흡수 대상) |
| 8 | **Effective Permission 계산(팀)** | `effectiveForUser`/`effectiveScope` 산출 동일 | `TeamPermissions.php:366-394,236-265` | **HIGH**(EFFECTIVE_RESOLUTION_SUBSTRATE 확장 대상) |
| 9 | **writeGuard/team 쓰기 게이트** | `guardTeamWrite` 403 판정 불변 | `UserAuth.php:1167`·`index.php:72-85` | **HIGH**(Runtime Guard 근접 substrate) |
| 10 | **acl 위임상한(assignableMap)** | `assignableMap`/`clampActions`/`DELEGATION_EXCEEDED` 판정 불변 | `TeamPermissions.php:354-360,396-402,644-647` | MEDIUM(별개 축·오흡수 감시) |
| 11 | **대행(impersonation)** | `UserAdmin::impersonate` 세션 대행 판정 불변 | `UserAdmin.php:451,478-489` | LOW(Assignment 밖 유지 대상) |
| 12 | **인증우회(break-glass)** | break-glass MFA 우회 판정 불변(289차 BLOCKED_SECURITY 계열, 재플래그 아님) | `UserAuth.php:790-801,929-935,995-999` | LOW(Assignment 밖 유지 대상) |
| 13 | **감사 저장** | `auth_audit_log`/`pm_audit_log` 기록 판정 불변(통합 조회 신설되어도 원본 유지) | `TeamPermissions.php:19`·`Shared.php:129-148` | MEDIUM |
| 14 | **tamper-evident 체인** | `SecurityAudit::verify` 해시체인 검증 로직 불변(assignment 결합 신설되어도) | `SecurityAudit.php:56-68` | LOW(승격 대상이지 변경 대상 아님) |
| 15 | **권한 전체교체(replacePerms/replaceScope)** | DELETE→INSERT 동작 자체는 무후퇴(Version 신설이 별도 레이어로 추가되되 기존 동작 대체 아님) | `TeamPermissions.php:324-336,337-346` | **HIGH**(Missing Version lint 대상이자 회귀 감시 지점) |
| 16 | **폐기 admin_roles/user_roles** | 재부활 없음(회귀 대상 아님) | ADR D-1 참조(289차 P3 폐기) | N/A(재부활 금지) |

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 회귀 표면 | 판정 | 실 substrate (file:line) |
|---|---|---|
| team_role 3분산 write | **CANONICAL_ASSIGNMENT_SUBSTRATE(통합·무후퇴)** | `UserAuth.php:1334,1392`·`EnterpriseAuth.php:507-509` |
| api_key.role 2경로 | **CONSOLIDATION_REQUIRED(무후퇴)** | `Keys.php:81-187`·`UserAuth.php:4340-4399` |
| admin_level(sub-axis) | **SUB_AXIS(흡수·무후퇴)** | `UserAuth.php:1639-1648` |
| wms_permissions/pm_task_assignees | **DOMAIN_ASSIGNMENT(흡수/Adapter·무후퇴)** | `Wms.php:505-526`·`Assignees.php:17-72` |
| effectiveForUser/effectiveScope | **EFFECTIVE_RESOLUTION_SUBSTRATE(확장·무후퇴)** | `TeamPermissions.php:366-394,236-265` |
| writeGuard/guardTeamWrite | **근접 Runtime Guard(무후퇴)** | `UserAuth.php:1167`·`index.php:72-85` |
| assignableMap/DELEGATION_EXCEEDED | **별개 축(오흡수 금지·무후퇴)** | `TeamPermissions.php:354-360,644-647` |
| impersonation/break-glass | **Assignment 밖 유지 대상(무후퇴)** | `UserAdmin.php:451,478-489`·`UserAuth.php:790-801` |
| 감사 2중 저장소 | **비일관·통합 조회만 신설(원본 무후퇴)** | `TeamPermissions.php:19`·`Shared.php:129-148` |
| SecurityAudit tamper-evident | **승격 대상(검증 로직 무후퇴)** | `SecurityAudit.php:56-68` |
| admin_roles/user_roles | **DEPRECATED(재부활 금지·회귀 대상 아님)** | ADR D-1 참조 |

## 5. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — Canonical Assignment Registry는 5분산 write(#1~#7)를 삭제하지 않고 **중개 진입점으로만 통합**하므로(ADR D-1), 정형화 후에도 위 16개 표면은 **동일 판정**이어야 한다.
2. **api_key.role 2경로 통합(#3·#4)이 최고위험 회귀 지점** — 동일 자원에 2개 진입경로가 있고 감사가 비대칭이므로(DUPLICATE_AUDIT D-2), 통합 시 어느 한쪽 경로의 기존 caller가 응답 형식/감사 유무 차이로 회귀를 겪지 않아야 한다.
3. **assignableMap/impersonation/break-glass(#10·#11·#12)는 Assignment로 오흡수 금지** — 각기 정당한 별개 기능(권한 위임상한/대행/인증우회)이며 role 부여 자체가 아니다(D-5). Assignment Registry 신설이 이들의 판정 로직을 흡수·변경하면 정면 위반.
4. **replacePerms/replaceScope(#15)는 회귀 감시이자 Missing Version lint 대상** — DELETE→INSERT 동작 자체는 무후퇴(기존 caller 기대 유지)하되, 그 위에 Version 레이어를 별도로 얹는 것이 Canonical 설계(대체가 아니라 추가).
5. **감사 2중 병존(#13)은 통합 조회 API만 신설하고 원본 테이블 무후퇴** — `auth_audit_log`/`pm_audit_log`를 하나로 재작성하면 기존 소비자(TeamPermissions 감사 조회·PM 감사 조회)가 깨질 위험.
6. **SecurityAudit 승격(#14)은 검증 로직 변경이 아니라 새 이벤트 결합** — `verify()` 해시체인 재계산 로직 자체는 무후퇴, role assignment 이벤트를 추가 기록하는 것만 신규.
7. **폐기 admin_roles는 회귀 표면 아님** — 재부활 금지(재검증 대상 자체가 없음). 289차 P1~P4 재플래그 금지.
8. **정직 부재는 게이트 대상 아님** — Emergency/Break Glass/Scheduled Assignment·SoD·Version 관련 기능이 현재 존재하지 않으므로 "회귀"가 아니라 "신규 기능 검증"으로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Canonical Assignment Registry + Part 2/3-1/3-2 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **최고위험 감시 지점(부수 발견 아님·설계 우선순위)**: api_key.role 2경로 통합(#3·#4)·team_role 3분산 write 통합(#1·#2)·effectiveForUser/effectiveScope 확장(#8) — 전부 ADR D-1·GROUND_TRUTH 인용, 본 차수 수정 아님.
- **무후퇴 원칙**: 위 16개 표면은 실존 기능(또는 명시적 유지 대상) → Assignment Registry 도입 과정에서 삭제·재구현 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = Canonical Assignment Registry 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_AUDIT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]

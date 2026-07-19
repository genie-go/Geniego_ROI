# DSAR — Approval Role Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

기존 기능 **회귀 게이트**를 정의한다. Canonical Role Registry는 team_role·api_key role·admin_level·AdminMenu enum·SSO map을 대체·재구현이 아닌 정형화(흡수)하므로, **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Registry/Definition/Permission Mapping 실 구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. 열거 / 항목 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) |
|---|---|---|---|
| 1 | **Login** | 로그인/토큰 발급·admin 판정 불변 | `resolveAdminByToken`(admin SSOT·289차 P4)·isMaster `UserAdmin.php:43-46` |
| 2 | **User Management** | 사용자 생성·admin_level 승격차단 불변 | `UserAdmin.php:298-301,436-438`(신규 admin=sub 강제) |
| 3 | **team 권한** | owner/manager/member 쓰기가드 동일 판정 | `requireTeamWrite`(`UserAuth.php:1134`)·`teamCanWrite`(`:1125`)·`TEAM_OWNER_ONLY`(`:1117`)·roleOf(`TeamPermissions.php:120-131`) |
| 4 | **admin 패널** | required_role 게이트·isSuper 접근 불변 | `AdminMenu.php:247,401`·isSuper `AdminMenu.php:148-151` |
| 5 | **api_key** | role rank·defaultScopes·RBAC 미들웨어 불변 | roleRank `index.php:573`·validRoles/scopes `Keys.php:95,189-194` |
| 6 | **SSO** | IdP 그룹→team_role 매핑 불변 | `sso_group_role_map`(`EnterpriseAuth.php:70-72`)·roleForGroups(`:78-88`)·default_role(`:50`) |
| 7 | **approval** | 승인 경로·게이트 판정 불변(Part 5 별개) | 현행 승인 게이트(Part 5 Authority 별개축) |
| 8 | **assignment** | 역할/권한 부여 경로 불변(Part 3-3 별개) | Assignment 정본 부재(Part 3-3) |
| 9 | **delegation** | 위임 판정 불변(DELEGATION_EXCEEDED=ACL 상한·인접상이) | 위임 정본 ABSENT(289차 판정) |
| 10 | **impersonation** | 세션 대행 tenant 해석 불변 | act-as tenant 해석(286차 하이재킹 수정분·재발 방지) |

## 3. substrate 매핑 (§5.2)

| 회귀 표면 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| team_role 쓰기가드 | **CANONICAL_ROLE_REGISTRY_CANDIDATE(무후퇴)** | `UserAuth.php:1117,1125,1134`·`TeamPermissions.php:120-131` |
| api_key RBAC | **CANONICAL(무후퇴)** | `index.php:573`·`Keys.php:95,189-194` |
| admin_level/admin SSOT | **정합 기반(289차 P4·무후퇴)** | `UserAdmin.php:43-46,298-301,436-438` |
| AdminMenu 게이트 | **CONSOLIDATION_REQUIRED(반쯤 死·정합 시 회귀 주의)** | `AdminMenu.php:247,401,148-151` |
| SSO group→role | **VALIDATED_IAM(Adapter·무후퇴)** | `EnterpriseAuth.php:70-88` |
| plan god flag | **ANTI_PATTERN(정합 시 admin 판정 회귀 최우선 감시)** | `TeamPermissions.php:132`·`AuthContext.jsx:720` |
| admin_roles/user_roles | **DEPRECATED(재부활 금지·회귀 아님)** | `routes.php:1670`·`UserAdmin.php:596-599` |

## 4. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — 5 어휘를 삭제하지 않고 Registry substrate로 흡수하므로, 정형화 후에도 위 10개 표면은 **동일 판정**이어야 한다.
2. **plan god flag 정합이 최고위험 회귀 지점** — admin 판정을 plan에서 분리(후속 Part)할 때 Login/admin 패널/api_key 접근이 회귀할 수 있으므로 #1·#4·#5를 최우선 감시.
3. **AdminMenu rank 불일치 정합 주의** — required_role(3값)과 게이트 rank(4값) 통합 시 반쯤 死 상태를 살리는 과정에서 접근 확대/축소 회귀 가능 → #4 정밀 재검증.
4. **폐기 admin_roles는 회귀 표면 아님** — 재부활 금지(재검증 대상 자체가 없음).
5. **정직 부재는 게이트 대상 아님** — isManager/isApprover/JobTitle 개념 부재로 관련 회귀 항목을 만들지 않는다.

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Registry/Permission Mapping 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **선행 감시 지점**: plan god flag 정합(#1·4·5)·AdminMenu rank 통합(#4)이 실 구현 시 최고위험 회귀.
- **무후퇴 원칙**: 위 10개 표면은 실존 기능 → Registry 도입 과정에서 삭제·재구현 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = 엔진 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_ROLE_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]

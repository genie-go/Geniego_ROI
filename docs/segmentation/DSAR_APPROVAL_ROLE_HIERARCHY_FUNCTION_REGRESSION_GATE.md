# DSAR — Role Hierarchy Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance · §76.7)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§76.7(Regression Test)의 **기존 Approval 전 기능 회귀 게이트**를 정의한다. Canonical Role Graph는 roleRank·parent_user_id·menu_tree·team_role→acl_permission·SSO group→role을 **대체·재구현이 아니라 경계 설정+정규화(흡수 대상 한정)**하므로(ADR D-1·D-5), **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Role Graph/Composite/Registry 실 구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. Canonical 필드

- **기능 표면 ID** — 아래 §3 표 번호
- **검증 기준(회귀 0)** — 도입 전/후 판정 동일성 조건
- **현행 substrate** — 근접 인용(file:line)
- **회귀 위험도** — `HIGH`(Golden Rule 흡수 경계 직접 접촉) / `MEDIUM`(간접 참조) / `LOW`(별개 도메인·참조만)

## 3. 열거형 / 타입 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) | 위험도 |
|---|---|---|---|---|
| 1 | **Login** | 로그인/토큰 발급·admin 판정 불변 | `resolveAdminByToken`(admin SSOT·289차 P4·`UserAuth.php:2998-3024`) | LOW |
| 2 | **User Management** | `parent_user_id` owner→member 위계·tenant 상속 판정 불변 | `UserAuth.php:176,316,423-426` | **HIGH**(§6.1 경계 직접 접촉) |
| 3 | **Permission(team 권한)** | team_role→acl_permission 판정·`effectiveForUser`/`effectiveScope` 산출 동일 | `TeamPermissions.php:152,236-265,366-394` | **HIGH**(§6.3 경계 직접 접촉) |
| 4 | **Role Registry(Part 3-1)** | Part 3-1 설계 산출물(Role Definition Node substrate) 무변경 | Part 3-1 substrate(본 문서 인용 범위 밖 — Part 3-1 GROUND_TRUTH 참조) | MEDIUM |
| 5 | **api_key RBAC** | roleRank 선형 rank·쓰기 게이트(analyst+/connector+) 판정 불변 | `index.php:573,592-595` | **HIGH**(§6.2 "선형 rank≠상속" 경계 직접 접촉) |
| 6 | **admin 패널(AdminMenu)** | `required_role` 게이트·rank 판정 불변(단, 기존 데드락 결함은 본 차수 수정 대상 아님) | `AdminMenu.php:247,338,343-346,401` | **HIGH**(§6.1 메뉴 트리 경계 직접 접촉) |
| 7 | **SSO(Cross-Registry Adapter)** | IdP 그룹→team_role 평면 매핑 불변 | `EnterpriseAuth.php:78-88` | MEDIUM |
| 8 | **Approval(승인 경로)** | 기존 승인 게이트 판정 불변(Part 1 Authority Registry 별개축) | 현행 승인 게이트(본 문서 범위 밖 — Part 1 GROUND_TRUTH 참조) | LOW |
| 9 | **Assignment(역할 부여 경로)** | 부여 경로 불변(실 Assignment=Part 3-3 별개) | Assignment 정본 부재(Part 3-3) | LOW |
| 10 | **WMS mini-RBAC(Silo)** | `wms_permissions` role text 등가비교 불변(Consolidation 후보이나 Role Graph 흡수 대상 아님) | `Wms.php:114,567-575` | MEDIUM |

## 4. 실 substrate 매핑 (§5.2)

| 회귀 표면 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| parent_user_id 계정 위계 | **Organization Hierarchy Candidate(Role Graph 밖 유지·무후퇴)** | `UserAuth.php:176,316,423-426` |
| team_role→acl_permission | **Permission Group Candidate(Composite 아님·무후퇴)** | `TeamPermissions.php:152` |
| roleRank 선형 rank | **Hardcoded Parent-child(순서)·Unversioned(무후퇴)** | `index.php:573,592-595` |
| menu_tree parent_id + required_role | **Organization Hierarchy Candidate(메뉴·무후퇴·단 반쯤 死 상태 유지)** | `AdminMenu.php:108,117,247,268,338,343-346,401` |
| SSO group→role | **IAM Group Nesting Candidate(Adapter·무후퇴)** | `EnterpriseAuth.php:78-88` |
| plan god flag 전역 우회 | **ANTI_PATTERN(§6.5·정합 시 최우선 감시 지점)** | `TeamPermissions.php:132` |
| admin_roles/user_roles | **DEPRECATED(재부활 금지·회귀 대상 아님)** | ADR D-6 참조(289차 P3 폐기) |

## 5. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — Role Graph는 3종 substrate(roleRank/parent_user_id/menu_tree)를 삭제하지 않고 **경계 밖 유지**하므로(ADR D-1), 정형화 후에도 위 10개 표면은 **동일 판정**이어야 한다.
2. **§6.1/§6.2/§6.3 경계 접촉 표면이 최고위험 회귀 지점** — #2(Organization Hierarchy)·#3(Permission Group)·#5(선형 rank)·#6(메뉴 트리)은 Role Graph 신설 시 "오흡수" 실수가 발생하기 가장 쉬운 지점(ADR D-2 정의역 4분리 위반 감시).
3. **AdminMenu 데드락은 회귀가 아니라 기존 결함 — 정합 시 확대 금지** — `required_role='super_admin'|'moderator'` 저장 시 admin(rank3)조차 비노출되는 기존 데드락(Duplicate Audit D-8 ①)은 **본 차수 수정 대상이 아니며**, Role Graph 도입이 이 결함을 "정합"이라는 명목으로 방치·확대하지 않아야 한다(향후 별도 fix 세션).
4. **SSO 부분 배선은 회귀가 아니라 기존 한계 — 정합 시 축소 금지** — OIDC/SAML 로그인 경로가 groups 미전달(SCIM만 실효, Duplicate Audit D-8 ②)인 현행 한계를 Role Graph Cross-Registry Adapter가 "이미 해결된 것처럼" 오표기 금지.
5. **plan god flag 정합이 admin 판정 회귀 최우선 감시 지점** — admin 판정을 plan에서 분리(후속 Part)할 때 Login/admin 패널/api_key 접근이 회귀할 수 있으므로 #1·#5·#6을 최우선 감시.
6. **폐기 admin_roles는 회귀 표면 아님** — 재부활 금지(재검증 대상 자체가 없음). 289차 P1~P4 재플래그 금지.
7. **정직 부재는 게이트 대상 아님** — Composite/Diamond/Cycle 관련 기능이 현재 존재하지 않으므로 "회귀"가 아니라 "신규 기능 검증"으로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Role Graph/Composite/Registry 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **선행 감시 지점(부수 발견 · 수정 아님)**: AdminMenu `required_role` 쓰기/읽기 rank 데드락(#6·`AdminMenu.php:247,338,343-346`) · SSO group→role 부분 배선(#7·`EnterpriseAuth.php:240,294,374-375`) · plan god flag 전역 우회(#1·#5·#6·`TeamPermissions.php:132`) — 전부 Duplicate Audit D-8/ADR §7 부수 발견 인용, 본 차수 수정 아님.
- **무후퇴 원칙**: 위 10개 표면은 실존 기능 → Role Graph 도입 과정에서 삭제·재구현 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = 엔진 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_ROLE_HIERARCHY_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_GRAPH_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]

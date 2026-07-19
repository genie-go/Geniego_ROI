# DSAR — Role Hierarchy / Composite 중복 구현 감사 (EPIC 06-A-03-02-03-04 Part 3-2 · §66 · ⓑ GROUND_TRUTH)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **원칙**: 동일 목적 구현이 있으면 중복 Hierarchy/Composite/Role Graph/Role Resolver 신설 금지 — Canonical Versioned Role Graph + Adapter로 통합(Golden Rule). 폐기 admin_roles 재부활 금지.
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **선행**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · Part 3-1 [`DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT.md)

---

## 0. 총평

Role Hierarchy/Composite/Graph는 **실체가 없어 "동일 그래프의 중복 구현"은 성립하지 않는다**(중복될 그래프가 부재). 대신 §66이 겨냥하는 진짜 위험은 **"위계로 오용될 병렬 트리 구조 3종"과 "5 role 어휘 산재"**이며, 이는 신규 Canonical Role Graph를 이들 위에 잘못 이중 표현하지 않도록 하는 통합·경계 결정 대상이다.

## 1. 확인된 중복/병렬/오용 위험

### D-1. ★위계로 오용 가능한 병렬 트리 3종 (Role Graph로 이중 표현 금지)
| 구조 | 대상 | 저장/근거 | 위험 |
|---|---|---|---|
| api_key `roleRank` 선형 rank | 프로그래매틱 role 순서 | `index.php:573` | Role Hierarchy로 승격 시 "선형 rank=상속"으로 오변환(§6.2 Permission Hierarchy 혼동) |
| `parent_user_id` 계정 위계 | owner→member(사람) | `UserAuth.php:176,316` | **Organization Hierarchy를 Role Hierarchy로 사용**(§6.1·§67 Critical Gap 후보) |
| `menu_tree.parent_id` 메뉴 트리 | 메뉴 노드 | `AdminMenu.php:108,117,268` | 메뉴 트리를 Role Graph로 이중 표현(§66 "Organization Hierarchy를 Role Hierarchy로 중복") |

→ 세 구조는 **서로 다른 대상(프로그래매틱 rank·사람 계정·메뉴)** 이므로 실제 "중복"이 아니라 **오용 경계** 문제다. 신규 Role Graph는 이들을 Node/Edge로 흡수·재사용하지 말고, `parent_user_id`(Part 3-3 Assignment의 Subject 관계)·`menu_tree`(메뉴 도메인)와 **명확히 분리**해야 한다.

### D-2. 5 role 어휘 산재 (Part 3-1 D-1 재확인 · Hierarchy 관점)
- team_role(owner/manager/member)·api_key role(viewer~admin)·admin_level(master/sub)·AdminMenu ROLE_ENUM·plan 'admin'가 통합 Namespace 없이 공존(Part 3-1 `DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT` §D-1). Hierarchy 관점에서 이 중 **암묵적 순서를 가진 것은 roleRank(선형)·admin_level(master>sub)·team_role(owner>manager>member)** 3개이며, 서로 다른 값공간의 순서라 **단일 Role Graph로 결합 불가**(Actor/Category 축 분리 필요).

### D-3. Role→Permission 묶음 vs Composite Role 혼동 위험 (§6.3)
- team_role→acl_permission(`TeamPermissions.php:152`)는 **Role→Permission 묶음**이지 Composite Role(여러 Role Definition 조합)이 아니다. 신규 Composite Role을 이 매핑 위에 이중 정의하면 §6.3 위반. Composite Role은 별도 실체(component=Role Definition)로 신설.

### D-4. SSO group→role 평면 매핑 (Nested Group 아님 · Adapter로 유지)
- `roleForGroups`(`EnterpriseAuth.php:78-88`)는 IdP 그룹→team_role **평면(1-hop) 매핑**이지 LDAP/AD nested group 상속이 아니다(Part 3-1 §1.5). Cross-registry/IAM Adapter로 유지하되 Role Graph 내부 edge로 흡수 금지(§48 Cross-Registry Governance).

### D-5. Silo mini-RBAC (`wms_permissions`) — 미통합 병렬 RBAC (Consolidation 후보)
- `wms_permissions(role, warehouses)`(`Wms.php:114`)가 TeamPermissions acl_permission과 **무관한 도메인 국지 RBAC**로 존재. role text 등가비교(`Wms.php:567-575`·admin=전창고 우회)이며 rank/graph 없음. Canonical Role Registry가 흡수할 Consolidation 후보이나 Role Graph edge는 아님(별도 도메인 권한).

### D-6. 선형 rank 3종 중복 리터럴 (미통합·SSOT 부재)
- api_key roleRank 리터럴이 **3곳 하드코딩 중복**(`index.php:573`·`AdminMenu.php:74`·`:338`)·plan `PlanPolicy::RANK`(`:19-22`)·team_role enum 비교(`TeamPermissions.php:120-131`)로 3개 순서 체계가 각기 정의. 값 'admin'이 api_key role·plan·AdminMenu enum에 중복하나 값공간·의미 상이. Role Hierarchy로 결합 불가(Actor/Category 축 분리·§6.2).

### D-7. 정책 이중정의·판정 재구현 드리프트 (2 Explore 스레드 교차확인 · Reconciliation/Drift/Static Lint substrate)
| 중복 유형 | 근거 (file:line) | 비고 |
|---|---|---|
| team_role 쓰기정책 BE↔FE 드리프트 | BE `UserAuth.php:1117`(TEAM_OWNER_ONLY 7개·security_policy 포함) vs FE `teamRolePolicy.js:33-42`(6개·security_policy 누락) | 283차 R2 추가분 FE 미반영(BE defense-in-depth로 차단·UX 불일치) |
| 메뉴 ACL 카탈로그 자백형 이중정의 | BE `TeamPermissions.php:39-82,706-722` vs FE `teamApi.js:16-51,228-244`("로컬 사본" 주석) | 데모/폴백 사본·수동 동기화 드리프트 리스크 |
| owner/roleOf 판정 5중 재구현 | `TeamPermissions.php:120-136`·`UserAuth.php:1119-1131`·`EnterpriseAuth.php:476-497`·`Wms.php:565`·`AgencyPortal.php:479-480` | fail-open/closed 세부 상이 |
| WMS role 4등급(FE) vs 2등급(BE) | FE `WmsManager.jsx:185-190` vs BE `Wms.php:579`(admin/non-admin만 실효) | FE 과다표기 |
| role 스키마 정의 경로 이중화 | migrations `20260526_168_101/102/005` vs Handler `ensureSchema`/`ensureTenantColumns`(`UserAuth.php:181-199`·`AdminMenu.php:48-49`) | 마이그레이션 프레임워크 밖 분산 DDL |

### D-8. ★부수 발견 — 실 결함 2건 (설계 거버넌스 코드 0 · 수정 아님 · 후속 세션 후보)
- **AdminMenu `required_role` 쓰기측 ROLE_ENUM ↔ 읽기측 rank 데드락**: 쓰기 검증=`ROLE_ENUM['admin','super_admin','moderator']`(`AdminMenu.php:247,401`)·읽기 가시성=rank `['viewer'=>0..'admin'=>3]`(`:338,343-346` `$need=$rank[required_role]??99`). `required_role='super_admin'|'moderator'` 저장 시 admin(rank3)조차 `$need=99`로 **해당 메뉴 영구 비노출**(논리 데드락). 2스레드 교차확인. 스키마 원천=`menu_tree.required_role VARCHAR(32)`(CHECK/ENUM 없음·`migrations/20260526_168_101`). Part 3-1 §1.4 "반쯤 死 enum" 정합. **이번 차수 수정 안 함**(설계·메뉴 도메인·별도 fix 세션 승인 필요).
- **SSO group→role 부분 배선**: `roleForGroups`(`EnterpriseAuth.php:78-91`)가 실제 groups를 받는 경로=SCIM(`:374-375`)뿐. OIDC 콜백(`:240`)·SAML ACS(`:294`)는 `provisionUser` 호출 시 groups 미전달→항상 `default_role` 폴백. **수정 아님·후속 후보**.

## 2. 중복이 **아닌** 것 (정직 판정·오탐 예방)

- Role Graph "중복 구현"은 **존재하지 않음**(그래프 실체 부재). 따라서 "동일 Source·Target Edge 중복", "방향만 반대인 중복 Edge", "IAM/ERP/Workflow와 Platform 동일 Hierarchy", "동일 Component Set Composite" 등 §66 항목 대부분은 **N/A(대상 부재)**.
- roleRank·parent_user_id·menu_tree는 서로 다른 대상 → 상호 중복 아님(오용 경계만).
- FE role 정책 미러(`teamRolePolicy.js`·`AuthContext.jsx`)는 defense-in-depth(Part 3-1 §2·중복 아님).

## 3. 통합 결정 (조립 계획)

- **금지**: 신규 Role Hierarchy/Composite/Role Graph/Role Resolver를 병렬 신설하면서 `parent_user_id`(계정)·`menu_tree`(메뉴)·roleRank(rank)를 Role↔Role edge로 오흡수. 폐기 admin_roles/user_roles 재부활.
- **채택**: Canonical Versioned Role Graph를 **제로에서 신설**하되 (a) Node=Part 3-1 Role Definition(team_role/api_key role/admin_level 정규화 대상), (b) roleRank/admin_level/team_role의 암묵 순서는 Role Category/Actor 축으로 분리해 각기 별도 Hierarchy Registry로, (c) parent_user_id는 Part 3-3 Subject Assignment 관계로(Role Graph 밖), (d) menu_tree는 메뉴 도메인 유지(Role Graph 밖), (e) SSO group→role은 IAM Adapter(Cross-registry).
- **실 구현**: 선행 Permission Engine·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0).

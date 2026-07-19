# DSAR — Role 중복 구현 감사 (EPIC 06-A-03-02-03-04 Part 3-1 · §56)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **원칙**: 동일 목적 구현이 있으면 중복 Role Registry/Definition/Resolver 신설 금지 — Canonical Role Contract+Adapter로 통합(Golden Rule). 폐기 admin_roles 재부활 금지.
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)

---

## 1. 확인된 중복/병렬 구현

### D-1. ★5개 무관 역할 vocabulary (통합 namespace 부재·값충돌) — 최우선 통합 대상
| 체계 | 값 | 저장소 | 축 | 정규화 |
|---|---|---|---|---|
| team_role | owner/manager/member | `app_user.team_role` | 테넌트 쓰기 위계 | `roleOf`(`TeamPermissions.php:120`) |
| api_key role | viewer/connector/analyst/admin | `api_key.role` | 프로그래매틱 rank | `roleRank`(`index.php:573`) |
| admin_level | master/sub | `app_user.admin_level` | plan=admin 내부 세분 | `isMaster`(`UserAdmin.php:46`) |
| AdminMenu ROLE_ENUM | admin/super_admin/moderator | `menu_tree.required_role` | 메뉴 게이트(반쯤 死) | `AdminMenu.php:247`·rank 불일치 |
| plan 'admin' | god flag | `app_user.plan/plans` | 전역 우회 | `isAdmin`(`TeamPermissions.php:132`) |

→ 4개 role 어휘 + plan god flag가 **서로 다른 값공간·정규화·저장소**. 값 `admin`이 3체계(api_key role·AdminMenu enum·plan)에 중복하며 **의미가 다름**. Canonical Role Registry가 단일 Namespace(`{DOMAIN}:{FUNCTION}:{ROLE}`)+Actor Eligibility 축으로 통합해야 함. **주의: plan은 Role 아님(§6.5)** — 통합은 혼용이 아니라 admin 판정을 Role/admin_level로 분리.

### D-2. AdminMenu ROLE_ENUM vs 실 게이트 rank 불일치 (반쯤 死 enum)
- `ROLE_ENUM=['admin','super_admin','moderator']`(`AdminMenu.php:247`, required_role 검증)이나 실제 접근 게이트는 api_key rank(`viewer/connector/analyst/admin` `:74,338`)를 사용 → required_role='moderator'/'super_admin'은 rank map에 없어 정합 불가. 통합·정합 대상.

### D-3. Role→Permission 매핑 3축 분산 (단일 매핑 함수 부재)
- team_role→acl_permission(`TeamPermissions.php:152`) · api_key role→scope(`index.php:573-597`·`Keys.php:189-209`) · admin_level→admin_menus(`UserAuth.php:1353`). 3개 별도 변환. Canonical Role Permission Mapping으로 단일화.

### D-4. plan god flag 누출 (Role↔Plan 혼용·§6.5)
- `plan='admin'`이 team 권한 전역 우회(BE `TeamPermissions.php:132`·FE `AuthContext.jsx:720`·`AdminMenu.php:57`). Subscription Plan이 Role로 새는 anti-pattern. admin 판정을 Role/admin_level로 분리(단 광범위 영향·후속 정합). ★admin 판정 SSOT(resolveAdminByToken·P4)가 이미 단일화됨=정합 기반.

### D-5. team_role 문자열 상수 BE/FE 산재 (정책 소비지 미러)
- `in_array(role,['owner','manager','member'])`(`TeamPermissions.php:123`) · FE `useTeamRole.js:15-17` · `AuthContext.jsx:707`. defense-in-depth 소비지이나 role 정의는 **단일 Registry 데이터**로(현재 하드코딩 const).

## 2. 중복이 **아닌** 것 (정직 판정·오탐 예방)
- team_role vs api_key role vs admin_level = **의도적 별개 축**(테넌트 위계/프로그래매틱/admin 세분)이나 통합 Namespace·Actor Eligibility로 정형화 대상(값충돌 해소).
- SSO group→role = team_role 매핑 Adapter(중복 아님).
- FE role 게이트 vs 서버 게이트 = defense-in-depth(중복 아님·정의 단일화만).

## 3. 통합 결정 (조립 계획)
- **금지**: 신규 Role Registry/Definition/Resolver 병렬 신설·폐기 admin_roles/user_roles 재부활.
- **채택**: team_role/TeamPermissions를 Role Definition/Permission-Mapping substrate로, api_key role/admin_level/AdminMenu enum을 Canonical Role로 정규화(Actor Eligibility 축·Legacy Alias). plan god flag는 admin 판정을 Role/admin_level로 분리(후속). 5 어휘를 단일 Namespace로 통합하되 축(테넌트 위계/프로그래매틱/admin 세분)은 Role Category/Actor Type로 보존.
- **실 구현**: 선행 Permission Engine 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0).

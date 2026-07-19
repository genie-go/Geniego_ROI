# DSAR — Role Assignment 중복 구현 감사 (EPIC 06-A-03-02-03-04 Part 3-3 · ⓑ GROUND_TRUTH)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **원칙**: 동일 목적 구현이 있으면 중복 Assignment Registry/Service/Resolver 신설 금지 — Canonical Assignment Registry+Adapter로 통합(Golden Rule). 폐기 admin_roles 재부활 금지.
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **선행**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · Part 3-1 [`DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT.md)

---

## 0. 총평

Assignment "실행"은 5자원에 실재하나 **통합 Assignment Service/Registry가 없어 동일 자원(`app_user.team_role`)에 3개 핸들러가 각자 검증규칙으로 독립 write** — 이것이 Part 3-3의 핵심 중복이다. 신규 Canonical Assignment Registry는 이 분산 write를 중개(통합)하되, 폐기된 admin_roles/user_roles 재부활은 금지(인가 미소비 장식 재발 방지).

## 1. 확인된 중복/병렬/분산

### D-1. ★`app_user.team_role` 단일 컬럼에 3핸들러 독립 write (통합 Registry 부재 — 최우선)
| 경로 | 핸들러 | file:line | 독자 검증규칙 |
|---|---|---|---|
| 팀원 초대/역할변경 | `UserAuth::createTeamMember`/`updateTeamMember` | `UserAuth.php:1334,1392` | 화이트리스트 `in_array(['manager','member'])` |
| SSO/SCIM 프로비저닝 | `EnterpriseAuth::provisionUser` | `EnterpriseAuth.php:496,507-509` | IdP 그룹→role(`roleForGroups`)·owner 강등금지 |
| 팀 CRUD manager 승격 | `TeamPermissions::promoteManager` | `TeamPermissions.php:768-776` | owner 보호 체크 |
| (별도 축) sub-admin 발급 | `UserAuth::createSubAdmin`·`UserAdmin` | `UserAuth.php:1639-1648`·`UserAdmin.php:298,301,436,438` | admin_level='sub' 강제·이메일 도메인 제한 |

→ 동일 컬럼에 **3 클래스(UserAuth/EnterpriseAuth/TeamPermissions) 독립 UPDATE + admin_level 4번째 축**. 중개하는 단일 Assignment Service 부재(grep 0). Canonical Assignment Registry가 이 write들을 통합해야 함(검증규칙 일원화·감사 일관·version 부여).

### D-2. api_key.role 할당 2중 병렬 구현 (감사·검증 divergent)
- `/v421/keys`(`Keys.php:81-187`·scope 상한 `allowedScopesForRole`·**감사 0**) vs `/auth/api-keys`(`UserAuth.php:4340-4399`·**감사 O**·scope 상한 미러 없음). 동일 `api_key` 테이블·다른 진입경로·다른 검증·다른 감사 → 통합 대상.

### D-3. 감사 2중 테이블 병존 (단일 SSOT 아님)
- `auth_audit_log`(SSOT 표방·`TeamPermissions.php:19`) + `pm_audit_log`(PM 별도·`Shared.php:129-148`). Assignment 감사가 두 테이블로 분산. 정본 tamper-evident=`SecurityAudit`(단 assignment 미기록).

### D-4. Effective 계산 vs assignment 상태 (근접이나 별개)
- `effectiveForUser`/`effectiveScope`(`TeamPermissions.php:366-394,236-265`)가 유효권한 계산이나 assignment 엔티티/version 무참조·라이브 재계산. 신규 Effective Assignment Resolution은 이를 assignment version 기준으로 승격(중복 신설 아님·확장).

## 2. 중복이 **아닌** 것 (정직 판정·오탐 예방)

- team_role vs api_key.role vs admin_level vs pm_task_assignees = **의도적 별개 축**(테넌트 위계/프로그래매틱/admin 세분/과제 담당)·값공간 상이. 통합 Registry는 축을 Subject Type/Role Namespace로 보존하며 write 경로만 중개.
- `assignableMap`(권한 위임상한)·impersonation(대행)·break-glass(인증우회)·writeGuard(정적 게이트) = **각기 정당한 별개 기능**(role 부여 아님). Assignment로 오흡수 금지.
- UNIQUE 제약(acl `uq_acl`·scope `uq_scope`·pm UNIQUE) = 물리 중복 방지지 SoD 아님(중복 아님).
- FE `teamRolePolicy.js`/`writeGuard.js` = 서버 정책 미러(defense-in-depth·중복 아님).

## 3. 통합 결정 (조립 계획)

- **금지**: 신규 Assignment Registry/Service/Resolver를 병렬 신설하면서 3분산 write를 방치·폐기 admin_roles/user_roles 재부활·근접 패턴(assignableMap/impersonation/break-glass/menu snapshot)을 Assignment로 오흡수.
- **채택**: Canonical Assignment Registry가 (a) team_role 3분산 write(UserAuth/EnterpriseAuth/TeamPermissions)를 단일 Assignment 진입점으로 중개(검증·감사·version 일원화), (b) api_key.role 2경로 통합, (c) admin_level·pm_task_assignees를 Subject Type/Namespace 축으로 흡수, (d) `effectiveForUser`를 Effective Assignment Resolution의 substrate로 확장(version 기준), (e) 감사를 SecurityAudit tamper-evident 체인으로 승격(assignment 이벤트 기록), (f) **인가 실소비 role에만 적용**(admin_roles 장식화 전례 반영).
- **실 구현**: 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0).

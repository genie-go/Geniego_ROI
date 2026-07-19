# DSAR — Approval Role Static Lint (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§58은 Role Definition/Namespace/Permission Mapping을 **저장·커밋하는 시점에 결손을 잡는 정적 검사(static lint)** 목록이다. lint는 정의를 저장하는 순간 발동한다. 이 저장소에는 **Canonical Role Definition/Namespace/Permission Mapping/Version 스키마가 통째로 부재**하므로, 대부분 lint는 **검사 대상 저장 스키마가 없어 `NOT_APPLICABLE`**(엔티티 신설 시 함께 켤 규칙)이다. 단 **문자열 상수 비교(team_role/admin_level)와 plan god flag는 현행 실코드에 실재**하므로 lint가 겨눌 안티패턴으로 `ABSENT`(의미 있게 빠짐)/`REAL`로 표기한다.

★**`VALIDATED_LEGACY` 미사용(cover 0)** — 어떤 lint도 "기존 스키마가 이미 위반을 차단한다"가 아니다.

## 2. 열거 / 항목 (§58 Static Lint 차단 목록 + 판정)

| # | §58 lint 규칙 | 현행 대조 (substrate file:line) | 판정 |
|---|---|---|---|
| 1 | Hardcoded Role String | 문자열 비교 실재 `TeamPermissions.php:123`·`AuthContext.jsx:707` · Definition 스키마 부재 | REAL(정형화 대상) |
| 2 | `role=="ADMIN"/"MANAGER"/"APPROVER"` 비교 | `role=="admin"` 계열 실재 · MANAGER/APPROVER 상수는 team_role(manager) 외 부재 | PARTIAL_REAL |
| 3 | `isAdmin`/`isManager`/`isApprover` | `isAdmin`(`TeamPermissions.php:132`)·`isOwnerAdmin`(`:134`)·`isManagerAdmin`(`:136`) 실재 · **isManager/isApprover 명칭은 grep 0(정직 부재)** | REAL(isAdmin류)·ABSENT(isManager/isApprover) |
| 4 | User Type을 Role로 | api_key role(`Keys.php:95`)·team_role(`UserAuth.php:188`) 축 혼재 · 통합 lint 대상 스키마 부재 | NOT_APPLICABLE |
| 5 | Job Title/Position을 Role로 | job_title/jobTitle 0건 · position=비-HR | ABSENT(정직) |
| 6 | Feature Flag를 Role로 | Feature Flag→Role 매핑 스키마 부재 | NOT_APPLICABLE |
| 7 | Subscription Plan을 Role로 | **plan 'admin' god flag 실재** `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57`(§6.5) | REAL(후속 정합) |
| 8 | Permission Code ↔ Role Code 혼동 | Role 문자열이 곧 Permission 묶음 소비(`TeamPermissions.php:120-131`) · 분리 스키마 부재 | NOT_APPLICABLE |
| 9 | Unversioned Role | Role Version 컬럼 부재 → 검사 대상 없음 | NOT_APPLICABLE |
| 10 | In-place Update | 불변 버전체인 스키마 부재 | NOT_APPLICABLE |
| 11 | Missing Tenant | Role Definition tenant 컬럼 부재(team 데이터격리≠정의격리) | NOT_APPLICABLE |
| 12 | Missing Owner | Owner 컬럼 부재 | NOT_APPLICABLE |
| 13 | Missing Purpose | Purpose 컬럼 부재 | NOT_APPLICABLE |
| 14 | Missing Permission Version | Permission Version 결합 부재(Part 2 BLOCKED) | BLOCKED_PREREQUISITE |
| 15 | Deprecated/Retired/Suspended Role 사용 | Role Lifecycle 컬럼 부재 → 상태 검사 대상 없음 | NOT_APPLICABLE |
| 16 | Service Account에 Human Role | actor type eligibility 컬럼 부재 | NOT_APPLICABLE |
| 17 | Emergency를 일반 Assignment로 | Emergency Role 개념 부재 | NOT_APPLICABLE |
| 18 | Temp 무기한 | Temporary Role/만료 컬럼 부재 | NOT_APPLICABLE |
| 19 | Alias를 authz에 직접 사용 | Legacy Alias 개념 부재(신규) | NOT_APPLICABLE |
| 20 | Duplicate Registry/Resolver/Enum | ROLE_ENUM(`AdminMenu.php:247`)·rank(`AdminMenu.php:74`)·validRoles(`Keys.php:95`) **다중 enum 실재** · 통합 Registry 부재 | REAL(정형화 대상·중복 신설 금지) |
| 21 | Cross-Tenant Cache | Role 캐시 tenant 키 개념 부재 | NOT_APPLICABLE |
| 22 | Mutable Snapshot | Snapshot 스키마 부재 | NOT_APPLICABLE |
| 23 | Bypass Flag | plan god flag가 사실상 전역 bypass(`TeamPermissions.php:132`) | REAL(§6.5) |

**전사 23항.** 커버리지 = **`VALIDATED_LEGACY` 0** · `REAL`(정형화/후속정합 대상) 5(#1·3·7·20·23)·PARTIAL_REAL 1(#2) · `ABSENT`(정직) 2(#3 isManager/isApprover·#5 JobTitle) · `BLOCKED_PREREQUISITE` 1(#14) · `NOT_APPLICABLE` 나머지.

## 3. substrate 매핑 (§5.2)

| lint 대상 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 문자열 상수 비교(team_role/admin_level) | **정책 소비지 미러(중복 아님·정형화)** | `TeamPermissions.php:123`·`AuthContext.jsx:707`·`useTeamRole.js:11-22` |
| 다중 Role enum | **CONSOLIDATION_REQUIRED** | `AdminMenu.php:247`(ROLE_ENUM)·`AdminMenu.php:74`(rank)·`Keys.php:95`(validRoles) |
| plan god flag / Bypass | **ANTI_PATTERN(§6.5·후속 정합)** | `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57` |
| isManager/isApprover/JobTitle | **정직 부재(ABSENT)** | grep 0건 |
| Definition/Version/Owner/Snapshot 스키마 | **ABSENT → 신설** | 없음 |

## 4. 설계 원칙

1. **엔티티 신설 = lint 동시 발동이 완료조건** — Role Definition/Namespace/Permission Mapping/Version DDL 신설 커밋에 §58 lint를 **같은 PR로** 붙인다. lint 없는 스키마 신설은 §57 Critical Gap을 구조적으로 재초대한다.
2. **정직 부재를 lint 근거로 날조 금지** — isManager/isApprover/JobTitle(#3·#5)은 레포에 없으므로 "제거 대상"이 아니라 "신설 시 금지 규칙"으로만 등재.
3. **문자열 미러는 중복 Registry가 아님** — `TeamPermissions.php:123`·`AuthContext.jsx:707`은 중앙정책의 소비지 미러(정형화 대상). Canonical Code로 대체하되 판정 의미 무변경(회귀 0).
4. **다중 enum 통합(#20)은 신설 Registry로만** — ROLE_ENUM/rank/validRoles를 삭제·재구현이 아닌 Registry substrate로 흡수. 중복 Resolver 신설 금지.
5. **plan god flag lint(#7·#23)는 후속 정합** — 자립 quick-fix 아님(광범위 영향·설계 등재).

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Version lint(#14)는 Part 2 실 구현 이후.
- **REAL(정형화/후속정합)**: 문자열 상수 비교·다중 enum·plan god flag·isAdmin류 — 신설 lint가 겨눌 실 안티패턴.
- **NOT_APPLICABLE**: 나머지 lint는 검사할 저장 스키마 부재(엔티티 신설 시 동시 활성).
- **정직 부재**: isManager/isApprover/JobTitle ABSENT — 날조 금지.
- **판정**: NOT_CERTIFIED · 실 lint 활성 = 스키마 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_ROLE_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]

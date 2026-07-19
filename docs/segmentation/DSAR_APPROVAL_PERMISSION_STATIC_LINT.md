# DSAR — Permission Engine 최소 Static Lint (EPIC 06-A-03-02-03-04 Part 2 · §88)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지

---

## ① 목적

§88은 **Permission 정의·Grant·Resolver 소스에 대해 정적으로 차단해야 할 anti-pattern 목록**이다. Production Certification 이전에 이 anti-pattern들이 코드/정의에 침투하지 못하도록 하는 **최소 Lint 집합**이다. 실 Lint 코드·규칙은 아직 0건(순신규)이므로 이 문서는 **계약(CONTRACT_ONLY)**이다 — 문서 존재를 "린트가 있다"로 읽으면 가짜녹색이다.

## ② 핵심 항목/열거 (§88 Static Lint 규칙)

| # | Lint 규칙 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Hardcoded Permission String | 소스 리터럴 authz 전무(정직) | `CONTRACT_ONLY` · 부재 확인 |
| 2 | Role-as-Permission(역할명을 권한으로) | 3 rank/vocab 병존(plan/api_key/team_role) — Resolver 통합 시 혼용 금지 | `CONTRACT_ONLY` |
| 3 | User ID/Email을 Permission 주체로 | 하드코딩 user-id/email authz 전무(정직) | `CONTRACT_ONLY` · 부재 확인 |
| 4 | isAdmin Bypass 리터럴 | admin 판정 전부 DB 기반(`resolveAdminByToken`) | `CONTRACT_ONLY` · 부재 확인 |
| 5 | `permission == "*"` 비교 | 일반 UI 권한에 wildcard 없음 | `CONTRACT_ONLY` · 부재 확인 |
| 6 | `FULL_ACCESS` 상수 | 백엔드 grep 공집합 | `CONTRACT_ONLY` · 부재 확인 |
| 7 | `MANAGE_ALL` 상수 | 백엔드 grep 공집합(`manage`=action superset이나 ALL 아님) | `CONTRACT_ONLY` · 부재 확인 |
| 8 | Client-side-only Check | writeGuard=289차 서버 미러 완료 | `CONTRACT_ONLY` · 해소 인용 |
| 9 | UI-only Permission | menu 가시성=cosmetic·서버 재검증 필수 | `CONTRACT_ONLY` |
| 10 | Missing Server-side Check | 중앙 RBAC + guardTeamWrite 전역 배선 | `CONTRACT_ONLY` |
| 11 | Missing Tenant Scope | grant 귀속 tenant 정형화 순신규 | `CONTRACT_ONLY` |
| 12 | Missing Resource Version | Resource Version 개념 ABSENT | `CONTRACT_ONLY` |
| 13 | Missing Canonical Action | 8 action vocabulary만·Canonical Binding ABSENT | `CONTRACT_ONLY` |
| 14 | Unversioned Definition | Definition Version ABSENT | `CONTRACT_ONLY` |
| 15 | Unversioned Grant | Grant Version ABSENT | `CONTRACT_ONLY` |
| 16 | Grant without Source | Grant Source Chain ABSENT | `CONTRACT_ONLY` |
| 17 | Emergency without Incident 참조 | Emergency 개념 ABSENT | `CONTRACT_ONLY` |
| 18 | Service Account Human Approval 누락 | Actor Type 분리 ABSENT | `CONTRACT_ONLY` |
| 19 | Circular Group | Group Hierarchy ABSENT | `CONTRACT_ONLY` |
| 20 | Circular Hierarchy | Permission Hierarchy ABSENT | `CONTRACT_ONLY` |
| 21 | Circular Dependency | Dependency/Exclusion 개념 ABSENT | `CONTRACT_ONLY` |
| 22 | Scope Union without Guard | Intersection/Expansion Guard ABSENT | `CONTRACT_ONLY` |
| 23 | Null Permission as Allow | Default Deny 정형화 ABSENT(현행은 grant 부재=deny) | `CONTRACT_ONLY` |
| 24 | Revoked Grant in Cache | Effective-Set 캐시 ABSENT | `CONTRACT_ONLY` |
| 25 | Mutable Snapshot | Snapshot ABSENT | `CONTRACT_ONLY` |
| 26 | Cross-Tenant Cache | 캐시 ABSENT | `CONTRACT_ONLY` |
| 27 | Duplicate Resolver | Resolver 통합 대상(3 스케일 병존) — 중복 신설 금지 | `CONTRACT_ONLY` · Golden Rule |
| 28 | Duplicate Registry | Registry 순신규 — 중복 신설 금지 | `CONTRACT_ONLY` · Golden Rule |
| 29 | Duplicate Permission Code | Code 표준 순신규 | `CONTRACT_ONLY` |
| 30 | Bypass Feature Flag | Mandatory Control 무력화 플래그 금지(§6.16) | `CONTRACT_ONLY` |

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **#1/#3/#4/#5/#6/#7 부재 확인 근거** — `UserAuth::resolveAdminByToken :2998`(admin DB 기반)·`index.php:553-619`(중앙 RBAC). 소스 리터럴/이메일 authz·`FULL_ACCESS`/`MANAGE_ALL` = ABSENT(정직).
- **#8/#10 서버 재검증** — `UserAuth::guardTeamWrite :1167` + `index.php:82`(mutating 전역 호출·`TEAM_READ_ONLY`)·`requireTeamWrite :1134`. writeGuard UI-only 해소.
- **#2 Role-as-Permission 위험처** — 3 rank 병존: plan `PlanPolicy::RANK :19` · api_key `roleRank index.php:573` · team_role `normTeamRole :1119`(owner>manager>member). Resolver 통합 시 혼용 금지.
- **#22 Scope Union 위험처** — `data_scope`(`TeamPermissions.php:160-171,218-322`)·`scopeSql :286-293`·`DENY_SCOPE :234`. Intersection Guard = ABSENT.
- **#5 wildcard** — `Keys.php:191,204`(api_key scopes) → 프로그래매틱 한정이므로 Lint는 **일반 UI 권한 문자열에만** 적용(api_key scope 오탐 금지).
- **Definition/Grant Version·Source·Snapshot·Cache·Hierarchy/Group** — **ABSENT(전부 순신규)**.

## ④ 설계 원칙

- **규칙 SSOT 1곳·호출처 N곳**: Lint 규칙 구현은 한 곳(스캐너/검증기)에 두고 pre-commit·CI가 같은 구현을 호출한다. 정규식을 CI YAML에 복사하면 규칙 분기의 병을 새로 심는다.
- **등급 어휘 정직**: 실 코드 0 → `CONTRACT_ONLY`. `WIRED(탐지)`≠`ENFORCED(예방)`. required check 미설정이면 탐지일 뿐 차단 아님.
- **오탐 금지**: api_key wildcard scope는 §6.8 부합(정상) — #5 Lint 대상에서 제외. admin_roles/user_roles=289차 폐기(재플래그 금지).
- **Golden Rule**: #27/#28 — Resolver/Registry는 신설 1개만, 중복 금지. 기존 TeamPermissions/index.php RBAC 확장.

## ⑤ Gap

- 전 30종 `CONTRACT_ONLY` — **승인 Permission Static Lint는 단 1건도 코드로 존재하지 않는다**. 계약만 있고 집행 없음.
- BLOCKED_PREREQUISITE(RP-002): 실 Lint는 Registry/Definition/Grant 선언체가 신설된 후에야 검증 대상을 가진다.
- ★"있다고 가정" 배선 금지. 실 Lint 구현·CI 강제(required check)는 별도 승인세션.

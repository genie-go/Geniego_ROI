# DSAR — Effective Role Resolution Engine (ERRE): 중복·부재 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED.
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md`.
> 상위 ADR: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md`.
> Ground-Truth ①(실존 substrate): `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`.
> 본 문서는 ERRE 거버넌스/런타임 계층의 **부재(ABSENT)·부분(PARTIAL) 판정 정본** 및 오흡수 금지(KEEP_SEPARATE) 목록이다.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/`·`backend/migrations/`·`frontend/src/`. 읽기 전용.
- 레거시(`legacy_v338_pkg/`)·문서(`docs/`)·빌드로그는 실코드 아니므로 판정 근거에서 제외(참고만).
- 라인 번호 실측(Explore 스레드 B·36 tool-use).

## 1. 핵심 판정 요약

**ERRE가 감쌀 실체는 `TeamPermissions::effectiveForUser()`의 단일 온-더-플라이 계산 함수 + 분산된 constraint/guard substrate뿐이며, "resolution을 거버넌스하는 런타임 계층"은 실질적으로 순신규 그린필드다.**

resolution 결과는 매 요청 재계산되며 **영속·버전·캐시·그래프·스냅샷·드리프트·시뮬레이션·설명(XAI)이 전무**하다. 12개 거버넌스 개념 판정: **ABSENT 8 · PARTIAL 3 · PRESENT 1**.

## 2. 거버넌스 계층별 판정표

| # | 개념 | 판정 | 증거 (`파일:라인` / grep 0) |
|---|------|------|------------------------------|
| 1 | Registry/Pipeline/Planner/Optimizer/Executor | **ABSENT** | `ResolutionPipeline\|resolveGraph\|Planner\|Optimizer\|Executor` 백엔드 실코드 0. 권한계산은 파이프라인 없이 `TeamPermissions.php:393`이 if/switch 직접 산출 |
| 2 | Resolution Graph(DAG)/Cycle Detection (role↔role) | **ABSENT** | role 노드/엣지·순환탐지 0. (근접물 §4 KEEP_SEPARATE) |
| 3 | Snapshot/Digest/Version(immutable) | **ABSENT** | effective 결과 불변 스냅샷/해시/버전 영속 0. `effectiveForUser`(`TeamPermissions.php:393`)는 반환만·저장 안 함 |
| 4 | Cache/Invalidation(version) | **ABSENT** | 권한계산 결과 캐시·무효화 0. 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`) |
| 5 | Drift/Revalidation/Reconciliation | **ABSENT** | effective 권한 드리프트·재검증·조정 0 |
| 6 | Simulation/Explain(XAI) | **ABSENT** | 권한 what-if·"왜 이 role이 활성인가" 설명 0 |
| 7 | Effective Risk Calculator (role→LOW/MED/HIGH/CRIT) | **ABSENT** | role 입력 위험등급 계산기 0 (근접물 §4) |
| 8 | Effective Constraint (time/device/region/amount/API/dataset) | **PARTIAL** | 분산 substrate 실재: ① amount `Catalog.php:1036`(HIGH_VALUE_KRW=5000000)→`Catalog.php:1159`(requiresHighValueApproval)·`Catalog.php:1124`(approval_type='high_value') ② MFA `UserAuth.php:941` ③ api_key scope+`expires_at`(`Keys.php:99`) ④ data_scope 차원제약(`TeamPermissions.php:272`~`:307`). 통합 constraint 모델 부재 |
| 9 | Conflict Detection / SoD | **ABSENT** | `SoD\|segregation\|mutually.exclusive` 백엔드 실코드 0(유일매치=`EnterpriseAuth.php:314` SAML SPSSODescriptor 오탐) |
| 10 | Runtime Guard / Static Lint | **PARTIAL** (Guard만) | Guard substrate 실재: FE `writeGuard.js:61`(guardWrite), BE `UserAuth.php:1167`(guardTeamWrite), `Wms.php:557`(guardWarehouse), `Keys.php:99`(scope 권한상승 차단), `PlanPolicy.php:9`(메뉴 심층방어). **Static Lint(하드코딩 authz 정적탐지) ABSENT** — 도구·룰 0 |
| 11 | 하드코딩 authz / god-role | **PRESENT(대량 산재)** | §3 — 백엔드 106건/19파일 + 프론트 127건/36파일 = 233개소 |
| 12 | Resolution 관련 DB 테이블/제약 | **ABSENT(전용)/PARTIAL(RBAC substrate)** | §5 — `effective_role/resolution_snapshot/resolution_version/role_graph/sod_*` 테이블 0. RBAC substrate는 런타임 생성 |

## 3. 하드코딩 authz 산재 실측 (Static Lint 대상 규모)

패턴 `=== 'admin'`·`=== 'owner'`·`role == '...'`·`isAdmin/isOwner`.

- **백엔드 106건/19파일**: `UserAuth.php`(46) · `AdminMenu.php`(12) · `UserAdmin.php`(9) · `TeamPermissions.php`(9, 예 `:132 ($c['plan']??'')==='admin'`·`:134 roleOf($c)==='owner'`) · `Keys.php`(6) · `Payment.php`(4) · `AgencyPortal.php`(3) · `EnterpriseAuth.php`(3) · `SystemMetrics.php`(2) · `Wms.php`(2) · `routes.php`(2).
- **프론트 127건/36파일**: `pages/TeamMembers.jsx`(19) · `auth/AuthContext.jsx`(16) · `layout/Topbar.jsx`(8) · `layout/Sidebar.jsx`(7) · `components/GenieAssistant.jsx`(7) · `pages/UserManagement.jsx`(5) · `pages/PnLDashboard.jsx`(5) · `auth/planMenuPolicy.js`(5) · `auth/useVisibleTabs.js`(3) · `pages/SubAdminManager.jsx`(3) · `pages/AdminMenuManager.jsx`(3).

총 **233개소**가 `admin`/`owner` 문자열을 직접 비교 — resolution 우회·god-role 판정이 코드 전반에 흩어져 중앙 게이트로 강제되지 않음(Static Lint 미존재). ERRE Static Lint(§29)의 실 대상.

## 4. KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

이름은 유사하나 **권한 resolution이 아닌** 근접 클래스/파일. DSAR은 이들을 ERRE substrate로 인용 금지.

- **비-권한 그래프/순환탐지**: `AdminMenu.php:504`·`:551`(wouldCycle=menu_tree 조상체인) · `PM/Dependencies.php:77`~`:90`(task DFS) · `GraphScore.php:13`~`:25`(마케팅 어트리뷰션 그래프).
- **마케팅/의사결정 엔진**: `RuleEngine.php`(channel_roas/sku_stock 캠페인 자동제어) · `Decisioning.php` · `AnomalyDetection.php` · `Alerting.php`(`:665` "executor identity"는 알림 실행자지 resolution executor 아님).
- **감사·해시체인**: `SecurityAudit.php:25`~`:31`·`:56`~`:64`(append-only hash chain — snapshot 아닌 audit).
- **ML/드리프트/정합**: `Risk.php:12`·`:81`·`:91`(churn/policy ML 예측·probability·drivers — role 입력 아님) · `ModelMonitor`(model drift) · `PgSettlement`(정산 reconciliation) · `Connectors.php:819`(요청당1회 채널캐시)·roasReconciliation · `Wms`(reconcileChannelStock).
- **시뮬레이션(비-권한)**: `PriceOpt::simulate` · `AdminGrowth.php:1239`(campaign simulate) · `CustomerAI`(mode:simulated).
- **레지스트리(비-권한)**: `ChannelRegistry.php` · `channel_registry`/`risk_model_registry` 테이블.
- **SIEM/MFA 정적게이트**: `UserAuth.php:941`~`:972`(mfa_policy off/admin/all 정적 게이트·risk-score 없음) · `UserAuth.php:3681`(siem_config 라벨링).
- **레거시(폐기)**: `legacy_v338_pkg/` Python `effective_role_for_user`(org.py) — 폐기 Python·현행 PHP 무관·재부활 금지.
- **문서(실코드 아님)**: `docs/segmentation/*`·`docs/architecture/ADR_*`의 "effective_role_cache_invalidated" 등은 설계 문구일 뿐 구현 부재.

## 5. Resolution 관련 DB/테이블 실재

- **전용 resolution 테이블 ABSENT**: `effective_role`/`resolution_snapshot`/`resolution_version`/`role_graph`/`sod_*` = 백엔드·`backend/migrations/` grep 0.
- **RBAC/ABAC substrate PRESENT(런타임 생성)**: `team`/`acl_permission`(subject_type×subject_id×menu_key×actions)/`data_scope`(scope_type×values) — `backend/migrations/*.sql`에 없고 `TeamPermissions.php:139`~`:177`(ensureSchema)가 요청 시 `CREATE TABLE IF NOT EXISTS`로 생성. **스키마 거버넌스(마이그레이션 파일) 밖**.
- **tenant isolation PRESENT**: 모든 쿼리 `WHERE tenant_id=?`(예 `TeamPermissions.php:202`·`:215`). **version binding·immutable 제약 부재** — acl_permission UPDATE in-place 변경·이력/버전 없음.
- **migrations 디렉토리**: role/permission/resolution SQL 0(pm_task_dependencies·menu_tree·plan_menu_access 등 비-권한resolution만).

## 6. 종합 판정

- 12개념 중 **ABSENT 8**(Pipeline·Graph/Cycle·Snapshot·Cache·Drift·Simulation/Explain·Risk Calculator·SoD) · **PARTIAL 3**(Constraint·Runtime Guard[Guard만·Lint ABSENT]·DB substrate) · **PRESENT 1**(하드코딩 authz 산재).
- **ERRE 판정 = PARTIAL-substrate / ABSENT-governance** (Part 3-6 Service Role과 동형 계열, 단 substrate가 단일 함수로 더 좁음).
- 실 엔진 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션. 본 설계는 green-field 거버넌스 명세.

## 7. 인용 허용목록 (Ground-Truth ② 추가분)

Ground-Truth ①의 7파일에 더해 본 문서가 인용한 파일:

- `backend/src/Handlers/Catalog.php` — HIGH_VALUE_KRW·requiresHighValueApproval(constraint substrate)
- `backend/src/Handlers/Wms.php` — guardWarehouse(guard substrate)
- `backend/src/Handlers/SecurityAudit.php` — hash chain (**KEEP_SEPARATE**)
- `backend/src/Handlers/Risk.php` — churn ML (**KEEP_SEPARATE**)
- `backend/src/Handlers/PM/Dependencies.php` — task DFS (**KEEP_SEPARATE**)
- `backend/src/Handlers/GraphScore.php` — 마케팅 그래프 (**KEEP_SEPARATE**)
- `backend/src/Handlers/RuleEngine.php` · `Decisioning.php` · `AnomalyDetection.php` · `Alerting.php` · `ModelMonitor.php` · `PgSettlement.php` · `Connectors.php` · `ChannelRegistry.php` · `PriceOpt.php` · `AdminGrowth.php` · `CustomerAI.php` (**전부 KEEP_SEPARATE**)
- `backend/src/Db.php` · `backend/src/routes.php` · `backend/migrations/*.sql` (스키마·라우팅 확인)
- FE: `frontend/src/services/writeGuard.js` · `frontend/src/auth/teamRolePolicy.js` · `frontend/src/auth/AuthContext.jsx` · `frontend/src/auth/planMenuPolicy.js` · `frontend/src/auth/useVisibleTabs.js` · `frontend/src/pages/TeamMembers.jsx` · `frontend/src/layout/Topbar.jsx` · `frontend/src/layout/Sidebar.jsx` (FE authz 산재)

---
**총평**: 판정 12개념 중 ABSENT 8·PARTIAL 3·PRESENT 1. ERRE가 감쌀 실체는 `effectiveForUser` 단일 계산 함수 + 분산 constraint/guard substrate뿐. "resolution을 거버넌스하는 런타임 계층"은 순신규 그린필드. 하드코딩 authz 233개소가 Static Lint 실 대상.

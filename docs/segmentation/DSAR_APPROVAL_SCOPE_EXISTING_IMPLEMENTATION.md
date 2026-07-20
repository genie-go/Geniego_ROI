# DSAR — Scope 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-4 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독(백엔드 PHP 전역·102 핸들러) · 2 Explore 스레드 + 핵심 인용 firsthand 재검증. 모든 발견 `파일:라인`. **반날조: 없는 것을 있다고, 있는 것을 없다고 하지 않음. ★실재 과신(scope 있으니 완성)·부재 과장(거버넌스 없으니 scope 없음) 양방향 회피.**
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행(재사용)**: Part 3-3 [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · Part 2 Permission Engine ground-truth

---

## 0. 총평

**Scope enforcement substrate는 실재(PARTIAL/PRESENT)하나 저강도·차원 편중.** data_scope 9차원 중 **실제 SQL 행필터로 강제되는 것은 4차원(channel/product/brand/warehouse)·전 102핸들러 중 4개소뿐**. tenant 격리·api_key scope·amount(₩5M)·environment(demo/prod)는 강하게 실재. time/device/network/client/session(만료 외)/position/BU/field/row/dataset scope는 **ABSENT**. **scope 거버넌스 계층(Version/Projection 영속/Drift/Snapshot/Registry/Simulation/Evidence)은 완전 부재(순신규)** — effectiveScope는 라이브 재계산(version 무관).

---

## 1. data_scope — 핵심 scope substrate (PARTIAL · 저강도 소비)

- **9차원 정의**: `DATA_SCOPES=['company','brand','team','campaign','product','channel','warehouse','partner','own']`(`TeamPermissions.php:41`·firsthand·기본 'own' `:342`). 스키마 `data_scope(tenant_id,subject_type,subject_id,scope_type,scope_values,updated_at)`(`:160-166`)·**UNIQUE(tenant,subject_type,subject_id)=subject당 scope_type 1개만**(다차원 동시부여 불가·구조적 제약).
- **effectiveScope fail-closed**(`:236-265`·firsthand): owner/admin=null(무제한 `:246`)·비owner+무tenant=DENY_SCOPE(`:251`)·예외=DENY_SCOPE(`:260-263`·은행급)·company=null(`:258`)·미설정=null(fail-open 예외조항 `:255-256`). replaceScope DELETE→INSERT 전량교체(`:337-346`·version 소실).
- **차원별 SQL 강제 헬퍼**: `scopeSql`(`:286-293`)·`scopeSqlNamed`(`:299-307`)·`scopeChannelProduct`(`:315-322`)·`scopeValuesFor`(`:272-280`).
- **★실 소비 핸들러 = 4개(102 핸들러 중)**: `Catalog.php:1001-1003`(channel/product/brand)·`OrderHub.php:261`(scopeChannelProduct channel/sku·firsthand)·`Wms.php:1291`(scopeSql warehouse/wh_id)·`AdPerformance.php:26,62,64,90,92,115,117,134`(applyAbacScope).
- **★9차원 중 SQL WHERE 강제=4차원뿐**(channel/product/brand/warehouse). **company/team/campaign/partner/own 5차원=정의·시드(`ORG_PRESET:706-722`)·effectiveForUser 응답에만 등장·scopeSql 호출 인자 grep 0**=저장/조회는 되나 행필터 강제 경로 없음("미완성 차원").

## 2. Tenant scope 격리 (PRESENT · 강함)

- X-Tenant-Id 헤더 신뢰 배제·인증 user 행 tenant_id 사용(`UserAuth.php:399`·188차)·authedTenant(`:401-429`). index.php 미들웨어 무조건 주입(`index.php:609-619`·`:619` X-Tenant-Id 키의 tenant로 덮어씀·188차 P0). platform_growth act-as(admin 한정·타값 불허 `:417-420`·288차). strict 무-테넌트 거부는 `GENIE_STRICT_AUTH=1` 옵션(`index.php:604-606`·기본 OFF). Keys.php auth_tenant만 신뢰(`Keys.php:25-32`).

## 3. api_key scope (PRESENT · data_scope와 별개 축)

- 역할별 상한 화이트리스트 `defaultScopes`(`Keys.php:189-195`)·`allowedScopesForRole`(`:201-210`). 게이트웨이 검증 `index.php:573-598`(admin:keys `:583-586`·write:* / write:ingest / analyst `:587-597`). ★RBAC scope(동작권한)와 data_scope(행필터)는 **별개 축·교집합 로직 grep 0**.

## 4. Amount scope (PRESENT · 단일 임계치)

- `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1036`·firsthand)·evaluatePolicy(`:1104-1148`·$price>=임계→high_value)·서버측 강제 requiresHighValueApproval(`:1159-1169`·실행 `:395,597,860`·289차 클라 우회 봉인). ★단일 정적 임계치 하나뿐·역할/팀/테넌트별 차등·다중통화·다단계 approver 부재(grep 0).

## 5. Environment scope (PRESENT · demo/production 2값)

- `envLabel`(`Db.php:56-61`·firsthand·DB명 '_demo' 접미=demo·그외 production). guardTeamWrite 데모 전면우회(`UserAuth.php:1173`·`Db::envLabel()==='demo'`→null). env()/envLabel() 이원화 경고(`MediaHost.php:58-60`). ★demo/production 2값뿐·staging/QA/DR scope 부재.

## 6. Resource scope (PARTIAL · 메뉴 단위만)

- acl_permission menu×action(`TeamPermissions.php:39` ACTIONS 8종·`:55-82` MENU_CATALOG 26·`:152-159` 스키마). ★**field/row/column scope 부재**(field_scope|row_level|column_mask grep 0). Dataset/Document/API를 단위로 하는 별도 scope 부재(menu_key가 근접이나 리소스타입 분류 아님).

## 7. Time/Device/Network/Client/Session scope (대부분 ABSENT)

- **Time**: 접근제어용 부재(grep 0·`Attribution.php:444` time_window=마케팅 어트리뷰션 FP·배제).
- **Device**: 부재(grep 0·device_id/trusted_device 0).
- **Network/IP**: 부재(grep 0·CORS Origin은 브라우저 검사지 IP 접근제어 아님).
- **Client**: 부재(grep 0·api_key role scope와 다른 개념).
- **Session**: 만료(expires_at)만 PRESENT(`UserAuth.php:609-611`)·ip/ua는 관측/포렌식 기록만(`:4243-4268`)·**변경 시 세션무효/재인증 차단 로직 grep 0**.

## 8. Organization/Project/Position/BusinessUnit scope (PARTIAL · 조직=팀프리셋만)

- **Organization**: TEAM_TYPES(`TeamPermissions.php:44-49` 17종·자유문자열)·ORG_PRESET 시드(`:706-722`). ★team 테이블 평면(`:145-151`·parent_team_id 없음·계층 강제 없음).
- **Project**: PM 모듈(`PM/Projects.php:30-143`·pm_projects·tenant 격리만)·`PM/Enterprise.php` portfolio. ★**PM은 data_scope 미연동**(`PM/Shared.php:59-89` gate=role rank만·data_scope/effectiveScope 호출 grep 0)=프로젝트 단위 scope 제한 부재.
- **Position/BusinessUnit**: 부재(grep 0·`business_unit_id`=Trustpilot 외부 API 필드 FP·배제).

## 9. Scope 거버넌스 계층 (ABSENT · 완전 부재)

- version/projection 영속/digest/snapshot/drift/registry/simulation **grep 0 전항목**. reconciliation 매치=PgSettlement/ROAS(금융/데이터 정합·scope 무관). effectiveScope 라이브 재계산(`TeamPermissions.php:236-265`·매 요청 SELECT·캐시/버전/스냅샷 diff 없음). replaceScope DELETE→INSERT(이력 소실·`auth_audit_log`에 "menus=N개" 카운트만·diff 미기록). evidence chain(승인→검토→발급) 부재·근접=`auth_audit_log`(범용·`teamAudit` `:684-700`).

## 10. Substrate ↔ Governance 경계 요약 (판정)

| 계층 | 상태 | 근거 |
|---|---|---|
| data_scope 정의·fail-closed 판정 | **PARTIAL/PRESENT** | `TeamPermissions.php:41,160-166,236-265` |
| data_scope SQL 강제(4/9차원·4/102핸들러) | **PARTIAL(저강도)** | `Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134` |
| tenant 격리 | **PRESENT(강)** | `UserAuth.php:399,401-429`·`index.php:609-619` |
| api_key scope | **PRESENT** | `Keys.php:189-210`·`index.php:573-598` |
| amount(₩5M 단일임계) | **PRESENT** | `Catalog.php:1036,1104-1148,1159-1169` |
| environment(demo/prod) | **PRESENT(2값)** | `Db.php:56-61`·`UserAuth.php:1173` |
| resource(menu×action) | **PARTIAL(메뉴만)** | `TeamPermissions.php:39,55-82,152-159` |
| field/row/dataset/document | **ABSENT** | grep 0 |
| time/device/network/client | **ABSENT** | grep 0(FP 배제) |
| session(만료 외) | **ABSENT**(만료만 PRESENT) | `UserAuth.php:4243-4268`(기록만) |
| organization(팀 프리셋·평면) | **PARTIAL** | `TeamPermissions.php:44-49,706-722,145-151` |
| project(PM·scope 미연동) | **PARTIAL(별개체계)** | `PM/Shared.php:59-89` |
| position/business unit | **ABSENT** | grep 0(FP 배제) |
| **scope 거버넌스(version/drift/snapshot/registry/sim/evidence)** | **ABSENT(완전 순신규)** | grep 0·`TeamPermissions.php:236-265`(라이브 재계산) |

★실 엔진="scope enforcement 위에 governance 계층 순신규 구축 + 4/9차원 편중·5 미완성 차원 정합 + effectiveScope/data_scope/acl_permission를 SSOT로 확장". 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 RP-002. 이번 차수 코드 0.

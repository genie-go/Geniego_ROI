# DSAR — Scope 중복 구현 감사 (EPIC 06-A-03-02-03-04 Part 3-4 · ⓑ GROUND_TRUTH)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **원칙**: 동일 목적 구현이 있으면 중복 Scope Registry/Resolver 신설 금지 — Canonical Scope Registry+Adapter로 통합(Golden Rule).
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md)

---

## 0. 총평

Scope 개념이 **통합 Registry 없이 최소 7곳에 독립 정의·저장·강제**됨. 특히 `warehouse`는 **data_scope 차원과 wms_permissions.warehouses 두 테이블·두 강제경로로 이중 구현**. 신규 Canonical Scope Registry는 이 산재를 중개·정합하되, 부수 발견 실결함(manager scope 위임상한 미구현)을 별도 fix 트랙으로 등재.

## 1. 확인된 중복/병렬/산재

### D-1. ★Scope 개념 7곳 산재 (통합 Registry 부재 — 최우선)
| # | 위치 | file:line | 성격 |
|---|---|---|---|
| 1 | data_scope 9차원 | `TeamPermissions.php:41,160-166` | 사용자/팀 데이터 접근범위(단 4차원만 실강제) |
| 2 | tenant_id 전역격리 | `index.php:614-619`·`UserAuth.php:220-236` | 최광의 파티션 scope |
| 3 | api_key.scopes_json | `UserAuth.php:4305-4311`·`Keys.php:191,204`·`Db.php:949` | read:*/write:*/write:ingest/admin:keys — 별개 문자열 네임스페이스 |
| 4 | high_value ₩5M 승인 | `Catalog.php:857,1104-1169` | 금액 임계 scope(카탈로그 국한) |
| 5 | wms_permissions.warehouses | `Wms.php:72-75,557-590` | WMS 창고 화이트리스트 |
| 6 | menu_key(acl_permission) | `TeamPermissions.php:52-82,152-159` | 메뉴×동작 기능 scope |
| 7 | menu_tree.parent_id | `AdminMenu.php:107-117` | UI 메뉴 위계(scope 아니나 "위계" 명칭 공유·혼동) |

→ 서로 다른 테이블·값체계(9종 enum vs read:* 문자열 vs 창고ID JSON vs menu_key)·강제경로(scopeSql vs guardWarehouse vs index.php RBAC vs guardTeamWrite)로 **완전 독립 구현**. 통합 ScopeRegistry grep 0.

### D-2. ★warehouse 이중 구현 (동일 개념·두 테이블·두 경로)
- data_scope `warehouse` 차원(`scopeSql($req,'warehouse','wh_id')`·`Wms.php:1291`) **vs** `wms_permissions.warehouses` 독자 조회(`guardWarehouse` `Wms.php:557-590`·`:575-584`). 같은 "창고 접근 판정"을 2개 코드경로로 수행 → 유지보수 시 한쪽만 갱신하면 불일치. Canonical Scope Registry 통합 대상.

### D-3. api_key defaultScopes 2곳 중복 정의
- `UserAuth.php:4305-4311`(apiKeyDefaultScopes)·`Keys.php:191`(동일 값). 현재 drift 없으나 구조적 2곳 유지보수. 통합 대상.

### D-4. company/owner = 사실상 wildcard·환경 오분류 방지
- data_scope `company`=null 무제한(`TeamPermissions.php:258,372`)·기호 `*` 없으나 기능적 wildcard. api_key `write:*`(`UserAuth.php:4307`·강제 `index.php:589`)=명시 wildcard.
- ★**envLabel(environment)은 scope 아님(정직 배제)**: `Db.php:56`은 배포환경 라벨(demo/production)이지 데이터 접근범위 아님. 스펙 §20 Environment Scope의 근접 substrate이나 "데이터 scope 차원"으로 분류하면 오분류.

### D-5. ★부수 발견 — 실 결함 1건 (설계 코드0·수정 아님·후속 fix 세션 후보)
- **manager scope 위임상한 미구현(권한상승)**: `putMemberPermissions`(`TeamPermissions.php:615-661`)이 menus는 `assignableMap` 상한으로 clamp(`:627-646`·DELEGATION_EXCEEDED)하나, **scope는 요청 body를 manager 본인 범위와 비교 없이 `replaceScope` 직접 기록**(`:649,653`). 주석(`:648` "manager가 본인 범위보다 넓은 scope_type 부여 금지")의 약속이 **코드 미구현** → manager가 팀원에 `company`(무제한 scope) 부여 가능 = **위임 통한 scope 확대 권한상승**(스펙 §29 Scope Expansion Guard 정면 대상). firsthand 확인. **이번 차수 수정 안 함**(설계·별도 fix 세션 배포승인 필요).
- (설계 리스크) `ORG_PRESET` 재무팀 프리셋 `scope='company'`(전사 무제한·`TeamPermissions.php:706-722`)·`seedOrg` idempotent 실행 시 재무팀 전원 즉시 회사 전체 무제한(승인 절차 없음). 신규 거버넌스에서 seed 시 승인 Hook 필요.

## 2. 중복이 **아닌** 것 (정직 판정·오탐 예방)

- data_scope vs api_key scope vs menu_key = 의도적 별개 축(행필터/프로그래매틱/기능). 통합 Registry는 축을 Scope Type으로 보존.
- tenant_id는 파티션 키(최상위 격리)·scope 통합 시 최광의 Scope Type으로 흡수.
- envLabel=배포환경(scope 아님·D-4).
- menu_tree.parent_id=UI 위계(scope 아님·명칭만 유사).
- reconciliation 매치(PgSettlement/ROAS/BillingMethod/Wms stock/KrChannel)=금융/재고 정합(scope 무관).

## 3. 통합 결정 (조립 계획)

- **금지**: 신규 Scope Registry/Resolver 병렬 신설하면서 7곳 산재 방치·warehouse 이중구현 존치·envLabel/menu_tree를 데이터 scope로 오흡수.
- **채택**: Canonical Scope Registry가 (a) 7곳 산재를 Scope Type 축으로 통합(data_scope 9차원=정본 SSOT 후보·effectiveScope 확장), (b) warehouse 이중구현 단일화(scopeSql↔guardWarehouse), (c) api_key defaultScopes 2곳 통합, (d) 5 미완성 차원(company/team/campaign/partner/own) 정합, (e) manager scope 위임상한을 Scope Expansion Guard로 실구현(D-5), (f) seed 시 승인 Hook. version/projection/drift/snapshot은 순신규.
- **실 구현**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0). ★D-5 실결함은 별도 fix 세션(배포 승인).

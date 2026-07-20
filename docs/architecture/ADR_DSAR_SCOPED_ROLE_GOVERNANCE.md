# ADR — Scoped Role Governance (EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Permission Engine + Role Registry/Hierarchy/Assignment + Decision Core 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-20)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-4 — Scoped Role Governance (사용자 제공 verbatim · [`docs/spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md))
- **선행 블록**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)(Part 3-3) · [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)(Part 3-2) · [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)(Part 3-1) · [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)(Part 2)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n286_value_sync_audit]] · [[reference_platform_growth_actas_tenant_hijack]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-4 — Scoped Role Governance**. Part 3-3(Role Assignment) 위에서, "같은 Role이라도 Scope가 다르면 서로 다른 권한"을 **Canonical·Versioned·Tenant-isolated·Scope-aware Engine**으로 정형화한다(Who×What×Where×Resource×Org×Time×Device×Client×Network×Session 함께 계산). Part 3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution이 재사용할 Scope Resolution Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0).

★**능력 기반 전수조사(ⓑ·GROUND_TRUTH·2 Explore 스레드+firsthand)** 핵심 결론 — **Part 3-3과 유사하게 PARTIAL/PRESENT substrate + ABSENT governance**:

- **★Scope enforcement substrate 실재(PARTIAL/PRESENT)이나 저강도·차원 편중**: data_scope 9차원(`TeamPermissions.php:41`) 중 **실제 SQL 행필터 강제=4차원(channel/product/brand/warehouse)·전 102핸들러 중 4개소**(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134`). 5차원(company/team/campaign/partner/own)=정의만·소비자 0. effectiveScope fail-closed(`:236-265`·DENY_SCOPE).
- **★강하게 실재하는 scope 축**: tenant 격리(`index.php:614-619`·`UserAuth.php:399,423-428`·188차)·api_key scope(`Keys.php:189-210`·별개 축)·amount 단일임계 ₩5M(`Catalog.php:1036,1104-1169`)·environment demo/production(`Db.php:56-61`·단 배포라벨이지 데이터 scope 아님·D-4).
- **★ABSENT 차원(순신규)**: field/row/dataset/document scope·time/device/network/client scope·session(만료 외)·position/business unit·project 단위 scope(PM은 data_scope 미연동·`PM/Shared.php:59-89` role rank만). resource=메뉴 단위만(acl_permission).
- **★scope 거버넌스 계층 완전 부재(ABSENT)**: Version/Projection 영속/Drift/Revalidation/Reconciliation/Simulation/Snapshot/Digest/Evidence/전용 Registry/Cache/Static Lint = grep 0. effectiveScope는 라이브 재계산(version 무관)·replaceScope DELETE→INSERT(이력 소실).
- **★scope 개념 7곳 산재(통합 Registry 부재)**: data_scope·tenant_id·api_key.scopes_json·high_value·wms_permissions.warehouses·menu_key·menu_tree.parent_id. ★warehouse **이중 구현**(data_scope 차원↔wms_permissions 두 경로).

## 2. 결정 (Decision)

### D-1. Canonical Scope Registry를 **신설**하되 7곳 산재 substrate를 통합·확장(Golden Rule — "발명 아니라 조립+통합"). 중복 Scope Registry/Resolver 신설 금지.

| 실존 | 분류 태그 | 확장 결정 |
|---|---|---|
| **data_scope 9차원+effectiveScope** | **CANONICAL_SCOPE_SSOT(확장·정본후보)** | Scope Registry/Type/Value/Resolution의 정본. 4/9 실강제→9 정합·version/projection 상위 신설. |
| **tenant_id 격리** | **TENANT_SCOPE_TYPE(흡수)** | 최광의 Scope Type. 위조차단(index.php:619) 보존. |
| **api_key scope** | **PROGRAMMATIC_SCOPE(별개 축·통합)** | 동작권한 축. data_scope와 교집합 정합. defaultScopes 2곳 통합. |
| **high_value ₩5M** | **AMOUNT_SCOPE(확장)** | Amount Scope Type substrate. 역할/테넌트별 차등·다단계 approver 신설. |
| **wms_permissions.warehouses** | **CONSOLIDATION_REQUIRED(warehouse 이중구현 단일화)** | data_scope warehouse 차원과 통합(scopeSql↔guardWarehouse). |
| **acl_permission menu_key** | **RESOURCE_SCOPE(메뉴 단위·확장)** | field/row/dataset scope 신설의 substrate. |
| **envLabel** | **NOT_SCOPE(배제)** | 배포환경 라벨이지 데이터 scope 아님. Environment Scope Type은 근접이나 오분류 금지. |
| **menu_tree.parent_id** | **NOT_SCOPE(배제)** | UI 위계. Scope Hierarchy로 오흡수 금지. |

### D-2. Default Intersection · Scope 자동확대 금지 (§9·§29·구현 시 강제)

Scope Policy 기본=Intersection(§9). 상위 scope가 하위를 덮어쓰지 않게·조직 위계를 scope 자동확장으로 변환 금지(§14·§29). ★현행 `company`=사실상 wildcard(`TeamPermissions.php:258`)·미설정=무제한(fail-open 예외조항 `:255-256`)이 자동확대 위험 지점.

### D-3. Scope Hierarchy ≠ Organization Hierarchy (§13·정직 판정)

data_scope 9차원=FLAT(부모-자식 없음·`company`만 특례)·team 테이블 평면(parent_team_id 없음·`:145-151`). menu_tree parent_id(메뉴)·parent_user_id(계정)는 scope 아님. Scope Hierarchy는 순신규(조직 위계와 물리 분리 유지).

### D-4. Effective Scope Engine = version 기준 승격 (§27·§10)

effectiveScope substrate(라이브·data_scope만)를 Assignment/Permission/Session/Runtime/Context 통합 + version 기준 Effective Scope로 승격. Projection(Effective Tenant/Org/Project/Resource/Dataset/API·§11) 영속·Snapshot/Digest 신설.

### D-5. 구현 판정 = PARTIAL/PRESENT-substrate/ABSENT-governance/BLOCKED_PREREQUISITE

- Scope enforcement substrate(data_scope 4차원·tenant·api_key·amount·environment) 실재이나 governance(Registry/Version/Projection 영속/Drift/Revalidation/Reconciliation/Simulation/Snapshot/Effective Scope Engine)=순신규.
- 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core가 아직 설계(코드 0)라 Scope↔Assignment/Permission version 결합은 **BLOCKED_PREREQUISITE**.
- 실 엔진="7곳 산재 scope를 Canonical Scope Registry로 통합 + 4/9 차원 정합 + governance 신설" 조립. 이번 차수=설계 명세(코드 0).

### D-6. 규율

Golden Rule(Extend·중복 Scope Registry/Resolver 신설 금지·7곳 산재 통합·warehouse 이중구현 단일화·envLabel/menu_tree Scope 오흡수 금지) · 무후퇴 · Default Intersection · Scope 자동확대 금지 · Tenant Isolation 무력화 금지 · 부재 날조·실재 과신 양방향 금지 · 289차 P1~P4 재플래그 금지.

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-5+ 재사용)

- **Scope Registry/Definition/Version/Type/Value/Mapping**: data_scope 9차원을 Scope Type/Value substrate로, 7곳 산재를 Scope Type 축으로 정규화. Immutable Version(Initial~Migration).
- **Scope Resolution/Projection/Effective Scope Engine**: effectiveScope를 version 기준 Effective Scope로 승격·Projection 영속·Assignment/Session/Runtime/Context 통합.
- **Scope Constraint/Expansion Guard/Reduction**: manager 위임상한 실구현(§29·D-5 실결함 해소)·Intersection 기본·High/Critical Expansion 차단.
- **Snapshot/Evidence/Digest/Drift/Revalidation/Reconciliation/Simulation**: 순신규. SecurityAudit tamper-evident 체인 승격.
- **Adapter(Part 3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution)**: Scope Resolution Contract·Affected Reference·Dynamic Scope Rule Reference만 제공.
- **경계 보존**: envLabel(환경)·menu_tree(UI 위계)·PM project(별개 체계)는 Canonical Scope Type으로 흡수하되 오분류 금지.

## 4. 대안 (Considered)

- **A. 지금 Scope Engine(Registry·Version·Projection·Effective) 구현** — 기각. 선행 Permission Engine·Role Assignment·Decision Core 실 구현 부재·RP-002 위반·중복 엔진 리스크.
- **B. envLabel/menu_tree를 Scope로 재사용** — 기각. 배포라벨·UI 위계는 데이터 scope 아님(오분류).
- **C. 7곳 산재 그대로 두고 governance만 얹기** — 기각. 통합 Registry 없이 얹으면 우회 잔존(warehouse 이중구현 등). 단일 Registry 중개가 정답.
- **D. 설계 명세만(코드 0)+실존 substrate 통합계획+Gap+실결함 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 2/3-1/3-2/3-3 동형.

## 5. 귀결 (Consequences)

- (+) 7곳 산재 scope substrate·warehouse 이중구현·company/write:* wildcard의 통합/정합 계획 확정("발명 아니라 조립+통합").
- (+) scope 거버넌스 계층 순신규·4/9 차원 편중·5 미완성 차원을 grep 0으로 실증 → 투기성 스키마 방지.
- (+) 정직 판정(enforcement PARTIAL·governance ABSENT·envLabel≠scope·Scope Hierarchy≠Org Hierarchy·PM 미연동) — 실재 과신·부재 과장 양방향 회피.
- (+) Part 3-5+ Dynamic/Service/Effective가 재사용할 Scope Resolution Contract 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-5 Dynamic Role Governance**(스펙 권장순서 §49).
- (★부수) 설계 전수조사 중 발견한 **실 결함 1건**(설계 코드 0·수정 아님·후속 fix 세션 후보): **manager scope 위임상한 미구현**(`putMemberPermissions` menus는 clamp하나 scope는 무검증·`TeamPermissions.php:648-653`·manager가 팀원에 `company` 무제한 scope 부여 가능=위임 통한 scope 확대 권한상승·스펙 §29 대상). 상세=[`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md) §D-5.

## 6. 규율 준수

Golden Rule · 무후퇴 · "결론의 근거도 재실증"(data_scope 4/9 강제·effectiveScope·tenant·amount·environment·7곳 산재·거버넌스 부재 전부 grep/코드 정독·firsthand 재검증) · Default Intersection · Scope≠Org Hierarchy · envLabel≠Scope · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · 부재 날조·실재 과신 양방향 금지 · 289차 P1~P4 재플래그 금지 · GROUND_TRUTH 외 인용 금지.

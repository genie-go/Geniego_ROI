# DSAR — Organization Hierarchy Critical Gap 후보 (§57)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §57 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `organization_unit`·`org_unit` | `git log --all -S` **0**(스펙 커밋 제외) · 현 `backend/src` `hierarch` grep **0** | `ABSENT` — 삭제된 조직 코드 0 = 팬텀도 유물도 아니다 |
| Organization Registry | `TeamPermissions::ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) · `seedOrg`(`:725-753`) 실배선(`routes.php:1589`·`:2570`·`teamApi.js:261`) — 단 `team` DDL(`:145-151`)에 **`parent_team_id` 없음** | `PARTIAL` — **구조가 아니라 열거** |
| Tenant Hierarchy | `parent_tenant`/`sub_tenant`/`tenant_tree`/`tenant_hierarchy` backend+frontend 전역 grep **0** · 테넌트 마스터 테이블 자체 부재(`api_key.tenant_id` FK 없음 `Db.php:944`) | `ABSENT`(이름·능력 양쪽) |
| Legal Entity | `biz_no`/`brn`/`corp_reg`/`tax_id` **0건** · 사업자정보 = `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| Hierarchy Version / Snapshot | 엔티티 `version` = `menu_defaults.version` **단 1건**(`AdminMenu.php:120`) · optimistic lock `version` grep **0** | `ABSENT` |
| Path Index | Closure Table·Nested Set(`lft`/`rgt`)·Materialized Path **컬럼** 전부 grep **0** | `ABSENT` |
| Cycle 방어 선례 | `PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) 반복 DFS+visited+tenant 필터+깊이 10000+**쓰기 전 차단**(`:32-34` 422 `cycle_detected`) | `LEGACY_ADAPTER`(PM 도메인 · 조직 커버 아님) |
| HRIS / ERP Source | `hris`/`workday`/`payroll` **0** · `ChannelRegistry.php:12`,`:79` `group_type` 열거에 **`erp`·`hr` 값 없음** | `ABSENT`(능력축 증명) |
| Matrix Relationship | `matrix_` grep **0** | `ABSENT` |
| Cross-Tenant Edge 인접 자산 | `agency_client_link`(`AgencyPortal.php:64-72`) — **이분(bipartite)·N:M·1홉 전용·동의 기반 접근 허가** | `KEEP_SEPARATE_WITH_REASON` — 조직↔조직 엣지 아님 |

### 🔴 **"판정이 전부 `NOT_APPLICABLE`/`ABSENT` = 갭 0 = 양호"로 읽지 마라 — 최중요 경고**

본 문서의 25개 Critical Gap 후보는 **거의 전건이 `NOT_APPLICABLE`(부재 → 신설) 로 판정된다.** 이것은 **양호가 아니다.**

- **판정 대상 개념 자체가 부재**하기 때문에 위반이 성립할 무대가 없을 뿐이다. "Cross-Tenant Organization Edge 없음"은 **조직 엣지가 애초에 0개**라서 참이지, 방어가 작동해서 참인 것이 아니다.
- 🔴 **조직 도메인을 신설하는 순간 25건 전부가 즉시 활성 갭으로 전환된다.** 갭이 닫혀 있는 것이 아니라 **아직 열리지 않았을 뿐**이다.
- 🔴 **이 표를 "리스크 0" 근거로 인용 금지.** 정확한 의미 = **"방어 자산 0 · 구현 착수 시 25건 전량이 Day-1 요구"**.
- ★대칭 오류 금지: `agency_client_link`·`app_user.parent_user_id`·`ORG_PRESET` 같은 **형태 유사 자산을 커버로 계산하면 갭이 정의상 소멸하는 역산**이다.

## 1. 원문 전사 + 판정 — **원문 25종**

원문(§57) 전제: *"다음은 High 또는 Critical로 처리하라."* → 아래 25종은 **전건 High/Critical 등급 고정**이며, 등급 하향은 원문 위반이다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Cross-Tenant Organization Edge | 조직 엣지 0. 인접 = `agency_client_link` 이분·1홉(`AgencyPortal.php:64-72`) — 조직↔조직 아님 | `NOT_APPLICABLE`(신설 시 즉시 활성) |
| 2 | Cross-Tenant Membership | Membership 개념 부재. `app_user.tenant_id`(`UserAuth.php:166`)는 단일 값 | `NOT_APPLICABLE` |
| 3 | 다른 Tenant Workspace Binding | Workspace 엔티티 grep 0 | `NOT_APPLICABLE` |
| 4 | Cycle이 있는 Administrative Hierarchy | Administrative Hierarchy 부재. 순환 방어 선례는 PM/menu 도메인에만 | `NOT_APPLICABLE` |
| 5 | Cycle이 있는 Legal Entity Hierarchy | Legal Entity 부재 | `NOT_APPLICABLE` |
| 6 | Active Period에 여러 Primary Parent | Primary Parent 개념 부재 · `app_user.parent_user_id`(`UserAuth.php:156-167`)는 **nullable 단일 컬럼**(다중 부모 표현 불가) | `NOT_APPLICABLE` |
| 7 | Active Period에 여러 Primary Legal Entity | Legal Entity 부재 | `NOT_APPLICABLE` |
| 8 | Financial Organization에 Legal Entity 없음 | 양쪽 부재. `cost_center`/`profit_center` grep 0 | `NOT_APPLICABLE` |
| 9 | Settlement Organization에 Accounting Entity 없음 | 양쪽 부재. `pnl_vat_summary` tenant 키(`Pnl.php:402-423`)는 **법인 회계가 아니라 구독자별 리포트** | `NOT_APPLICABLE` |
| 10 | Payout Organization에 Payout Entity 없음 | 양쪽 부재 | `NOT_APPLICABLE` |
| 11 | 종료된 Organization에 신규 Membership | Organization·Membership·종료 상태 3자 부재 | `NOT_APPLICABLE` |
| 12 | 종료된 Organization에 신규 Role Assignment | 조직 부재. 역할축은 `team_role`(owner>manager>member `TeamPermissions.php:17`) — 조직 미결합 | `NOT_APPLICABLE` |
| 13 | 종료된 Organization에 신규 Approval Workflow Binding | 조직 부재 · 승인 워크플로 노드 자체가 5-3-2 에서 전건 부재 확정 | `NOT_APPLICABLE` |
| 14 | Approval 시점 Hierarchy Snapshot 없음 | Snapshot 선례 = `menu_defaults`(`AdminMenu.php:120`)·`pm_baseline`(`PM\Enterprise.php:55`) — **조직 도메인 0** | `NOT_APPLICABLE` |
| 15 | Hierarchy Version 없는 Approval Resolution | Hierarchy Version 부재 | `NOT_APPLICABLE` |
| 16 | 다른 Legal Entity 경계를 일반 Parent Edge로 은폐 | Legal Entity·타입드 조직 엣지 양쪽 부재 | `NOT_APPLICABLE` |
| 17 | 과거 Hierarchy Version 덮어쓰기 | 버전 부재 · ★관찰: `menu_defaults` 는 **최신 1건만 조회**(`:584-590`), `kr_fee_rule` 읽기는 전부 `ORDER BY effective_from DESC LIMIT 1`(`Pnl.php:454`) = **레포 관례가 "최신승 덮어쓰기"** | `NOT_APPLICABLE`(단 관례 자체가 위험 방향) |
| 18 | Retroactive Change에 Evidence 없음 | Retroactive 재계산 수단 부재 · ★`ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다**(§62 Evidence 도 미존재) | `NOT_APPLICABLE` |
| 19 | Organization Graph Cycle로 승인 경로 무한 반복 | 조직 그래프 부재 · ⚠️ `graph_node`/`graph_edge`(`Db.php:816-839`)는 **순환 방어 없음** + `GraphScore::scoreInfluencer:187-240` **하드코딩 3-hop** — 조직에 그대로 답습하면 이 갭이 실현된다 | `NOT_APPLICABLE`(설계 경고 동반) |
| 20 | Path Index와 Node·Edge 불일치 | Path Index 부재(Closure/Nested Set/Path 컬럼 grep 0) | `NOT_APPLICABLE` |
| 21 | HRIS에서 삭제된 조직에 Active Approver 존재 | HRIS 커넥터 부재(`ChannelRegistry` `group_type` 열거에 `hr` 값 없음) · ★단 **`EnterpriseAuth` SCIM 2.0 Users CRUD 는 REAL**(`routes.php:915-932`+`$register :2383-2400`) — **SCIM Groups 는 GET 전용**(`EnterpriseAuth.php:417-423`)이라 IdP→내부 인입 경로 없음 | `NOT_APPLICABLE`(인입 경로 신설 시 즉시 활성) |
| 22 | Future-dated 변경 활성화 실패 | Future-dated 개념 부재 · ★**`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건**(유일 effective date = `kr_fee_rule.effective_from` `Db.php:898`) · `effective_to` 컬럼 grep 0 | `NOT_APPLICABLE` |
| 23 | Matrix Relationship을 Primary Hierarchy로 오해 | Matrix 부재 · ⚠️**오해 소재는 실재**: `crm_customers.identity_id`(`CRM.php:109`)는 **union-find 등가류**(대칭·추이적)이지 계층(반대칭 부분순서)이 아니다 | `NOT_APPLICABLE`(오해 경고 동반) |
| 24 | Approval Routing Eligible Path 없음 | 경로 개념·승인 라우팅 양쪽 부재 | `NOT_APPLICABLE` |
| 25 | Organization Source of Truth 불명확 | ★**현재 상태가 정확히 이것이다**: 조직 유사 자산이 `ORG_PRESET`(열거)·`app_user.parent_user_id`(사용자 트리)·`team`(평면)·`data_scope`(평면 필터)·`partner_account`·`wms_suppliers` 로 **분산** · 어느 것도 SoT 선언 없음 | `PARTIAL` — **유일하게 "부재"가 아니라 "불명확"이 현행 사실** |

**실측 개수: 25 / 25 전사.** 커버리지 = `NOT_APPLICABLE` 24 · `PARTIAL` 1(#25). **`VALIDATED_LEGACY` 0 — 커버 0건.**

## 2. 규칙

- 🔴 **"전건 부재 = 양호" 금지.** §0 경고 재확인 — **판정 대상 개념이 없어서 위반이 성립하지 않을 뿐**이며, 조직 도메인 신설 시 25건이 **동시에 Day-1 요구로 활성**된다.
- 🔴 **원문 전제 준수**: 25종은 **High 또는 Critical 고정**. 신설 설계에서 등급을 낮추면 원문 위반이다.
- 🔴 **형태 유사 자산의 커버 계산 금지**(역산):
  - `app_user.parent_user_id` = **한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(`UserAuth.php:197`·`:214`). ★**전 생성 경로가 owner 직속 2단으로 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574`/`:1581`·`:670`) — **3단을 만드는 경로가 존재하지 않는다.** 보고선 아님.
  - `agency_client_link` = **동의 기반 접근 허가**(이분·N:M·1홉·순회 0). #1 근거로 쓰면 역산.
  - `DATA_SCOPES` 의 `'company'` = ★**무제한 센티넬**(`effectiveScope():258` `if ($st === 'company') return null;`) — **법인 경계를 긋는 게 아니라 지운다.** #8/#9 커버로 계산하면 의미가 정반대.
  - `crm_customers.identity_id` = **동일성 해소**이지 계층 아님(#23).
  - `Db::envLabel()` = 코드가 스스로 금지(`Db.php:51-54` *"게이트 로직(env())은 절대 이걸 쓰지 말 것"*) — 인가 결정 사용 0.
- 🔴 **#25(SoT 불명확) 은 "미래 리스크"가 아니라 현행 사실이다.** 신설 시 **첫 결정 = Organization SoT 단일 선언**. 분산 자산(`ORG_PRESET`/`team`/`app_user.parent_user_id`/`data_scope`/`partner_account`)을 **경합 SoT 로 남기면 #25 는 신설 후에도 미해결**.
- 🔴 **중복 조직 레지스트리 신설 금지.** `ORG_PRESET`+`seedOrg` 는 **실배선 자산**(`routes.php:1589`·`:2570`) — 폐기·병렬 신설이 아니라 **구조 링크(`parent_team_id` 등) 확장**이 정본 경로.
- 🔴 **IdP 커넥터 신설 금지**(#21). `EnterpriseAuth` = OIDC/SAML/SCIM **실 스택 REAL** → **확장 강제**. SCIM Groups GET 전용을 CRUD 로 확장하는 것이 정본이며, 두 번째 IdP 엔진은 헌법 위반.
- **#19 설계 경고 상속**: 조직 그래프는 `graph_node`/`graph_edge` 의 **순환 방어 부재**를 답습하지 마라. 정본 선례 = `PM/Dependencies::validateDependency`(**쓰기 전 차단** — 레포 최상급) + `PM/Gantt:104-125`(Kahn 위상정렬).
- **#18/#22 집행 수단 부재를 설계 전제로 명시하라**: `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002`) → 조직 스키마는 `ensureTables` 멱등 경로뿐이고, **`ensureTables` 는 백필을 하지 않는다.** Retroactive 재계산·Future 활성화는 **집행 수단부터 신설 대상**이다.

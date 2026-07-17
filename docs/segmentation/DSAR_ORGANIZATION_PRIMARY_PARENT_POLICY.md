# DSAR — Primary Parent 규칙 (§17)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §17 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★대전제 — Primary Parent 개념 자체가 성립한 적 없다

원문 §17 은 *"동일 Hierarchy Type과 유효기간에서 허용 수보다 많은 Primary Parent를 차단하라"* 를 요구한다. 이 규칙이 의미를 가지려면 **① 다중 부모가 표현 가능**하고 **② 그중 하나를 primary 로 지목**할 수 있어야 한다. 현행은 **둘 다 불가능**하다.

| 항목 | 실측 | 판정 |
|---|---|---|
| 레포 유일 부모 간선 | `app_user.parent_user_id` — 정의 `UserAuth.php:156-167`(주석 :156 *"하위(팀원) 계정의 상위 owner id. owner=NULL"*) · ALTER `:167` · ★**DDL nullable**(`NOT NULL 아님`) | `PARTIAL` |
| ★**2단 봉인** | **PM 전수 검증 완료 — 전 생성 경로가 owner 직속 2단**(아래 표) · **3단을 만드는 경로가 존재하지 않는다** | ★**Primary Parent 성립 불가** |
| 다중 부모 표현 | **단일 컬럼** → 한 사용자에 부모는 **최대 1개**. `matrix_` grep 0 · 엣지 테이블 없음 | `ABSENT` |
| primary 지목 | `is_primary`·`primary_parent` **grep 0** — 부모가 최대 1개이므로 **지목할 대상 집합이 없다** | `ABSENT` |
| 순회 | **단일 홉** — `resolveTenantId`(`UserAuth.php:200-217`)가 `$pid` 로 `LIMIT 1` **1회 조회 후 즉시 return** · **재귀 없음** | `PARTIAL` |
| 1홉 소비처 | `Rollup.php:56` · `ChannelSync.php:72` · `ChannelCreds.php:85` · `BillingMethod.php:88` · `AgencyPortal.php:478` · `PlanLimits.php:36-37`(plan 은 `parent_user_id IS NULL` owner 에서 읽음) | — |
| 용도 | ★**한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(`UserAuth.php:197`·`:214` 동일값 UPDATE) — **보고선 아님 · 테넌트 간 부모-자식 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 팀 부모 | `team` DDL(`TeamPermissions.php:145-151` MySQL / `:168` SQLite) — **`parent_team_id` 없음** | `ABSENT` |
| Hierarchy Type 축 | 부재([Type 문서](DSAR_ORGANIZATION_HIERARCHY_TYPE.md) 20종 커버 0) → **"동일 Hierarchy Type 에서"** 라는 술어의 좌변이 없다 | `ABSENT` |
| 유효기간 축 | `effective_to`\|`valid_to` **grep 0** · as-of 술어 **전역 0건** → **"유효기간에서"** 라는 술어의 우변도 없다 | `ABSENT` |

### ★2단 봉인 — 전 생성 경로 실측 (PM 전수 검증 완료)

| 경로 | parent 값 |
|---|---|
| `UserAuth.php:1226-1227`(팀원 추가) | manager 의 parent(=owner) 또는 `$ownerId`. 주석 `:1225` *"항상 최상위 owner 에 종속"* |
| `EnterpriseAuth.php:500`(**SSO/SCIM 프로비저닝**) | `(int)$owner['id']` — 테넌트 owner 조회 후 고정 |
| `UserAuth.php:1574/1581`(하위 관리자) | `$masterId` |
| `UserAuth.php:670`(owner 자신) | `null` |

→ ★**어떤 경로로도 3단이 생기지 않는다.** 트리의 최대 깊이가 **2로 봉인**되어 있으므로 **부모는 언제나 owner 1명**이고, **"여러 Parent"·"Secondary"·"Matrix"·"허용 수 초과 차단"이 전부 무의미**하다.

**★축 주의 — 유사물 오판 금지.**
- 🔴 **`sso_group_role_map` 을 다중 부모로 계산 금지.** `EnterpriseAuth.php:70`·`:72` `(tenant_id, group_name, role)` — **그룹이 엔티티가 아니라 평문 문자열**이다. 어설션 `groups` 수신(`:374`) → `roleForGroups:78-85` 가 `group_name IN (?)` **단순 룩업**(`:84`)으로 **롤 1개로 즉시 소모**. **부모-자식·중첩그룹·그룹ID 없음** — 한 사용자가 여러 그룹에 속하는 것은 **다중 부모가 아니라 다중 라벨**이다.
- 🔴 **`agency_client_link`(`AgencyPortal.php:64-72`) 를 다중 부모로 계산 금지.** N:M 이지만 ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님.
- 🔴 **`crm_customers.identity_id`(`CRM.php:109`) 를 부모 관계로 계산 금지.** **union-find 등가류**(`resolveIdentitiesForTenant:597-643` — `roots`/`sizes` 클러스터링). `roots` 라는 이름이 트리처럼 보이나 **등가관계(대칭·추이적)** 이며 계층(**반대칭 부분순서**)이 아니다. `crm_identity_merge_link(a_id,b_id)`(`:708-712`)의 `UNIQUE(tenant_id,a_id,b_id)` 도 **무방향 엣지**다.
- 🔴 **`team_role` 서열을 부모로 계산 금지.** owner>manager>member(`TeamPermissions.php:17`)는 **3단 고정 서열**이지 트리 간선이 아니다. 권한 "상속"도 **하향 클램프**(`:382-389`·`:396-402` `clampActions` — 팀 권한을 **상한**으로 멤버 권한 교집합 축소)이지 계층 전파가 아니다.
- 🔴 **`TeamPermissions.php:230` 주석의 "팀 스코프 상속"을 근거로 삼지 마라 — 상속이 아니라 폴백**이다(`:253-254` user 에 없으면 team **1회** 조회 · 단일 홉 · 비재귀 · 중첩 불가). **부모 팀 컬럼 자체가 없으므로 구조적 불가.** ★규율 §10 적중 지점.

## 1. 원문 전사 + 판정 — **원문 7종(기본 규칙) + 차단 규칙 1**

### 1-1. Hierarchy Type별 기본 규칙 — **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Administrative Hierarchy: Active Period에 Primary Parent 최대 1개 | ⚠️ **부모가 구조적으로 최대 1개**(`app_user.parent_user_id` 단일 컬럼)라 **숫자만 우연히 일치**. 🔴 그러나 ⓐ Administrative Hierarchy 축 부재 ⓑ **Active Period 축 부재**(`effective_to` grep 0 · as-of 술어 0건) ⓒ **2단 봉인**으로 부모=owner 고정 → **규칙이 강제된 게 아니라 표현력이 없는 것** | `KEEP_SEPARATE_WITH_REASON` |
| 2 | Legal Entity Hierarchy: Active Period에 Legal Parent 최대 1개 | **부재** — `legal_entity` **grep 0** · 사업자정보 = `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** | `ABSENT` |
| 3 | Functional Hierarchy: Primary Functional Parent 최대 1개, Secondary 허용 | **부재** — Secondary parent 표현 수단 없음(단일 컬럼) · `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)은 **평면 라벨** | `ABSENT` |
| 4 | Matrix Hierarchy: 여러 Parent 허용 | **부재** — `matrix_` **grep 0** · **다중 부모 구조적 불가** | `ABSENT` |
| 5 | Project Hierarchy: 여러 Sponsor Reference 허용 가능 | 부재(조직) · `sponsor` grep 무관 · 인접 = `pm_task_dependencies` **다중 선행 허용**(`UNIQUE(tenant,pred,succ,dep_type)` · migration `20260526_168_004:12-14`) — **작업 의존이지 조직 sponsor 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | Approval Hierarchy: Policy에 따라 여러 Parent 허용 가능 | **부재** — 승인 계층·승인 케이스 **grep 0**(5-3-2 확정) · 승인 = 핸들러 메서드(`Mapping::approve` `Mapping.php:238-294`) | `ABSENT` |
| 7 | Financial Hierarchy: Cost Center·Profit Center 규칙에 따라 분리 | **부재** — `cost_center`·`profit_center` **grep 0** | `ABSENT` |

### 1-2. 차단 규칙 — **원문 1종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 8 | 동일 Hierarchy Type과 유효기간에서 허용 수보다 많은 Primary Parent를 차단하라 | ★**술어의 양변이 모두 부재** — 좌변(Hierarchy Type) `ABSENT` · 우변(유효기간) `ABSENT`. 인접 **쓰기 전 차단** 선례 = `Dependencies::validateDependency`(`PM/Dependencies.php:32-34` → 422 `cycle_detected` · self-loop 차단 `:29-31`) — **차단 타이밍의 정본**이나 대상 도메인 상이 | `LEGACY_ADAPTER` |

**실측 개수: 8 / 8 전사**(기본 규칙 7 + 차단 규칙 1). 커버리지 = `VALIDATED_LEGACY` **0** · `LEGACY_ADAPTER` 1 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 5.

> 🔴 **커버 0.** ★**규칙 1 의 "최대 1개"가 현행과 숫자상 일치하는 것은 규칙이 지켜지고 있어서가 아니라, 여러 개를 표현할 수단이 없어서다.** 이를 `VALIDATED_LEGACY` 로 계산하면 **가장 정교한 형태의 역산**이다 — 표현력 부재를 제약 준수로 오독하는 것.

## 2. 규칙

- 🔴 **"Primary Parent 규칙이 이미 지켜지고 있다"고 쓰지 마라.** 현행 `app_user.parent_user_id` 는 **전 생성 경로가 owner 직속 2단으로 봉인**(PM 전수 검증 완료 — `UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670`)되어 **3단을 만드는 경로가 존재하지 않는다**. **Primary Parent 개념 자체가 성립한 적이 없다** — 규칙 준수가 아니라 **규칙의 대상이 없음**이다.
- 🔴 **`app_user.parent_user_id` 를 조직 계층으로 확장하지 마라.** 용도 = **한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(`UserAuth.php:197`·`:214`). **보고선 아님 · 테넌트 간 부모-자식 아님** → §21 Tenant Hierarchy 커버 **불가**. 이 컬럼에 3단을 허용하면 `resolveTenantId`(`:200-217`)의 **단일 홉 가정이 깨져 tenant 해석이 조용히 틀어진다** — 286차 `platform_growth` 전역 tenant 하이재킹과 동형의 사고 유형(요청 시점 tenant 해석 오류 → 전 메뉴 공백). **무후퇴 위반.**
- **다중 부모가 필요하면 컬럼이 아니라 엣지 테이블이 유일 경로다.** `graph_edge`(`Db.php:816-839` — `src_type`/`src_id`→`dst_type`/`dst_id` · `edge_weight` · `edge_label` · **양방향 인덱스** `:838-839`) 가 **구조적 쌍둥이**다. 🔴 단 도메인이 **마케팅 귀속**(influencer→creative→sku→order)이므로 **커버 계산 금지 · 선례 인용만**. ⚠️ **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0 → 외부 POST 전용) — "운영 중"으로 인용 금지.
- **차단은 `Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) 패턴을 확장하라** — **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + ★쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 차단(`:29-31`). 레포 최고 품질이며 §17 차단 규칙의 **타이밍 정본**(사후 검출이 아니라 쓰기 전 거부)이다. **신규 검증기 신설 = 두 번째 엔진 = 헌법 위반.**
- 🔴 **§17 착수 전 선행 요구 2건** — 없으면 차단 규칙은 `VACUOUS`:
  1. **Hierarchy Type 축**(술어 좌변) — [Type 문서](DSAR_ORGANIZATION_HIERARCHY_TYPE.md) 20종 커버 0.
  2. **유효기간 축**(술어 우변) — `effective_to` **grep 0** · **as-of 술어 `WHERE effective_from <= :as_of` 전역 0건** · `kr_fee_rule.effective_from`(`Db.php:898`) 이 유일 컬럼이나 읽기가 **전부 최신승**(`Pnl.php:454`). **폐구간 모델은 신규.**
- 🔴 **SSO 그룹을 다중 부모 입력으로 배선하지 마라.** SCIM Groups 는 **GET 전용**(`scimListGroups` `EnterpriseAuth.php:417-423` · `routes.php:932` — Groups 는 GET 1개뿐, Users 는 CRUD 5개) → 내부 `team` 을 SCIM Group 으로 **투영해 내보낼 뿐 IdP→내부 인입 경로가 없다**. 그룹 계층을 받으려면 **인입 경로 신설**이 선행이며, 그때도 **`EnterpriseAuth` 확장 강제**(IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반).
- 🔴 8종 **"있다고 가정"하고 배선 금지.**

# DSAR — Hierarchy Candidate (§50)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §50 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_HIERARCHY_CANDIDATE` | **grep 0** | `CONTRACT_ONLY`(계약만·실코드 0) |
| 조직 계층 자체 | `org_unit`/`organization_unit`/`hierarch` **backend/src grep 0** · `git log --all -S "org_unit"` **0** | `ABSENT`(이름·능력 양쪽) |
| "후보(candidate)" 개념 | 계층이 없으므로 **후보 집합도 없다** | `ABSENT` |
| 테넌트 | 격리 강제는 REAL(`index.php:600` `X-Tenant-Id` 무조건 덮어쓰기) · **단 테넌트 마스터 테이블 없음**(`api_key.tenant_id VARCHAR(100)` FK 없음 `Db.php:944`) | `PARTIAL` |
| effective date | `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date** · **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건** | `PARTIAL`(컬럼 有·as-of 조회 능력 無) |
| 표준 조직 15단위 | `TeamPermissions::ORG_PRESET`(`TeamPermissions.php:706-722`) + `seedOrg`(`:725-753`) **실배선** — 단 `team` DDL(`:145-151`)에 **`parent_team_id` 없음** | `PARTIAL`(구조가 아니라 열거) |

**★축 주의 — 계층이 없으면 후보도 없다.** §50 은 **Hierarchy Version 이 이미 존재한다는 전제** 위에서 "어떤 계층을 쓸지 고르는 입력"을 정의한다. 현행은 계층 자체가 부재(⊘)이므로 **후보 25필드 중 조직 축은 전부 `ABSENT`**다. 🔴 `ORG_PRESET` 15단위·`team`·`app_user.parent_user_id` 를 후보로 계산하면 **갭이 정의상 소멸하는 역산**이다.

**★`ORG_PRESET` 을 "Organization Registry ABSENT" 로 밀어도 오판이다.** 정확한 표현 = **"구조가 아니라 열거"** — 이름에 "마케팅 글로벌팀"이 있으나 "마케팅팀"의 자식이라는 **구조 링크가 0**이다.

## 1. 원문 전사 + 판정 — **원문 25종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | hierarchy candidate id | 부재 — 후보 엔티티 자체 없음 | `ABSENT` |
| 2 | tenant | 격리 강제 REAL(`index.php:600`·strict fail-closed `:585`) · **테넌트 마스터 테이블 없음** · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론** | `PARTIAL` |
| 3 | subject | 부재 — 조직 주체 개념 없음. 인접 = `app_user`(`UserAuth.php:156-167`) | `LEGACY_ADAPTER` |
| 4 | approval request | 부재 — 승인 노드/요청 **grep 0**(5-3-2 §12 실측) | `ABSENT` |
| 5 | approval case | 부재 — Case 개념 전무 | `ABSENT` |
| 6 | resource | 부재 | `ABSENT` |
| 7 | requested action | 부재 | `ABSENT` |
| 8 | effective date | `kr_fee_rule.effective_from`(`Db.php:898`) **유일** · 읽기 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승(`Pnl.php:454`·`KrChannel.php:102`) · **as-of 술어 0** · **`effective_to` grep 0** | `PARTIAL`(선례만) |
| 9 | candidate hierarchy types | 부재 — 계층 타입 열거 없음 | `ABSENT` |
| 10 | candidate hierarchy versions | 부재 — **엔티티 `version` 은 `menu_defaults.version` 단 1건**(`AdminMenu.php:120`) | `ABSENT` |
| 11 | candidate organization memberships | 부재 — 조직 멤버십 없음. 인접 = `team` 멤버(`TeamPermissions.php:145-151`) **평면** | `LEGACY_ADAPTER` |
| 12 | primary organization | 부재 — **primary/secondary 구분 개념 0** | `ABSENT` |
| 13 | secondary organizations | 부재 | `ABSENT` |
| 14 | legal entity candidates | 부재 — `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** · 사업자정보는 `app_user` **프로필 평문 필드**(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| 15 | regional candidates | 부재 — `region` **3축 병존**(광고 인구통계 `Db.php:681` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · **`APAC`/`EMEA` grep 0** · **parent region 0** | `ABSENT` |
| 16 | country candidates | 부재 — `Geo`(`Geo.php:23-53`)는 **IP→ISO alpha-2→언어** 매핑 · **Country→Region 매핑 코드 0건** | `ABSENT` |
| 17 | matrix relationships | 부재 — `matrix_` **grep 0** | `ABSENT` |
| 18 | cost center candidates | 부재 — `cost_center` **grep 0** | `ABSENT` |
| 19 | profit center candidates | 부재 — `profit_center` **grep 0** | `ABSENT` |
| 20 | conflicts | 부재 — 후보 충돌 판정 없음(§51 우선순위 부재와 짝) | `ABSENT` |
| 21 | proposed hierarchy | 부재 | `ABSENT` |
| 22 | proposed path | 부재 — **Path Index 전례 0**(Closure Table·Materialized Path 컬럼 **grep 0**) | `ABSENT` |
| 23 | manual review requirement | 부재 — Manual Review 상태 없음 | `ABSENT` |
| 24 | status | 부재 | `ABSENT` |
| 25 | evidence | 부재 | `ABSENT` |

**실측 개수: 25 / 25 전사.** 목록 끝 = `evidence` **확인**(원문 :2082). 커버리지 = 부재 21 · `PARTIAL` 2(tenant·effective date) · `LEGACY_ADAPTER` 2(subject·memberships) · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **`ORG_PRESET` 15단위를 Candidate 로 계산 금지.** `seedOrg` 는 **평면 `team` 행 15개를 생성**할 뿐 부모-자식 링크를 만들지 않는다(`team` DDL `TeamPermissions.php:145-151`·`:168` 에 `parent_team_id` **없음**). 열거 ≠ 구조 — 규율 9(대칭 오류) 직격.
- 🔴 **`app_user.parent_user_id`(`UserAuth.php:156-167`)를 조직 후보로 계산 금지.** 레포 유일 부모-자식 간선이나 **2단으로 봉인**됐다 — 전 생성 경로가 owner 직속(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670`)이라 **3단을 만드는 경로가 존재하지 않는다.** 순회도 **단일 홉**(`resolveTenantId:200-217` — `LIMIT 1` 1회 후 즉시 return·재귀 없음). 용도 = **테넌트 상속**이지 **보고선 아님**.
- 🔴 **`crm_customers.identity_id`(`CRM.php:109`)를 계층 후보로 계산 금지.** **union-find 등가류**(`resolveIdentitiesForTenant:597-643`) — **등가관계(대칭·추이적)** vs **계층(반대칭 부분순서)**. `crm_identity_merge_link`(`:708-712`)도 **무방향 엣지**다. 동일성 해소 ≠ 계층.
- 🔴 **`DATA_SCOPES` 의 `'company'` 를 Legal Entity Candidate 로 계산 금지 — 의미가 정반대다.** `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **법인 경계를 긋는 게 아니라 지운다.**
- 🔴 **"테넌트 = 법인" 가정 금지 = 역산.** 테넌트 = **1 owner 계정의 구독 스코프**(plan 은 `parent_user_id IS NULL` owner 에서 읽음 `PlanLimits.php:36-37`). **한 법인이 다수 테넌트를 갖거나 그 반대를 막는 것도 표현하는 것도 없다.** → `legal entity candidates`(#14)는 `tenant`(#2)로 대체 불가.
- **`effective date`(#8)는 신설이되 `kr_fee_rule.effective_from` 이 유일 선례다.** 단 **읽기 능력이 없다** — 전 읽기가 최신승(`Pnl.php:454`)이라 **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**된다. 주석(`:451`)이 의도를 명시하므로 **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요). §50 의 후보 선정은 **as-of 조회를 전제**하므로 **폐구간(`effective_to`) 모델은 순수 신규**다.
- **후속 Manager Resolution Engine 이 이 Candidate 를 입력으로 사용한다**(원문 :2084) → **§50 이 Manager Resolution 보다 선행**이다. 🔴 Candidate 없이 Manager Resolution 을 먼저 구현하면 **입력이 빈 파이프라인**(280차 팬텀 `/pixel.js` 와 동형).
- **스키마 도입 제약 3건**: ① `backend/migrations/` 는 **172차 정지 확정** → 조직 스키마는 **`ensureTables` 멱등 패턴 필수**(`Db.php:1123-1127`·`CRM.php:109`) ② **`ensureTables` 는 데이터 변환·백필을 하지 않는다** → 후보 백필 수단 현재 없음 ③ **MySQL/SQLite 두 방언 동시 작성 의무**(`CRM.php:48` vs `:77`).
- 🔴 **25필드 "있다고 가정"하고 배선 금지.**

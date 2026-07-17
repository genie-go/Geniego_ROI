# DSAR — Reporting Line Reconciliation (§66)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §66 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `REPORTING_LINE_RECONCILIATION` | **backend/src grep 0** — 대사기 없음 | `CONTRACT_ONLY` |
| **좌변** — HRIS/ERP/Directory | `hris`·`workday`·`bamboo`·`payroll`·`sap`·`netsuite`·`dynamics`·`ldap`·`active_directory`·`distinguishedName` **소스 히트 0** · **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** | `ABSENT` |
| **좌변** — IdP | `sso_config` DDL(`EnterpriseAuth.php:45-54`) = **`email_attr`·`name_attr` 2슬롯뿐 · `manager_attr` 없음** → **설정 슬롯조차 없다** | `ABSENT` |
| **좌변** — SCIM | `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` **전역 0** · `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = **5종만 파싱** · **`/Schemas`·`/ResourceTypes` 디스커버리 부재** | `ABSENT` |
| **우변** — Canonical Reporting Line | ★**미선언** — `manager_id`·`reports_to`·`supervisor_id` **grep 0** · **§3.1 `ORGANIZATION_*` backend 전역 grep 0**(18/18 `CONTRACT_ONLY`) | `ABSENT` |
| Manager 보유 소스 | ★**0개** — EnterpriseAuth 는 존재하나 **manager 데이터를 한 바이트도 싣지 않는다** | ⊘ |
| 대사 상태 기록 선례 | `agency_client_link.status`(`AgencyPortal.php:64-72`) · `pm_audit_log`(tenant_id NOT NULL+`entity`+`diff_json`+3인덱스 · migration `20260526_168_008`) | `LEGACY_ADAPTER` |

### ★★★ 이 절의 정체 — **이중 공허(Double Vacuity)** · 5-3-3-1 D-14 와 동형이나 **더 깊다**

5-3-3-1 §55 는 *"좌변 부분실재 5건 · 우변 전부 부재"* 였다. **§66 은 좌변마저 0 이다.**

```
좌변 (source system)              우변 (canonical)
   HRIS      → ABSENT                Canonical Direct Manager   → 미선언
   ERP       → ABSENT                Canonical Position Manager → 미선언
   IdP       → ABSENT (manager_attr 슬롯 없음)
   SCIM      → ABSENT (enterprise ext. 전역 0)
   Directory → ABSENT
                    ↓
        28개 비교쌍 전부: null vs null
                    ↓
        difference (#11) = ∅          ← 비교할 것이 없음
                    ↓
        status (#17) = MATCH          ← 🔴 "차이 없음" = 일치로 보고
```

> 🔴🔴 **양변 부재 → 대사는 항상 `MATCH` 를 반환한다 = 가짜 녹색.**
> **288차 `ok=>true` 위장**(하드 실패를 성공으로 보고 · ChannelSync 14채널 18개소 · 285차 11번가 정본이 `ok=>false` 로 통일)과 **구조적으로 동형**이다. 차이는 위장의 주체뿐이다 — 288차는 **실패를 성공으로 덮었고**, 여기서는 **비교 부재를 일치로 덮는다.** 결과는 같다: **대사 대시보드 전면 녹색 · 드리프트 0건 보고 · 신뢰 붕괴.**
> 🔴 **`MATCH` 는 §67 30종 중 유일하게 "아무것도 하지 않아도 참이 되는" 상태다.** 상세 = [§67](DSAR_REPORTING_LINE_RECONCILIATION_STATUS.md).

### ★★ 순서 강제 규칙 — **Canonical 선언이 §66 에 선행한다**

🔴 **"source 측만 만들면 된다"는 역산이다.** HRIS 커넥터를 아무리 붙여도 **비교할 우변이 없으면 대사는 성립하지 않는다.** 다음 순서를 **강제**한다:

```
① Canonical Reporting Line 선언   ← 관계 모델·Type·유효기간·시점 (§4.3/§4.4/§4.6)
② Manager Assignment 영속          ← 이력·effective date
③ Supervisory Path / Version       ← §66 #19·#20 의 전제
④ Source Connector (HRIS/ERP/IdP)  ← 좌변
⑤ 대사기 (§66)
⑥ 상태 (§67)
```

- 🔴 **①~③ 없이 ④ 만 만들면** → 수집된 HRIS manager 를 **비교할 대상이 없어** 그대로 저장 → **"HRIS 가 정본"이 암묵적으로 확정**된다. 이는 헌법 Vol2 **Unified Data Model** 위반이며, 헌법 Vol3 **"단일채널 불신 · Cross Validation 필수"** 를 정면 위반한다.
- 🔴 **⑤·⑥ 만 먼저 박으면** → `CONTRACT_ONLY` 47종이 코드에 들어앉아 **"구현됨"처럼 보인다** — 283차 교훈(**"코드 존재 ≠ 구현 완료"** · 실결함 대부분이 **미배선**)의 정확한 재현이다.

### 🔴 논증 주의 (규칙 11) — **`group_type` 열거 논증은 무효다**

*"`group_type` 열거에 `hr`·`erp` 가 없으므로 HRIS/ERP 부재"* 는 **무효 논증**이다. `ChannelRegistry.php:36`,`:38`/`:46`,`:47` = **`VARCHAR(40)`/`VARCHAR(20)` 자유 문자열 · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** → **누구든 `group_type='hr'` 삽입 가능**하다. 주석(`:12`·`:79`)은 **열거가 아니라 관례**이며 실값 `support` 가 주석에 누락된 **stale** 이다.
→ **부재증명은 능력축으로만**: **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0**(규칙 7).

## 1. 원문 전사 + 판정 — **원문 47종**(비교쌍 28 + 필수 필드 19)

### 1-1. 비교쌍 — 원문 28종 (:2260-2287) · **좌변/우변 양변 판정**

| # | 원문 항목명 | 좌변(source) | 우변(canonical) | 판정 |
|---|---|---|---|---|
| 1 | HRIS Manager vs Canonical Direct Manager | **ABSENT** — 커넥터 0·fetcher 0 | **미선언** — `manager_id` grep 0 | `ABSENT` · 🔴**이중 공허** |
| 2 | HRIS Position Supervisor vs Canonical Position Manager | **ABSENT** | **미선언** — 직위 축 전무(`position_idx` = **PM 태스크 정렬순서**) | `ABSENT` · 🔴**이중 공허** |
| 3 | ERP Personnel Manager vs Canonical Manager | **ABSENT** — `sap`·`netsuite`·`dynamics` 소스 히트 0 | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 4 | IdP Manager vs Canonical Manager | **ABSENT** — `sso_config` 에 **`manager_attr` 슬롯 없음**(`EnterpriseAuth.php:45-54`) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 5 | SCIM Manager vs Canonical Manager | **ABSENT** — enterprise ext. **전역 0** · 🔴**PATCH `manager` = 침묵 no-op**(`scimUpdateUser:391-396` 이 **`'active'` 경로만** 분기 → `:399` 가 `is_active`·`name` 만 UPDATE → **200 + 정상 User 반환**) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 6 | Directory Manager vs Canonical Manager | **ABSENT** — `ldap`·`active_directory`·`distinguishedName` 0(🔴**`$dn` 2건은 PHP 지역변수** `Connectors.php:1557`·`GraphScore.php:343`) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 7 | Organization Head vs Organization Manager Binding | **ABSENT** — `head_id`·`department_head_id` grep 0 | **미선언** — §3.1 18/18 `CONTRACT_ONLY` | `ABSENT` · 🔴**이중 공허** |
| 8 | Department Head vs Department Profile | **ABSENT** | **미선언** — `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`TeamPermissions.php:148`/`:168`) | `ABSENT` · 🔴**이중 공허** |
| 9 | Cost Center Manager vs Finance Master | **ABSENT** — `cost_center` grep 0 | **미선언** — Finance Master 0 | `ABSENT` · 🔴**이중 공허** |
| 10 | Profit Center Manager vs Finance Master | **ABSENT** — `profit_center` grep 0 | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 11 | Project Manager vs Project Registry | ⚠️**부분실재** — `pm_projects.owner_user_id`(migration `20260526_168_001:13`·`KEY :21` · 쓰기 `Projects.php:58`,`:66`,`:113`) · 🔴**4결격**: ①**`WHERE owner_user_id` grep 0 = 판독 술어 0**(저장된 라벨) ②**무검증 자유문자열**(`:112-117` `validId()` 없음 · FK 없음) ③**기본값이 생성자**(`:66` `?? $g['user_id']`) → 미설정 행과 **구분 불가** ④**단일값** | **미선언** — Registry 아님 | `ABSENT` · 좌변 `PARTIAL` |
| 12 | Program Manager vs Program Registry | **ABSENT** · 🔴**`pm_portfolio` "프로그램" = 주석 팬텀** — `PM/Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 13 | Regional Manager vs Region Registry | **ABSENT** · 🔴**`region` 3축 전부 명부 아님** — 광고 인구통계(`Db.php:681`,`:690`) / **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) / **WMS 시·도**(`Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 14 | Country Manager vs Country Registry | **ABSENT** · 🔴**`Geo.php:23-53` = IP→ISO alpha-2 언어 결정용**(탐지이지 명부 아님) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 15 | Position Incumbent vs Manager Assignment | **ABSENT** — 직위 축·재직자 축 전무 | **미선언** — Assignment 0 | `ABSENT` · 🔴**이중 공허** |
| 16 | Manager Assignment vs Employment Status | **ABSENT** — 🔴**`is_active` = 계정 상태**(base DDL **`Db.php:1106`**) · `terminated`·`on_leave` grep 0 · **`NOT NULL DEFAULT 1` → 미지 = fail-open** | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 17 | Manager Assignment vs Organization Membership | **ABSENT** · ⚠️인접 `app_user.team_id` = **단일 컬럼 = 1인 1팀**(이력·유효기간 0) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 18 | Manager Legal Entity vs Subordinate Legal Entity | **ABSENT** — 🔴**법인 엔티티 0** · `ceo_name` 은 **`app_user` 프로필 평문 문자열**(`UserAuth.php:306-307`) · 🔴**`DATA_SCOPES` `'company'` = 무제한 센티넬**(법인 아님 · `effectiveScope():258`) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 19 | Reporting Line Version vs Supervisory Path | **ABSENT** — 🔴**optimistic lock `version` grep 0** · 엔티티 `version` = `menu_defaults.version` **1건**이며 ★**유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | **미선언** — Supervisory Path 0 | `ABSENT` · 🔴**이중 공허** |
| 20 | Supervisory Edge vs Path Index | **ABSENT** — **Closure Table·Materialized Path 컬럼 grep 0** · 🔴**`graph_node`/`graph_edge`(`Db.php:816-839`)를 "Path Index 있음"으로 계산 금지** — `GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422 가 조직 노드 저장을 막는다** · ⚠️`graph_node` **인덱스·UNIQUE 0**(`:816-824`) · **내부 생산자 0 → `VACUOUS` 미배제** | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 21 | Manager Snapshot vs Source Version | **ABSENT** — 🔴**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가**(`KV_ONLY`) · **`as_of` 2건 = 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)이지 as-of 질의 아님 | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 22 | Manager Candidate vs Active Relationship | **ABSENT** — **후보 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) | **미선언** — Active Relationship 0 | `ABSENT` · 🔴**이중 공허** · ⚠️**§67 에 대응 상태 없음**(§2 참조) |
| 23 | Task Assignee vs Current Candidate | **ABSENT** — Task 축 grep 0 · **워크플로 정의 테이블 grep 0** | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 24 | Task Claim Actor vs Manager Snapshot | **ABSENT** — 🔴**`Omnichannel::claimBatch:390` 의 `claim_id` 는 익명 워커 랜덤값**(`:392` `bin2hex(random_bytes(8))`)이지 **사람 Actor 가 아니다**(주체·대상·목적·인가·해제 **5축 상이**) | **미선언** — Snapshot 0 | `ABSENT` · 🔴**이중 공허** |
| 25 | Terminated Manager vs Active Task | **ABSENT** — 좌변 종료 상태 0(#16) · 우변 Task 0(#23) | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 26 | Vacant Position vs Active Position Manager | **ABSENT** — `vacan` **grep 0** · ★**단 §76 실재 항목**: `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** | **미선언** | `ABSENT` · 🔴**실 결함 인접** |
| 27 | Future Manager Change vs Scheduler | **ABSENT** — 🔴**`effective_to`/`valid_to`/`valid_from` grep 0** · `next_run_at` = **`Reports.php:75`,`:77` 리포트 스케줄러**(Task 스케줄러 아님) · **§38 Business/System 이중 시간축 = 전례 0** | **미선언** | `ABSENT` · 🔴**이중 공허** |
| 28 | Approval Chain Reference vs Reporting Line | **ABSENT** — `approval_chain` grep 0 · `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** = **체인 아님·인덱스 불가** | **미선언** | `ABSENT` · 🔴**이중 공허** |

### 1-2. 필수 필드 — 원문 19종 (:2291-2309)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 29 | reporting_line_reconciliation_id | 대사 레코드 0 · 선례 = `AUTO_INCREMENT PRIMARY KEY` 전반 | `ABSENT` |
| 30 | tenant | ★**필수** — 선례 `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) · 🔴**`menu_audit_log`·전역 `audit_log`(`Db.php:540-545`)·`admin_growth_approval`(`AdminGrowth.php:142-149`) 은 tenant_id 없음 → 복제 금지** | `LEGACY_ADAPTER` |
| 31 | subordinate subject | ★**직원 아이덴티티 = `app_user` 뿐** — `id`+`email`+외부 상관자 3컬럼(`oidc_sub`·`oidc_provider`·`scim_external_id` · 정의부 `EnterpriseAuth.php:64-65`) · 🔴**병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`) · 🔴**DSAR "Data Subject" = 고객**(직원 아님) | `PARTIAL` |
| 32 | subordinate position | **직위 축 전무**(`position_idx` = PM 태스크 정렬순서) | `ABSENT` |
| 33 | organization | §3.1 **18/18 `CONTRACT_ONLY`** · 인접 `ORG_PRESET`(열거+시딩 · **계층 링크 0**) · `team`(**`parent_team_id` 없음**) | `CONTRACT_ONLY` |
| 34 | relationship type | **§4.6 Type 표현 불가** — `team.manager_user_id` = **팀당 1칸**(`TeamPermissions.php:148`) · 🔴**규칙 10**: "1개"인 것은 **여러 개를 표현할 수단이 없어서**다 | `ABSENT` |
| 35 | source system | ★**Manager 보유 소스 0개** — 정렬·선택할 대상이 없다(§62 권장 12단계 중 **6단계 ABSENT**) | `ABSENT` |
| 36 | source manager | **좌변 전건 부재**(#1~#6) | `ABSENT` |
| 37 | canonical manager | ★**우변 미선언 — 이 필드가 §66 전체의 급소다**(§0 순서 강제) | `ABSENT` · 🔴**최선결** |
| 38 | effective date | 🔴**부재의 깊이가 축마다 다르다** — `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승 `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) · 🔴**환율 `fxToKrw`(`Connectors.php:1749`)는 컬럼도 이력도 無**(`app_setting` KV **단일행 덮어쓰기** `:1804-1805`) → **"시점 컬럼만 붙이면 된다"는 일반화가 깨진다** | `ABSENT` |
| 39 | difference | ★**양변 부재 → 항상 ∅** → §67 `MATCH` 자동 도달(§0) | `ABSENT` · 🔴**가짜 녹색 진원지** |
| 40 | affected tasks | Task 축 0(#23) · **워크플로 정의 테이블 grep 0** | `ABSENT` |
| 41 | affected approval cases | **Approval Case 개념 0** — 승인 4종은 **케이스가 아니라 행 상태** | `ABSENT` |
| 42 | severity | 대사 severity 0 · ⚠️`grade` 45+건 **전량 무관**(고객등급·리드등급·모델품질 — 이름 함정) | `ABSENT` |
| 43 | resolution | 해소 축 0 | `ABSENT` |
| 44 | resolved_by | 🔴**행위자 표준 부재** — `Mapping::actorId:36-53` **3분기 fail-closed = REAL 이나 국소 표준** · `Alerting::actor:33-36` = **`X-User-Email` 헤더/`?actor=` 쿼리/`'unknown'` 폴백**(위조 가능) · `admin_growth_approval.decided_by` = **자유 텍스트**(`AdminGrowth.php:1330`) | `ABSENT` · 🔴**표준 미확립** |
| 45 | resolved_at | 시각 컬럼 선례 다수(`created_at`/`updated_at`) · 🔴**`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 시각을 소거 → 이력 물리적 소멸** = **§55 "과거 Snapshot 대체 금지" 정면 반례** | `ABSENT` · 🔴**반례 존재** |
| 46 | status | §67 참조 — 30종 전건 `ABSENT` · ★**`MATCH` 반전 규칙 필수** | `CONTRACT_ONLY` |
| 47 | evidence | 근거 영속 0 · 인접 선례 = `pm_audit_log.diff_json`(migration `20260526_168_008:13`) · `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·`:182-197`) | `ABSENT` |

**실측 개수: 47 / 47 전사.**
- **측정기 분모 47** = 비교쌍 28 + 필수 필드 19. **원문 대조 47 · 전사 47 — 3자 일치.**
- 🔴 **PM 브리핑은 "28개 비교쌍"이라 했으나 측정기·원문은 47**이다. 28 은 **첫 목록만**이며 `필수 필드` 19종(:2291-2309)이 누락됐다. **필수 필드를 빠뜨리면 §66 의 스키마 축이 통째로 소실**되므로 47 전건을 전사했다.
- ★**원문이 `evidence` 로 끝난다**(:2309) → **그대로 전사**(#47). **추가하지도 누락하지도 않았다**(규칙 4 양방향 준수).

커버리지 = `ABSENT` 43 · `CONTRACT_ONLY` 3(#33·#46 + `REPORTING_LINE_RECONCILIATION` 자체) · `LEGACY_ADAPTER` 1(#30) · `PARTIAL` 1(#31) · **`VALIDATED_LEGACY` 0**.
→ ★**28개 비교쌍 중 성립하는 것은 0개다.** 좌변 부분실재 1건(#11 `pm_projects.owner_user_id`)조차 **4결격 · 우변 부재**로 비교 불가.

## 2. 규칙

- ★★★🔴 **`MATCH` 를 기본값·성공값으로 두지 마라 — Fail-closed 로 뒤집어라.** 상세 = [§67](DSAR_REPORTING_LINE_RECONCILIATION_STATUS.md) 규칙. 요약:
  - `canonical manager`(#37) 가 **null** 이면 → **`MATCH` 가 아니라 `BLOCKED`**.
  - `source system`(#35) 커넥터가 **미등록**이면 → **`MATCH` 가 아니라 `MANUAL_REVIEW`**.
  - 🔴 **"비교 못함" ≠ "일치함".** `difference`(#39)가 ∅ 인 이유가 **"차이가 없어서"인지 "비교를 못해서"인지** 반드시 구분하라. 이 규칙 없이는 §66 전체가 **가짜 녹색 생성기**다.
- ★★★🔴 **순서 강제 — Canonical 선언(#37)이 §66 에 선행한다.** ① Canonical Reporting Line → ② Manager Assignment 영속 → ③ Supervisory Path/Version → ④ Source Connector → ⑤ 대사기 → ⑥ 상태(§0).
  - 🔴 **"source 측만 만들면 된다"는 역산 금지.** ④ 를 먼저 만들면 **"HRIS 가 정본"이 암묵 확정** → 헌법 Vol2 **Unified Data Model** 위반 · 헌법 Vol3 **"단일채널 불신 · Cross Validation 필수"** 정면 위반.
  - 🔴 **⑤·⑥ 만 먼저 박으면 `CONTRACT_ONLY` 47종이 "구현됨"처럼 보인다** — 283차 **"코드 존재 ≠ 구현 완료"** 의 재현.
- ★🔴 **부재증명·존재증명 모두 능력으로**(규칙 7). **`group_type` 열거 논증은 무효**(§0 — 자유 VARCHAR · ENUM/CHECK 없음). HRIS/ERP 부재의 유효 근거는 **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** 뿐이다.
- ★🔴 **#5 SCIM 침묵 no-op 를 "SCIM manager 지원"으로 계산 금지.** `scimUpdateUser:391-396` 이 **`'active'` 경로만** 분기하므로 IdP 가 `PATCH {"path":"manager"}` 를 보내면 **200 + 정상 User 리소스를 반환하고 저장은 0**이다. **Okta/Entra 콘솔엔 성공 표시** — **이것이 §66 이 잡아야 할 드리프트의 원형**이자, 대사기가 없으면 **영원히 발견되지 않는 유형**이다. **현재 소비자 0 → 관찰 사실 · 등급 미부여.**
  - ★**SCIM 확장 시 유일한 실작동 선례 = `active` 인입 경로**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`). `manager` 를 실으려면 **`urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` 확장 스키마 · `/Schemas`·`/ResourceTypes` 디스커버리 · PATCH 경로 분기**가 전부 신규다.
  - 🔴 **정정 상속**: *"어설션 `groups` 수신(`:374`)"* 은 **오류**다 — `:374` 는 **`scimCreateUser` 가 SCIM POST body 를 읽는 줄**. **OIDC(`:240`)·SAML(`:294`) 은 `provisionUser` 를 8인자로 호출 → `$groups` 기본값 `[]`(`:476`) → `roleForGroups:81` 즉시 `''`.** **OIDC/SAML 어설션은 groups 를 읽지 않는다** — 그룹→롤 매핑은 **SCIM 경로 전용**이다.
- ★🔴 **#4 IdP Manager Attribute 는 설정 슬롯조차 없다.** `sso_config` DDL(`EnterpriseAuth.php:45-54`) = **`email_attr`·`name_attr` 2슬롯**. 🔴 **`sso_group_role_map.role`·`sso_config.default_role` 이 담는 `'manager'` 문자열을 "IdP 가 manager 를 준다"로 읽으면 §3.4 ⑧⑨ 를 통째로 오판**한다 — 그것은 `team_role ∈ {owner,manager,member}` 의 **값**(롤 라벨)이지 **관계**가 아니다.
- ★🔴 **#11 `pm_projects.owner_user_id` 를 좌변으로 채택하지 마라 — 판독 술어 0 = 저장된 라벨**이다. **`WHERE owner_user_id` grep 0** → 인가·승인라우팅·감독 효과 **없음**. 대사에 넣으면 **의미 없는 문자열끼리 비교**하게 된다. 🔴 **③ 기본값이 생성자**(`Projects.php:66` `?? $g['user_id']`)라 **미설정 행과 구분 불가** → **드리프트가 정의상 탐지 불가**하다.
- ★🔴 **#20 `graph_node`/`graph_edge` 스키마 쌍둥이 주의** — 신설 시 **두 번째 그래프 스토어 = 헌법 위반**. `KEEP_SEPARATE_WITH_REASON` 의 근거는 "다른 것"이 아니라 **`GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → 422 가 조직/Subject 노드 저장을 막는다**는 **게이트 사실**이다. ⚠️`graph_node` **인덱스·UNIQUE 0**(`:816-824` = id PK 뿐 · `:838-839` 는 **edge 전용**) · **내부 생산자 0 → `VACUOUS` 미배제**.
- ★🔴 **#38 effective date — "시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.** 세율은 **질의 계층 교정**(컬럼 有·과거 복원 가능)이나 환율은 **저장 계층 신설**(복원할 게 없다). **§38 Business/System Time 이중 시간축 = 전례 0.** 🔴 **`pm_baseline.captured_at` 방식(JSON 내부 키) 금지** — 인덱스·as-of 질의 불가.
- ★🔴 **#45 `resolved_at` — `AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거 패턴 절대 복제 금지.** 대사 해소 이력은 **덮어쓰기가 아니라 append**. 그리고 🔴**`ensureTables` 는 백필을 하지 않는다**(`CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 뿐) → **§40 Retroactive Correction 집행 수단이 없다.** `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 신규 스키마는 마이그레이션 경로가 없고 **MySQL/SQLite 두 방언 수기 중복 작성 의무**다. 🔴**`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 데이터 이행기가 아니다.**
- ★🔴 **#30 `tenant` 는 NOT NULL 필수.** `pm_audit_log` 패턴 확장(`tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스 · migration `20260526_168_008`). 🔴 **전역 `audit_log`(`Db.php:540-545` · tenant 없음) · `menu_audit_log`(tenant 없음 · `lastHash():214-219` 에 tenant 술어 없음) · `admin_growth_approval`(`AdminGrowth.php:142-149` **tenant_id 컬럼 없음** · 조회도 tenant 술어 없음 `:641`·`:1292`·`:1306`·`:1324`) 전부 복제 금지** — 테넌트 격리 절대(헌법 Vol1).
- ★🔴 **#44 `resolved_by` 는 `Mapping::actorId:36-53` 을 표준으로.** **3분기 fail-closed**(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` 폴백 `:49` / 미확인 **null** `:52` → **403** `:187-190`,`:246-250`). 🔴 **`Alerting::actor:33-36`(`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백) 채택 금지** — 289차 G-01 이 `Mapping` 에서 고친 **바로 그 위조가능 패턴**이다.
  - ⚠️ **관찰(등급 미부여)**: 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다** → dedup(`:279`)·자기승인 차단(`:268`)이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- 🔴 **#22 는 §67 에 대응 상태가 없다**(§67 §2 참조) — **원문의 비대칭이며 날조로 메우지 마라**(규칙 1).
- 🔴 **47종 "있다고 가정"하고 배선 금지.** 5-3-2 팬텀(`INSERT INTO action_request` **grep 0** → 생산자 전무 → 죽은 스켈레톤 · 287차가 **"가짜 집행"**으로 확정)의 재현이다.
- **회귀 커버리지 0** — `tools/e2e/` 3종에서 manager/reporting/hris/scim 시나리오 **0**(`render.mjs:17` **마운트 크래시만 검사** 자인 · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 계약키** · 이름 함정). ★**가짜 녹색은 E2E 없이는 절대 잡히지 않는다**(정의상 "정상"으로 보이므로). **"Canonical 부재 시 `BLOCKED` 를 반환하는가"를 검증하는 E2E 가 완료 조건**이다.

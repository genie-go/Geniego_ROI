# DSAR — Manager Chain Foundation (§50)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §50 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **`manager chain` 개념** | 🔴 **`manager_chain`·`chain_depth` backend/src grep 0** | `ABSENT` |
| `approval_chain` | 🔴 **grep 0** | `ABSENT` |
| **Path 전례** | 🔴 **0** — Closure Table·Materialized Path·Recursive CTE·Graph DB **전례 0**(`WITH RECURSIVE`·`CONNECT BY`·`closure`·`ancestor`·`descendant`·`lft`·`rgt` **backend/src 0**) | `ABSENT`(**순수 신규**) |
| Level 1/2/3 Manager | 🔴 **다단 계층 자체가 없다** — `team` 에 **`parent_team_id` 없음 → 팀 트리 없음**(`TeamPermissions.php:148`/`:168`) · `app_user.parent_user_id` 는 **owner 직속 2단 봉인** | `ABSENT` |
| 승인자 후보 계산 | 🔴 **`resolveApprover`·`routeApproval` grep 0**(`approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| Snapshot 선례 | ⚠️ `pm_baseline` — 🔴 **`captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |

### ★축 주의 — **§50 은 "Chain 참조 기반 구축" 단계**

원문: *"이번 단계에서는 Manager Chain 참조 기반을 구축한다. … 최종 Approval Chain 생성은 다음 블록에서 구현한다."*
→ **본 블록 산출은 참조 구조 정의까지**이며 **Approval Chain 집행은 범위 밖**이다. 범위를 넘겨 승인 라우팅을 설계하면 **요구 날조**다.

### 🔴 **Level 1/2/3 은 현행 구조로 표현 불가**(규율 규칙 10)

`level 1/2/3 manager`·`root manager`·`chain depth` 는 **다단 계층을 전제**한다. 현행 실측:
- `app_user.parent_user_id` — **owner 직속 2단 봉인**. 전 생성경로가 owner 를 가리킨다: `UserAuth.php:1226-1227`(주석 `:1225` *"항상 최상위 owner 에 종속"*) · `EnterpriseAuth.php:500`(`(int)$owner['id']` · `:494-496` owner 조회) · `:1574/1581`(`$masterId`) · `:670`(null). **3단 경로 없음** → **level 2 가 구조적으로 발생 불가.**
- 🔴 **3단 허용 시 `resolveTenantId:200-217` 단일 홉 가정이 붕괴**(`LIMIT 1` 1회 · 재귀 없음 · 하위계정이 상위 owner tenant_id 를 `:197`·`:214` 로 **그대로** 물려받음) → **286차 `platform_growth` 하이재킹과 동형 사고**. **일반화가 선결.**
- `team` — **`parent_team_id` 없음** → 팀 트리 자체가 없다. `ORG_PRESET` 은 **열거+시딩뿐이며 계층 링크 0**.

## 1. 원문 전사 + 판정 — **원문 28종**(필수 필드 19 + Chain Type 9)

### 1-1. 필수 필드 — **원문 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_chain_reference_id | 부재 · ID 선례 `self::genId('dep')`(`Handlers/PM/Dependencies.php:35`) | `ABSENT` |
| 2 | subordinate subject | 부재 · 직원 아이덴티티 = **`app_user` 뿐**(병합/정규화 계층 0 · union-find 는 **고객 전용** `CRM.php:597-643`) | `ABSENT` |
| 3 | subordinate position | 부재 · Position 축 0(§3.1 18/18 `CONTRACT_ONLY`) | `ABSENT` |
| 4 | hierarchy version | 🔴 **버전 축 0** — optimistic lock `version` grep 0 · 엔티티 `version` 1건은 `menu_defaults.version` 이며 **유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `ABSENT` |
| 5 | effective date | 🔴 **`valid_from`/`valid_to`/`effective_to` grep 0** · ⚠️ **`kr_fee_rule.effective_from`(`Db.php:898`)은 컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 **최신승**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `ABSENT` |
| 6 | chain type | 9종 부재(아래 1-2) | `ABSENT` |
| 7 | direct manager | ⚠️ `team.manager_user_id`(`TeamPermissions.php:148`/`:168`) = **팀당 1칸** · 🔴 Type/Priority/Responsibility Scope 표현 불가 · nullable · **effective date 0 · 이력 0** | `PARTIAL` |
| 8 | level 1 manager | 🔴 **구조적 발생 불가**(owner 직속 2단 봉인 — 위 ★) | `ABSENT` |
| 9 | level 2 manager | 동상 | `ABSENT` |
| 10 | level 3 manager | 동상 | `ABSENT` |
| 11 | root manager | 부재 · `VIRTUAL_ROOT` 노드 축 0(§47) | `ABSENT` |
| 12 | chain depth | 🔴 **grep 0** · ⚠️ **`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` pop 마다 증가) — chain depth 로 계산 금지 | `ABSENT` |
| 13 | legal entity crossings | 부재 · Legal Entity 축 0 · `ceo_name` = **프로필 평문 문자열**(`UserAuth.php:306-307`) | `ABSENT` |
| 14 | matrix branches | 부재 · matrix 축 0 · `app_user.team_id` **단일 컬럼(1인 1팀)** | `ABSENT` |
| 15 | missing levels | 부재 · ⚠️ §45 `HIERARCHY_PATH_MISSING` 과 짝 | `ABSENT` |
| 16 | conflicts | 부재 → [DSAR_MANAGER_CONFLICT.md](DSAR_MANAGER_CONFLICT.md)(19종 전부 `ABSENT`) | `ABSENT` |
| 17 | candidate snapshot | 🔴 **후보 계산기 0** · ⚠️ Snapshot 선례 `pm_baseline` 은 **`captured_at` 이 JSON 키**(`Handlers/PM/Enterprise.php:360`) → **인덱스·as-of 불가** · 🔴 **`Actor Authorization Snapshot` = `ABSENT`**(승인 시점 권한 동결 0) | `ABSENT`(선례는 `KV_ONLY`) |
| 18 | status | 부재 · ⚠️ **`is_active` 재사용 금지**(계정 상태 · `NOT NULL DEFAULT 1` → **미지가 자동 "가용" = fail-open** · **`UNKNOWN` 조차 표현 불가**) | `ABSENT` |
| 19 | evidence | 부재 · 저장 선례 = `pm_audit_log`(`tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스+append-only · migration `20260526_168_008:2-19`) | `ABSENT`(선례는 `LEGACY_ADAPTER`) |

### 1-2. Chain Type — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DIRECT | `team.manager_user_id` **1홉**(팀당 1칸 · 보고선 아님) | `ABSENT` |
| 2 | ADMINISTRATIVE | `app_user.team_id` **단일 컬럼** | `ABSENT` |
| 3 | FUNCTIONAL | #2 와 병존 불가(규칙 10) | `ABSENT` |
| 4 | POSITION | Position 축 0 | `ABSENT` |
| 5 | MATRIX | matrix 축 0 | `ABSENT` |
| 6 | REGIONAL | 🔴 **Regional Directory `ABSENT`** — `region` 3축 전부 **탐지·라우팅·세그먼트이지 명부 아님** · ⚠️ **`wms_warehouses.manager VARCHAR(120)`**(`Wms.php:62`/`:112`) = **시설 담당자 자유텍스트**(FK 0 · 판독 술어 0) | `ABSENT` |
| 7 | FINANCIAL | ⚠️ `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 승인 권한 아님 · `DATA_SCOPES` `'company'` = **무제한 센티넬** | `ABSENT` |
| 8 | APPROVAL_REFERENCE | 🔴 **적격 술어 0** — 승인 4경로 전량 "호출자가 곧 승인자" | `ABSENT` |
| 9 | CUSTOM | — | `ABSENT` |

**실측 개수: 28 / 28 전사**(측정기 28 = 필수 필드 19 + Chain Type 9 · 원문 대조 일치). 커버리지 = `PARTIAL` **1**(#7 direct manager) · `ABSENT` 27 · 커버 **0**.

★ **원문 Chain Type 목록은 `evidence` 로 끝나지 않는다**(타입 열거) — **추가하지 않았다**(규율 규칙 4 반대 편향 방지).

## 2. 규칙

- 🔴 **§50 범위 = Chain 참조 기반까지.** 원문 말미가 *"최종 Approval Chain 생성은 다음 블록에서 구현한다"* 로 명시 — **승인 라우팅 집행 설계는 범위 밖**(요구 날조 금지).
- 🔴 **Level 1/2/3 은 "미구현"이 아니라 구조적 발생 불가다.** `app_user.parent_user_id` **owner 직속 2단 봉인**(전 생성경로 실측 4개소) · `team` **`parent_team_id` 없음**. **다단 계층 도입이 §50 에 선행**한다.
- 🔴 **다단 계층 도입 전 `resolveTenantId` 일반화가 선결이다.** `:200-217` 은 **단일 홉 가정**(`LIMIT 1` 1회 · 재귀 없음)이며, 3단 허용 시 **tenant 해석이 붕괴**한다 → **286차 `platform_growth` 하이재킹과 동형 사고**. **별도 승인세션 대상.**
- 🔴 **#7 `direct manager` 를 커버로 계산 금지.** `team.manager_user_id` 는 **`PARTIAL`** 이다 — ★단 **쓰기경로는 REAL**(`createTeam:463-469` manager 수령 → **테넌트 소속 검증 `:464` 422** → INSERT `:466` → `promoteManager:469` · 수정 `:492-495` · 조회 `:444-445`). ⚠️ **`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재** → **`ORG_PRESET` 시드 15팀 전부 manager NULL**. **"시드가 비었으니 미사용"은 시드 축에 한해 참이고 쓰기경로 축에서는 거짓**(규칙 7).
- 🔴 **`promoteManager:768-776` 확장 시 강등 경로를 반드시 신설하라** — 현행 **강등 경로 0**이라 `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유**(§76 실재 결함 2·3). **Chain 이 이 위에 얹히면 공석·교체가 체인에 반영되지 않는다.**
- 🔴 **#17 `candidate snapshot` 은 `pm_baseline` 패턴을 복제하지 마라** — **`captured_at` 이 DB 컬럼이 아니라 JSON 키**(`Handlers/PM/Enterprise.php:360`)라 **인덱스·as-of 질의 불가**(`KV_ONLY`). §55 과거 승인 재현은 **as-of 질의가 전제**이므로 **시점 컬럼을 실 컬럼으로** 두라.
  🔴 **`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이력을 물리 소멸**시키는 것은 **§55 "과거 Snapshot 대체 금지"의 정면 반례** — 답습 금지.
- ★ **#5 `effective date` 교정 계층은 축마다 다르다** — `kr_fee_rule.effective_from` 은 **컬럼 有·질의 無**(질의 계층 교정 → 과거 복원 가능)이나 **환율 `fxToKrw`(`Connectors.php:1749`)는 컬럼도 이력도 없다**(`app_setting` KV 단일행 덮어쓰기 `:1804-1805` → **저장 계층 신설 · 복원할 게 없다**). 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 깨진다.**
- ⚠️ **회귀 커버리지 0** — manager/reporting 테스트 **전무**. `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인) · 🔴 **`smoke.mjs:84` `keys:['team','roas']` 는 Meta Ads 캠페인 계약키**(조직 team 아님 — **이름 함정**) · `scenarios.mjs` 매니저 0. **§90 을 "테스트 있음"으로 닫지 마라.**
</content>

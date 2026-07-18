# DSAR — 최소 Runtime Guard (§70)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §70 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★정직 등급 — **25종 전건 `CONTRACT_ONLY`**

Manager 도메인 **실 코드 0**. 아래 25종은 **계약 명세일 뿐 오늘 아무것도 차단하지 않는다.**

**누적 집계 — 네 블록 연속 실 코드 0**

| 블록 | Lint | Guard | 소계 |
|---|---:|---:|---:|
| 5-3-1 (Organization) | 19 | 30 | 49 |
| 5-3-2 (Approval Workflow) | 28 | 37 | 65 |
| 5-3-3-1 (Organization Hierarchy) | 28 | 24 | 52 |
| **누적 (3블록)** | **75** | **91** | **166** |
| **5-3-3-2 (본 블록)** | **24**(§69) | **25** | **49** |
| **누적 (4블록)** | **99** | **116** | **215** |

🔴 **166종 전건 계약만 → 본 블록 49종을 더해 215종 · 네 블록 연속 실 코드 0.**

### ★등급 어휘 3단 — **원문 "차단하라"는 미충족**

| 등급 | 실체 | 실측 |
|---|---|---|
| `WIRED(pre-commit·로컬)` | `.githooks/pre-commit` | ★`core.hooksPath`=`.githooks` **본 클론 설정됨** · **신규 클론 기본 미설정** · `--no-verify` 우회 가능 → **보장 아님** |
| `WIRED(CI·탐지)` | `security-scan.yml:57` `repo-guards` | 규칙 SSOT = `tools/scan_secrets.sh`(`:70` 주석 · 호출 `:82`) — **정규식 CI 복사 금지** |
| 🔴 `ENFORCED(예방)` | **현행 레포에 없음** | 브랜치 보호 + required check **미설정**(G-06b) |

🔴 **Runtime Guard 는 정적 게이트와 다르다** — 런타임 차단은 **핸들러 코드 자체**가 집행하므로 브랜치 보호와 무관하게 동작한다. 그러나 **Guard 를 우회하는 신규 경로가 추가되는 것**은 `ENFORCED(예방)` 부재로 막지 못한다. 즉 **Guard 25종을 다 만들어도 "우회 경로 신설 금지"는 강제되지 않는다.**

### ★현행 Guard 실측 — **fail-closed 선례는 극소수**

| 패턴 | 실측 | 이식 가치 |
|---|---|---|
| **쓰기 전 순환 차단** | `Handlers/PM/Dependencies.php:32-34`(422 `cycle_detected`) · self-loop `:29-31` | ✅ **유일한 정석 선례** |
| **신원 fail-closed** | `Mapping::actorId:36-53` → 미확인 시 null(`:52`) → **403**(`:187-190`·`:246-250`) | ✅ 289차 G-01 |
| **테넌트 소속 검증** | `createTeam:464` → 422 | ✅ |
| **비활성 계정 차단** | 로그인 차단 `UserAuth.php:805` · 재활성화 우회 방어 `:854-856` · **세션 즉시 폐기** `:1381`·`EnterpriseAuth.php:400`,`:413` | ✅ 집행 REAL |
| 🔴 **fail-open 선례** | `index.php:508-545` 레이트리밋 = **fail-open** · `app_user.is_active NOT NULL DEFAULT 1` → **미지가 자동으로 "가용"** | ❌ **복제 금지** |
| 🔴 **탐지 후 미차단** | `Gantt.php:104-125` Kahn 위상정렬 — `:119` 정석 탐지하나 `:120-125` **부분결과+경고 degrade**(읽기 경로) | ⚠️ 읽기 축에서만 정당 |
| 🔴 **조용한 절단** | `ChannelSync.php:955-962` — `$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 절단** | ❌ **Guard 후보 계산 금지** |

## 1. 원문 전사 + 판정 — **원문 25종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Reporting Line Not Found | Reporting Line 엔티티 0 | `CONTRACT_ONLY` |
| 2 | Reporting Line Version Inactive | Version 축 0 · 엔티티 `version` = `menu_defaults.version` 1건이며 **리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**(`AdminMenu.php:309`) | `CONTRACT_ONLY` |
| 3 | Manager Relationship Not Found | Relationship 엔티티 0 | `CONTRACT_ONLY` |
| 4 | Manager Relationship Inactive | Active/Inactive 상태축 0 · 🔴`is_active` = **계정 상태**(`Db.php:1106`)이지 관계 상태 아님 | `CONTRACT_ONLY` |
| 5 | Manager Assignment Expired | Assignment·만료 양축 0(`effective_to`/`valid_to` **grep 0**) | `CONTRACT_ONLY` |
| 6 | Manager Subject Inactive | 고용 상태 0. ⚠️**인접 집행은 REAL**(`UserAuth.php:805` 로그인 차단 · `:1381` 세션 즉시 폐기)이나 **계정 축이지 고용 축이 아니다** | `CONTRACT_ONLY` |
| 7 | Manager Position Vacant | 🔴 **§68 #10 과 짝 — 오늘 실재하는 결함의 런타임 면**: `promoteManager:768-776` 강등 경로 0 → `manager_user_id=NULL` 이어도 전임자 `team_role='manager'` 로 **런타임 권한 통과**(`TeamPermissions.php:136`·`:618`). **Guard 로 잡을 Position 엔티티가 없어** 계약으로만 표현 | `CONTRACT_ONLY` |
| 8 | Tenant Mismatch | ⚠️**실 선례 有**: `createTeam:464`(422) · `Dependencies.php:91`(**매 홉 tenant 필터**) · `Catalog::approveQueue:2350`(테넌트 스코프). 🔴**단 반례도 有**: `admin_growth_approval` **`tenant_id` 컬럼 없음**(`AdminGrowth.php:142-149`) · 조회도 tenant 술어 없음(`:641`·`:1292`·`:1306`·`:1324`) · `menu_audit_log`·`menu_tree` **tenant_id 없음** | `CONTRACT_ONLY` |
| 9 | Legal Entity Policy Violation | Legal Entity 축 0(`ceo_name` = 프로필 평문 문자열 `UserAuth.php:306-307`) | `CONTRACT_ONLY` |
| 10 | Effective Date Outside Validity | 🔴 **as-of 질의 전례 0** — `kr_fee_rule.effective_from`(`Db.php:898`) 컬럼 有이나 `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 **최신승**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) · `as_of` 2건은 **응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`) | `CONTRACT_ONLY` |
| 11 | Self-reporting Detected | 선례 `Dependencies.php:29-31`(422) — 알고리즘 이식 가능 | `CONTRACT_ONLY` |
| 12 | Circular Reporting Detected | 선례 `Dependencies.php:79-100` + **쓰기 전 차단 `:32-34`** — ★경로 접두 `backend/src/Handlers/PM/`. 🔴`ChannelSync.php:955-962` **후보 아님**(조용한 절단) | `CONTRACT_ONLY` |
| 13 | Primary Manager Conflict | Primary 플래그·기간 축 0 → 충돌 판정 불가. 단일 칸은 **우연한 무충돌**(규칙 10) | `CONTRACT_ONLY` |
| 14 | Source Priority Conflict | **manager 보유 소스 0개** → 충돌 이전에 **무대상**. `VACUOUS` 이전에 무대상이므로 `CONTRACT_ONLY` | `CONTRACT_ONLY` |
| 15 | Manager Eligibility Failed | 🔴 **적격 술어 0** — 승인 4경로 어디에도 적격 판정 없음: `Mapping::approve:238-294`(**정족수 숫자뿐**) · `Catalog::approveQueue:2341-2365`(🔴**행위자를 읽지도 않는다** · `:2343` `requirePro` = **구독 플랜**) · `AgencyPortal::approveAgency:370`(`isTenantOwner` = 고정 역할이지 해석 아님) · `FeedTemplate::approveDraft:271`(라우트 게이트) | `CONTRACT_ONLY` |
| 16 | Manager Availability Blocked | Availability 축 0 — **Leave/OOO 전역 0**(`on_leave`·`out_of_office` 0) · **Suspension 전역 0**(`suspend` = `WorkspaceState.php:12` 말장난 1건) | `CONTRACT_ONLY` |
| 17 | Missing Manager Policy Exhausted | Missing Manager Policy 축 0 · 폴백 체인 개념 0 | `CONTRACT_ONLY` |
| 18 | Maximum Hierarchy Climb Exceeded | 🔴 **climb 대상 계층 0** — `parent_user_id` 순회는 **단일 홉**(`UserAuth.php:200-217` · `LIMIT 1` 1회 · 재귀 없음) · `team` 에 `parent_team_id` 없음. ★`Dependencies.php:84` `$depth<10000` 은 **깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 pop 마다) → **Maximum Depth 선례로 계산 금지** | `CONTRACT_ONLY` |
| 19 | Supervisory Path Missing | Path 축 0(Recursive CTE·Closure Table·Path Prefix **전부 0**) | `CONTRACT_ONLY` |
| 20 | Snapshot Missing | Snapshot 축 0. ★검색 오염: `snapshot` 최다 히트 = **CCTV JPEG 프레임**(`WmsCctv.php:45`) · `pm_baseline.captured_at` = **`snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → `KV_ONLY` | `CONTRACT_ONLY` |
| 21 | Snapshot Hash Invalid | ⚠️**해시 선례 有** — `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128` · SHA-256 `:197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`). 🔴**단 `menu_audit_log` 은 쓰기 체인만 실재·`verify()` 0** — AdminMenu `hash_equals` 0 · preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼(`:199-203`) 소실 → `created_at` DEFAULT(`:129`)가 덮어 재계산 불가 → **tamper-evident 아님**(`:18` 주석≠근거); **검증형(Invalid 판정) 정본 = `SecurityAudit::verify():56-68`**(`:64` hash_equals+prev_hash 교차). 스키마 복제 금지(`tenant_id` 없음) · **`lastHash()` 에 tenant 술어 없음** | `CONTRACT_ONLY` |
| 22 | Task Assignee Drift | Drift 비교 양변 0. `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` = **태스크 역할이지 매니저 아님** | `CONTRACT_ONLY` |
| 23 | Critical Reconciliation Drift | 🔴 **이중 공허** — 좌변(source)·우변(canonical) **양쪽 부재** → **자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형). **Canonical 선언이 선행** | `CONTRACT_ONLY` |
| 24 | Future Manager Change Activation Failed | 미래 예약 변경 축 0. ⚠️인접 = SMS 예약 워커(286차) — **도메인 상이** | `CONTRACT_ONLY` |
| 25 | Kill Switch 활성 | Kill Switch 축 0 · **`Db::envLabel()` 은 게이트가 아니다**(코드가 스스로 금지 `Db.php:51-54`) | `CONTRACT_ONLY` |

**실측 개수: 25 / 25 전사.**
측정기 분모 **25** · 원문 대조 **25** · 전사 **25** — **3자 일치.**
판정 분포: **`CONTRACT_ONLY` 25 / 25 (100%)** — **실 코드 0.**

## 2. 규칙

- 🔴 **25종 전건 `CONTRACT_ONLY`.** 이 문서는 **오늘 아무것도 차단하지 않는다.** "Guard 25종 확보"를 **차단 능력 확보**로 계산 금지.
- 🔴 **fail-open 복제 금지.** 신규 Guard 는 **fail-closed** 여야 한다. 현행 반례 2건: `index.php:508-545` 레이트리밋(**fail-open** · 주석 `:509-510` 자인: `api_key` 프로그래매틱 트래픽만 · **SPA/세션 경로 미도달**) · `app_user.is_active NOT NULL DEFAULT 1`(**미지 = 자동 가용**). §41 지원 상태 8종 중 **표현 가능 2종**이며 **`UNKNOWN` 조차 표현 불가**.
  - 🔴 **"레이트리밋 있음"으로 §78 을 닫지 마라** — 분모를 API 키 축으로 갈아끼우는 역산이다.
- 🔴 **#12 순환 Guard 의 참조 구현은 `backend/src/Handlers/PM/Dependencies.php` 하나뿐.** `ChannelSync.php:955-962`(조용한 절단) · `AdminMenu::wouldCycle:540-555`(`$visited` 없음) · `JourneyBuilder:511-518`(런타임 탐지이지 쓰기 전 차단 아님 · `:512` 주석이 스스로 자인) **전부 후보 아님**.
- 🔴 **#15 Eligibility 를 "현행이 Manager 자동상속을 안 하니 준수"로 읽지 마라**(규칙 10 적중) — **상속할 Manager 관계가 없어서**다. 동시에 **롤만으로 권한 자동부여 패턴은 실재**(`UserAuth.php:1064`·`TeamPermissions.php:136`) → Manager 축 신설 시 **즉시 #15 위반이 활성화**된다.
- 🔴 **#8 Tenant Mismatch — 통합 시 능력 소실 경고**(규칙 9): `Catalog::approveQueue` 는 `Mapping` 의 maker-checker(actor·정족수·자기승인차단)를 **전혀 갖지 않는다**. "중복 제거"로 포장하면 **`Mapping` 의 능력이 소실**된다.
- 🔴 **잠복 결함 경고** — `Alerting::actor:33-36` 은 여전히 `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백(**289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**)이며 `decideAction:591` 이 이 actor 를 그대로 기록한다(상태가드·자기승인차단·dedup·정족수 **전부 없음**). **`INSERT INTO action_request` grep 0 → 현재 도달 불가(VACUOUS)**이나 **생산자를 하나 붙이는 순간 위조가능 승인이 활성화**된다. Manager Guard 를 `Alerting` 경로에 배선하려면 **actor 축 선(先) 교정**이 필수.
- ⚠️ **회귀 커버리지 0** — manager/reporting 테스트 **전무**. `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인) · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 캠페인 계약키**(조직 team 아님 · 이름 함정). **Guard 구현 시 회귀 스위트 동반이 완료 조건.**
- 🔴 **본 문서는 코드변경 0.** 실 Guard 구현은 **별도 승인세션**.

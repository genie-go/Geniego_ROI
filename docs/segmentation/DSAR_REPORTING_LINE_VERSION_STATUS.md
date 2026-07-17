# DSAR — Reporting Line Version Status (§8)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §8 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 대전제 — **상태를 담을 엔티티가 없고, 현행 `status` 컬럼은 전부 무검증 자유문자열이다**

버전 엔티티가 `ABSENT`([DSAR_REPORTING_LINE_VERSION.md](DSAR_REPORTING_LINE_VERSION.md))이므로 14종 상태는 **정의상 존재할 수 없다**. 나아가 **본 레포에 상태 전이(state machine)를 강제하는 선례가 없다**:

| 현행 `status` | DDL | 강제 수단 | 판정 |
|---|---|---|---|
| `team.status VARCHAR(20) DEFAULT 'active'` | `TeamPermissions.php:148`/`:168` | **ENUM/CHECK/`in_array` 0** · 전이 규칙 0 | 자유문자열 |
| `ml_models.status VARCHAR(30) DEFAULT 'active'` | `ModelMonitor.php:36` | 동일 · 값은 **데모 시드 하드코딩**(`'active'`,`'retraining'` `:297-301`) | 자유문자열 |
| `catalog_writeback_job.status` | `Catalog.php` — `pending_approval` 실경로 | ✅**상태를 판독해 집행 분기**(`approvalCreate:2275`→`approveQueue:2341`→집행 `:2362`) | **유일한 준-상태기계** |
| `action_request.status` | `Alerting.php` | 🔴**`:612` 에서 SELECT 하고도 어디서도 판독 안 함** → `pending`·`rejected` 도 실집행(승인 우회) · `INSERT INTO action_request` **grep 0 → `VACUOUS`** | **가짜 상태** |

★**규칙 11 적중** — *"현행 status 열거에 DRAFT 가 없다"* 는 **무효 논증**이다. 열거가 **코드로 강제되지 않으므로**(ENUM/CHECK/화이트리스트 0) 누구든 임의 문자열을 넣을 수 있다. **능력축(전이 강제·판독 분기 유무)으로만 논증하라.**

### ★14종 상태가 요구하는 3계층 — **현행 보유 0 / 1 / 0**

| 계층 | §8 상태 | 현행 |
|---|---|---|
| **검증** | VALIDATION_PENDING · VALIDATION_FAILED | 🔴 **보고선 Lint/Guard = `CONTRACT_ONLY`**(§3.1 §58 Lint 28 + §59 Guard 24 **전건**) · 순환탐지는 **6방식 중 2/6**(아래) |
| **승인** | REVIEW_PENDING · APPROVAL_PENDING · APPROVED | ⚠️ 승인 4종 중 **2 REAL** — 단 **Review/Approval 미분화**(`reviewed_by` grep 0) |
| **시점** | SCHEDULED · ACTIVE · SUPERSEDED · RETIRED · ARCHIVED | 🔴 **`effective_from`/`effective_to` 질의 계층 0** → 예약·승계·퇴역을 **시간으로 판정할 수단 없음** |

### 순환탐지 실측 — **§57 6방식 중 2/6 · 도메인만 다름** (VALIDATION_FAILED / BLOCKED 직결)

| §57 요구 | 실재 | 증거 |
|---|---|---|
| **DFS** | ✅ | **`backend/src/Handlers/PM/Dependencies.php:79-100`** — 반복형 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`(422 `cycle_detected`)** + self-loop `:29-31` |
| **Topological Sort** | ✅ | **`backend/src/Handlers/PM/Gantt.php:104-125`** — Kahn · `:119` `count($topo)!==count($taskMap)` 정석 · `:120-125` **500 아닌 부분결과+경고 degrade**. ⚠️**탐지 후 차단 안 함**(읽기 경로) |
| Recursive CTE / Closure Table / Graph Query / Path Prefix | ❌ | 전부 0 |

- 🔴 **★경로 접두 필수**: `backend/src/Handlers/PM/…` (**`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파)
- ★**`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → §57 "Maximum Depth"로 계산하면 오판
- ★**`:90-91` 이 `dep_type` 을 술어에 안 넣어 전 타입 무차별 순회** → **§11 Manager Type 27종별 순환정책 표현 불가** · 🔴**`pm_task_dependencies` 스키마 복제 금지**
- **그 외 순환 코드 3건 전부 §57 미달**: `AdminMenu::wouldCycle:540-555`(`$visited` 없음 · `menu_tree` **tenant_id 없음**) · `JourneyBuilder:511-518`(**런타임 탐지이지 쓰기 전 차단 아님** · `:512` 주석이 자인) · 🔴**`ChannelSync.php:955-962` 는 순환 검출기가 아니다**(`$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**) — **§57 후보 계산 금지**
- **§58 Cycle 처리 11요구 중 실재 2**(관계 활성화 차단 `Dependencies:32-34` · Audit Event `:48-54`)

## 1. 원문 전사 + 판정 — **원문 14종**

원문 §8 `상태:` (spec `:561-576`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DRAFT | 초안 상태 부재 — 인접 `FeedTemplate::approveDraft:271` 은 **라우트 게이트만**(행위자·정족수·상태전이 0) | `ABSENT` |
| 2 | VALIDATION_PENDING | 검증 큐 개념 0 · 보고선 Lint/Guard **`CONTRACT_ONLY`**(§58 Lint 28 + §59 Guard 24 전건) | `ABSENT` |
| 3 | VALIDATION_FAILED | 인접 = `Dependencies.php:32-34` **쓰기 전 차단 422 `cycle_detected`** — ✅**REAL 이나 PM 태스크 의존 도메인**(보고선 아님) · §57 **6방식 중 2/6** | `LEGACY_ADAPTER` |
| 4 | REVIEW_PENDING | **Review/Approval 미분화** — `reviewed_by` grep 0 · 리뷰 단계 0. 🔴`pm_task_assignees.role` 의 `'reviewer'`(migration `…168_005`)는 **태스크 역할**이지 버전 리뷰어 아님 | `ABSENT` |
| 5 | APPROVAL_PENDING | ✅**유일한 실재 선례** = `catalog_writeback_job.status='pending_approval'` — **282차 근본수정** · 실경로 `approvalCreate:2275`→`approveQueue:2341`(테넌트 스코프 `:2350`)→**집행 `processWritebackQueue:2362`** · 정책 게이트 `evaluatePolicy`→`requires_approval`(`:2247`). 🔴**단 `Catalog::approveQueue:2341-2365` 는 행위자를 읽지도 않는다**(`:2343` `requirePro` = **구독 플랜 게이트**) | `LEGACY_ADAPTER` |
| 6 | APPROVED | 인접 = `Mapping::approve:238-294` **REAL**(289차 G-01: 신원 fail-closed `:246-250` · 자기승인 차단 `:268-271` · dedup `:278-283` · 정족수 `:287`). 🔴**그러나 정족수 유일 생산자 `:210` 이 리터럴 `2` 하드코딩** — 요청자·금액·위험도 무엇에도 반응 안 함 = **5-3-3-1 D-13 `'baseline'` 라벨과 동형**(규칙 7). 🔴`Alerting::decideAction:591-595` = **단일 결정으로 즉시 approved** = **정족수를 표시하나 집행하지 않음**(`VACUOUS`) | `LEGACY_ADAPTER` |
| 7 | SCHEDULED | 🔴**예약 활성화 수단 0** — `effective_from` 질의 계층이 없다(`WHERE effective_from <= :as_of` **전역 0**). ⚠️인접 = SMS 예약 워커(286차 신설) — **발송 도메인**이지 버전 예약 아님 | `ABSENT` |
| 8 | ACTIVE | `menu_defaults` 판독 `AdminMenu.php:584` = `ORDER BY created_at DESC LIMIT 1` **최신승**이지 ACTIVE 선택 아님 · `team.status DEFAULT 'active'`·`ml_models.status DEFAULT 'active'` = **기본값 문자열**. ★§8:578 *"Active Version을 직접 수정하지 마라"* **강제 수단 0** | `NAME_ONLY` |
| 9 | ACTIVE_WITH_WARNINGS | ✅**부분결과+경고 degrade 선례 실재** = `Gantt.php:120-125`(순환 탐지 시 **500 아닌 부분결과+경고**) — **읽기 경로 · PM 도메인**. ⚠️**탐지 후 차단은 안 함** | `LEGACY_ADAPTER` |
| 10 | SUPERSEDED | 승계 개념 0 — `previous_version_id` **grep 0** → **무엇이 무엇을 대체했는지 선언할 수단 없음**. 🔴**정면 반례**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이전 이력을 소거**(§55 위반) | `ABSENT` |
| 11 | SUSPENDED | 🔴**`suspend` grep = 말장난 1건**(`WorkspaceState.php:12` **"belt-and-suspenders"**) — **Suspension 개념 전역 0**. 🔴**함정**: `locked_until` ≠ 정지(`login_attempt` `UserAuth.php:3335`·`agency_login_attempt` `AgencyPortal.php:179` = **무차별 대입 스로틀** · 키가 `ident`(**user_id 아님**) · 분 단위 자동 해제) | `ABSENT` |
| 12 | RETIRED | 퇴역 개념 0 · `effective_to`·`valid_to` **grep 0** → 종료 시점을 선언할 수단 없음 | `ABSENT` |
| 13 | ARCHIVED | 아카이브 개념 0 · `deleted_at` **전역 0**(soft-delete 선례조차 없음) | `ABSENT` |
| 14 | BLOCKED | 인접 = `Dependencies.php:32-34` **쓰기 전 차단 422**(✅REAL · PM 도메인). 🔴**보고선 축의 차단 대상 4종이 전부 표현 불가** — `BLOCKED_CROSS_TENANT`(교차 관계 0) · `BLOCKED_CIRCULAR_REPORTING`(recursive manager query **0개라서 순환 0** — ★규칙 10 적중) · `BLOCKED_HISTORICAL_INTEGRITY_RISK`(이력 0) · `BLOCKED_MANAGER_ELIGIBILITY`(적격 술어 **0** — 승인 4경로 전량 정족수(숫자)뿐) | `LEGACY_ADAPTER` |

**측정기 분모: 38(§8 전체) / 원문 대조: 필수 필드 24 + 상태 14 = 38 / 본 편 전사: 14.** 잔여 24는 [DSAR_REPORTING_LINE_VERSION.md](DSAR_REPORTING_LINE_VERSION.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 8 · `LEGACY_ADAPTER` 5 · `NAME_ONLY` 1.

> ★**원문 §8 의 상태 목록은 `evidence` 로 끝나지 않는다**(spec `:576` = `BLOCKED` 가 마지막). **규칙 4 반대편향 방지 준수 — `evidence` 를 추가하지 않았다.** (`evidence` 는 §8 **필수 필드** 목록 `:559` 의 마지막 항목이며 그쪽에서 전사했다.)

## 2. 규칙

- 🔴 **14종 중 `ABSENT` 8 을 "현행이 단순해서"로 읽지 마라(규칙 10).** 상태가 2개(`active` 기본값)인 것은 **정책이 아니라 상태기계가 없어서**다. 이를 "충분함"으로 계산하면 §8 전체가 정의상 충족되어 갭이 소멸한다.
- 🔴 **`status VARCHAR` + 주석으로 14종을 선언 금지**(규칙 8·11). `team.status`·`ml_models.status` 가 정확히 그 실패 사례이며, `group_type`(`ChannelRegistry.php:12`·`:79`)에서는 **주석에 없는 실값 `support` 가 존재**한다. 열거는 **ENUM/CHECK 또는 `in_array` 화이트리스트로 강제**하고, **전이 표(from→to)를 코드로 판독**하라.
- 🔴 **`action_request` 를 상태 참조 구현으로 삼지 마라** — `Alerting.php:612` 가 `status` 를 **SELECT 하고도 판독하지 않아** `pending`·`rejected` 도 실집행된다(**승인 우회**). 현재 `INSERT INTO action_request` **grep 0 → `VACUOUS`** 이나, **생산자를 하나 붙이는 순간 활성 결함**이 된다. 🔴 같은 경로의 `Alerting::actor:33-36`(**`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백 = 위조가능**)까지 함께 활성화된다.
- ✅ **`APPROVAL_PENDING`(#5) 참조 구현 = `catalog_writeback_job`**(상태를 판독해 집행 분기 — 본 레포 **유일한 준-상태기계**). 🔴 **단 maker-checker 는 `Mapping` 에서 가져와라** — `Catalog::approveQueue` 는 **행위자·정족수·자기승인 차단을 전혀 갖지 않는다**. **"중복 제거"로 포장해 통합하면 `Mapping` 의 능력이 소실된다**(규칙 9).
- 🔴 **`catalog_writeback_approval` 테이블(`Catalog.php:86`·`:126` CREATE 뿐 · INSERT/SELECT 0 · 주석 `:2269-2272` 가 스스로 자인)은 고아가 맞다.** **테이블은 죽었고 능력은 살아 있다** — "테이블 고아 = 축 미달"로 계산하면 규칙 7 위반.
- 🔴 **`BLOCKED`(#14) 4종을 `Dependencies.php` 스키마 복제로 구현 금지** — `:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회**한다. 이 결함을 물려받으면 **Manager Type 별 순환정책이 설계 시점에 이미 불가능**해진다. **알고리즘(반복형 DFS + `$visited` + tenant 필터 매 홉 + 쓰기 전 422)만 이식**하라.
- 🔴 **`ChannelSync.php:955-962` 를 순환 검출기로 계산 절대 금지** — `$visited` 없이 **깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**(가짜 녹색).
- 🔴 **`SCHEDULED`(#7)·`SUPERSEDED`(#10)·`RETIRED`(#12)는 `effective_from`/`effective_to` **질의 계층**이 선결**이다. `kr_fee_rule.effective_from`(`Db.php:898`)처럼 **컬럼만 붙이고 질의를 안 넣으면**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 최신승) 세 상태가 **영원히 라벨**로 남는다.
- 🔴 **`ACTIVE`(#8) 보호가 §8:578 의 명시 요구다** — 현행 강제 수단 0. `previous_version_id` 없이는 "직접 수정"과 "새 버전 발행"을 **구분조차 못 한다**.
- ★**회귀 커버리지 0** — `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 한계 자인) · `scenarios.mjs` 매니저 0. **가드 등급 3단**: `WIRED(pre-commit·로컬)`(★`core.hooksPath`=`.githooks` 는 **본 클론만** · `--no-verify` 우회 가능 → **보장 아님**) / `WIRED(CI·탐지)` / 🔴**`ENFORCED(예방)` = 현행 부재**(브랜치 보호+required check 미설정 G-06b).

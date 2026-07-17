# Approval Chain — 테스트 범위

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §69 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §69. 테스트 범위 (원문 줄 3157-3261 · 분모 80)

**전제(실측)**: 이 레포에는 **테스트 스크립트가 없다** — `npm test` 없음 · PHPUnit 스위트 없음 · 검증은 수동/배포. 실재하는 자동 검증 = `tools/e2e/`(`smoke.mjs` 476줄 · `render.mjs` · `scenarios.mjs` · `package.json:4-6` `e2e`/`e2e:render`/`e2e:scenario`).
🔴 **승인 축 자동 검증 전체 = `tools/e2e/smoke.mjs:42` 1줄**(`'/api/v423/approvals'` 가 `GET_ENDPOINTS` 배열에 포함). 그 검사는 `:148` `r.s >= 500 && r.s !== 503` 만 실패로 본다 — **HTTP 상태만 확인**하며 응답 내용·승인 의미론을 검증하지 않는다. `smoke.mjs:80-91` `CONTRACT`(키 회귀 가드 10건)에 승인 엔드포인트는 **없다**. `tools/e2e` 전체에서 `approval|approve|승인` grep = **`smoke.mjs:42` 단 1히트**.

#### Unit Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Chain Definition 생성 | 단위 테스트 스위트 0(PHPUnit 부재 · `npm test` 부재) · 대상 기능 0 | ABSENT |
| 2 | Chain Version 생성 | 상동 | ABSENT |
| 3 | Template 생성 | 상동 | ABSENT |
| 4 | Stage 생성 | 상동 | ABSENT |
| 5 | Level 생성 | 상동 | ABSENT |
| 6 | Route Node·Edge 생성 | 상동. 인접 기능(`GraphScore.php:44` `upsertNode` / `:107` `upsertEdge`)도 테스트 0 | ABSENT |
| 7 | START·Terminal 검증 | 상동. START/Terminal 노드 타입 개념 `backend/src` 0 | ABSENT |
| 8 | Cycle Detection | 테스트 0. 🔴 **검증 대상 알고리즘은 실재하나 무테스트** — `backend/src/Handlers/PM/Dependencies.php:79-100`(반복 DFS + `$visited:81` + tenant 필터 `:91` 매 홉 + `:84` `$depth<10000` 상한) · 쓰기 전 차단 `:32-34` 422 `cycle_detected` · self-loop `:29-31` | ABSENT |
| 9 | Reachability | 테스트 0. 알고리즘 실재·무테스트 — `backend/src/Handlers/PM/Gantt.php:119` `count($topo)!==count($taskMap)` + `:120-125` 부분결과+경고 degrade | ABSENT |
| 10 | Branch Validation | 테스트 0 · Branch 검증기 0(`JourneyBuilder` `split:610` 은 **배타 택일**만) | ABSENT |
| 11 | Merge Validation | 테스트 0 · Merge 개념 `backend/src` 0 | ABSENT |
| 12 | Applicability Match | 테스트 0 · Applicability 0(최근접 = `Catalog.php:1016` `HIGH_VALUE_KRW` 상수 + `:1103-1105`) | ABSENT |
| 13 | Priority Selection | 테스트 0 · Priority 축 0(★오탐 `source_priority` = `DataPlatform.php:65`,`:184` Trust 우선순위) | ABSENT |
| 14 | Specificity Selection | 테스트 0 · Specificity 개념 0 | ABSENT |
| 15 | Override Overlay | 테스트 0 · Chain Override 0(★오탐 `override` = `Mmm.php:381-382` · `OrderHub.php:1274` 스칼라 선행순위) | ABSENT |
| 16 | Fallback Sequence | 테스트 0 · Fallback 개념 0 | ABSENT |
| 17 | Effective Period | 테스트 0 · 시점 축 0(`WHERE effective_from <= :as_of` 전역 0 · `effective_to`/`valid_from`/`valid_to` grep 0) | ABSENT |
| 18 | Snapshot Hash | 테스트 0. 해시 검증기 선례 = `backend/src/SecurityAudit.php:56-68` `verify()` `hash_equals` — 자체 테스트 0 · Chain Snapshot 0 | ABSENT |
| 19 | Compilation Hash | 테스트 0 · Compilation Artifact 0 | ABSENT |

#### Integration Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 20 | Organization Hierarchy Reference | 테스트 0 · `ORGANIZATION_*` 이름·능력 양쪽 0 · `ORG_PRESET` = `TeamPermissions.php:706-722` PHP 상수 15줄 | ABSENT |
| 21 | Reporting Line Reference | 테스트 0. 🔴 Manager Resolver 자체가 ABSENT — 상급자(사람)를 반환하는 함수 0 · `parent_user_id` 전 4 생성경로가 owner 하드고정(`UserAuth.php:1225-1227`,`:1549`,`:1576` · `EnterpriseAuth.php:502`) | ABSENT |
| 22 | Workflow Definition Reference | 테스트 0. `journeys.nodes`/`edges`(`JourneyBuilder.php:35-41`)는 **무검증 `json_encode`**(`createJourney:135`)이며 통합 테스트 0 | ABSENT |
| 23 | Approval Request → Chain Selection | 테스트 0 · Chain Selection 기능 0 | ABSENT |
| 24 | Approval Case → Chain Snapshot | 테스트 0 · Chain Snapshot 0 | ABSENT |
| 25 | Template → Chain Version | 테스트 0 · Template 0 | ABSENT |
| 26 | Future Chain Activation | 테스트 0 · 미래시점 예약 0 | ABSENT |
| 27 | Override Start·End | 테스트 0 · Override 0. 🔴 인접 반례 = `AgencyPortal.php:304`,`:381` 이 `revoked_at=NULL` 로 이전 해지시각 소거 | ABSENT |
| 28 | Fallback Resolution | 테스트 0 · Fallback 0 | ABSENT |
| 29 | Chain Change Impact | 테스트 0 · 영향분석 0 | ABSENT |
| 30 | Reconciliation | 테스트 0 · Reconciliation 0 | ABSENT |
| 31 | Cache Invalidation | 테스트 0. 🔴 **무효화할 캐시가 없다** — Redis/Memcached `backend/src` 0(★오탐 `redis` = `Payment.php:817` `totalBeforeDisc`) · `apcu_*` = `SystemMetrics.php:225-455` 지표 전용 | ABSENT |

#### Property Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 32 | Route Graph Acyclic | 속성 테스트 프레임워크 0 · 테스트 0. 🔴 `GraphScore.php:107` `upsertEdge` **acyclicity 검사 없음** → 불변식 자체가 미강제 | ABSENT |
| 33 | START Node 정확히 하나 | 테스트 0 · START 노드 개념 0 | ABSENT |
| 34 | Required Node Reachable | 테스트 0 | ABSENT |
| 35 | Required Node에서 Terminal Reachable | 테스트 0 · Terminal 개념 0 | ABSENT |
| 36 | Tenant Isolation | 테스트 0. 🔴 위반이 실재 — `admin_growth_approval` **`tenant_id` 컬럼 없음**(`AdminGrowth.php:142-149`) · 조회 `:1324` `WHERE id=?` tenant 술어 없음 · `AdminMenu::wouldCycle:540-555` tenant_id 없음(`:107-118`) | ABSENT |
| 37 | Active Version Immutability | 테스트 0 · version 축 0(`menu_defaults.version` = 리터럴 `'baseline'` `AdminMenu.php:309`) | ABSENT |
| 38 | Snapshot Determinism | 테스트 0 · Snapshot 0 | ABSENT |
| 39 | Effective Period Non-overlap | 테스트 0 · Effective Period 0 | ABSENT |
| 40 | Selection Determinism | 테스트 0 · Chain Selection 0. 인접 선례 = `JourneyBuilder::pickWeighted:725-734` `(($seed*2654435761)+1)%100000` **enrollId 해시 결정론적 분배**(주석 `:610-611`) — 무테스트 · 🔴 `:729` `if ($total<=0) return $keys[0]` 첫 키 폴백 | ABSENT |
| 41 | 동일 입력·동일 Version Set의 동일 결과 | 테스트 0 · Version Set 0 | ABSENT |
| 42 | Fallback Termination | 테스트 0 · Fallback 0 | ABSENT |

#### Concurrency Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 43 | 동일 Chain Version 동시 생성 | 동시성 테스트 0(`tools/e2e/smoke.mjs:145` `pool(...,5)` 은 **동시성 5 스윕**이지 경쟁 검증 아님) · 대상 기능 0 | ABSENT |
| 44 | 동일 Scope Chain 동시 활성화 | 테스트 0 · 대상 0 | ABSENT |
| 45 | 동일 Priority 동시 등록 | 테스트 0 · 대상 0 | ABSENT |
| 46 | Future Scheduler 중복 실행 | 테스트 0 · 스케줄러 축 0(예약 워커 선례 = SMS 예약 워커 286차 · Chain 축 0) | ABSENT |
| 47 | Override 동시 생성 | 테스트 0 · 대상 0 | ABSENT |
| 48 | Snapshot 동시 생성 | 테스트 0 · 대상 0 | ABSENT |
| 49 | Compilation 동시 실행 | 테스트 0 · 대상 0 | ABSENT |
| 50 | Cache Invalidation 경쟁 | 테스트 0 · 캐시 계층 0 | ABSENT |

#### Security Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 51 | Cross-Tenant Chain 조회 | 테스트 0 · 대상 0. `smoke.mjs` 는 단일 계정 로그인(`:126-128`)이라 교차테넌트 시나리오 자체가 없음 | ABSENT |
| 52 | Cross-Tenant Node 참조 | 테스트 0 · 대상 0 | ABSENT |
| 53 | Unauthorized Chain Activation | 테스트 0 · 대상 0 | ABSENT |
| 54 | Unauthorized Override | 테스트 0 · 대상 0 | ABSENT |
| 55 | Unauthorized Retroactive Correction | 테스트 0 · Retroactive 수단 0(`ensureTables` 는 백필 0) | ABSENT |
| 56 | Active Version 변조 | 테스트 0 · 대상 0 | ABSENT |
| 57 | Snapshot 변조 | 테스트 0 · 대상 0. 변조 검증기 정본 선례 = `SecurityAudit.php:56-68`(`hash_equals`) — 🔴 `menu_audit_log.hash_chain` 은 preimage `'ts'=>date('c')`(`AdminMenu.php:195`) vs 저장 `created_at ... DEFAULT CURRENT_TIMESTAMP`(`:129`) → **재구성 불가한 장식** · `hash_equals` grep 0 | ABSENT |
| 58 | Unsafe Expression Injection | 테스트 0. ⚠️ 현행 표면은 좁다 — `RuleEngine.php:24` 연산자 화이트리스트(`OPS:33` · `compare:433-439`) · **`eval` 미사용** · `eval`/`create_function`/`system` `backend/src` **0**. 그러나 이를 검증하는 테스트 0 | ABSENT |
| 59 | Fixed Subject 권한 상승 | 테스트 0. 🔴 관련 실결함 실재 — `data_scope` 개인(member) 범위가 강제 경로에 도달 못함(`TeamPermissions::effectiveScope:253` 이 `'user'` 조회 · 쓰기는 `'member'` `:653` → 영구 0행 → `:256` **null(무제한)**) · `subject_type` 열거 강제 없음(`replacePerms:325`/`replaceScope:337` 무검증 인자) | ABSENT |
| 60 | Chain을 통한 Authority 자동 상승 방지 | 테스트 0 · 대상 0. 🔴 선결 미결 — `$roleRank`(`backend/public/index.php:554`) ↔ `team_role` 매핑 코드 전수 0 · `acl_permission.approve`(`TeamPermissions::ACTIONS:39` · `seedOrg:711` 시드)를 읽어 승인 가부를 판정하는 코드 0 | ABSENT |

#### Performance Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 61 | 대량 Chain Applicability 검색 | 성능 테스트 0(`tools/e2e/` 3파일 어디에도 부하·지연 측정 없음) · 대상 0 | ABSENT |
| 62 | 대량 Candidate Selection | 테스트 0 · 대상 0 | ABSENT |
| 63 | 복잡한 DAG Compilation | 테스트 0 · Compilation 0 | ABSENT |
| 64 | 최대 허용 Node·Edge Route | 테스트 0 · 상한 정책 0. 인접 상한 = `Dependencies.php:84` `$depth<10000` · `AdminMenu::wouldCycle:540-555` `$depth<100`(🔴 `$visited` 없음) — 무테스트 | ABSENT |
| 65 | 다중 Branch·Merge | 테스트 0 · Merge 0 | ABSENT |
| 66 | Historical Version 조회 | 테스트 0 · 대상 0 | ABSENT |
| 67 | Snapshot 조회 | 테스트 0 · 대상 0 | ABSENT |
| 68 | Cache Hit·Miss | 테스트 0 · 캐시 계층 0 | ABSENT |
| 69 | Concurrent Resolution | 테스트 0 · Resolution 0 | ABSENT |

#### Regression Test

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 70 | 기존 Single Approval | 🔴 **HTTP 상태 확인만** — `tools/e2e/smoke.mjs:42` `'/api/v423/approvals'` 가 `GET_ENDPOINTS` 에 포함되고 `:148` 이 `>=500`(503 제외)만 실패 처리 · `:80-91` `CONTRACT` 키 회귀 가드에는 **미포함** → 응답 내용·승인 의미론 **미검증**. ⚠️ 게다가 그 엔드포인트가 읽는 `action_request` 는 **VACUOUS**(`INSERT INTO action_request` 전수 0) → **영원히 빈 테이블을 200 으로 반환**하는 것을 회귀 통과로 계산 중 | PARTIAL |
| 71 | 기존 Multi-Level Approval | 테스트 0. 대상 기능도 미달 — `required_approvals` 유일 생산자 = `Mapping.php:209-210` **리터럴 `2`** + `Db.php:634` `DEFAULT 2`(UPDATE·설정 API·타 INSERT 전수 0) · 🔴 `Db.php:592-600` `action_request` 엔 `required_approvals` **컬럼 자체가 없다**(`Alerting.php:562` 는 응답 투영 리터럴) · `Alerting::decideAction:591-595` **단일 결정 즉시 approved** | ABSENT |
| 72 | 기존 Workflow Definition | 테스트 0. `journeys` MEDIUMTEXT(`JourneyBuilder.php:36`) 무검증 저장 · `tools/e2e` 에 journey 계약 검증 0(`smoke.mjs:80-91` CONTRACT 10건에 미포함) | ABSENT |
| 73 | 기존 Workflow Task | 테스트 0. `pm_tasks` 축 회귀 검증 0 | ABSENT |
| 74 | 기존 Manager Approval | 테스트 0 · **대상 기능 0** — Manager Resolver ABSENT(상급자 반환 함수 0) · `team.manager_user_id`(`TeamPermissions.php:148`) 판독자 = `:444-445` 표시용 `manager_name` 투영 1개소뿐(승인 판독 0) | ABSENT |
| 75 | 기존 Finance Approval | 테스트 0 · 대상 도메인 0 | ABSENT |
| 76 | 기존 Legal Approval | 테스트 0 · 대상 도메인 0(Legal Entity 이름·능력 0 · 유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 77 | 기존 Role Assignment | 테스트 0. 대상 실재 — `TeamPermissions::putMemberPermissions:614-661`(상한 `assignableMap:354` → `:639` 초과 시 403 `DELEGATION_EXCEEDED` `:645-646` · `clampActions:396` · `reclampTeamMembers:586`) — **레포 최상급 위임 선례이나 자동 회귀 검증 0** | ABSENT |
| 78 | 기존 Notification | 테스트 0. `tools/e2e` 에 발송 축 계약 검증 0 | ABSENT |
| 79 | 기존 Audit | 테스트 0. 감사 회귀 검증 0 — 🔴 `Catalog::approveQueue` 감사 자체가 0(클래스에 audit 함수 부재) · `Dependencies.php:32-34` 순환 탐지 시 `:48` auditLog 미도달(422 조기반환) → **회귀가 없는 게 아니라 관측되지 않는다** | ABSENT |
| 80 | 기존 API Compatibility | 계약 회귀 가드 실재·승인 축 미포함 — `tools/e2e/smoke.mjs:80-91` `CONTRACT` **10건**(rollup/meta-ads/line/graph-score/instagram/pg-settlements/web-popups) 키 누락 시 실패(`:173-174`) + `:37-...` `GET_ENDPOINTS` 500 스윕(`:148`) + `tools/e2e/render.mjs:27`,`:47` `deriveRoutes()`(281차 **119라우트 자동도출 + 무음사망 탐지**). 승인 API 는 CONTRACT 미포함 | PARTIAL |

---

## 2. 설계 계약

### 2.1 테스트 인프라 자체가 선행 산출물이다

§69 는 80항의 테스트를 요구하나 이 레포에는 **테스트 스크립트가 없다**. 따라서 §69 이행은 "테스트 작성"이 아니라 **테스트 인프라 신설 + 테스트 작성** 2단계다.

| 테스트 유형 | 필요 인프라 | 현행 |
|---|---|---|
| Unit(19) | PHP 단위 테스트 러너(PHPUnit 등) | **0** — `backend/composer.json` require-dev 없음 |
| Integration(12) | DB 픽스처 + 격리 테넌트 | **0** — 실서버 대상 `tools/e2e` 만 |
| Property(11) | 속성 기반 테스트 러너 | **0** |
| Concurrency(8) | 병렬 클라이언트 + 경쟁 유도 | **0**(`smoke.mjs:145` 동시성 5 는 스윕용) |
| Security(10) | 다중 테넌트·다중 역할 계정 | **0** — `smoke.mjs:126-128` 단일 계정 로그인 |
| Performance(9) | 부하·지연 측정 | **0** |
| Regression(11) | 계약 키 가드 | **부분 실재** — `smoke.mjs:80-91` 10건 · `render.mjs` 119라우트 |

**계약 C-69-1**: Chain 구현 착수 전 **최소 Unit + Integration 러너**를 세운다. `tools/e2e` 는 배포된 실서버를 때리는 스모크이므로 **Unit·Property 를 여기에 얹지 마라**(§69-32~42 는 순수 함수 축이며 서버 없이 검증 가능해야 한다).

### 2.2 재사용 선례 (신설 금지 · 확장할 것)

**C-69-2 (DAG 검증 테스트의 대상).** §69-8/9/32 의 검증 대상 알고리즘은 이미 실재하므로 **알고리즘을 추출·재사용**하고 테스트를 그 위에 얹는다:
- Cycle Detection = `backend/src/Handlers/PM/Dependencies.php:79-100`(반복 DFS · `$visited:81` · **tenant 필터 `:91` 매 홉** · 쓰기 전 차단 `:32-34` 422).
- Topological/Reachability = `backend/src/Handlers/PM/Gantt.php:104-122`(Kahn · `:119` 고립 판정 · `:120-125` degrade).
- 🔴 **경로 표기 주의**: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다.**
- 🔴 **스키마 복제 금지**(`Dependencies.php:90-91` `dep_type` 술어 부재를 동반 이식하지 마라).
- 🔴 **`:32-34` 의 감사 공백을 복제 금지** — 순환 탐지 시 `:48` auditLog 에 도달하지 못한다. §69-79("기존 Audit" 회귀) 테스트는 **거부 경로의 감사 이벤트**를 반드시 포함해야 한다.

**C-69-3 (계약 회귀 가드 확장).** §69-70/80 은 `tools/e2e/smoke.mjs:80-91` `CONTRACT` 배열의 **확장**으로 이행한다(신규 스모크 스크립트 신설 금지). 승인 엔드포인트를 `GET_ENDPOINTS`(상태만)에서 `CONTRACT`(키 검증)로 **승격**하는 것이 최소 개선이다.

**C-69-4 (render.mjs).** `tools/e2e/render.mjs:27`,`:47` `deriveRoutes()` 는 119라우트 자동도출 + 무음사망 탐지(281차)다. Chain 관리 UI 신설 시 **자동 도출 대상에 포함되는지 확인**하고, 도출이 조용히 실패하지 않는지 검증한다(`:50` 주석이 과거 동일 사고 기록).

### 2.3 CI 가 테스트를 실행하지 않는다

`.github/workflows/deploy.yml` = EN locale 구문가드 → build → SCP → chown/reload → 로그인 스모크. 🔴 **모든 SSH/테스트/Slack 스텝이 시크릿 존재 여부에 게이트**되어 있고 **시크릿이 미등록**이므로 **CI 는 빌드만 수행(inert)**한다. 또한 `paths-ignore` 로 **`frontend/**` 변경만 트리거**된다 → **`backend/**` 변경은 CI 가 아예 돌지 않는다.

**계약 C-69-5**: §69 의 80항을 작성해도 **CI 가 자동 실행하지 않는다**. 테스트 도입은 (ⓐ)러너 신설 (ⓑ)CI 워크플로에 backend 트리거 추가 (ⓒ)시크릿 등록 — 3건이 함께 가야 실효가 있다. **(ⓑ)(ⓒ)는 배포 파이프라인 변경이므로 사용자 승인 대상.**

### 2.4 가짜 녹색 방지 (§69-70 의 교훈)

§69-70 이 PARTIAL 인 근거 자체가 **가짜 녹색의 표본**이다:
- `smoke.mjs:42` 가 `/api/v423/approvals` 를 200 으로 확인 → "승인 회귀 통과"처럼 보인다.
- 그러나 그 엔드포인트가 읽는 `action_request` 는 **생산자 0**(`INSERT INTO action_request` 전수 0) → **영원히 빈 테이블**.
- 🔴 그리고 `docs/IMPLEMENTATION_STATUS.md:130` 이 *"Approvals 실집행(가짜 로컬→실 Alerting action_request)"* 을 **완료로 기록**하고 있다 — §72-25("미구현을 구현 완료로 기록하지 마라") **위반이 정본에 실재**.

**계약 C-69-6**: Chain 테스트는 **"200 이 왔다"를 통과로 계산하지 마라.** 최소 (ⓐ)의미 있는 행이 실제로 생성됐는지 (ⓑ)응답 키 계약 (ⓒ)거부 경로가 거부되는지 — 3축을 검증한다. 특히 **VACUOUS 판정(생산자 0)을 스모크가 감지할 수 있어야 한다**(빈 배열 200 을 실패로 볼 조건을 명시).

---

## 3. 미결·선행조건

### 3.1 분모 대조

| 섹션 | 원문 줄 | 분모 | 표 행 수 | 일치 |
|---|---|---|---|---|
| §69 | 3157-3261 | 80 | 80 | ✓ |

내역: Unit 19 + Integration 12 + Property 11 + Concurrency 8 + Security 10 + Performance 9 + Regression 11 = **80**.

### 3.2 판정 분포

| 판정 | 건수 | 비고 |
|---|---|---|
| PARTIAL | 2 | #70(기존 Single Approval — 상태만) · #80(기존 API Compatibility — CONTRACT 10건·승인 미포함) |
| ABSENT | 78 | |
| **cover(`VALIDATED_LEGACY`)** | **0** | |

### 3.3 BLOCKED_* 선행조건

| 대상 | 선결 |
|---|---|
| §69 Unit(19) · Property(11) | **테스트 러너 신설**(PHPUnit 등 · `backend/composer.json` require-dev 0). 인프라 없이 항목만 문서화하면 §72-25 위반 재발. |
| §69 Security(10) | **다중 테넌트·다중 역할 테스트 계정**. `smoke.mjs:126-128` 은 단일 계정. + **권한 축 2벌 분열 해소**(`index.php:554` `$roleRank` ↔ `team_role` 매핑 0)가 #60 의 선결. |
| §69-31 Cache Invalidation | **캐시 계층 자체가 부재** → 테스트 대상 미존재. §64/§67 후행. |
| §69 전체 CI 실행 | **CI 시크릿 미등록(inert) + `paths-ignore` 로 `backend/**` 미트리거**. 파이프라인 변경 = 사용자 승인 대상. |
| §69-70 의 실효화 | **`action_request` 생산자 확정**(288차 보류 항목 — 라이브검증/제품결정 대기). 생산자 없이는 어떤 테스트도 빈 테이블을 확인할 뿐. |

### 3.4 원문 대비 발견

1. **§69 는 테스트 인프라의 존재를 전제한다.** 원문 어디에도 "러너를 세우라"가 없다 — "Unit Test / Integration Test …" 목록만 제시한다. 이 레포에는 러너가 0 이므로 **원문의 전제가 성립하지 않는다**. §69 이행 계획은 인프라 신설을 **선행 항목으로 별도 계상**해야 한다.
2. **§69 Regression 11항은 "기존 X 가 실재함"을 전제한다.** 실측상 #71(Multi-Level) · #74(Manager) · #75(Finance) · #76(Legal)은 **기존 기능 자체가 0** 이다 → "회귀 테스트"가 성립하지 않는다(보호할 동작이 없다). 원문의 Regression 목록은 **일반 엔터프라이즈 승인 시스템**을 상정한 것이며 이 레포의 실제 기존자산(승인 4경로)과 대응하지 않는다.
3. **§69 는 §72-25 위반을 탐지할 테스트를 요구하지 않는다.** 그러나 이 레포의 실제 최대 위험은 "미구현이 완료로 기록됨"(`docs/IMPLEMENTATION_STATUS.md:130`)이다. §2.4 C-69-6 으로 보강했다.
4. **§69-31(Cache Invalidation)과 §67 전체는 순환 전제다** — §67 이 캐시를 요구하고 §69 가 그 무효화 테스트를 요구하나, 현행에 캐시 계층이 0 이라 양쪽 다 순수 신규다.

### 3.5 기지 실측 정정·확인

- **확인**: `tools/e2e/smoke.mjs:42` `'/api/v423/approvals'` 가 `GET_ENDPOINTS` 에 실재 — ⓑ 앵커 정확.
- **확인**: `tools/e2e` 전체에서 `approval|approve|승인` grep = **`smoke.mjs:42` 단 1히트**(`render.mjs`·`scenarios.mjs` 0) — ⓑ "승인 의미론 테스트 0" 재실증.
- **확인**: `package.json:4-6` `e2e`/`e2e:render`/`e2e:scenario` 실재 — ⓑ 앵커 정확.
- **확인**: `tools/e2e/render.mjs:27` `const ROUTES` · `:47` `function deriveRoutes()` · `:50` 주석(과거 자동도출 무음실패 자인) — ⓑ "119라우트 자동도출 + 무음사망 탐지" 구조 확인.
- **보강(ⓑ 미기재)**: `smoke.mjs:80-91` `CONTRACT` **10건**(키 회귀 가드)이 실재하며 `:160-176` 이 키 누락을 실패 처리한다. ⓑ 는 "#47 테스트 PARTIAL — HTTP 상태만"으로 요약했으나, **정확히는 스모크에 2계층이 있고**(GET 500 스윕 `:148` / CONTRACT 키 가드 `:173-174`) **승인 엔드포인트는 1계층(상태)에만 있다**. 결론 동일, 근거 정밀화.
- **보강(ⓑ 미기재)**: `smoke.mjs:148` 이 **503 을 인프라로 간주해 실패에서 제외**한다(`r.s >= 500 && r.s !== 503`) · `:139` 503 백오프 재시도 → **레이트리밋에 가려 회귀가 은폐될 여지**가 구조적으로 존재.
- **확인**: `apcu_*` 실범위 = `SystemMetrics.php:225-455`(ⓑ 표기 `:225-451` — 마지막 히트는 `:455`). **미세 정정.**
- **확인**: Redis/Memcached `backend/src` 0 · `Payment.php:817` `totalBeforeDisc` 오탐 — ⓑ 앵커 정확.
- **확인**: `Dependencies.php:29-34`(self-loop 422 · cycle_detected 422 · `:48` auditLog 미도달) · `:79-100`(DFS + `$visited:81` + tenant `:91` + `:84` `$depth<10000`) — ⓑ 앵커 정확. **`$depth` 상한 10000 은 ⓑ 미기재 — 보강.**
- **확인**: `Gantt.php:104-122` Kahn · `:119` 고립 판정 · `:120-125` degrade — ⓑ 앵커 정확.

### 3.6 자진 신고

- **§69-70 을 PARTIAL 로 판정**한 것은 경계 판정이다. `smoke.mjs:42` 는 "승인 엔드포인트가 500 을 내지 않는다"만 보장하며 **승인 의미론은 0** 이다. "회귀 테스트가 있다"고 말하기엔 미달이나, 파일에 그 경로가 실재하고 실패 조건이 걸려 있으므로 ABSENT 은 부정확하다고 판단했다. **엄격 해석 시 ABSENT.**
- **§69-80 을 PARTIAL 로 판정**한 근거는 CONTRACT 10건 + render 119라우트다. 그러나 **승인 API 는 그 10건에 없다** → "기존 API Compatibility" 를 승인 축으로 좁히면 ABSENT 이다. **경계 판정.**
- **스모크·CI·러너를 실행하지 않았다.** 판정은 전부 파일 Read/Grep 근거이며 실행 결과에 근거한 단정 0. `smoke.mjs` 가 실제로 무엇을 통과/실패시키는지는 **코드 독해 결론**이다.
- **`docs/IMPLEMENTATION_STATUS.md:130`** 은 ⓑ 인용이며 이 문서에서 재실증하지 않았다(§2.4 근거로만 사용).
- `Mapping.php`·`Catalog.php`·`Alerting.php`·`AdminGrowth.php`·`TeamPermissions.php`·`UserAuth.php`·`EnterpriseAuth.php`·`JourneyBuilder.php`·`AgencyPortal.php`·`SecurityAudit.php`·`AdminMenu.php` 의 세부 줄번호는 **ⓑ 전수조사 실측 인용**이며 이 문서에서 전량 재실증하지 않았다(재실증분 = `tools/e2e/*` · `package.json` · `Dependencies.php` · `Gantt.php` · `Db.php` · `index.php` · `SystemMetrics.php` · `Payment.php` · `composer.json`). 상충 발견 시 ⓑ 를 우선 검증하라.
- **#45 운영 로그 축(ⓑ `UNVERIFIED`)은 이 문서 범위 밖**이다 — §69 는 테스트 범위이지 운영 관측이 아니므로 인용하지 않았다.

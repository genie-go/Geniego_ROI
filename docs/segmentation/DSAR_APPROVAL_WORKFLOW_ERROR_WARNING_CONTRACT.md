# DSAR — Error Contract + Warning Contract (§67 + §68)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §67·§68 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★**에러 봉투** | `AdminGrowth::json`(AdminGrowth.php:164-179) — `success`·`data`·`message`·`error`·`meta`(`request_id` = `bin2hex(random_bytes(8))`) | `VALIDATED_LEGACY` |
| ★**에러 코드 헬퍼** | `AdminGrowth::fail`(AdminGrowth.php:**181-184**) — `fail(Response, string $detail, string $codeStr='ERROR', int $http=400)` → `json(..., ['code'=>$codeStr, 'detail'=>$detail])` | `VALIDATED_LEGACY` — **`code`+`detail`+`meta` 봉투 구현** |
| ★**승인 경로 실배선** | `AdminGrowth::approvalDecide` — `:1322` `fail(..., 'VALIDATION', 422)` · `:1326` `fail(..., 'NOT_FOUND', 404)` · `:1327` `fail(..., 'CONFLICT', 409)` | `VALIDATED_LEGACY` — **승인 경로에 이미 배선됨** |
| 기존 코드 어휘 (실측) | `ERROR`(기본값) · `VALIDATION`(422) · `NOT_FOUND`(404) · `CONFLICT`(409) | `VALIDATED_LEGACY` — **확장 대상** |
| 정족수 fail-closed | `Mapping::actorId`(Mapping.php:36) 미확인 신원 → **403** · `Mapping::approve`(:238-294) 비-pending → **409** | `VALIDATED_LEGACY` |
| Warning 채널 | 승인 도메인 **Warning 반환 기전 grep 0** · 인접 = `Alerting` `min_severity`(Alerting.php:911 `notification_channel` SSOT) | `NOT_APPLICABLE`(Warning 봉투) · `LEGACY_ADAPTER`(severity) |
| `APPROVAL_WORKFLOW_*` 코드 | **grep 0** | `NOT_APPLICABLE` — 신설 |

### ★축 주의 — **"에러 코드 체계 부재"는 과장이다** (오탐 정정)

🔴 **이것이 이 문서의 가장 중요한 대조점이다.** 5-3-2 착수 시 "에러 코드 체계가 없다"고 판단하기 쉬우나 **실측은 정반대다**:

- `AdminGrowth::fail`(**AdminGrowth.php:181-184**)이 **`code` + `detail` + `meta` 봉투를 이미 구현**하고 있다.
- 그것도 **승인 경로에 실배선**되어 있다 — `approvalDecide` 의 **:1322**(`VALIDATION` 422) · **:1326**(`NOT_FOUND` 404) · **:1327**(`CONFLICT` 409).
- → 판정 = **`VALIDATED_LEGACY`(공용 추출·확장)**. 🔴 **두 번째 에러 봉투 신설 금지.**
- **"부재"라고 믿었다면 두 번째 에러 봉투를 신설할 뻔했다.** 이는 289차 오탐 레지스트리에 등재된 항목이다 — **재플래그 금지.**

즉 §67 의 44종은 **"봉투가 없다"가 아니라 "봉투는 있는데 코드 어휘가 4개(`ERROR`/`VALIDATION`/`NOT_FOUND`/`CONFLICT`)뿐"** 이다. 5-3-2 의 작업은 **신설이 아니라 어휘 확장 + 공용 추출**이다.

### ★두 번째 축 주의 — 봉투 존재 ≠ 코드 충족

반대 방향의 역산도 금지한다: `AdminGrowth::fail` 이 존재한다는 사실을 **§67 44종의 커버로 계산하면 안 된다.** `APPROVAL_WORKFLOW_*` 접두 코드는 **grep 0**이다. 봉투는 `VALIDATED_LEGACY`(확장 대상)이고, **44종 코드 자체는 전건 `NOT_APPLICABLE`(부재 → 신설)** 이다. 이 둘을 섞으면 분모가 소멸한다.

---

## 1-A. 원문 전사 + 판정 — §67 Error Contract **원문 44종**

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_WORKFLOW_DEFINITION_NOT_FOUND | 코드 grep 0 · **봉투 재사용 가능**(`fail(...,'NOT_FOUND',404)` AdminGrowth.php:1326) | `NOT_APPLICABLE`(코드) · 봉투=`VALIDATED_LEGACY` |
| 2 | APPROVAL_WORKFLOW_VERSION_NOT_FOUND | 동상 | `NOT_APPLICABLE` |
| 3 | APPROVAL_WORKFLOW_VERSION_INACTIVE | Version 개념 부재 | `NOT_APPLICABLE` |
| 4 | APPROVAL_WORKFLOW_VERSION_IMMUTABLE | 불변 Version 부재 | `NOT_APPLICABLE` |
| 5 | APPROVAL_WORKFLOW_GRAPH_INVALID | 그래프 정적 검증 부재(§65 전건 `CONTRACT_ONLY`) | `NOT_APPLICABLE` |
| 6 | APPROVAL_WORKFLOW_START_NODE_INVALID | START 노드 부재(§12 #1) | `NOT_APPLICABLE` |
| 7 | APPROVAL_WORKFLOW_END_NODE_INVALID | END 노드 부재(§12 #2) | `NOT_APPLICABLE` |
| 8 | APPROVAL_WORKFLOW_NODE_NOT_FOUND | Node 개념 부재 | `NOT_APPLICABLE` |
| 9 | APPROVAL_WORKFLOW_EDGE_NOT_FOUND | Edge 개념 부재 | `NOT_APPLICABLE` |
| 10 | APPROVAL_WORKFLOW_TRANSITION_INVALID | **전이 규칙 선언 0** · 전이 가드 4곳(FeedTemplate::transition:248-285 등) | `NOT_APPLICABLE` |
| 11 | APPROVAL_WORKFLOW_GATEWAY_NO_MATCH | Gateway 부재(§12 #11~#16) | `NOT_APPLICABLE` |
| 12 | APPROVAL_WORKFLOW_GATEWAY_CONFLICT | 동상 | `NOT_APPLICABLE` |
| 13 | APPROVAL_WORKFLOW_TENANT_MISMATCH | 🔴 **인접 갭**: `admin_growth_approval` tenant_id 없음 · `AdminGrowth.php:1324` = `WHERE id=?`(테넌트 술어 없음) → **에러를 낼 지점 자체가 없다** | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |
| 14 | APPROVAL_WORKFLOW_WORKSPACE_MISMATCH | Workspace 개념 grep 0 | `NOT_APPLICABLE` |
| 15 | APPROVAL_WORKFLOW_LEGAL_ENTITY_MISMATCH | Legal Entity 개념 grep 0 | `NOT_APPLICABLE` |
| 16 | APPROVAL_WORKFLOW_ENVIRONMENT_MISMATCH | Environment Scope 부재 | `NOT_APPLICABLE` |
| 17 | APPROVAL_WORKFLOW_DOMAIN_MISMATCH | Approval Domain 부재 | `NOT_APPLICABLE` |
| 18 | APPROVAL_WORKFLOW_INSTANCE_NOT_FOUND | Instance 부재 · 봉투 재사용 가능(:1326) | `NOT_APPLICABLE` |
| 19 | APPROVAL_WORKFLOW_INSTANCE_INACTIVE | Instance 부재 | `NOT_APPLICABLE` |
| 20 | APPROVAL_WORKFLOW_INSTANCE_PAUSED | Pause 부재 · 인접 킬스위치 `AdAdapters::executionEnabled`:34 | `NOT_APPLICABLE` |
| 21 | APPROVAL_WORKFLOW_INSTANCE_CANCELLED | Cancel 전이 부재 | `NOT_APPLICABLE` |
| 22 | APPROVAL_WORKFLOW_INSTANCE_SUPERSEDED | Superseded 부재 | `NOT_APPLICABLE` |
| 23 | APPROVAL_WORKFLOW_INSTANCE_DUPLICATE | 멱등키 grep 0 | `NOT_APPLICABLE` |
| 24 | APPROVAL_WORKFLOW_TASK_NOT_FOUND | Task 부재 | `NOT_APPLICABLE` |
| 25 | APPROVAL_WORKFLOW_TASK_ALREADY_COMPLETED | ★**의미적 선례 REAL**: `Mapping::approve` 비-pending → **409**(:238-294) · `AdminGrowth::approvalDecide:1327` `fail('이미 처리된 항목입니다.','CONFLICT',409)` | `NOT_APPLICABLE`(코드) · `VALIDATED_LEGACY`(409 규율) |
| 26 | APPROVAL_WORKFLOW_TASK_CLAIM_INVALID | Task Claim 부재 · 인접 claim 은 잡 큐/여정 도메인 | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 27 | APPROVAL_WORKFLOW_TASK_CLAIM_EXPIRED | 인접 stale lease(Omnichannel 900s :394-423 · ChannelSync 600s :6136-6153) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 28 | APPROVAL_WORKFLOW_TASK_ACTOR_UNAUTHORIZED | ★**의미적 선례 REAL**: `Mapping::actorId`(Mapping.php:36) 미확인 신원 → **403 fail-closed** · 🟠 **`actor_type` 부재**(apikey/user 동등 계수 → API 키 2개로 Maker-Checker 충족 가능·스펙 §20 위배) | `NOT_APPLICABLE`(코드) · `VALIDATED_LEGACY`(403 규율) · 🟠 결함 병존 |
| 29 | APPROVAL_WORKFLOW_TASK_EVIDENCE_REQUIRED | Evidence Requirement 부재(§69 전 축 신설) | `NOT_APPLICABLE` |
| 30 | APPROVAL_WORKFLOW_TASK_RETRY_EXCEEDED | 인접: `AdAdapters::retryDeliveryDlq`(:1187-1228 maxAttempts 5) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 31 | APPROVAL_WORKFLOW_TRANSITION_DUPLICATE | Transition 부재 | `NOT_APPLICABLE` |
| 32 | APPROVAL_WORKFLOW_EVENT_DUPLICATE | 인접 dedup: `uq_rve_dedup` UNIQUE(Db.php:1017-1034) · Paddle `notification_id` UNIQUE(**`processed=1`일 때만 skip**) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 33 | APPROVAL_WORKFLOW_EVENT_CORRELATION_FAILED | 🔴 **범용 이벤트 버스·구독 기전 grep 0** · `OpenPlatform::emit`:311-328 = **웹훅 발신 전용·예외 절대 미전파**(:325) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 34 | APPROVAL_WORKFLOW_CALLBACK_UNAUTHORIZED | 인접 REAL: Paddle HMAC(Paddle.php:1073) · 🔴 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` · 🔴 인접 갭 |
| 35 | APPROVAL_WORKFLOW_CALLBACK_TENANT_MISMATCH | 🔴 **인접 갭**: `paddle_events` tenant_id **없음**(:99) = 테넌트 검증 부재 | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |
| 36 | APPROVAL_WORKFLOW_RESOURCE_VERSION_CHANGED | `version` grep 0 | `NOT_APPLICABLE` |
| 37 | APPROVAL_WORKFLOW_POLICY_VERSION_CHANGED | Policy Version 부재 | `NOT_APPLICABLE` |
| 38 | APPROVAL_WORKFLOW_LOCK_CONFLICT | 🔴 optimistic lock grep 0 · **SQLite 폴백 호환 제약** · 대체 = 조건부 UPDATE+rowCount CAS(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411) | `NOT_APPLICABLE` · 🔴 **CAS 실패로 매핑**(§66 규칙) |
| 39 | APPROVAL_WORKFLOW_LOCK_LOST | 🔴 **분산락·`GET_LOCK` grep 0** · `flock` = `stock_sync_cron.php:54` 유일 | `NOT_APPLICABLE` · 🔴 **lease 만료 회수로 매핑** |
| 40 | APPROVAL_WORKFLOW_MIGRATION_INVALID | Migration 개념 부재 | `NOT_APPLICABLE` |
| 41 | APPROVAL_WORKFLOW_REPLAY_BLOCKED | Replay 개념 부재 | `NOT_APPLICABLE` |
| 42 | APPROVAL_WORKFLOW_MANDATORY_REQUIREMENT_PENDING | 🔴 **인접 계약 위반 이미 존재**: `listActionRequests` 는 `required_approvals:2` 응답하나 `decideAction` 은 **1명에 approved** | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |
| 43 | APPROVAL_WORKFLOW_RECONCILIATION_FAILED | Reconciliation 부재(외부 엔진 미도입) | `NOT_APPLICABLE` |
| 44 | APPROVAL_WORKFLOW_RUNTIME_BLOCKED | 인접 킬스위치 `AdAdapters::executionEnabled`(:34 · 9곳 배선) | `NOT_APPLICABLE` · `VALIDATED_LEGACY`(킬스위치 재사용) |

**실측 개수: 44 / 44 전사.** 커버리지 = 코드 축 `NOT_APPLICABLE` 44 (`APPROVAL_WORKFLOW_*` grep 0) · **봉투 축 `VALIDATED_LEGACY`**(`AdminGrowth::fail`:181-184 + `approvalDecide`:1322/:1326/:1327 실배선) · 의미적 선례 `VALIDATED_LEGACY` 2건(#25 409 · #28 403) · 인접 어댑터 5건(#27·#30·#32·#34·#44) · 인접 갭 실재 4건(#13·#35·#42 + #34).

---

## 1-B. 원문 전사 + 판정 — §68 Warning Contract **원문 19종**

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_WORKFLOW_VERSION_WARNING | Version 개념 부재 · **Warning 봉투 자체 부재**(`AdminGrowth::json` 은 `error` 만 · warning 슬롯 없음 :164-179) | `NOT_APPLICABLE` |
| 2 | APPROVAL_WORKFLOW_GRAPH_WARNING | 그래프 검증 부재 | `NOT_APPLICABLE` |
| 3 | APPROVAL_WORKFLOW_LOOP_WARNING | ★인접: `JourneyBuilder`:512 순환 감지 — **런타임 중단**이지 Warning 반환 아님 · 주석이 **작성자 JSON acyclicity 미검증 자인** | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 4 | APPROVAL_WORKFLOW_GATEWAY_WARNING | Gateway 부재 | `NOT_APPLICABLE` |
| 5 | APPROVAL_WORKFLOW_ASSIGNMENT_WARNING | Assignment 부재 | `NOT_APPLICABLE` |
| 6 | APPROVAL_WORKFLOW_TASK_WARNING | Task 부재 | `NOT_APPLICABLE` |
| 7 | APPROVAL_WORKFLOW_RETRY_WARNING | 인접: 백오프 3공식 병존(AdAdapters:1187-1228 · OpenPlatform:466-471 · Omnichannel:365) — **경고 반환 기전 없음** | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(공식) |
| 8 | APPROVAL_WORKFLOW_TIMEOUT_WARNING | Timeout Boundary 부재(§12 #25) | `NOT_APPLICABLE` |
| 9 | APPROVAL_WORKFLOW_TIMER_WARNING | 인접: `journey_enrollments.resume_at`/`wait_until`(:80-82) · `sms_campaigns.scheduled_at` + `runScheduledQueue`(SmsMarketing.php:367 **ISO8601 문자열 사전식 비교**) — **타이머 서비스·지연큐 부재** | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 10 | APPROVAL_WORKFLOW_EVENT_WARNING | 🔴 이벤트 버스 grep 0 · `OpenPlatform::emit`:325 **예외 절대 미전파** = 경고조차 삼켜짐 | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 11 | APPROVAL_WORKFLOW_CALLBACK_WARNING | 인접: `Webhooks.php:22-27` **opt-in** — 시크릿 미설정 시 `verified=false` **로 수신 허용** = ★**"경고성 상태 플래그"의 현행 유일 선례** | `NOT_APPLICABLE`(승인) · `LEGACY_ADAPTER`(`verified=false` 패턴) |
| 12 | APPROVAL_WORKFLOW_SUB_WORKFLOW_WARNING | **Sub-workflow 부재**(`sub_journey`/`call_activity` grep 0) | `NOT_APPLICABLE` |
| 13 | APPROVAL_WORKFLOW_PAUSE_WARNING | Pause 개념 부재 | `NOT_APPLICABLE` |
| 14 | APPROVAL_WORKFLOW_CANCELLATION_WARNING | Cancel 전이 부재 | `NOT_APPLICABLE` |
| 15 | APPROVAL_WORKFLOW_COMPENSATION_WARNING | Compensation 부재 · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 16 | APPROVAL_WORKFLOW_MIGRATION_WARNING | Migration 부재 | `NOT_APPLICABLE` |
| 17 | APPROVAL_WORKFLOW_REPLAY_WARNING | Replay 부재 | `NOT_APPLICABLE` |
| 18 | APPROVAL_WORKFLOW_RECONCILIATION_WARNING | Reconciliation 부재 | `NOT_APPLICABLE` |
| 19 | APPROVAL_WORKFLOW_MANUAL_REVIEW_REQUIRED | 인접: `notification_channel` SSOT(Alerting.php:911 · `min_severity`) + 폴백 체인(:471-497) **완비** · 🔴 **승인 이벤트↔통지 배선만 0** | `NOT_APPLICABLE`(코드) · `VALIDATED_LEGACY`(통지 인프라 — **신설 금지·배선만**) |

**실측 개수: 19 / 19 전사.** 커버리지 = `NOT_APPLICABLE` 19 (**Warning 봉투·코드 전건 부재**) · 인접 어댑터 4건(#7·#9·#11·#19) · `KEEP_SEPARATE_WITH_REASON` 2건(#3·#10).

🔴 **§68 은 §67 과 대칭이 아니다.** §67 은 **봉투가 있고 어휘만 부족**하지만, §68 은 **봉투 자체가 없다**(`AdminGrowth::json`:164-179 는 `success`/`data`/`message`/`error`/`meta` 만 — **warning 슬롯 없음**). 즉 Warning 은 **봉투 확장이 선결**이다. 이 비대칭을 뭉개면 §68 작업량이 과소평가된다.

---

## 2. 규칙

### 에러 봉투

- 🔴 **두 번째 에러 봉투 신설 금지.** `AdminGrowth::fail`(AdminGrowth.php:**181-184**)이 **`code`+`detail`+`meta` 봉투를 구현**하고 **승인 경로 `approvalDecide` 에 실배선**(:1322 `VALIDATION` 422 · :1326 `NOT_FOUND` 404 · :1327 `CONFLICT` 409)되어 있다 → **`VALIDATED_LEGACY`(공용 추출·확장)**.
- **"에러 코드 체계 부재"는 과장이다** — 289차 오탐 레지스트리 등재. **재플래그 금지.** 부재한 것은 **봉투가 아니라 `APPROVAL_WORKFLOW_*` 어휘 44종**이다.
- **작업의 성격 = 신설이 아니라 (a) 공용 추출 + (b) 어휘 확장.**
  - (a) `AdminGrowth::fail`/`json` 은 현재 **`private static`**(:164, :181) 이라 재사용 불가 → **공용 트레이트/서비스로 추출**. `Mapping::approve`+`actorId` 공용 추출(설계 결론 3)과 **같은 리팩터에 묶어라** — 승인 규율과 에러 봉투는 같은 경로를 지난다.
  - (b) 기존 어휘 4종(`ERROR`·`VALIDATION`·`NOT_FOUND`·`CONFLICT`)에 44종을 **더한다**. 기존 4종을 **치환하지 마라**(Golden Rule: Replace 가 아니라 Extend · 기능 후퇴 0).
- 🔴 **봉투 존재를 44종 커버로 계산하지 마라.** `APPROVAL_WORKFLOW_*` grep 0 → **44종 전건 `NOT_APPLICABLE`**. 봉투(`VALIDATED_LEGACY`)와 코드(`NOT_APPLICABLE`)는 **다른 축**이다.

### HTTP 상태 매핑 — 원문에 없는 축

🔴 **원문 §67 은 HTTP 상태 코드를 지정하지 않는다.** 현행 실측(`VALIDATION`→422 · `NOT_FOUND`→404 · `CONFLICT`→409 · `actorId` 미확인→403)은 **인용 가능한 선례**이지 **원문 요구가 아니다**. 44종 각각의 HTTP 상태를 **지어내지 마라** — 5-3-2 구현 시 별도 승인 하에 확정한다. (5-3-1 에서 `REQUIREMENT_SOURCE` 에 원문에 없는 `SYSTEM_DEFAULT` 를 지어내 현행 하드코딩을 담은 것이 **역산**이었다. 같은 실수를 HTTP 축으로 반복하지 마라.)

### 의미적 선례 보존

- **#25(`TASK_ALREADY_COMPLETED`) = 비-pending → 409.** `Mapping::approve`(:238-294)·`AdminGrowth::approvalDecide:1327` 이 이미 확립한 규율이다. **재작성 금지 · 코드 어휘만 교체.**
- **#28(`TASK_ACTOR_UNAUTHORIZED`) = 미확인 신원 → 403 fail-closed.** `Mapping::actorId`(Mapping.php:36)의 규율이다. 🔴 **재작성 시 289차 G-01 이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동.**
  - 🟠 **단 `actor_type` 부재는 미해결 결함**: `apikey:{id}`/`user:{email}` 이 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). #28 구현 시 **선결**.
- **#38/#39(Lock)**: 원문 문자 그대로 구현하면 **SQLite 폴백 호환 제약 위반**이다(`optimistic lock(version)`·분산락·`GET_LOCK` 전부 grep 0). **#38 → CAS 실패**(조건부 UPDATE+rowCount · Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411) · **#39 → lease 만료 회수**(Omnichannel 900s :394-423 · ChannelSync 600s)로 매핑한다.

### Warning 봉투

- 🔴 **§68 은 봉투 자체가 없다.** `AdminGrowth::json`(:164-179)에 **warning 슬롯이 없다**(`success`/`data`/`message`/`error`/`meta` 만). §67 을 "어휘만 추가하면 된다"고 읽고 §68 도 같다고 가정하면 **작업량 과소평가**다. **Warning 은 봉투 확장이 선결.**
- **Warning ≠ Error.** §68 19종은 **차단이 아니라 통지**다. `error` 슬롯에 Warning 을 담으면 **호출자가 실패로 오인**한다 → 별도 슬롯(예: `warnings[]`)을 **기존 봉투에 확장**한다(두 번째 봉투 신설 금지).
- **#19(`MANUAL_REVIEW_REQUIRED`) = 신설 금지·배선만.** `notification_channel` SSOT(Alerting.php:911 slack/generic webhook/email + `min_severity`) + **폴백 체인**(:471-497 · 282차 "알림 통지 죽음" 수정분)이 **완비**되어 있고 **승인 이벤트↔통지 배선만 0**이다 → `Alerting::pushEvent` 재사용.
  - ⚠️ **282차 트랩**: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블에 있어 **무발송**이 된다. Warning 배선 시 이 경로를 반드시 확인하라.
- **#10(`EVENT_WARNING`) 주의**: `OpenPlatform::emit`(:311-328)은 **예외를 절대 전파하지 않는다**(:325). 여기에 Warning 을 얹으면 **경고가 조용히 삼켜진다** — emit 은 **웹훅 발신 전용**이지 이벤트 버스가 아니다.
- **#11(`CALLBACK_WARNING`) 선례**: `Webhooks.php:22-27` 의 `verified=false` opt-in 수신이 **현행 유일한 "경고성 상태 플래그"** 다 — Warning 설계 시 **패턴으로 인용 가능**하나, **opt-in 자체는 §66 #30 의 갭**임을 혼동하지 마라.
- **#3(`LOOP_WARNING`) 주의**: `JourneyBuilder`:512 는 **런타임 중단**이지 Warning 반환이 아니며, 주석이 **"작성자 JSON 에 acyclicity 검증 없음"을 자인**한다 → **커버 아님**.

### 공통

- 🔴 **63종(44+19) "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.
- **§63 Mapping Registry 규율 준수**: 원문 §63 은 "하드코딩된 단일 Enum 변환이 아니라 **Versioned Mapping Registry 또는 명시적 Contract**로 관리하라"고 요구한다. 44종/19종을 **PHP 상수 배열에 하드코딩**하면 §63 위배다.

---

## ★정정 — 통지 인프라 재사용 판정 (289차 9회차 · PM 직접 실측)

> **본 절은 상위 본문의 "통지 = 신설 금지·배선만" 판정을 정정한다.** 초판은 전사자 공통 규율 파일의 **`Alerting::dispatch` 재사용**을 인용했으나, 그 이름은 **실재하지 않는다**.

**① 팬텀 이름의 출처** — `function dispatch(` **grep 0**. `Alerting.php:472-474` **주석**에 *"종전 dispatch 는 …"* 로 남은 **역사적 명칭**(282차 수정으로 소멸)이며, 규율 파일이 이를 실 메서드로 오인해 인용했다. CLAUDE.md 기지 트랩(`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**)과 **동형**이다. → **주석을 API 근거로 삼지 마라.**

**② 실 진입점과 가시성** — `Alerting::pushEvent`(**:917**)만이 `public`이다. 폴백 체인(:471-497)을 품은 `dispatchNotifications`(**:445**)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** → 승인 노드가 직접 부를 수 없다. **가시성 승격이 선결.**

**③ `pushEvent` 는 그대로 재사용 불가** (실측 3제약)
- **반환 `void` + 예외 삼킴**(:934 `catch { error_log }`) → **발송 실패가 무음**. 승인 통지는 감사 대상이므로 **결과 반환·감사 기록이 필수**.
- **`tenant === 'demo'` → no-op**(:919) → **데모 환경에서 승인 통지 검증 불가**(배포 전 E2E 사각).
- **`notification_channel` = `tenant_id` PRIMARY KEY = 테넌트당 1행**(:911-912) · `email_to` **단일 주소** · locale 한국어 하드코딩(:927) → **승인자 개인 통지(recipient resolution) 구조적 불가**.

**④ 정정된 판정** — "배선만"은 **Channel 축에만 참**이다. §29 실측 기준 **필수 10종 현행 충족 0**.
> ∴ 정확한 판정 = **`pushEvent` 배선 + 가시성 승격 + 발송결과 반환/감사 + recipient resolution 신설**.
> 🔴 **"완비 → 배선만"으로 닫으면 분모를 Channel 축으로 갈아끼우는 역산이다.**

**⑤ 보존되는 것**(재구현 금지) — `notification_channel` SSOT(:911) · 폴백 체인(:471-497 · 282차 "알림 통지 죽음" 수정분) · `min_severity` 게이트 · `Genie\Crypto` 자격 복호(`nDec` :915). ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. **실발송 검증 필수.**

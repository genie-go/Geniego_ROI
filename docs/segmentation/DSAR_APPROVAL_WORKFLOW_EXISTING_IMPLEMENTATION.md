# DSAR — 기존 구현 분류 (§71)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §71 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Flow 실행 엔진** | **`JourneyBuilder::advanceEnrollment`(JourneyBuilder.php:498-700+) = 레포 유일 실 Flow 실행 엔진** | `VALIDATED_LEGACY`(확장 — 재구현 금지) |
| ┗ 노드 13종 | `trigger·email·kakao·sms·push·webhook·nba·decision·delay`(:527)·`wait`(:548)·`condition`(:600)·`split`(:610)·`exit·attr·goal` | `VALIDATED_LEGACY`(실행 프리미티브) |
| ┗ `approval` 노드 | **grep 0** (JourneyBuilder.php · JourneyBuilderConstants.js 양쪽) | `NOT_APPLICABLE` — **결번 1종** |
| ┗ 원자적 claim | :411-418 (조건부 UPDATE 선점) | `VALIDATED_LEGACY` |
| ┗ 순회 멱등 | `claimSendOnce(enrollment_id,node_id)` :672 (커밋 전 크래시 시 재발송 차단 · 277차) | `VALIDATED_LEGACY` |
| ┗ 순환 감지 | :512 (한 패스 내 재방문 중단 · **런타임 방어만** — 주석이 "작성자 JSON에 acyclicity 검증 없음" 자인) | `VALIDATED_LEGACY`(부분 — 정적 검증은 결번) |
| ┗ 노드 감사 | `journey_node_logs` :50, :69 | `VALIDATED_LEGACY` |
| ┗ cron 배선 | `journey_cron.php:29-35`(*/5) · `install_crontab.sh` 정본 등재 = **REAL** | `VALIDATED_LEGACY` |
| ┗ 🔴 실행 컨텍스트 | `crm_customers`/`journey_enrollments` · **`customer_id` 필수**(JourneyBuilder.php:551 `$cid=(int)($enr['customer_id']??0)` · :556 `if($cid>0 && …)`) | **최대 설계 리스크** — 아래 §0.1 |
| 워크플로 정의 테이블 | `workflow_*`/`flow_*`/`wf_*` **grep 0** | `NOT_APPLICABLE` |
| Sub-workflow | `sub_journey`/`call_activity` **grep 0** | `NOT_APPLICABLE` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |
| 상태머신 | `UPDATE … SET status=` **155건 / 44파일** · **전이 규칙 선언 0** (전부 호출 지점 인라인) | `NOT_APPLICABLE`(선언적 전이 부재) |
| ┗ 전이 가드 | **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155 | `VALIDATED_LEGACY`(참조 선례) |
| 승인 정족수·Maker-Checker | `Mapping.php:238-294` 5단 규율 + `Mapping::actorId`(289차) = **레포 유일 REAL** | `VALIDATED_LEGACY`(공용 추출 — §72) |
| 동시성 | `Omnichannel::claimBatch`:394-423(stale lease 900s 회수 → `SELECT..FOR UPDATE SKIP LOCKED`+claim_id → 조건부 UPDATE 폴백) · `claimConditional`:427-447 · 조건부 UPDATE+rowCount CAS 4곳(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel) | `VALIDATED_LEGACY`(신설 금지) |
| ┗ optimistic lock(`version`)·분산락·`GET_LOCK` | **전부 grep 0** — **SQLite 폴백 호환이 명시적 설계 제약** | `NOT_APPLICABLE` — **다른 동시성 모델 도입은 제약 위반** |
| Timer/Wait | DB 컬럼 + cron 폴링 (`journey_enrollments.resume_at`/`wait_until`:80-82 · 206차 delay + 255차 이벤트 절대기한 **분리 설계**) · **타이머 서비스·지연큐 부재** | `VALIDATED_LEGACY`(패턴) |
| Retry/Backoff | `AdAdapters::retryDeliveryDlq`:1187-1228(maxAttempts 5 · `600*2^n` **86400s 캡**) · `OpenPlatform`:466-471(`min(60,2^n)`분) · `Omnichannel`:365(attempts<3 · **백오프 없음**) — **3공식 병존** | `CONSOLIDATION_REQUIRED` |
| Dead Letter | **`ad_delivery_dlq` 1개뿐**(AdAdapters.php:1127) · 나머지는 원 테이블 `status='failed'` 잔류 | `VALIDATED_LEGACY`(단일 — 중복 없음) |
| Event | `OpenPlatform::emit`:311-328 = **웹훅 발신 전용**(화이트리스트 · 구독 0이면 no-op · **예외 절대 미전파** :325) · **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0** | `KEEP_SEPARATE_WITH_REASON` / `NOT_APPLICABLE` |
| Notification | `notification_channel` SSOT(Alerting.php:911 · slack/generic webhook/email + `min_severity`) + 폴백 체인(:471-497 · 282차 수정분) = **완비** · **승인 이벤트↔통지 배선만 0** | `VALIDATED_LEGACY`(신설 금지 · 배선만) |
| Kill Switch | `AdAdapters::executionEnabled`:34-40 — **호출부 9곳 실배선 REAL** | `VALIDATED_LEGACY`(재사용 강제) |
| 에러 봉투 | `AdminGrowth::fail`:181-184 (`code`+`detail`+`meta`) + 승인 경로 `approvalDecide` **실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY`(공용 추출·확장) |
| 외부 엔진 | Temporal·Camunda·Flowable·Zeebe·Step Functions·BPMN **`backend/src` grep 0** | `NOT_APPLICABLE`(§73) |

### 0.1 🔴 최대 설계 리스크 — enrollment 컨텍스트 일반화가 선결

`JourneyBuilder` 는 **마케팅 여정 도메인**이다. 실행 컨텍스트가 `crm_customers` / `journey_enrollments` 이고 **`customer_id` 가 사실상 필수**다(JourneyBuilder.php:551 에서 `$cid` 를 enrollment 에서 꺼내고, :556 `if ($cid > 0 && …)` 로 이벤트 대기 판정 자체가 고객 존재에 종속된다).

5-3-2 의 승인 대상은 **비-고객 엔티티**(예산·가격·배포·Claim/Funding/Payout)를 포함한다. 이를 그대로 태우면 `customer_id=0` 인 enrollment 가 `wait` event-mode 에서 **영구 대기**한다. → **`approval` 노드 추가에 앞서 enrollment 컨텍스트의 일반화(subject_type/subject_id 축)가 선결 조건**이며, 이 선결이 없는 상태의 노드 추가는 `BLOCKED_MIGRATION_RISK` 다.

### 0.2 ★축 주의 — **8회차 교훈: 부재증명은 이름이 아니라 능력으로 하라**

**8회차에 `BPMN`/`Temporal`/`Camunda`/`Zeebe` grep 0 을 근거로 "이 레포에는 워크플로 실행 엔진이 없다"고 판정했다. 이 판정은 틀렸다.** `JourneyBuilder` 가 **노드 13종 · delay/wait 타이머 · 원자적 claim · 순회 멱등 · 순환 감지 · 노드 감사 · cron 배선**을 전부 갖춘 **실 Flow 실행 엔진**으로 존재했고, 전수조사에서 예측이 정면으로 뒤집혔다.

- **이름 grep 0 ≠ 능력 부재.** 벤더명·표준명이 없다는 사실은 "그 벤더를 안 쓴다"만 증명한다. **엔진의 유무는 능력(무엇을 하는가)으로 대조해야 한다.**
- 이 오판을 그대로 밀었다면 결론은 **"실행 엔진 신설"** 이었을 것이다. 그것은 레포에서 가장 성숙한 실행 자산 위에 **두 번째 엔진**을 얹는 것 = 헌법 위반(중복 엔진) + 무후퇴 붕괴.
- **따라서 실행 엔진 신설은 금지다. `JourneyBuilder` 확장이 유일 합리해다.** 결번은 **`approval` 노드 하나**뿐이다.

### 0.3 ★축 주의 — 형태 유사 ≠ 의미 동일 (§12와 동일 규율)

`JourneyBuilder` 의 `condition`/`split`/`wait`/`delay` 는 원문 게이트웨이·타이머와 **형태가 닮았으나 마케팅 발송 도메인**이다. 이를 승인 도메인 커버로 계산하면 역산이다 → 승인 의미 축에서는 `KEEP_SEPARATE_WITH_REASON`. **단 실행 프리미티브의 재사용 근거로는 인용 가능**하며(위 표), 그것이 §0.2 결론의 유일한 용법이다.

## 1. 원문 전사 + 판정 — **원문 31종**

원문 §71 은 **분류 어휘(classification vocabulary) 목록**이다. 엔티티 필드 축이 아니라 "기존 구현을 어느 값으로 분류하는가"의 값 집합이므로, 아래 표는 **각 어휘 값에 현재 배정 가능한 실측 대상**을 대조한다. 배정 대상이 없으면 "현행 배정 0"으로 정직하게 적었다(어휘 자체는 5-3-2 구현 시 사용될 계약이므로 `CONTRACT_ONLY`).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | `CANONICAL_APPROVAL_WORKFLOW_CATALOG` | 현행 배정 0 — 워크플로 정의 테이블(`workflow_*`) grep 0 | `CONTRACT_ONLY` (대상 부재) |
| 2 | `CANONICAL_APPROVAL_WORKFLOW_TEMPLATE` | 현행 배정 0 — 표준/커스텀 구분 개념 전무 | `CONTRACT_ONLY` |
| 3 | `CANONICAL_APPROVAL_WORKFLOW_DEFINITION` | 현행 배정 0 — 승인 정의는 **코드 상수**(Mapping INSERT `2` 리터럴 :209 · Alerting 응답 `2` 하드코딩 :562 · AdminGrowth 단일결재 암묵) | `CONTRACT_ONLY` — **신설 불가피** |
| 4 | `CANONICAL_APPROVAL_WORKFLOW_VERSION` | 현행 배정 0 — 정의가 없으므로 버전도 없음 | `CONTRACT_ONLY` |
| 5 | `CANONICAL_APPROVAL_WORKFLOW_NODE` | 인접 = `journeys` 노드 13종(마케팅 도메인) · 승인 노드 배정 0 | `CONTRACT_ONLY` (인접은 `KEEP_SEPARATE_WITH_REASON`) |
| 6 | `CANONICAL_APPROVAL_WORKFLOW_EDGE` | 현행 배정 0 — journeys 는 JSON 내 next 참조, edge 엔티티 없음 | `CONTRACT_ONLY` |
| 7 | `CANONICAL_APPROVAL_WORKFLOW_INSTANCE` | 인접 = `journey_enrollments`(고객 종속 · §0.1) · 승인 인스턴스 배정 0 | `CONTRACT_ONLY` |
| 8 | `CANONICAL_APPROVAL_WORKFLOW_TASK` | 현행 배정 0 — **Task/배정/클레임 개념 전무** | `CONTRACT_ONLY` |
| 9 | `CANONICAL_APPROVAL_WORKFLOW_TRANSITION` | 현행 배정 0 — 전이 규칙 선언 0(가드 4곳은 인라인) | `CONTRACT_ONLY` |
| 10 | `CANONICAL_APPROVAL_WORKFLOW_EVENT` | 인접 = `journey_node_logs`(:50,:69) 노드 감사 · 승인 전이 이벤트 배정 0 | `CONTRACT_ONLY` |
| 11 | `CANONICAL_APPROVAL_WORKFLOW_TIMER` | 인접 = `resume_at`/`wait_until`(:80-82) + cron 폴링 · 승인 타이머 배정 0 | `CONTRACT_ONLY` |
| 12 | `CANONICAL_APPROVAL_WORKFLOW_RETRY` | 인접 = 백오프 **3공식 병존**(AdAdapters:1221 · OpenPlatform:466-471 · Omnichannel:365) · 승인 재시도 배정 0 | `CONTRACT_ONLY` |
| 13 | `CANONICAL_APPROVAL_WORKFLOW_MIGRATION` | 현행 배정 0 — 실행 중 정의 마이그레이션 개념 전무 | `CONTRACT_ONLY` |
| 14 | `CANONICAL_APPROVAL_WORKFLOW_REPLAY` | 현행 배정 0 — replay 기전 grep 0 | `CONTRACT_ONLY` |
| 15 | `CANONICAL_APPROVAL_WORKFLOW_RECONCILIATION` | 현행 배정 0 | `CONTRACT_ONLY` |
| 16 | `VALIDATED_EXTERNAL_ENGINE` | **배정 0** — 외부 엔진 `backend/src` grep 0(§73) | `NOT_APPLICABLE` |
| 17 | `EXTERNAL_ENGINE_ADAPTER` | **배정 0** — 어댑터 대상 엔진 자체가 부재 | `NOT_APPLICABLE` |
| 18 | `VALIDATED_LEGACY` | **★배정 다수**: `JourneyBuilder` 실행 엔진(:498-700+) · `Mapping.php:238-294` 승인 5단 규율 + `Mapping::actorId` · `Omnichannel::claimBatch`:394-423 · `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497) · `AdAdapters::executionEnabled`:34-40(호출부 9곳) · `AdminGrowth::fail`:181-184 에러 봉투 | `VALIDATED_LEGACY` — **전부 확장 대상 · 재구현 금지** |
| 19 | `LEGACY_ADAPTER` | 배정: `Alerting::executeAction` 의 **액추에이터 배선**(:620-650 — `AdAdapters::pause`:631 / `updateBudget`:634) = `action_request` 의 유일 실자산 · Paddle 웹훅 멱등 수신(`notification_id` UNIQUE) | `LEGACY_ADAPTER` — 🔴 **참조 구현 금지**(§72 결함 A) |
| 20 | `MIGRATION_REQUIRED` | 배정: `admin_growth_approval`(**tenant_id 없음** · 전역 조회 · `:1324 WHERE id=?`) · `catalog_writeback_approval`(**고아** — 읽는 코드 0) | `MIGRATION_REQUIRED` |
| 21 | `CONSOLIDATION_REQUIRED` | 배정: 승인 4종(§72) · 백오프 3공식 · 인라인 상태 전이 155건/44파일 | `CONSOLIDATION_REQUIRED` |
| 22 | `DEPRECATION_CANDIDATE` | 배정: `catalog_writeback_approval`(고아) · `writeback_job`(Db.php:519 — 레거시 유물) · `action_request` 의 **가짜 정족수 표면**(`Alerting:562` 리터럴 2) | `DEPRECATION_CANDIDATE` |
| 23 | `KEEP_SEPARATE_WITH_REASON` | 배정: `journeys` 노드 13종의 **의미 축**(마케팅 발송 ≠ 승인) · `OpenPlatform::emit`(웹훅 발신 전용 ≠ 내부 이벤트 버스) · `omni_outbox`(발송 도메인) | `KEEP_SEPARATE_WITH_REASON` |
| 24 | `BLOCKED_CROSS_TENANT` | **배정 실재**: `admin_growth_approval` **tenant_id 컬럼 없음** · 조회/결정 경로 격리 없음(`AdminGrowth:1324 WHERE id=?`) · (인접) `paddle_events` tenant_id 없음(Paddle.php:99) | `BLOCKED_CROSS_TENANT` |
| 25 | `BLOCKED_WORKFLOW_BYPASS` | **배정 실재**: 🔴 `Alerting::executeAction`(Alerting.php:601-660) — `:612` 가 `status` 를 SELECT 하고 **어디서도 판독 안 함**(죽은 읽기) → `pending`·`rejected` 도 실집행 | `BLOCKED_WORKFLOW_BYPASS` — **§72 A** |
| 26 | `BLOCKED_DUPLICATE_EXECUTION` | 현행 배정 0(승인 도메인) — 다만 `idempotency_key` grep 0 이므로 **신설분이 즉시 이 상태에 빠질 수 있음** | `CONTRACT_ONLY`(예방 축) |
| 27 | `BLOCKED_MIGRATION_RISK` | **배정 실재**: ① `EquivalenceProof` 없이 승인 4종 통합 시(286차 rank 맵 붕괴 재현) ② enrollment 컨텍스트 일반화 없이 `approval` 노드 추가 시(§0.1) | `BLOCKED_MIGRATION_RISK` |
| 28 | `BLOCKED_REPLAY_RISK` | 현행 배정 0 — replay 기전 부재이므로 위험 표면도 아직 없음 | `CONTRACT_ONLY` |
| 29 | `BLOCKED_SECURITY_RISK` | **배정 실재**: 🟠 **`actor_type` 부재** → `apikey:`/`user:` 가 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배) | `BLOCKED_SECURITY_RISK` |
| 30 | `UNVERIFIED` | 배정: `ClaudeAI.php` "killswitch 내장" **주석**(실효와 불일치 — 주석만 읽으면 오판) · `Approvals.jsx:576` `required_approvals`(매핑 1회 후 참조 0 = dead field) | `UNVERIFIED` — 주장 근거로 쓰지 말 것 |
| 31 | `TEST_ONLY` | **배정 0** — 승인·워크플로 도메인에 테스트 전용 구현 없음(레포에 테스트 스위트 자체가 없음) | `NOT_APPLICABLE` |

**실측 개수: 31 / 31 전사.** 원문 개수와 전사 개수 **일치**.
커버리지 = `VALIDATED_LEGACY` 실배정 6그룹 · `LEGACY_ADAPTER` 2 · `BLOCKED_*` 실배정 4(CROSS_TENANT·WORKFLOW_BYPASS·MIGRATION_RISK·SECURITY_RISK) · `MIGRATION_REQUIRED`/`CONSOLIDATION_REQUIRED`/`DEPRECATION_CANDIDATE`/`KEEP_SEPARATE_WITH_REASON`/`UNVERIFIED` 각 실배정 · `CONTRACT_ONLY` 15(CANONICAL_* 계열 전부 + BLOCKED_DUPLICATE_EXECUTION·BLOCKED_REPLAY_RISK) · `NOT_APPLICABLE` 3(외부 엔진 2 + TEST_ONLY).

## 2. 규칙

- 🔴 **Flow 실행 엔진 신설 절대 금지.** `JourneyBuilder` 가 레포 유일 실 엔진이며 **`approval` 노드 하나만 결번**이다 → **`approval` 노드 추가 + `wait` event-mode 재폴링 패턴(:565-570) 재사용**이 유일 합리해. 두 번째 엔진 = 헌법 위반(중복 엔진) + 무후퇴 붕괴.
- 🔴 **선결 조건: enrollment 컨텍스트 일반화.** `customer_id` 종속(:551/:556)을 풀지 않은 채 비-고객 승인을 태우면 `BLOCKED_MIGRATION_RISK`. **노드 추가보다 컨텍스트 일반화가 먼저다.**
- ★ **부재증명은 이름이 아니라 능력으로 하라.** 8회차의 BPMN/Temporal grep 0 → "엔진 부재" 확대 해석은 **전수조사로 뒤집혔다**. 이후 모든 부재 주장은 **능력 대조**를 동반해야 하며, 벤더명 grep 0 단독은 근거가 아니다.
- ★ **형태 유사 ≠ 의미 동일.** `journeys` 의 `condition`/`split`/`wait`/`delay` 를 승인 커버로 계산 금지(역산). **실행 프리미티브 재사용 근거로만 인용 가능.**
- **승인 정의(Definition)는 신설 불가피** — 현행 4종 전부 "누가·몇 명·어떤 순서"가 코드 상수다(Mapping:209 리터럴 `2` · Alerting:562 하드코딩 `2` · AdminGrowth 단일결재 암묵). 정의 테이블·step·조건부 라우팅·역할 바인딩 **전부 부재**. 이것이 §71 CANONICAL_* 15종이 `CONTRACT_ONLY` 인 이유다.
- **정족수·Maker-Checker는 신설 금지** → `Mapping.php:245-290` 5단 규율(위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수)을 **공용 트레이트/서비스로 추출**. **재작성 시 289차 G-01 이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동이다.**
- **실행 인프라(동시성·알림·킬스위치·에러 봉투) 신설 금지.** 조건부 UPDATE+rowCount CAS 채택 · `Alerting::pushEvent` 재사용 · `AdAdapters::executionEnabled` 재사용 · `AdminGrowth::fail` 봉투 공용 추출.
  - 🔴 **`version` optimistic lock·분산락·`GET_LOCK` 도입 금지** — **SQLite 폴백 호환이 명시적 설계 제약**이며 이를 어기는 동시성 모델은 제약 위반이다.
- **멱등은 5-3-2 가 채울 결번**(`idempotency_key` grep 0) → 현행 3패턴 중 **`claimSendOnce` 자연키 선점 마커**(JourneyBuilder:672)가 승인 결정에 가장 정합.
- 🔴 **오탐 재플래그 금지**: `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** · "에러 코드 체계 부재" 주장은 **과장**(`AdminGrowth::fail` 실배선) — 믿었다면 **두 번째 에러 봉투를 신설할 뻔했다**.

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

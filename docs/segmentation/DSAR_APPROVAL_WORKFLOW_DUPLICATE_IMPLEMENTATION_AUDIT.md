# DSAR — 중복 구현 감사 (§72)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §72 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

### 0.1 ★승인 지형 = **"중복 4벌"이 아니라 "1 REAL + 3 미달"**

이 감사의 가장 중요한 실측이다. 승인 테이블이 4개 존재하므로 **"중복 4벌 → 통합"** 으로 결론내기 쉽다. **틀렸다.** 실제로는 **1개만 작동하고 3개는 승인 통제로서 미달**이다. 미달을 "중복"으로 부르면 **통합 대상의 절반이 처음부터 존재하지 않던 기능**이 되고, 통합 결과물이 자동으로 "기능 유지"로 위장된다.

| 승인 구현 | 실측 | 판정 |
|---|---|---|
| ★`mapping_change_request` | **레포 유일 REAL**. `Mapping.php:238-294` 5단 규율 전부: 위조불가 신원 fail-closed(`Mapping::actorId` 289차 신설 — `apikey:{id}`/`user:{email}` 만 · 미확인 null→**403 fail-closed**) → 자기승인 차단 → 승인자 dedup → 비-pending 상태 게이트 → 정족수(`:287` `count($approvals) >= (int)$r["required_approvals"]`). 정족수 컬럼 실재(`Db.php:634 required_approvals INT NOT NULL DEFAULT 2`), INSERT 에 실주입(`Mapping.php:209`) | `VALIDATED_LEGACY` — **공용 추출 원본** |
| `action_request` | 정족수 **컬럼 없음** · `Alerting.php:562` 리터럴 `"required_approvals" => 2` = **응답 장식** · **`INSERT INTO action_request` grep 0 = 생산자 전무 = 한 번도 채워진 적 없음** · `listActionRequests` 는 `required_approvals:2` 를 응답하나 `decideAction` 은 **1명에 approved** = **계약 위반이 이미 존재** · 유일 실자산 = `executeAction` 액추에이터 배선(:620-650) | `VACUOUS` + `DEPRECATION_CANDIDATE`(정족수 표면) / `LEGACY_ADAPTER`(액추에이터만) |
| `admin_growth_approval` | **tenant_id 없음** · 전역 조회 · 결정 경로도 격리 없음(`AdminGrowth:1324 WHERE id=?`) | `BLOCKED_CROSS_TENANT` + `MIGRATION_REQUIRED` |
| `catalog_writeback_approval` | **고아** — 읽는 코드 0 | `DEPRECATION_CANDIDATE` |

**→ 통합은 신설이 아니다.** `Mapping::approve` + `Mapping::actorId` 를 **공용 트레이트/서비스로 추출한 뒤 나머지를 흡수**한다. 🔴 **4번째 Foundation 신설 금지(AL-19).** 🔴 **`EquivalenceProof` 선행 없이 통합 금지** — 286차 rank 맵 붕괴가 그대로 재현된다.

### 0.2 🔴 신규 결함 (미수정 · 별도 세션 — **참조 구현으로 삼지 말 것**)

| ID | 결함 | 실측 | 심각도 |
|---|---|---|---|
| **A** | **`Alerting::executeAction` 승인 우회** | Alerting.php:601-660. `:612` 가 `SELECT action_json, status FROM action_request WHERE id=? AND tenant_id=?` 로 **`status` 를 SELECT 하고 어디서도 판독하지 않는다**(죽은 읽기) → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행**. 287차 "가짜집행" 수정(집행 없이 status만 executed)의 **부작용** — 집행은 진짜가 됐으나 **상태 게이트가 함께 오지 않았다**. 현재 `INSERT INTO action_request` grep 0 → **VACUOUS**(도달 불가)이나 **생산자 배선 시 즉시 활성** | 🔴 |
| **B** | **`actor_type` 부재** | 정족수 계수가 `apikey:`/`user:` 를 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). `Mapping::actorId` 는 위조불가 신원까지는 확보했으나 **주체 유형(type) 축이 없다** | 🟠 |

### 0.3 ★순서 절대 규율

> **① `executeAction` 상태 게이트 → ② `action_request` 생산자 배선.**

**뒤집으면 승인 우회(결함 A)가 즉시 활성화된다.** 현재 A 가 무해한 유일한 이유는 생산자가 0이라 도달 불가(VACUOUS)이기 때문이다. 생산자를 먼저 배선하는 순간, `pending` 상태의 승인 요청이 곧바로 실 광고 집행(예산 변경·캠페인 정지)으로 흘러간다. **이 순서는 협상 대상이 아니다.**

### 0.4 ★축 주의 — "중복"과 "미달"을 구분하라

원문 §72 는 **"여러 X"** 형태로 중복을 묻는다. 실측에서 다수가 **"여러 개"가 아니라 "0개 또는 1개"** 다(Task Queue·Human Task Inbox·Idempotency Store·Workflow Lock 등). **중복이 없다는 사실을 "양호"로 읽으면 오독이다** — 그 항목들은 대체로 **기능 자체가 부재**하며, 5-3-2 가 처음 만드는 것이다. 따라서 이 표의 판정은 **`NOT_APPLICABLE`(부재) 과 `CONSOLIDATION_REQUIRED`(진짜 중복) 를 엄격히 분리**한다.

## 1. 원문 전사 + 판정 — **원문 24종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 여러 Workflow Definition Store | **중복 없음 — 정의 스토어 자체가 0**(`workflow_*`/`flow_*`/`wf_*` grep 0). 승인 정의는 **코드 상수**(Mapping:209 리터럴 `2` · Alerting:562 하드코딩 `2` · AdminGrowth 단일결재 암묵) | `NOT_APPLICABLE`(부재 → 신설) |
| 2 | 여러 Workflow Version Store | **중복 없음 — 0**. 정의가 없으므로 버전도 없음 | `NOT_APPLICABLE` |
| 3 | 여러 Workflow Instance Table | **중복 없음 — 1**(`journey_enrollments`, 마케팅 도메인 · `customer_id` 종속). 승인 인스턴스 0 | `KEEP_SEPARATE_WITH_REASON` / `NOT_APPLICABLE`(승인) |
| 4 | 여러 Workflow Task Table | **중복 없음 — 0**. Task/배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 5 | 여러 Task Queue | **★진짜 다수 — 잡/큐 REAL 7종**: `omni_outbox`(Omnichannel.php:74-93) · `catalog_writeback_job`(Catalog.php:75-84) · `channel_shipment_job`(ChannelSync.php:5960) · `catalog_sync_job`(:248) · `ad_delivery_dlq`(AdAdapters.php:1127) · `webhook_delivery`/`webhook_endpoint`(OpenPlatform.php:81-105) · `raw_vendor_event`(Db.php:1017-1034 · `uq_rve_dedup` UNIQUE). `writeback_job`(Db.php:519)=레거시 유물. **전용 브로커 부재 · 러너 37종은 얇은 어댑터** | `KEEP_SEPARATE_WITH_REASON`(도메인별 큐 — 승인 큐 신설 금지·정족수는 Mapping 추출) + `DEPRECATION_CANDIDATE`(`writeback_job`) |
| 6 | 여러 Human Task Inbox | **중복 없음 — 0**. Inbox/배정/클레임 부재. (`Approvals.jsx` 는 목록 UI일 뿐 · `:576 required_approvals` 는 **매핑 1회 후 참조 0 = dead field**) | `NOT_APPLICABLE` |
| 7 | 여러 State Machine | **★최대 산포**: `UPDATE … SET status=` **155건 / 44파일**(Wms 10 · ChannelSync 10 · EmailMarketing 10 · JourneyBuilder 10 · Catalog 9 · LiveCommerce 9 …). **전이 규칙 선언 0 — 전부 호출 지점 인라인.** 전이 가드는 **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155 | `CONSOLIDATION_REQUIRED`(승인 도메인 한정) — 🔴 **155건 전역 리팩터 금지**(무후퇴 붕괴) |
| 8 | 여러 Timer Scheduler | **중복 없음 — 스케줄링 수단은 OS cron 단일**. 구현 패턴은 DB 컬럼+cron 폴링 2벌: `journey_enrollments.resume_at`/`wait_until`(:80-82 · 206차 delay + 255차 이벤트 절대기한 **분리 설계**) · `sms_campaigns.scheduled_at`+`runScheduledQueue`(SmsMarketing.php:367 · **ISO8601 문자열 사전식 비교**) · kakao/email 대칭. **타이머 서비스·지연큐 부재** | `VALIDATED_LEGACY`(패턴 재사용 — 신설 금지) |
| 9 | 여러 Retry Framework | **★진짜 중복 — 백오프 3공식 병존**: `AdAdapters::retryDeliveryDlq`:1187-1228(maxAttempts 5 · `600*2^n` **86400s 캡**) · `OpenPlatform`:466-471(`min(60,2^n)`분) · `Omnichannel`:365(attempts<3 · **백오프 없음**) | `CONSOLIDATION_REQUIRED` — **신설분은 `AdAdapters:1221` 공식 채택 권고** |
| 10 | 여러 Callback Correlation Store | **중복 없음 — 상관 스토어 0**. 인접: Paddle 서명 HMAC(:1073) + **멱등**(`notification_id` UNIQUE → **`processed=1`일 때만 skip**, `processed=0`은 재처리 허용 · 272차) / 범용 인바운드 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더는 수신 허용 + `verified=false`) | `NOT_APPLICABLE`(상관) + `LEGACY_ADAPTER`(멱등 수신 선례) |
| 11 | 여러 Dead Letter Store | **중복 없음 — DLQ 테이블은 `ad_delivery_dlq` 1개뿐**(AdAdapters.php:1127). 나머지는 원 테이블 `status='failed'` 잔류 | `VALIDATED_LEGACY`(단일) |
| 12 | 여러 Idempotency Store | **중복 없음 — 0**(`idempotency_key` grep 0). 자연키 선점 3패턴 존재: `claimSendOnce`(JourneyBuilder:672) · `notification_id` UNIQUE(Paddle) · `uq_rve_dedup`(Db.php:1017-1034) | `NOT_APPLICABLE` — **5-3-2 가 채울 결번**(`claimSendOnce` 패턴이 승인 결정에 가장 정합) |
| 13 | 여러 Workflow Lock 구현 | **중복 없음 — 워크플로 락 0**. 동시성 = 조건부 UPDATE+rowCount CAS 4곳(Catalog:1683 · ChannelSync:6136-6153(stale 600s 회수) · JourneyBuilder:411 · Omnichannel) + `Omnichannel::claimBatch`:394-423(stale lease 900s → `FOR UPDATE SKIP LOCKED`+claim_id → 조건부 UPDATE 폴백) + `claimConditional`:427-447. **optimistic lock(`version`)·분산락·`GET_LOCK` 전부 grep 0** — **SQLite 폴백 호환이 명시적 설계 제약**. `flock` 은 `stock_sync_cron.php:54` 유일 | `VALIDATED_LEGACY`(CAS 채택) — 🔴 **다른 동시성 모델 도입 = 제약 위반** |
| 14 | 여러 Workflow Audit Store | **중복 없음 — 워크플로 감사 0**. 인접 = `journey_node_logs`(JourneyBuilder.php:50,:69) 노드 감사 | `NOT_APPLICABLE`(승인) + `VALIDATED_LEGACY`(패턴) |
| 15 | Claim·Funding·Payout별 독립 Workflow Engine | **부재 — 해당 도메인 자체가 미구현**. 실 Flow 엔진은 `JourneyBuilder` **1개뿐**(레포 유일) | `NOT_APPLICABLE` — 🔴 **도메인별 엔진 신설 금지** |
| 16 | ERP·Provider·Admin UI별 독립 Workflow 상태 | **★실재**: `admin_growth_approval`(Admin UI 전용 · **tenant_id 없음** · `:1324 WHERE id=?`) · `catalog_writeback_approval`(고아) · `action_request`(VACUOUS) — 각각 독립 상태 축 | `CONSOLIDATION_REQUIRED` + `BLOCKED_CROSS_TENANT`(admin_growth_approval) |
| 17 | API Handler 안의 하드코딩된 단계 전환 | **★전면 실재 — 이것이 현행 지배 패턴**. `UPDATE … SET status=` 155건/44파일이 **전부 핸들러 인라인**. 승인 단계 수 자체도 하드코딩(Mapping:209 `2` · Alerting:562 `2` · AdminGrowth 단일결재 암묵) | `CONSOLIDATION_REQUIRED`(승인 도메인) |
| 18 | Cron Job으로 직접 상태 변경 | **★실재이자 정상 설계**: `journey_cron.php:29-35`(*/5 · `install_crontab.sh` 정본 등재 = REAL) 가 enrollment 상태 전이 · `runScheduledQueue`(SmsMarketing:367) · `stock_sync_cron.php`. **스케줄링=OS cron 단일 수단**이므로 이 경로 제거는 불가 | `VALIDATED_LEGACY` — **cron 경유 전이는 유지 · 단 전이 규칙은 선언으로 이동** |
| 19 | Boolean `completed` 기반 Workflow | **부재 — 현행은 `status` 문자열 기반**(155건 전부). Boolean completed 축 grep 0 | `NOT_APPLICABLE`(해당 안티패턴 없음) |
| 20 | Active Definition 직접 수정 | **판정 불가 — 정의 자체가 부재**. 다만 `journeys` JSON 은 **작성자 JSON 에 acyclicity 검증 없음**(JourneyBuilder:512 주석 자인 · **런타임 방어만**) → 정의 불변성 개념 전무 | `NOT_APPLICABLE` — **Active Version Immutable 은 5-3-2 신설분(§82-4)** |
| 21 | Workflow Task 없이 Approval Decision 생성 | **★전면 실재 — 현행 4종 전부가 이것**. Task 엔티티가 없으므로 모든 승인 결정이 Task 없이 생성된다(`Mapping::approve`:238-294 · `Alerting::decideAction` · `AdminGrowth::approvalDecide`:1322-1327) | `CONSOLIDATION_REQUIRED` — 구조적 필연(Task 축 신설 전까지) |
| 22 | Approval Decision 없이 Workflow Approval Task 완료 | **🔴 실질 등가물 실재**: `Alerting::executeAction`(:601-660) 이 `:612` 죽은 읽기로 **`pending`·`rejected` 도 실집행**(§0.2 A) = **결정 없이 완료**. 현재 VACUOUS(생산자 0)이나 **생산자 배선 시 즉시 활성** | `BLOCKED_WORKFLOW_BYPASS` — **§0.3 순서 절대** |
| 23 | Callback으로 Authorization 없이 직접 Transition | **인접 실재**: 범용 인바운드 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더는 **수신 허용** + `verified=false`) → 인증 없는 콜백이 수신 자체는 통과 · Paddle 은 서명 HMAC(:1073) 실재하나 **테넌트 검증 부재**(`paddle_events` 에 tenant_id 없음 :99). **단 이들이 승인 상태를 전이시키는 경로는 현재 없음** | `BLOCKED_CROSS_TENANT`(Paddle 테넌트 축) — 🔴 **승인 전이를 콜백에 연결 시 즉시 실결함화** |
| 24 | External Engine과 Internal Engine의 이중 실행 | **부재 — 외부 엔진 `backend/src` grep 0**(Temporal·Camunda·Flowable·Zeebe·Step Functions·BPMN). 이중 실행 표면 없음(§73) | `NOT_APPLICABLE` |

**실측 개수: 24 / 24 전사.** 원문 개수와 전사 개수 **일치**.
커버리지 = **진짜 중복(`CONSOLIDATION_REQUIRED`) 5** (State Machine · Retry Framework · ERP/Provider/Admin 독립 상태 · 핸들러 인라인 전환 · Task 없는 Decision) · **차단(`BLOCKED_*`) 3**(WORKFLOW_BYPASS 1 · CROSS_TENANT 2) · **부재(`NOT_APPLICABLE`) 10** · `VALIDATED_LEGACY` 5 · `KEEP_SEPARATE_WITH_REASON` 2 · `LEGACY_ADAPTER`/`DEPRECATION_CANDIDATE` 부수 배정.

## 2. 규칙

- 🔴 **승인 지형을 "중복 4벌"로 서술 금지.** 정확한 서술은 **"1 REAL + 3 미달"** 이다. `mapping_change_request` 만 REAL 이고, `action_request` 는 VACUOUS, `admin_growth_approval` 은 테넌트 미격리, `catalog_writeback_approval` 은 고아다. **미달을 중복으로 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다.**
- 🔴 **통합 = 신설이 아니라 추출·흡수.** `Mapping::approve`(:238-294) + `Mapping::actorId` 를 **공용 트레이트/서비스로 추출**한 뒤 나머지를 흡수한다. **재작성 시 289차 G-01 이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동이다.**
- 🔴 **4번째 Foundation 신설 금지(AL-19).** 승인 테이블이 4개인 상황에서 5번째를 만드는 것이 통합일 수 없다.
- 🔴 **`EquivalenceProof` 선행 없이 통합 금지.** 286차 rank 맵 붕괴가 그대로 재현된다. 추출 전후 **동일 입력 → 동일 판정** 증명이 선행 조건이다.
- 🔴 **★순서 절대: ① `executeAction` 상태 게이트 → ② `action_request` 생산자 배선.** 뒤집으면 승인 우회(결함 A)가 **즉시 활성**된다. 현 무해함의 유일한 근거는 VACUOUS(생산자 0)이며, 그것은 안전장치가 아니라 **우연**이다.
- 🔴 **`action_request` 는 흡수 대상이지 재사용 자산이 아니다.** **첫 생산자로 배선하거나 폐기 후 디스패치만 회수**한다. **현 상태 방치 = 가짜 정족수 잔존**(`listActionRequests` 는 `required_approvals:2` 응답 · `decideAction` 은 1명에 approved = **계약 위반이 이미 존재**).
- 🔴 **`Alerting::executeAction` 을 참조 구현으로 삼지 마라.** 액추에이터 배선(:620-650)만 `LEGACY_ADAPTER` 로 회수하고, **상태 판독 부재(:612)는 복제 금지**.
- 🟠 **`actor_type` 축을 5-3-2 정족수 계약에 반드시 포함하라.** 현행은 `apikey:`/`user:` 동등 계수 → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배).
- 🔴 **155건/44파일 전역 상태 전이 리팩터 금지.** 승인 도메인에 한정하라. 전역 리팩터는 무후퇴 붕괴이며 §72 가 요구하는 것도 아니다.
- 🔴 **`version` optimistic lock·분산락·`GET_LOCK` 도입 금지** — **SQLite 폴백 호환이 명시적 설계 제약**. 조건부 UPDATE+rowCount CAS 를 채택하라.
- **부수 규율**: **defer≠실패**(Omnichannel:349,362 — quiet_hours/sto_defer 는 attempts 미증가) · **honest pending**(ChannelSync:6173 · Catalog:1712 — 어댑터 부재 시 재시도 미소모). 승인 대기·보류도 **실패로 계상 금지**.
- **오탐 재플래그 금지**: `Approvals.jsx:576 required_approvals` 는 grep 0 이 아니라 **매핑 1회 후 참조 0(dead field)** · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**(주석만 읽고 판정 금지) · `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계**.

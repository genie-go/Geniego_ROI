# DSAR — Audit Event (§70)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §70 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

**엔티티: `APPROVAL_WORKFLOW_AUDIT_EVENT`**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_AUDIT_EVENT` | **grep 0** | `NOT_APPLICABLE` — 신설 |
| 🔴 **범용 감사 저장소** | `audit_log` — **MySQL판**(Db.php:**540-545**) = `id`·`actor`·`action`·`details_json MEDIUMTEXT`·`created_at` / **SQLite판**(AdminGrowth.php:**157-159**) = 동일 컬럼 → **tenant 없음 · 해시체인 없음 · prev_hash 없음** | 🔴 **부적격**(아래 축 주의) |
| ★**노드 감사 REAL** | `journey_node_logs`(JourneyBuilder.php:**48**, :**69**, 인덱스 :**71**) = `tenant_id`(**보유**)·`enrollment_id`·`journey_id`·`node_id`·`node_type`·`action`·`result`·`executed_at` · 집계 조회 :248(`WHERE journey_id=:id AND tenant_id=:t` — **테넌트 술어 실배선**) | `LEGACY_ADAPTER` — **노드 감사 REAL · 마케팅 여정 도메인** |
| 승인 결정 기록 | `AdminGrowth::approvalDecide` — `decided_by`/`decided_at` UPDATE(:1330-1331) · 🔴 조회는 `WHERE id=?`(:1324 · **테넌트 술어 없음**) | `LEGACY_ADAPTER` · 🔴 인접 갭 |
| 정족수 결정 기록 | `Mapping::approve`(Mapping.php:238-294) + `Mapping::actorId`(:36 위조불가 신원) | `VALIDATED_LEGACY` |
| 이벤트 발신 | `OpenPlatform::emit`(:311-328) — 화이트리스트 · 구독 0이면 no-op · **예외 절대 미전파**(:325) = **웹훅 발신 전용** | `KEEP_SEPARATE_WITH_REASON` — **이벤트 버스 아님** |
| 🔴 이벤트 버스 | 범용 이벤트 버스·in-process dispatcher·구독 기전 **grep 0** — 내부는 전부 직접 static 호출 | `NOT_APPLICABLE` |
| 통지 인프라 | `notification_channel` SSOT(Alerting.php:911 · `min_severity`) + 폴백 체인(:471-497 · 282차) **완비** · 🔴 **승인 이벤트↔통지 배선만 0** | `VALIDATED_LEGACY` — **신설 금지·배선만** |

### ★축 주의 ① — `audit_log` 는 §70 의 저장소가 될 수 없다

실측 `audit_log`(Db.php:540-545 · AdminGrowth.php:157-159)는 **tenant 도 해시체인도 없다**:
- **tenant 없음** → 40종 감사 이벤트를 여기에 쓰면 **테넌트 간 감사 혼재**. `details_json` 안에 tenant 를 문자열로 묻는 것은 **격리가 아니라 위장**이다(테넌트 격리 절대 원칙 위배).
- **해시체인 없음**(`prev_hash`/`chain_hash` 부재) → **§64 #26(Workflow Definition 직접 수정으로 실행 이력 훼손) 이 설계상 미방어**. 감사 로그가 사후 수정돼도 탐지 수단이 없다.
- → 🔴 **§70 감사 저장소는 신설이 정답**이며, 이는 "중복 신설"이 아니라 **`audit_log` 가 요구를 충족하지 못한다는 실측 근거**에 따른 것이다. §69 #36(result hash)·#38(audit reference)이 여기에 직결된다.

### ★축 주의 ② — `journey_node_logs` 는 REAL 이지만 도메인이 다르다

`journey_node_logs`(JourneyBuilder.php:48,:69)는 **노드 감사 REAL** 이고 **`tenant_id` 를 실제로 보유**하며 조회에도 **테넌트 술어가 실배선**(:248)되어 있다 — `audit_log` 보다 성숙하며 **§70 신설의 스키마 참조 대상으로 최적**이다. 그러나 축이 `enrollment_id`/`journey_id` 인 **마케팅 발송 도메인**이고 이벤트 어휘가 §70 의 40종과 무관하다. **§70 커버로 계산하면 역산**이다 → `LEGACY_ADAPTER`(스키마·테넌트 술어 선례로만 인용).

### ★축 주의 ③ — 부재증명은 이름이 아니라 능력으로

8회차에 BPMN/Temporal **이름 grep 0** 을 "워크플로 엔진 부재"로 확대 해석했다가 **JourneyBuilder 라는 실 엔진의 존재로 뒤집혔다.** 동일하게 `APPROVAL_WORKFLOW_AUDIT_EVENT` **이름 grep 0** 을 "노드 감사 능력 부재"로 읽으면 오판이다 — **`journey_node_logs` 라는 실 노드 감사가 존재**한다. 아래 40종의 `NOT_APPLICABLE` 은 **"능력이 없다"가 아니라 "승인 도메인 이벤트 어휘가 없다"**는 뜻이다.

## 1. 원문 전사 + 판정 — **원문 지원 Event 40종**

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | WORKFLOW_CATALOG_CREATED | Catalog(워크플로) 개념 grep 0 · ※`Catalog.php` 는 **상품 카탈로그** — 동명이의 | `NOT_APPLICABLE` · ⚠️명명 충돌 주의 |
| 2 | WORKFLOW_TEMPLATE_REGISTERED | Template 개념 부재 · 인접 동명이의 = `FeedTemplate::transition`(:248-285 · **피드 템플릿**) | `NOT_APPLICABLE` |
| 3 | WORKFLOW_DEFINITION_CREATED | `workflow_*`/`flow_*`/`wf_*` **grep 0** | `NOT_APPLICABLE` |
| 4 | WORKFLOW_DEFINITION_UPDATED | 동상 · §64 #26(직접 수정 훼손)이 겨냥하는 이벤트 | `NOT_APPLICABLE` |
| 5 | WORKFLOW_VERSION_CREATED | Version 개념 부재 | `NOT_APPLICABLE` |
| 6 | WORKFLOW_VERSION_VALIDATED | Static Lint 부재(§65 전건 `CONTRACT_ONLY`) | `NOT_APPLICABLE` |
| 7 | WORKFLOW_VERSION_APPROVED | Version 승인 부재 · 인접 승인 = `Mapping::approve`(:238-294 **매핑 변경** 도메인) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 8 | WORKFLOW_VERSION_ACTIVATED | 인접 전이 가드 = `AdminGrowth::launch`(:1155) — **성장 캠페인** 도메인 | `NOT_APPLICABLE` |
| 9 | WORKFLOW_VERSION_DEPRECATED | Deprecate 개념 부재 | `NOT_APPLICABLE` |
| 10 | WORKFLOW_INSTANCE_CREATED | Instance 부재 · 인접 = `journey_enrollments` 생성(**마케팅 여정**) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 11 | WORKFLOW_INSTANCE_STARTED | 동상 | `NOT_APPLICABLE` |
| 12 | WORKFLOW_NODE_ENTERED | ★**인접 REAL**: `journey_node_logs`(JourneyBuilder.php:48,:69 · `node_id`·`node_type`·`executed_at`) — **마케팅 여정 노드** | `NOT_APPLICABLE`(승인) · `LEGACY_ADAPTER`(**스키마 선례 최적**) |
| 13 | WORKFLOW_NODE_EXITED | 동상 · ⚠️현행은 **enter/exit 미분화**(단일 로그 행) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 14 | WORKFLOW_TASK_CREATED | Task 개념 부재 | `NOT_APPLICABLE` |
| 15 | WORKFLOW_TASK_ASSIGNED | Assignment 부재 | `NOT_APPLICABLE` |
| 16 | WORKFLOW_TASK_CLAIMED | Claim 부재(승인) · 인접 = `Omnichannel::claimBatch`(:394-423 **잡 큐**) · `JourneyBuilder`:411-418(**여정**) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 17 | WORKFLOW_TASK_RELEASED | Release 부재 · 인접 = stale lease 회수(Omnichannel **900s** :394-423 · ChannelSync **600s** :6136-6153) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 18 | WORKFLOW_TASK_COMPLETED | 인접 승인 결정 = `AdminGrowth::approvalDecide`(`decided_by`/`decided_at` :1330-1331) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 19 | WORKFLOW_TASK_FAILED | 실패 이벤트 부재 — 현행은 원 테이블 `status='failed'` 잔류 | `NOT_APPLICABLE` |
| 20 | WORKFLOW_TRANSITION_EXECUTED | 🔴 **전이 규칙 선언 0** · `UPDATE ... SET status=` **155건/44파일** 전부 호출지점 인라인 → **전이 이벤트를 낼 중앙 지점이 없다** | `NOT_APPLICABLE` |
| 21 | WORKFLOW_GATEWAY_EVALUATED | Gateway 부재(§12 #11~#16) | `NOT_APPLICABLE` |
| 22 | WORKFLOW_TIMER_SCHEDULED | 타이머 서비스·지연큐 부재 · 인접 = `journey_enrollments.resume_at`/`wait_until`(:80-82) · `sms_campaigns.scheduled_at`(SmsMarketing.php:367) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 23 | WORKFLOW_TIMER_FIRED | 인접 = cron 폴링(`journey_cron.php:29-35` **\*/5** · `install_crontab.sh` 정본 등재) — **스케줄링 = OS cron 단일 수단** | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 24 | WORKFLOW_SIGNAL_RECEIVED | SIGNAL_CATCH 부재(§12 #19) · 🔴 이벤트 버스 grep 0 | `NOT_APPLICABLE` |
| 25 | WORKFLOW_MESSAGE_CORRELATED | 인접 = `JourneyBuilder` `wait` event-mode(:548 date\|event\|timeout 분기 · 재폴링 :565-570) — **마케팅 여정** | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(**설계 결론 1 재사용 대상**) |
| 26 | WORKFLOW_CALLBACK_PROCESSED | 인접 REAL: Paddle HMAC(:1073) + **멱등**(`notification_id` UNIQUE → **`processed=1` 일 때만 skip · `processed=0` 은 재처리 허용**·272차) · 🔴 **tenant 검증 부재**(`paddle_events` tenant_id 없음 :99) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` · 🔴 인접 갭 |
| 27 | WORKFLOW_RETRY_SCHEDULED | 인접 = `AdAdapters::retryDeliveryDlq`(:1187-1228 · maxAttempts 5 · `600*2^n` · **86400s 캡**) · 🔴 **백오프 3공식 병존** | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(**:1221 채택 권고**) |
| 28 | WORKFLOW_DEAD_LETTERED | 인접 = `ad_delivery_dlq`(AdAdapters.php:1127) — **레포 유일 DLQ 테이블** | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 29 | WORKFLOW_PAUSED | Pause 개념 부재 · 인접 킬스위치 = `AdAdapters::executionEnabled`(:34 · **9곳 실배선**) | `NOT_APPLICABLE` · `VALIDATED_LEGACY`(킬스위치) |
| 30 | WORKFLOW_RESUMED | Resume 부재 · 인접 컬럼명 = `resume_at`(:80-82 · **여정 delay 재개** — 동명이의) | `NOT_APPLICABLE` · ⚠️명명 충돌 주의 |
| 31 | WORKFLOW_CANCELLED | Cancel 전이 부재 | `NOT_APPLICABLE` |
| 32 | WORKFLOW_COMPENSATION_REQUESTED | Compensation 부재 · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 33 | WORKFLOW_MIGRATION_STARTED | Migration 개념 부재 · ※`backend/migrations/` 는 **DB 스키마 마이그레이션**(172차 정지 · 이후 `ensureTables` 자가치유) — **동명이의** | `NOT_APPLICABLE` · ⚠️명명 충돌 주의 |
| 34 | WORKFLOW_MIGRATION_COMPLETED | 동상 | `NOT_APPLICABLE` |
| 35 | WORKFLOW_REPLAY_STARTED | Replay 개념 부재 · 멱등키 grep 0 | `NOT_APPLICABLE` |
| 36 | WORKFLOW_REPLAY_COMPLETED | 동상 | `NOT_APPLICABLE` |
| 37 | WORKFLOW_COMPLETED | 종료 이벤트 부재 · 인접 = `journeys` `exit` 노드(**마케팅 여정**) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 38 | WORKFLOW_FAILED | 실패 종료 부재 | `NOT_APPLICABLE` |
| 39 | WORKFLOW_DRIFT_DETECTED | Drift 탐지 부재(외부 엔진 미도입 → §64 #23 대상 없음) | `NOT_APPLICABLE` |
| 40 | MANUAL_REVIEW_REQUESTED | 인접 통지 **완비**: `notification_channel` SSOT(Alerting.php:911 · `min_severity`) + 폴백 체인(:471-497) · 🔴 **승인 이벤트↔통지 배선만 0** | `NOT_APPLICABLE`(이벤트) · `VALIDATED_LEGACY`(통지 — **신설 금지·배선만**) |

**실측 개수: 40 / 40 전사.** 커버리지 = `NOT_APPLICABLE` 40 (**승인 워크플로 감사 이벤트 어휘 grep 0**) · 인접 어댑터 재사용 가능 11건(#12·#13·#17·#18·#22·#23·#25·#26·#27·#28·#40 — 그중 **#12/#13 `journey_node_logs` 가 스키마 선례로 최적**) · `VALIDATED_LEGACY` 2건(#29 킬스위치 · #40 통지) · ⚠️**동명이의 명명 충돌 4건**(#1 Catalog · #2 Template · #30 resume · #33/#34 Migration).

## 2. 규칙

- 🔴 **§70 감사 저장소를 `audit_log` 로 하지 마라.** 실측(Db.php:540-545 · AdminGrowth.php:157-159) = `actor`·`action`·`details_json`·`created_at` 4컬럼 · **tenant 없음 · 해시체인 없음**.
  - **tenant 부재** → 40종을 여기 쓰면 테넌트 간 감사 혼재. `details_json` 문자열 매장은 **격리가 아니라 위장**이다.
  - **해시체인 부재** → **§64 #26(실행 이력 훼손)이 설계상 미방어**. §69 #36(result hash)·#38(audit reference)도 함께 미충족으로 확정된다.
  - → **Evidence(§69)와 Audit Event(§70)는 같은 결정에 묶여 있다. 저장소 결정 전에는 두 문서의 해당 축을 `CONTRACT_ONLY` 이상으로 올리지 마라.**
- ★ **스키마 선례는 `journey_node_logs`(JourneyBuilder.php:48,:69,:71)를 참조하라.** 이유: **`tenant_id` 를 보유**하고 **조회에도 테넌트 술어가 실배선**(:248)되어 있어 `audit_log` 보다 성숙하다. 단 **마케팅 여정 도메인**이므로 **커버로 계산 금지 · 스키마/테넌트 술어 패턴만 인용**.
  - ⚠️ 현행은 **enter/exit 미분화**(단일 로그 행) → §70 #12/#13 은 **분리 신설**이 필요하다. 형태가 닮았다고 그대로 복사하면 원문 요구를 놓친다.
- 🔴 **#20(TRANSITION_EXECUTED)은 이 문서의 최대 구조 리스크.** **전이 규칙 선언이 0**이고 `UPDATE ... SET status=` 가 **155건/44파일**에 인라인 산재하므로 **전이 이벤트를 발신할 중앙 지점이 존재하지 않는다.** 감사 이벤트를 먼저 만들고 전이를 나중에 중앙화하면 **155곳에 감사 호출을 뿌리게 된다**(= 새 병). **전이 중앙화가 선결**이다.
- 🔴 **`OpenPlatform::emit`(:311-328)을 §70 의 발신 기전으로 쓰지 마라.** **웹훅 발신 전용**이며 화이트리스트 · 구독 0이면 no-op · **예외를 절대 전파하지 않는다**(:325). 감사 이벤트가 여기 얹히면 **감사 실패가 조용히 삼켜진다** — 감사는 **삼켜지면 안 되는 것의 정의 그 자체**다. (범용 이벤트 버스·in-process dispatcher·구독 기전은 **전부 grep 0** — 내부는 직접 static 호출.)
- **#40(MANUAL_REVIEW_REQUESTED) = 신설 금지·배선만.** `notification_channel` SSOT(Alerting.php:911) + **폴백 체인**(:471-497 · 282차 "알림 통지 죽음" 수정분)이 **완비**되어 있고 **승인 이벤트↔통지 배선만 0**이다 → `Alerting::pushEvent` 재사용.
  - ⚠️ **282차 트랩**: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블 → **무발송**. 배선 시 반드시 확인.
- **#29(PAUSED) = 킬스위치 재사용 강제.** `AdAdapters::executionEnabled`(:34 · **호출부 9곳 실배선**). ⚠️**오탐 재플래그 금지**: `pause()` 면제는 **279차 D-P1 의도된 설계**(킬스위치는 지출을 늘리는 방향만 차단). ⚠️`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치** — 주석만 읽고 판정하지 마라.
- 🔴 **#18(TASK_COMPLETED)을 `Alerting::executeAction` 위에 배선하지 마라.** Alerting.php:601-660 은 `:612` 에서 `status` 를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634)를 **실집행**한다. 현재 `VACUOUS`(`INSERT INTO action_request` grep 0 = 생산자 전무)이나 **생산자 배선 시 즉시 활성 결함**이다. **참조 구현으로 삼지 마라.**
- **#26(CALLBACK_PROCESSED) 멱등 = Paddle 선례 채택**(`notification_id` UNIQUE → **`processed=1` 일 때만 skip · `processed=0` 은 재처리 허용**·272차). 🔴 단 **`paddle_events` 의 tenant_id 부재(:99)를 복제하지 마라** — 감사 이벤트에 tenant 는 **필수 컬럼**이다.
- **#27/#28(RETRY/DEAD_LETTER)**: **`AdAdapters::retryDeliveryDlq`(:1187-1228) 공식 채택**(maxAttempts 5 · `600*2^n` · **86400s 캡**). 4번째 백오프 공식 금지(현재 3공식 병존). **DLQ 테이블은 `ad_delivery_dlq` 1개뿐** — DLQ 남발 신설 금지.
  - ★**defer≠실패 규율 보존**(Omnichannel:349,362 attempts 미증가) · ★**honest pending 보존**(ChannelSync:6173 · Catalog:1712) — 감사 이벤트가 defer 를 `TASK_FAILED` 로 기록하면 **규율이 무너진다**.
- **#22/#23(TIMER)**: **스케줄링 = OS cron 단일 수단**(`journey_cron.php:29-35` \*/5 · `install_crontab.sh` 정본 등재 · 러너 37종은 얇은 어댑터). 타이머 서비스·지연큐를 신설하지 마라. `TIMER_FIRED` 의 실제 의미는 **"cron 폴링이 조건을 만족시켰다"**이며, 이 **지연 특성(최대 5분)을 감사 이벤트 시각 해석에 반영**하라(§69 #34 effective at ≠ #35 recorded at 의 실제 사유).
- **#25(MESSAGE_CORRELATED)**: `JourneyBuilder` `wait` event-mode(:548 · 재폴링 :565-570)가 **설계 결론 1 의 재사용 대상**이다. 단 **enrollment 컨텍스트 일반화 선결**(`customer_id` 필수 :554 → 비-고객 승인 불가).
- ⚠️ **동명이의 4건에 속지 마라**: #1 `Catalog`(상품 카탈로그 ≠ 워크플로 카탈로그) · #2 `FeedTemplate`(피드 템플릿) · #30 `resume_at`(여정 delay 재개) · #33/#34 `backend/migrations/`(DB 스키마 마이그레이션 · 172차 정지 · 이후 `ensureTables` 자가치유). **이름이 같다는 이유로 커버로 계산하면 역산이다.**
- **부재증명은 이름이 아니라 능력으로.** 40/40 `NOT_APPLICABLE` 은 **"노드 감사 능력이 없다"가 아니라 "승인 도메인 이벤트 어휘가 없다"**는 뜻이다 — `journey_node_logs` 라는 **실 노드 감사가 존재**한다(8회차 JourneyBuilder 반전의 교훈).
- 🔴 **40종 "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.
- **§63 규율 준수**: 이벤트 어휘 매핑은 **하드코딩 단일 Enum 변환이 아니라 Versioned Mapping Registry 또는 명시적 Contract** 로 관리한다.

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

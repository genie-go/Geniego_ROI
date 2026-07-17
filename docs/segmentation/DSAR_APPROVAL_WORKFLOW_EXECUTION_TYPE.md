# DSAR — Workflow Execution Type (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §32(Execution Type) · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)
> 필드 축은 [DSAR_APPROVAL_WORKFLOW_EXECUTION.md](DSAR_APPROVAL_WORKFLOW_EXECUTION.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 실행 종류(execution type) 축 | **backend/src grep 0** — 실행 시도 기록 자체가 없으므로 그 분류도 없음 | `NOT_APPLICABLE`(부재 → 신설) |
| 최근접 = `journey_node_logs.node_type` | `JourneyBuilder.php:50` — `delay`/`wait`/`split`/`cycle` 등이 기록됨(:541,:556,:562,:617) | `KEEP_SEPARATE_WITH_REASON` |
| 조건 평가 | `evalCondition`(condition :600 · exit :623 재사용) — **결과만** `journey_node_logs` 에 기록 | `LEGACY_ADAPTER` |
| 콜백 처리 | Paddle HMAC(:1073) + **멱등**(`notification_id` UNIQUE → `processed=1`일 때만 skip · `processed=0`은 재처리 허용·272차) | `VALIDATED_LEGACY`(패턴) |
| 리컨실리에이션 | 인접 = `Omnichannel::claimBatch` **stale lease 900s 회수**(:394-399) · `ChannelSync`:6136-6153(stale 600s) | `LEGACY_ADAPTER` |
| 마이그레이션/리플레이 | **grep 0** — 정의 버전 개념 자체 부재 | `NOT_APPLICABLE` |

**★축 주의 — `node_type` ≠ `execution type`.** `journey_node_logs.node_type`(:50)은 **무엇을 실행했는가**(노드 종류)를 답한다. §32 Execution Type 은 **엔진이 무슨 국면을 시도했는가**(초기화·진입·조건평가·전이·타이머발화·리컨실)를 답한다. 하나의 노드 실행이 `NODE_ENTRY`→`CONDITION_EVALUATION`→`TRANSITION` **여러 Execution 으로 쪼개진다**. `node_type` 을 execution type 으로 매핑하면 **국면 구분이 소멸**한다 = 역산.

## 1. 원문 전사 + 판정 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INITIALIZATION | 부재 — 등록은 `INSERT` 후 즉시 `'active'`(JourneyBuilder.php:201). **초기화 국면 미기록** | `NOT_APPLICABLE` |
| 2 | NODE_ENTRY | 부재 — 노드 **진입**은 로그 없음(`logNode` 는 결과 시점만 :541,:556) | `NOT_APPLICABLE` |
| 3 | TASK_CREATION | 부재(Task 개념 grep 0) | `NOT_APPLICABLE` |
| 4 | TASK_ASSIGNMENT | 부재 — 배정/클레임(인간) 개념 전무 | `NOT_APPLICABLE` |
| 5 | TASK_EXECUTION | 부재 · 인접 = 발송 노드 실행 + `claimSendOnce(enrollment_id,node_id)`(:672) **순회 멱등** | `LEGACY_ADAPTER` |
| 6 | CONDITION_EVALUATION | 부재(기록 축) · 인접 = `condition`(:600)·`exit`(:623) `evalCondition` — **결과만 기록·평가 시도 미기록** | `LEGACY_ADAPTER` |
| 7 | TRANSITION | **부재** — 전이 기록 테이블 자체가 결번(§34) | `NOT_APPLICABLE` |
| 8 | TIMER_FIRE | 부재(기록 축) · 인접 = `delay` resume 도래(:527,:539) · cron `*/5`(journey_cron.php:29-35) **REAL** | `LEGACY_ADAPTER` |
| 9 | SIGNAL_PROCESSING | 부재 — 🔴 **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0**(내부는 전부 직접 static 호출) | `NOT_APPLICABLE` |
| 10 | MESSAGE_PROCESSING | 부재(승인) · 인접 = 범용 인바운드 `Webhooks.php:22-27` — **opt-in**(시크릿 미설정 벤더는 수신 허용 + `verified=false`) | `LEGACY_ADAPTER` |
| 11 | CALLBACK_PROCESSING | 부재(승인) · 인접 = Paddle 멱등 수신(:1073, `notification_id` UNIQUE) — 🔴 **테넌트 검증 부재**(`paddle_events` 에 tenant_id 없음 :99) | `LEGACY_ADAPTER` |
| 12 | COMPENSATION | **부재** · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 13 | MIGRATION | **grep 0**(정의 버전 부재) | `NOT_APPLICABLE` |
| 14 | REPLAY | **grep 0** | `NOT_APPLICABLE` |
| 15 | RECONCILIATION | 부재(승인) · 인접 = stale lease 회수 `Omnichannel`:394-399(900s)·`ChannelSync`:6136-6153(600s) | `LEGACY_ADAPTER` |
| 16 | OTHER | 부재 | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사.** 커버리지 = 부재 9 · `LEGACY_ADAPTER` 7.

★ **`VALIDATED_LEGACY` 가 0건이다.** 실행 국면 기록이라는 능력 자체가 레포에 없기 때문이다(§0 grep 0). `LEGACY_ADAPTER` 7건은 **국면을 수행하는 코드는 있으나 국면을 기록하지 않는다**는 뜻이다 — 커버가 아니라 **위임 후보**다.

## 2. 규칙

- 🔴 **`node_type`(:50) 을 execution type 으로 매핑 금지.** 노드 1개 = Execution 다수. 1:1 매핑은 국면 소멸이다.
- 🔴 **`SIGNAL_PROCESSING` 을 "있다고 가정"하고 배선 금지.** 범용 이벤트 버스·구독 기전이 **grep 0** 이다. 유일한 발신 기전 `OpenPlatform::emit`(:311-328)은 **웹훅 발신 전용**이고 ① 화이트리스트 ② 구독 0이면 **no-op** ③ **예외 절대 미전파**(:325) — 즉 **신호를 삼킨다**. 승인 신호를 여기 태우면 조용히 사라진다.
- 🔴 **`CALLBACK_PROCESSING` 배선 시 Paddle 패턴은 멱등만 가져오고 테넌트 결함은 승계하지 마라** — `paddle_events` 에 **tenant_id 가 없다**(:99). 승인 콜백은 테넌트 검증 필수.
- 🔴 **`MESSAGE_PROCESSING` 에 `Webhooks.php:22-27` opt-in 정책 승계 금지** — 시크릿 미설정 벤더 수신 허용(`verified=false`)은 벤더 웹훅에서는 실용적 타협이나 **승인 도메인에 오면 미검증 메시지가 승인 인스턴스를 전이시킨다**. 승인은 **fail-closed**.
- 🔴 **`TRANSITION` 실행 타입은 §34 Transition 테이블 없이 기록 불가** — 전이 기록이 결번인 채로 이 타입만 배선하면 `execution_result` 에 자유 문자열이 쌓인다. §34 선행.
- **멱등 = 5-3-2가 채울 결번**(`idempotency_key` **grep 0**) → 현행 3패턴(Paddle `notification_id` UNIQUE · `raw_vendor_event.uq_rve_dedup` UNIQUE(Db.php:1017-1034) · `claimSendOnce` 자연키 선점 마커 :672) 중 **`claimSendOnce` 자연키 선점 마커가 승인 결정에 가장 정합** — `TASK_EXECUTION`·`CALLBACK_PROCESSING` 은 이 패턴을 따른다.
- **`RECONCILIATION` 은 신설이 아니라 통일**: stale 회수 TTL 이 **900s(Omnichannel:395)/600s(ChannelSync:6136-6153) 병존**한다. 승인 리컨실은 둘 중 하나를 **명시적으로 선택**하고 근거를 남겨라 — 세 번째 TTL 신설 금지.

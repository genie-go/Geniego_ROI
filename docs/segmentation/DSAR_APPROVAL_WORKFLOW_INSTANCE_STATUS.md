# DSAR — Workflow Instance Status (§31)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §31(Instance 상태) · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)
> 필드 축은 [DSAR_APPROVAL_WORKFLOW_INSTANCE.md](DSAR_APPROVAL_WORKFLOW_INSTANCE.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 인스턴스 상태 어휘 | `journey_enrollments.status`(JourneyBuilder.php:45) — 실사용 **5종**: `active`(:201) · `waiting`(:396,:539) · `processing`(:415) · `completed` · `exited`(:623 주석 "완료와 구분") | 부분 |
| 🔴 **상태머신 선언** | `UPDATE ... SET status=` **155건 / 44파일** · **전이 규칙 선언 0**(전부 호출 지점 인라인) | `NOT_APPLICABLE` |
| 전이 가드 | **4곳뿐** — `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155 | `LEGACY_ADAPTER`(패턴만) |
| 상태 열거 상수 | enum/const 선언 **grep 0** — 상태는 **문자열 리터럴**로 산재 | `NOT_APPLICABLE` |
| pending/rejected 어휘 | 승인 4종에 존재(`Mapping.php:238-294`·`Alerting.php:562`·`AdminGrowth.php:1322`) — **워크플로 인스턴스가 아니라 요청 행의 상태** | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — "상태 컬럼이 155군데 있다" ≠ "상태머신이 있다".** 레포 전역에 `status` 는 넘치나 **어떤 상태에서 어떤 상태로 갈 수 있는가를 선언한 곳이 0**이다. 전이 가드 4곳조차 규칙 선언이 아니다 — 예: `FeedTemplate::transition`(:249)은 `from`/`to` 를 **메서드 인자로 받고**(`submitDraft`→`('draft','submitted')` :265, `approveDraft`→`('submitted','approved')` :271) `if ((string)$r['status'] !== $from) return 409 invalid_state`(:258)로 검사할 뿐이다. **규칙은 호출부에 하드코딩**돼 있다. 이것이 §31 Status 축과 §34 Transition 이 정면으로 겨냥하는 결번이다.

## 1. 원문 전사 + 판정 — **원문 25종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | CREATED | 부재 — `INSERT` 즉시 `'active'`(:201). **생성/시작 미분리** | `NOT_APPLICABLE` |
| 2 | INITIALIZING | 부재 | `NOT_APPLICABLE` |
| 3 | RUNNING | 인접 = `'active'`(:201) · `'processing'`(:415, **선점 마커**) | `LEGACY_ADAPTER`(어휘 재매핑) |
| 4 | WAITING | 인접 = `'waiting'`(:396,:539) | `LEGACY_ADAPTER` |
| 5 | WAITING_FOR_HUMAN | **부재** — 승인 도메인의 핵심 상태인데 여정에 인간 대기 노드가 없다 | `NOT_APPLICABLE` |
| 6 | WAITING_FOR_EVENT | 인접 = `wait` mode=event(:548,:557) — **마케팅 이벤트**(purchase/email_open/email_click) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | WAITING_FOR_TIMER | 인접 = `delay` + `resume_at`(:527,:539) | `LEGACY_ADAPTER` |
| 8 | WAITING_FOR_SUB_WORKFLOW | 부재(Sub-workflow grep 0) | `NOT_APPLICABLE` |
| 9 | PAUSE_PENDING | 부재 | `NOT_APPLICABLE` |
| 10 | PAUSED | 부재 — 여정의 `waiting` 은 타이머이지 일시정지 아님 | `NOT_APPLICABLE` |
| 11 | RESUME_PENDING | 부재 — `resume_at`(:80)은 **재개 시각**이지 재개 요청 상태 아님 | `NOT_APPLICABLE` |
| 12 | CANCELLATION_PENDING | 부재 | `NOT_APPLICABLE` |
| 13 | CANCELLING | 부재 | `NOT_APPLICABLE` |
| 14 | COMPENSATION_PENDING | 부재 | `NOT_APPLICABLE` |
| 15 | COMPENSATING | 부재 · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 16 | COMPLETED | `'completed'`(:45) | `VALIDATED_LEGACY` |
| 17 | CANCELLED | 인접 = `'exited'`(:623 — `exit` 노드 이탈조건 충족·`stats_completed` 미증가) | `LEGACY_ADAPTER` |
| 18 | FAILED | 부재 — 여정은 실패 상태가 없다(예외 시 `release`(:417)로 `waiting` 복귀) | `NOT_APPLICABLE` |
| 19 | DEAD_LETTERED | 부재(여정) · 인접 = `ad_delivery_dlq`(AdAdapters.php:1127) — **DLQ 테이블은 레포 전체 1개뿐** | `LEGACY_ADAPTER` |
| 20 | MIGRATION_PENDING | 부재 — 정의 버전 개념 자체가 grep 0 | `NOT_APPLICABLE` |
| 21 | MIGRATING | 부재 | `NOT_APPLICABLE` |
| 22 | REPLAY_PENDING | 부재 | `NOT_APPLICABLE` |
| 23 | BLOCKED | 부재 | `NOT_APPLICABLE` |
| 24 | SUPERSEDED | 부재 — `journeys` 는 **in-place 수정**(버전 승계 없음) · 인접 = `feed_template` published→`archived` 강등(FeedTemplate.php:290) | `LEGACY_ADAPTER`(패턴만) |
| 25 | UNKNOWN | 부재 | `NOT_APPLICABLE` |

**실측 개수: 25 / 25 전사.** 커버리지 = 부재 17 · `LEGACY_ADAPTER` 6 · `VALIDATED_LEGACY` 1(COMPLETED) · `KEEP_SEPARATE_WITH_REASON` 1(WAITING_FOR_EVENT).

★ **현행 5종 → 원문 25종 = 20종 결번.** 현행 어휘 5종 중 `processing`(:415)은 원문에 대응 항목이 없다 — **선점 마커**이지 인스턴스 상태가 아니기 때문이다. 이를 `RUNNING` 에 매핑한 것은 어휘 재매핑 제안이지 **커버 주장이 아니다**.

## 2. 규칙

- 🔴 **상태 어휘를 문자열 리터럴로 흩뿌리지 마라.** 현행이 정확히 그래서 `UPDATE ... SET status=` 155건/44파일에 **전이 규칙 선언이 0**이 됐다. 25종은 **단일 선언 지점**(enum/const)에서 나와야 한다.
- 🔴 **전이 가드 4곳을 참조 구현으로 삼되 복제하지 마라.** `FeedTemplate::transition`(:248-285)의 규율 — **비-대상 상태 시 409 `invalid_state`**(:258) — 은 옳다. 그러나 `from`/`to` 가 **호출부 인자**(:265,:271)라 규칙이 선언되지 않는다. §34 Transition 이 이 결번을 채운다.
- 🔴 **`WAITING_FOR_EVENT` 를 여정 `wait` mode=event 로 커버 계산 금지.** 형태는 닮았으나(:557 `eventOccurred`) **마케팅 이벤트 도메인**(purchase/email_open/email_click)이고, `customer_id > 0` 을 전제한다(:554,:557) → 승인 이벤트에 그대로 태우면 **`customer_id=0` 인스턴스가 영구 미발생**하여 타임아웃 분기(:565)로만 탈출한다. **enrollment 컨텍스트 일반화 선결**.
- 🔴 **`CANCELLATION_PENDING`/`CANCELLING` 2단 취소를 `exit` 노드로 대체 금지** — `exit`(:623)은 **즉시 종료**이고 요청/수락 분리가 없다.
- `DEAD_LETTERED` 배선 시 **DLQ 테이블 신설 금지가 아니다** — 레포 DLQ 는 `ad_delivery_dlq` **1개뿐**이고 나머지 6종 잡은 원 테이블 `status='failed'` 잔류다. 승인 인스턴스의 DLQ 는 **`AdAdapters::retryDeliveryDlq`(:1187-1228) 백오프 공식(`600*2^n`·86400s 캡·maxAttempts 5)을 채택**하라(백오프 3공식 병존 중 정본).
- ★ **`defer ≠ 실패` 규율 승계**(Omnichannel.php:349,362) — `WAITING_*` 계열 상태는 **attempts 를 증가시키지 않는다**. 이를 어기면 대기가 재시도 예산을 태워 `DEAD_LETTERED` 로 오분류된다.

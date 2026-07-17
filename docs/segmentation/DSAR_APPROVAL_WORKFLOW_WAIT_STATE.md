# DSAR — Workflow Wait State (§43)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §43 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 대기 상태 **엔티티**(`wait_state` 테이블·`workflow_token_id`) | **grep 0** — 대기는 엔티티가 아니라 **enrollment 행의 컬럼** | `NOT_APPLICABLE`(부재 → 신설) |
| 대기 **실체** | `journey_enrollments.resume_at` / `wait_until` (JourneyBuilder.php:80-82) — 206차 delay + 255차 이벤트 절대기한 **분리 설계** | `LEGACY_ADAPTER`(실행 프리미티브 재사용) |
| 대기 **재개 기전** | **타이머 서비스·지연큐 부재** → **DB 컬럼 + OS cron 폴링 단일 수단**(`journey_cron.php:29-35` */5 · `install_crontab.sh` 정본 등재) | `VALIDATED_LEGACY`(REAL) |
| `wait` 노드 3분기 | JourneyBuilder.php:548 — `mode=date` \| `mode=event`(+`timeout`) (:554/:562/:572) | `KEEP_SEPARATE_WITH_REASON`(마케팅 도메인) |
| ★**재폴링 패턴** | JourneyBuilder.php:565-570 — 미발생·미타임아웃 시 `status='waiting'`, `resume_at=now` 유지·`wait_until` 보존 후 즉시 return → **다음 cron 재폴링** | **재사용 지정 자산**(설계 결론 1) |
| 대기 상태 판독 | :553 `if ($status === 'waiting')` — 최초 진입(:581-584 deadline 계산)과 재개를 **동일 노드 코드가 분기** | `LEGACY_ADAPTER` |
| `correlation key` / `expected source` / `duplicate event policy` | **grep 0** — 이벤트 매칭은 `eventOccurred($pdo,$tenant,$cid,$ev,$since)`(:556) **고객ID+이벤트명+시각 이후** 존재 여부뿐 | `NOT_APPLICABLE` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — 형태 유사 ≠ 의미 동일.** JourneyBuilder `wait`(:548)은 원문 `WAIT`/`TIMER`/`EVENT`와 **형태가 닮았으나 마케팅 발송 도메인**이다. 실행 컨텍스트가 `crm_customers`/`journey_enrollments`이고 **`customer_id`가 필수**(:551,:556 — `$cid > 0` 없으면 이벤트 판정 자체가 불가)이므로, **비-고객 승인(예산·가격·배포) 대기를 그대로 태울 수 없다.** 이를 원문 Wait Type 커버로 계산하면 **갭이 정의상 소멸하는 역산**이다 → Wait Type 축은 전부 `NOT_APPLICABLE`.
단 **실행 프리미티브(재폴링 패턴 :565-570)의 재사용 근거로는 인용 가능**하다. 이 둘을 혼동하지 마라 — **"패턴 재사용 가능" ≠ "요구 충족"**.

🔴 **선결 조건**: 승인 대기를 JourneyBuilder에 태우려면 **enrollment 컨텍스트 일반화**(`customer_id` 필수 해제)가 **선결**이다. 이 선결 없이 `approval` 노드만 추가하면 대기 자체가 동작하지 않는다.

## 1. 원문 전사 + 판정 — Wait Type **원문 11종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | HUMAN_DECISION | 부재 — 승인 결정은 대기 상태가 아니라 **동기 HTTP 호출**(`Mapping::approve` Mapping.php:238-294). 대기하는 주체가 없다 | `NOT_APPLICABLE` |
| 2 | EXTERNAL_CALLBACK | 부재(승인) · 인접 = Paddle webhook 수신(Paddle.php:331-373) — 그러나 **워크플로 대기를 깨우지 않음**(구독 기전 0) | `NOT_APPLICABLE` |
| 3 | EVENT | 부재(승인) · 인접 = `wait` event-mode(:554-570) — **마케팅 이벤트 3종**(purchase/email_open/email_click, :555 기본값 `purchase`) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | SIGNAL | 부재 — **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0**(§44 참조) | `NOT_APPLICABLE` |
| 5 | MESSAGE | 부재 — Message Correlation 자체가 부재(§45 참조) | `NOT_APPLICABLE` |
| 6 | TIMER | 부재(승인) · 인접 = `wait` date-mode(:572-578) `resume_at <= now` · `sms_campaigns.scheduled_at`+`runScheduledQueue`(SmsMarketing.php:367) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | RESOURCE_CHANGE | 부재 — 리소스 버전 감시·변경 구독 grep 0 | `NOT_APPLICABLE` |
| 8 | POLICY_EVALUATION | 부재 — 정책 평가 대기 개념 전무(정책은 코드 상수) | `NOT_APPLICABLE` |
| 9 | SUB_WORKFLOW | 부재 — `sub_journey`/`call_activity` **grep 0** | `NOT_APPLICABLE` |
| 10 | MANUAL_CONFIRMATION | 부재 | `NOT_APPLICABLE` |
| 11 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** 커버리지 = 부재 9 · 형태유사·도메인상이(매핑 금지) 2. **원문 Wait Type을 충족하는 현행 = 0.**

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 14개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | wait_state_id | 부재 — 대기는 독립 행이 아님(enrollment 컬럼) | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = `journey_enrollments.id`(:568 `WHERE id=:id`) | `NOT_APPLICABLE` |
| 3 | workflow_token_id | 부재 — **토큰 개념 전무**. enrollment 1행 = 단일 커서(`current_node` :568) → **병렬 토큰 불가** | `NOT_APPLICABLE` |
| 4 | workflow_node_id | 부재 · 인접 = `journey_enrollments.current_node`(:568) | `NOT_APPLICABLE` |
| 5 | wait type | 부재 · 인접 = `config.mode`(:550 `date`\|`event`) — **2값, 원문 11종 미달** | `NOT_APPLICABLE` |
| 6 | correlation key | **부재** — 매칭은 `(tenant, customer_id, event, since)`(:556) 암묵 조합뿐, **선언된 키 없음** | `NOT_APPLICABLE` |
| 7 | expected event type | 부재 · 인접 = `config.event`(:555) — 마케팅 이벤트 화이트리스트 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | expected source | **부재** — 출처 제한 개념 전무(누가 이벤트를 냈는지 검증 안 함) | `NOT_APPLICABLE` |
| 9 | entered_at | 부재 · 인접 = `journey_enrollments.entered_at`(:552 `$since` 로 사용) | `LEGACY_ADAPTER` |
| 10 | timeout_at | 부재 · 인접 = `journey_enrollments.wait_until`(:80-82,:561,:583-584 `+{$tv} {$tu}` 기본 7 days) | `LEGACY_ADAPTER` |
| 11 | resume policy | **부재** — 재개는 **코드 인라인**(:558-559 `occurred` 분기 / :565 `timeout` 분기). 선언된 정책 0 | `NOT_APPLICABLE` |
| 12 | duplicate event policy | **부재** — 중복 이벤트 정책 전무. `eventOccurred`는 **존재 여부(Boolean)** 만 판정 → 중복 개념이 성립하지 않음 | `NOT_APPLICABLE` |
| 13 | status | 부재(대기 전용) · 인접 = `journey_enrollments.status`(`waiting`/`active` :553,:558) — **전이 규칙 선언 0**(호출 지점 인라인) | `NOT_APPLICABLE` |
| 14 | evidence | **부재** · 인접 = `journey_node_logs`(JourneyBuilder.php:50,:69 · `logNode` :557,:563,:575) — **노드 감사 로그는 REAL이나 증거 봉투가 아님** | `LEGACY_ADAPTER`(감사 싱크 재사용) |

**실측 개수: 14 / 14 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 10 · 어댑터 3 · 도메인상이 1.

## 2. 규칙

- 🔴 **타이머 서비스·지연큐 신설 금지.** 레포의 **스케줄링 단일 수단은 OS cron**이며 전용 브로커는 부재다. 5-3-2 대기 재개는 **`journey_cron.php`(*/5) 폴링에 편입**하라. 별도 데몬/브로커 도입은 인프라 이원화다.
- ✅ **재폴링 패턴 재사용 강제** — `JourneyBuilder.php:565-570`(`status='waiting'` + `resume_at=now` 유지 + `wait_until` 보존 + 즉시 return). **재작성 금지, 위치 이동/일반화만.**
- ✅ **`resume_at`/`wait_until` 2컬럼 분리 설계 보존** — 206차 delay(상대 재개)와 255차 이벤트 절대기한(타임아웃)은 **의도적으로 분리**되어 있다. 5-3-2가 하나로 합치면 **기능 후퇴**다.
- 🔴 **enrollment 컨텍스트 일반화가 선결.** `customer_id` 필수(:551,:556) 해제 없이 승인 대기는 성립 불가. **"있다고 가정하고 배선" 금지.**
- 🔴 **`workflow_token_id`는 현행 구조로 표현 불가.** enrollment 1행 = 단일 `current_node` 커서(:568)다. 원문 토큰(병렬 다중)을 이 컬럼에 매핑하면 **PARALLEL/FORK/JOIN이 정의상 소멸한다.** 토큰은 **부재로 정직하게 기록**하고 신설 여부는 §13/§14 축과 함께 결정하라.
- 🔴 **`duplicate event policy`·`expected source`·`correlation key` 3종은 5-3-2가 채울 결번.** 현행 `eventOccurred`(:556)는 Boolean 존재 판정이라 **중복·출처 개념이 애초에 없다**. "현행이 암묵적으로 한다"고 적으면 역산이다.
- ✅ **감사는 `journey_node_logs` 재사용**(`logNode` :557,:563,:575) — 신설 감사 테이블 금지. 단 원문 `evidence`(증거 봉투)와 **동일하지 않으므로** 어댑터로 표기하라.
- 🔴 **동시성 모델 변경 금지.** `optimistic lock(version)`·분산락·`GET_LOCK` 전부 grep 0이며 **SQLite 폴백 호환이 명시적 설계 제약**이다. 대기 진입/재개 갱신은 **조건부 UPDATE + rowCount CAS**(JourneyBuilder:411 · Catalog:1683 · ChannelSync:6136-6153)를 채택하라.

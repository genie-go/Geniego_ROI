# DSAR — Workflow Idempotency (§53)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §53 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> ★**이 블록(§49~§55)의 심장.** 설계 결론 7: **멱등 = 5-3-2 가 채울 결번.**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 명시적 멱등키 | 🔴 **`idempotency_key` backend/src grep 0** — 289차 실측 재확인 | `NOT_APPLICABLE`(결번 → 5-3-2 가 채움) |
| ①**자연키 선점 마커** | **`claimSendOnce(enrollment_id, node_id)`** JourneyBuilder.php:672 — 277차. 실측 주석: *"발송(HTTP) 직후 current_node 커밋 전에 프로세스가 죽으면 다음 크론이 같은 노드를 다시 실행해 **재발송**한다. claim 만으로는 이 창을 막지 못한다. 발송 전에 (enrollment_id, node_id) 마커를 선점하고, 이미 있으면 건너뛴다"* · 283차 P2-3 에서 `push` 추가 → 대상 4종(email/kakao/sms/push) | `VALIDATED_LEGACY`(★**승인 결정에 가장 정합** · 설계 결론 7) |
| ②Callback 멱등 | Paddle `notification_id` **UNIQUE**(Paddle.php) — **`processed=1` 일 때만 skip · `processed=0` 은 재처리 허용**(272차) | `VALIDATED_LEGACY`(★Callback 축 정본) |
| ③수신 dedup | `uq_rve_dedup` UNIQUE — `raw_vendor_event`(Db.php:1017-1034) | `VALIDATED_LEGACY`(Message 축) |
| 보상 멱등 | OrderHub `order_id` 자연키 멱등(OrderHub.php:1043) — 이중역분개 방지 | `LEGACY_ADAPTER` |
| 클레임(≠멱등) | `journey_enrollments` 조건부 UPDATE 선점(JourneyBuilder.php:411-418) · `Omnichannel::claimBatch`(:394-423) | `KEEP_SEPARATE_WITH_REASON` |
| payload 해시 | **부재** — 요청 본문 해시 비교 grep 0 | `NOT_APPLICABLE` |
| duplicate count / expiry | **부재** — 중복 계수·만료 개념 없음 | `NOT_APPLICABLE` |
| 테넌트 격리 | Paddle 선례는 🔴**테넌트 검증 부재**(`paddle_events` 에 tenant_id 없음 · Paddle.php:99) | 🔴 **결함 승계 금지** |

**★축 주의 — `claim` ≠ `idempotency`.** 이 둘은 형태가 닮았으나 **막는 창(window)이 다르다.** 실측 주석(JourneyBuilder.php:672)이 이 구분을 명시적으로 자인한다: **"claim 만으로는 이 창을 막지 못한다."**
- **claim**(조건부 UPDATE 선점) = **동시에 두 워커가 같은 행을 집는 것**을 막는다. 크래시 후 재시도는 **못 막는다**(claim 이 풀리면 다시 집힌다).
- **idempotency**(자연키 선점 마커) = **부수효과가 두 번 일어나는 것**을 막는다. 커밋 전 크래시에도 살아남는다.
→ **claim 을 멱등 커버로 계산하면 역산이다.** §54 Lock 은 claim 축, §53 은 멱등 축 — **별개로 유지하라**.

**★두 번째 축 주의 — 3패턴이 병존하나 셋 다 "테이블 내부 자연키"이지 "요청자가 보낸 키"가 아니다.** 원문 `idempotency key` 는 **호출자가 제시하는 키**를 함의한다(`request payload hash`·`duplicate count`·`expiry` 필드가 그 증거 — 자연키 방식엔 이 축이 필요 없다). 현행 3패턴은 **서버가 스스로 도출한 자연키**다. 이 차이를 뭉개면 "멱등 있음"이 되어 **결번이 정의상 소멸**한다 → 판정 = **`NOT_APPLICABLE`(결번)**, 3패턴은 **채택할 패턴의 선례**로만 인용.

## 1. 원문 전사 + 판정 — 적용 대상 **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Instance Start | 부재 — 인스턴스 개념 없음 | `NOT_APPLICABLE` |
| 2 | Task Creation | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 3 | Task Assignment | 부재 — 배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 4 | Task Completion | 부재 · 인접 = `claimSendOnce`(JourneyBuilder.php:672 · 마케팅 발송 완료) | `LEGACY_ADAPTER`(패턴 선례) |
| 5 | Decision Recording | 부재(멱등키) · 인접 = `Mapping.php:245-290` **승인자 dedup**(같은 승인자 중복 계수 차단) — ★**dedup ≠ 멱등**: 같은 승인자의 재요청은 막으나 **같은 요청의 재전송은 미방어** | `LEGACY_ADAPTER`(부분) |
| 6 | Transition | 부재 — 전이 규칙 선언 0(`UPDATE ... SET status=` 155건/44파일 전부 인라인) | `NOT_APPLICABLE` |
| 7 | Timer Fire | 부재 · 인접 = `resume_at`/`wait_until` cron 폴링(JourneyBuilder.php:80-82) — **발화 멱등 없음**(claim 만 존재 :411) | `NOT_APPLICABLE` |
| 8 | Signal | 부재 — 🔴 **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0** | `NOT_APPLICABLE` |
| 9 | Message | 부재(승인) · 인접 = `uq_rve_dedup` UNIQUE(Db.php:1017-1034) | `LEGACY_ADAPTER`(패턴 선례) |
| 10 | Callback | 부재(승인) · 인접 = Paddle `notification_id` UNIQUE(**`processed=1` 일 때만 skip** · 272차) | `VALIDATED_LEGACY`(★정본 패턴) |
| 11 | Sub-workflow Start | 부재(grep 0) | `NOT_APPLICABLE` |
| 12 | Cancellation | 부재 · §51 과 짝 | `NOT_APPLICABLE` |
| 13 | Migration | 부재 · §56 과 짝 | `NOT_APPLICABLE` |
| 14 | Replay | 부재 | `NOT_APPLICABLE` |
| 15 | Compensation | 부재(`compensation` grep 0) · 인접 선례 = OrderHub `order_id` 멱등(:1043 · 이중역분개 방지) · §52 와 짝 | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = 부재 10 · 어댑터 4 · 정본패턴 1.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 16개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_idempotency_id | 부재 | `NOT_APPLICABLE` |
| 2 | tenant_id | 부재(멱등 테이블 자체가 없음) · 🔴 인접 Paddle 선례는 **tenant_id 없음**(Paddle.php:99) | `NOT_APPLICABLE`(결함 승계 금지) |
| 3 | idempotency type | 부재 — 위 15종 구분축 | `NOT_APPLICABLE` |
| 4 | idempotency key | 🔴 **`idempotency_key` grep 0 = 결번의 핵심** | `NOT_APPLICABLE` |
| 5 | workflow instance | 부재 | `NOT_APPLICABLE` |
| 6 | task reference | 부재 | `NOT_APPLICABLE` |
| 7 | transition reference | 부재 | `NOT_APPLICABLE` |
| 8 | request payload hash | **부재** — payload 해시 비교 grep 0 | `NOT_APPLICABLE` |
| 9 | first result reference | **부재** — 최초 결과 재반환 개념 없음(현행 3패턴은 전부 **skip** 이지 **최초 결과 반환**이 아님) | `NOT_APPLICABLE` |
| 10 | first seen at | 부재 | `NOT_APPLICABLE` |
| 11 | last seen at | 부재 | `NOT_APPLICABLE` |
| 12 | duplicate count | **부재** — 중복 계수 축 없음 | `NOT_APPLICABLE` |
| 13 | expiry | **부재** — 멱등 레코드 만료 개념 없음(현행 자연키 마커는 **영구**) | `NOT_APPLICABLE` |
| 14 | resolution | 부재 — 중복 판정 결과(skip/replay/conflict) 축 없음 | `NOT_APPLICABLE` |
| 15 | status | 부재 | `NOT_APPLICABLE` |
| 16 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사.** 커버리지 = 부재 16. **원문 16개 전 필드가 부재 = 이 축은 100% 결번.**

## 3. 규칙

- ✅ **채택 패턴 = `claimSendOnce` 자연키 선점 마커**(JourneyBuilder.php:672 · **설계 결론 7**). 승인 결정에 가장 정합한 이유:
  1. **커밋 전 크래시를 막는다** — 승인 결정도 발송과 같다. `Decision Recording` 후 커밋 전에 죽으면 **재요청이 정족수를 이중 계수**한다(익명 2회 = 정족수 = 289차 G-01 이 닫은 우회로의 재개통).
  2. **선(先)선점 후(後)실행** — 실측 규율: *"발송 전에 마커를 선점하고, 이미 있으면 건너뛴다."* 실행 후 기록은 크래시 창을 못 막는다.
  3. **자연키가 이미 존재** — 승인 도메인의 자연키 = `(request_id, actor_id, decision)`. 별도 키 발급 없이 즉시 적용 가능.
- 🔴 **`claim` 을 멱등으로 쓰지 마라.** 실측 주석(JourneyBuilder.php:672)이 **"claim 만으로는 이 창을 막지 못한다"** 고 자인한다. §54 Lock(claim 축)과 §53(멱등 축)은 **둘 다 필요**하다 — 하나로 대체 불가.
- 🔴 **Paddle `processed` 2단 규율 승계 필수.** `notification_id` UNIQUE 만으로는 부족하다 — **`processed=1` 일 때만 skip, `processed=0` 은 재처리 허용**(272차). 수신 후 처리 전 크래시 시 **UNIQUE 만 보면 영구 유실**된다. `Callback`·`Message` 축에 그대로 적용하라.
- 🔴 **Paddle 의 tenant_id 부재(Paddle.php:99)를 승계 금지.** 원문 필드 #2 가 `tenant_id` 를 **명시적으로 요구**한다. 멱등키가 테넌트 간 공유되면 **A 테넌트의 키가 B 테넌트 요청을 skip** 시킨다 = 테넌트 격리 붕괴(데이터 헌법 위반).
- 🔴 **`first result reference` 는 현행에 선례가 없다 — 자연키 3패턴은 전부 `skip` 이지 `최초 결과 반환`이 아니다.** 이 차이가 중요하다: 승인 API 에서 중복 요청에 **skip 응답**을 주면 호출자는 **결정이 기록됐는지 알 수 없다**. 원문이 `first result reference` 를 요구한 이유다 → **재전송에 최초 결과를 그대로 반환**하라.
- 🔴 **`expiry` 없는 멱등 마커는 무한 성장한다.** 현행 자연키 마커는 영구다(`claimSendOnce` 마커 정리 코드 부재). 원문 #13 `expiry` 는 **선택이 아니다** — 단, **만료 후 재실행이 안전한 축**(Timer Fire)과 **영구 차단이 필요한 축**(Financial Compensation)을 `idempotency type` 별로 구분하라.
- 🔴 **`Decision Recording` 의 dedup 을 멱등으로 오인 금지.** `Mapping.php:245-290` 승인자 dedup 은 **같은 승인자의 중복 계수**를 막으나, **같은 요청의 네트워크 재전송**은 별개 축이다. 전자는 정족수 규율, 후자는 §53 이다.
- ⚠️ **`Signal` 축은 멱등 이전에 기전 자체가 없다**(이벤트 버스 grep 0). "있다고 가정하고 멱등 배선" 금지 → `CONTRACT_ONLY`.

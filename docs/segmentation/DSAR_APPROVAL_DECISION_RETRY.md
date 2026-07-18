# DSAR — Decision Retry (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**RETRY(§52)** — 자동 재시도 **대상**(transient만):
Lock Timeout · Temp DB Conflict · Transient Outbox Write Failure · Snapshot Write Failure · Audit Write Failure · Temp Authority Service Failure · Temp Delegation Service Failure · Temp Assignment Service Failure.

재시도 시 **유지**해야 하는 것: 동일 Command · 동일 Idempotency Key · 동일 Request Hash · 증가하는 Retry Count · **새 Lock** · **최신 Fencing Token** · 전체 Critical Revalidation(§32).

★금지: **Business Validation Failure(권한 없음·SoD 위배·금액 초과 등)는 자동 Retry 금지** — transient 인프라 실패만 재시도. COMMAND_TYPE `RETRY_COMMAND`(§14).

## 2. 기존 구현 대조

- **Decision Retry = ABSENT.** 4핸들러 어디에도 결정 커밋의 재시도 경로가 없다. 실패 시 HTTP 에러가 반환될 뿐, 동일 Command/Idempotency Key/Request Hash를 유지한 채 Retry Count를 증가시키며 새 Lock·최신 Fencing으로 재시도하는 구조는 부재. Command(§14)·Idempotency(§39)·Lock(§41)·Fencing(§43)이 모두 ABSENT이므로 §52가 요구하는 "유지" 재료가 존재하지 않는다.
- **인접 재시도 선례는 결정 도메인 밖**: `omni_outbox`(`Omnichannel.php:390-448`)의 claim/lease/SKIP LOCKED는 **메시지 발송 워커의 재처리** 패턴으로, transient 실패 재시도의 실전 원형이나 결정 커밋에 배선돼 있지 않다(KEEP_SEPARATE). Paddle 웹훅 멱등(`Paddle.php:343-368`)은 재전달 시 안전 재처리를 보장하나 이는 §47 dedup이지 §52 retry가 아니다.
- **위험 인접**: `Alerting::executeAction:601-665`는 외부 어댑터(`AdAdapters::pause:631`)+UPDATE(`:653`)가 비원자여서, 부분 실패 시 **재시도 안전성이 없다**(멱등·retry count 없음) — 재시도하면 중복 집행 위험. 즉 retry를 얹기 전 멱등·원자성(§48) 선행 필요.

## 3. 판정

- **Verdict: ABSENT.**
- **선행 의존**: Command(§14)·Idempotency(§39)·Lock(§41)·Fencing(§43)·Validation/Commit Revalidation(§32) 전부 부재. 재시도가 유지·재검증해야 할 축이 없어 **성립 불가**(다중 BLOCKED_PREREQUISITE).
- **cover: 0** (결정 도메인). `omni_outbox`/Paddle은 인접 도메인 재시도/멱등 선례이지 결정 retry cover 아님.

## 4. 확장/구현 방향 (설계)

- **transient vs business 실패 분리가 핵심.** §52 대상(Lock Timeout·Temp DB Conflict·Outbox/Snapshot/Audit Write·Temp Authority/Delegation/Assignment Service)만 자동 재시도하고, **Business Validation Failure는 절대 자동 Retry 금지** — 권한 없음·SoD 위배를 재시도로 뚫는 우회 방지.
- 재시도는 **동일 Idempotency Key/Request Hash 유지 + Retry Count 증가 + 새 Lock + 최신 Fencing + 전체 Critical Revalidation**(§32)이어야 안전 — 이것이 없는 상태(현행 Alerting 비원자)에서 순진한 재시도는 **중복 집행**을 낳는다.
- **`omni_outbox` claim/lease/SKIP LOCKED 패턴 재사용**으로 재시도 워커를 구성하되(Golden Rule=Extend), 결정 도메인 전용으로 신설(메시지 아웃박스 혼입 금지). Idempotency(§39)가 재시도 중복을 흡수.
- 실 구현 = **별도 승인 세션**(멱등·Lock·Fencing 선행 이후). 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

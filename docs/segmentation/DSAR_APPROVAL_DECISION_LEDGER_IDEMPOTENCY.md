# DSAR — Ledger Idempotency (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§40 LEDGER_IDEMPOTENCY

- **필드**: idempotency id · tenant id · decision ledger/partition id · idempotency key · append operation type · decision record/commit id · source event id · request digest foundation · first/last received_at · processing state · ledger entry id · ledger sequence · result digest foundation · expires_at · status · evidence.
- **규칙**:
  - ★ 동일 key + 동일 request = **기존 Entry/Sequence 반환**(재append 금지).
  - ★ 동일 key + 다른 request = **Conflict + Append 차단 + Critical Audit**.

## 2. 기존 구현 대조

- 코드 기반 판정: **원장 Idempotency ABSENT · 웹훅 dedup(paddle UNIQUE) 는 유사 substrate(재사용)**.
- 기록 대상 부재: Ledger Entry·Ledger Sequence·Decision Record 부재(§17/§19/§3.1)로 idempotency 결과가 가리킬 Entry/Sequence 가 없다.
- 유사 substrate 실존:
  - **Inbox Deduplication**: paddle_events UNIQUE 제약(`Paddle.php:108,146,343-368`) — 동일 웹훅 이벤트 ID 재수신 시 중복 삽입 차단. "동일 key = 무시"의 실사례이나, 이는 **결제 웹훅 수신 dedup**이지 원장 append idempotency 가 아니다.
- 부재:
  - 다차원 **Idempotency Key**(tenant·ledger/partition·append operation type·decision record/commit·source event·request digest) 를 산출·저장·조회하는 원장 구조 = no hits.
  - **result digest foundation / ledger entry id / ledger sequence 반환**(idempotent replay) 시맨틱 부재 — paddle UNIQUE 는 "저장된 결과 반환"이 아니라 삽입 실패/무시.
  - **동일 key + 다른 request → Conflict + Critical Audit**(§45/§56) 경로 부재 — request digest 를 계산·비교하지 않으므로 payload 변조 재요청 탐지 불가.
  - EXISTING_IMPLEMENTATION 재확인: idempotency-key 인프라 0(`idempotent`=migration skip 의미만).

## 3. 판정

- Verdict: **ABSENT(원장 idempotency) · 재사용substrate(paddle UNIQUE dedup)**
- 선행 의존: §40 은 §17 Ledger Entry·§19 Sequence·§3.1 Decision Record/Commit·§38 Transaction Boundary 에 종속(전부 ABSENT). BLOCKED_PREREQUISITE.
- cover: **paddle_events UNIQUE 웹훅 dedup 존재**(`Paddle.php:108,146,343-368`) · **원장 idempotency key/digest/replay = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): paddle_events UNIQUE dedup 패턴(`Paddle.php:108,146,343-368`)을 **원장 append idempotency 의 baseline substrate** 로 재사용 — 신설 `ledger_idempotency` 테이블에 §40 다차원 key(tenant·ledger·append op·decision record·source event·request digest) UNIQUE 제약을 확장.
- 시맨틱 정정(Mandatory): 동일 key + 동일 request 는 삽입 실패가 아니라 **기존 ledger_entry_id / ledger_sequence / result digest 반환**(idempotent replay) — §38 트랜잭션 커밋 시 result digest 를 함께 기록해 재조회 가능하게.
- Conflict 연동: 동일 key + **다른 request digest** = §45 CONFLICT(IDEMPOTENCY) + §56 Critical Audit — request digest 산출(SHA-256, `MediaHost.php:93` 패턴 재사용)이 선행 필수.
- 무후퇴: paddle 웹훅 dedup 은 결제 도메인 그대로 유지(§68 Regression Gate) — 원장 idempotency 는 KEEP_SEPARATE 신설. 결제 dedup 회귀 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_TRANSACTION_BOUNDARY]] · [[DSAR_APPROVAL_DECISION_LEDGER_CONFLICT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

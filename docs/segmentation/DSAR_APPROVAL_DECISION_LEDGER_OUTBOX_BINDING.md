# DSAR — Ledger Outbox Binding (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§39 LEDGER_OUTBOX_BINDING (검증 계약)

- 모든 **Committed Decision 에 Outbox 이벤트 + Ledger Entry 가 함께 존재**해야 한다.
- **Outbox 의 Decision Record ID / Payload Version 이 Ledger Entry 와 일치**.
- Outbox 이벤트가 **Ledger Sequence Reference 를 포함**.
- Outbox 와 Ledger Entry 는 **동일 Transaction / Correlation / Causation / Tenant / Decision Slot** 을 공유.

## 2. 기존 구현 대조

- 코드 기반 판정: **원장↔Outbox 바인딩 ABSENT · 재사용 substrate(omni_outbox 아웃박스 패턴) PRESENT**.
- 바인딩 대상 부재: Ledger Entry·Ledger Sequence·Decision Record 가 전부 없어(§17/§19/§3.1 ABSENT) "Committed Decision 마다 Outbox+Entry 존재" 를 검증할 두 쪽이 모두 부재.
- 재사용 substrate 실존:
  - **Transactional Outbox 실사례**: omni_outbox 큐(`Omnichannel.php:390-448`) — claimBatch(SKIP LOCKED)/claimConditional 로 status=queued→processing 클레임, 15분 리스 회수(`:395`). 쓰기와 발송을 분리하는 아웃박스 패턴의 실동작 substrate.
  - **동일 트랜잭션 경계**: 클레임이 PDO 트랜잭션 안에서 수행(`Omnichannel.php:404-415`).
- 부재:
  - omni_outbox 는 **채널 발송 작업큐**이지 Decision Ledger 바인딩이 아니다 — Decision Record ID·Payload Version·Ledger Sequence Reference 컬럼/일치검증 = no hits.
  - **Correlation / Causation ID** 개념 부재. Tenant 는 실재(`tenant_id`)하나 Decision Slot 참조 없음.
  - "모든 Committed Decision 에 Outbox+Entry 존재" 를 확인하는 §49 Completeness/§54 Reconciliation 검증 부재.

## 3. 판정

- Verdict: **ABSENT(원장 바인딩) · 재사용substrate(omni_outbox)**
- 선행 의존: §39 검증은 §17 Ledger Entry·§19 Sequence·§3.1 Decision Record·§38 Transaction Boundary 에 종속(전부 ABSENT). BLOCKED_PREREQUISITE.
- cover: **omni_outbox 아웃박스 패턴 존재**(`Omnichannel.php:390-448` · 리스 `:395` · 트랜잭션 `:404-415`) · **원장 바인딩/일치검증 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): omni_outbox(`Omnichannel.php:390-448`)의 claim/lease/SKIP LOCKED 메커니즘을 원장 Outbox 의 substrate 로 재사용 — 새 큐 엔진을 발명하지 말고 Decision Outbox row 에 `decision_record_id`·`payload_version`·`ledger_sequence_ref`·`correlation_id`·`causation_id`·`decision_slot_id` 컬럼을 확장.
- 동일 트랜잭션 바인딩(Mandatory): §38 경계에서 Ledger Entry append 와 Outbox row insert 를 **같은 PDO 트랜잭션**(`Omnichannel.php:404-415` 패턴)으로 원자화 — 커밋되면 Entry·Outbox 가 항상 함께 존재하도록 보장.
- 검증 배선: §49 Completeness / §54 Reconciliation 잡이 "Committed Decision ↔ Outbox ↔ Ledger Entry" 3자 일치를 주기 대조(신설) — 불일치 시 §45 CONFLICT(TRANSACTION_BOUNDARY/OUTBOX_BINDING) 로 라우팅.
- 무후퇴: 기존 채널 발송용 omni_outbox 는 그대로 유지(§68 Regression Gate) — Decision Outbox 는 별도 테이블/스코프로 KEEP_SEPARATE, 발송큐 회귀 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_TRANSACTION_BOUNDARY]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

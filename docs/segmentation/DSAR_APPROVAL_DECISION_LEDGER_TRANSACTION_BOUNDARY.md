# DSAR — Ledger Transaction Boundary (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§38 LEDGER_TRANSACTION_BOUNDARY

- **하나의 원자 경계**: Decision Record → History → Snapshot → Evidence → Audit → Outbox → Sequential Completion Reference → Ledger Sequence 할당 → Entry → Link → Head 갱신 → Idempotency Result → Integrity Context 상태.
- **원칙**: 위 단계 중 **하나라도 실패 = 전체 Rollback**(부분 커밋 금지).
- **분산 시나리오 보조**: Transactional Outbox · Pending Integrity State · Deterministic Recovery · Duplicate-safe Append · Reconciliation Job · Critical Alert · Finalization Timeout.
- ★ **Committed인데 Ledger 장시간 Pending 금지**(결정은 커밋됐는데 원장 반영이 지연·유실되는 상태 불허).

## 2. 기존 구현 대조

- 코드 기반 판정: **원장 트랜잭션 경계 ABSENT · 재사용 substrate(PDO 트랜잭션) PRESENT**. 두 축 분리.
- 기록 대상 부재: Decision Record→…→Entry→Link→Head 라는 **다단 원장 파이프라인 자체가 없다** — 승인 결정은 in-place UPDATE(`Mapping.php:285-289,327`)로 소실되며 불변 Entry/Head/Sequence 로우가 없어 감쌀 경계가 존재하지 않는다(§3.1 Decision Core ABSENT).
- 재사용 substrate(Platform primitive) 실존:
  - **PDO 트랜잭션 경계**: beginTransaction/commit/rollBack 패턴(`Omnichannel.php:404-415`) — SELECT..FOR UPDATE SKIP LOCKED 로 클레임 후 실패 시 rollBack(`:414-415`). `Migrate.php:54-60` 도 동일 트랜잭션 패턴.
  - **Transactional Outbox**: omni_outbox(`Omnichannel.php:390-448`)가 "쓰기+발송 분리" 아웃박스의 실사례(단 작업큐용·원장 아님).
- 부재:
  - SecurityAudit 해시체인 append 는 **비트랜잭션 best-effort**(`SecurityAudit.php:32` 지목) — Entry 기록과 Head 갱신이 하나의 트랜잭션 경계로 묶이지 않는다.
  - **Pending Integrity State · Finalization Timeout · Deterministic Recovery · Reconciliation Job** = no hits(§3.3 Runtime ABSENT).

## 3. 판정

- Verdict: **ABSENT(원장 경계) · 재사용substrate(PDO 트랜잭션)**
- 선행 의존: §38 은 §3.1 Decision Core(Record/History/Snapshot)·§17 Ledger Entry·§20 Head·§19 Sequence·§40 Idempotency Result 를 하나의 경계로 묶는 것 — 이들 대상이 전부 ABSENT 이므로 경계 대상이 없다. BLOCKED_PREREQUISITE.
- cover: **PDO 트랜잭션/Outbox substrate 존재**(`Omnichannel.php:404-415,390-448` · `Migrate.php:54-60`) · **원장 트랜잭션 경계 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): 신설 Decision Core commit 로직을 **기존 PDO 트랜잭션 경계**(`Omnichannel.php:404-415` 패턴) 위에 적재 — Record→Entry→Link→Head 갱신→Idempotency Result 를 단일 `beginTransaction/commit/rollBack` 로 감싼다. 트랜잭션 매니저를 새로 발명하지 말 것.
- Outbox 재사용: 분산/후속 사이드이펙트(알림·외부 API)는 원장 커밋과 동일 트랜잭션에서 omni_outbox 패턴(`Omnichannel.php:390-448`)에 Outbox row 를 append(§39 로 위임) — "커밋+발송"을 원자화.
- 실 위험(무후퇴): SecurityAudit best-effort append(`:32`)를 원장 경계 안으로 승격하되 **기존 감사 배선**(`UserAuth.php:4046`·`Compliance.php:162`)은 유지 — Entry 기록과 Head 갱신을 하나의 트랜잭션으로 원자화해 "Committed인데 Ledger Pending" 창을 제거.
- Pending Integrity State + Finalization Timeout + Reconciliation Job(§54)은 순신규 — 분산 경계 실패 시 결정론적 복구를 위해 신설(선행 Decision Core 후).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

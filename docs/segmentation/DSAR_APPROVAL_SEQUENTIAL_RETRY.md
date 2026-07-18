# DSAR — Retry (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §41 RETRY — 대상 / 유지
- **대상**: Retryable Infra Failure · Lock Timeout · Temp DB/Queue/Assignment Failure · Snapshot/Audit Write Retry.
- **유지**: 동일 Idempotency Key · 동일 Causation ID · 동일 Expected State · **증가 Retry Count** · 최신 Lock/Fencing · 상태 재검증.
- **★Business Guard Failure 자동 Retry 금지**(인프라 실패만 Retry, 업무 가드 실패는 아님).

## 2. 기존 구현 대조

- **잡 도메인에 재시도 카운터 = PARTIAL.** catalog_writeback_job 스키마에 `attempt INT DEFAULT 1` 컬럼이 존재한다(`Catalog.php:81`). 소비 시 `attempt` 를 SELECT 하고(`Catalog.php:1716`) 처리 결과 UPDATE 에 `attempt=?` 로 되쓴다(`Catalog.php:1721`). 즉 시도 횟수는 증가·추적된다.
- **그러나 §41 계약의 핵심 요소 부재**:
  - **Retry ≠ Recovery 구분 없음.** `attempt` 는 단일 카운터일 뿐, "Retryable Infra Failure vs Business Guard Failure" 를 분류하지 않는다 — 인프라 실패든 업무 실패든 동일하게 다음 회차에 재소비될 수 있어 §41 의 ★"Business Guard Failure 자동 Retry 금지" 를 강제하는 장치가 없다.
  - **백오프 정책 없음.** attempt 값에 따른 지연/backoff 스케줄링·max-attempts 컷·RETRY_PENDING 상태가 없다. 크론이 10분 주기로 무차별 재소비할 뿐이다.
  - **Idempotency Key/Causation ID 유지 없음.** attempt 재시도가 동일 Idempotency Key 를 유지한다는 계약이 없다(범용 Idempotency 미들웨어 ABSENT).
- **선행 SoT 부재.** `Temp Assignment Failure` 재시도는 Assignment(§3.4 ABSENT) 없이 성립 불가.

## 3. 판정

- Verdict: **PARTIAL** — `attempt` 카운터(`Catalog.php:81`) 존재로 시도 횟수 추적은 됨. 그러나 백오프·max-attempts·RETRY_PENDING 상태·Idempotency Key 유지·**Retry vs Recovery 구분** 전무.
- 선행 의존: Assignment(§3.4 ABSENT) 기반 재시도는 **BLOCKED_PREREQUISITE**. Business-Guard-Failure 분류는 선언적 Guard 레지스트리(§21 PARTIAL) 신설 후 실효.
- cover: 부분(attempt 카운터 1종) · 정책·상태·구분 0

## 4. 확장/구현 방향 (설계)

- 재사용: `attempt` 컬럼(`Catalog.php:81`)을 Sequential Transition Instance 의 `retry count`(§20 필드)로 승격 — 폐기 아닌 확장(§71 무후퇴: catalog_writeback_job 전이 유지).
- 순신규 **RETRY_PENDING 상태 + 실패 분류**: 인프라 실패만 자동 Retry 대상으로 표기, Business Guard Failure 는 Retry 금지(Block/Manual Review 로 라우팅) — §41 ★강제.
- ★재시도 시 동일 Idempotency Key·Causation ID·Expected State 유지 + 상태 재검증(§48 Idempotency SoT 신설과 연동). 백오프·max-attempts 정책은 §8 POLICY 의 retry policy 필드로 선언화. Fencing/Lock 은 재시도 시 최신값 재획득(Fencing SoT 신설 후 실효).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

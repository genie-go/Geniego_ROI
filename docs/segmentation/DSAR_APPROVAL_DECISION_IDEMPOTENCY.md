# DSAR — Idempotency (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### IDEMPOTENCY (§39)

필드: `idempotency_id`·`tenant_id`·`slot id`·`command type`·`idempotency key`·`request hash`·`actor subject id`·`first/last received_at`·`processing state`·`command/validation result/commit/record id`·`result hash`·`response reference`·`expires_at`·`status`·`evidence`.

★ 규칙:
- 동일 `key` + 동일 `request hash` → **저장된 결과 반환**(재실행 금지).
- 동일 `key` + **다른 hash** → **Conflict + Commit 차단 + Audit**.

## 2. 기존 구현 대조

### 결정(Decision) 도메인 = ABSENT
- 승인 결정 4핸들러(Mapping/AdminGrowth/Alerting/Catalog) 어디에도 **idempotency key·request hash·result hash 저장** 개념이 없다.
- `AdminGrowth::approvalDecide` 는 이미처리 시 409(`AdminGrowth.php:1327`)를 반환하나, 이는 **status 상태가드**(이미 approved/rejected 면 거부)이지 **동일 key+hash 결과 재현**이 아니다. 재제출 시 저장된 응답을 돌려주지 못하고 단순 차단한다.
- `Alerting::decideAction`(`Alerting.php:572-599`) — idempotency 키 부재. 동일 요청 반복 시 매번 UPDATE 실행.
- `Catalog::approveQueue` — CAS-lite WHERE status(`Catalog.php:2397`)로 이중 처리를 일부 억제하나 key 기반 결과 반환 아님.

### 웹훅 도메인 = PRESENT (재사용 원형)
- **Paddle 웹훅**은 `paddle_events` 테이블의 **UNIQUE(notification_id) 제약을 멱등 가드**로 사용(`Paddle.php:343-368`). INSERT 시 UNIQUE 위반이면 이미 `processed=1` 인 경우만 skip(`:357-358`), `processed=0`(과거 처리실패)은 재처리 허용(`:363`).
- 이는 결정 도메인의 §39 와 **구조가 동일**: 자연키(notification_id) = idempotency key, 처리상태(processed) = processing state, 중복 감지 시 저장결과 반환/재처리 판단.

## 3. 판정

- Verdict (결정 도메인): **ABSENT** / (웹훅 원형): **VALIDATED_LEGACY** — Paddle 멱등 패턴을 Decision Idempotency 로 **일반화**.
- 선행 의존: §14 COMMAND(idempotency key 발급 주체)·§35 RECORD(result 링크) 부재. 결정 도메인 구현은 Command/Record 신설에 종속.
- cover: 결정 도메인 **0** / Paddle 웹훅 멱등 **PRESENT**(`Paddle.php:343-368`).

## 4. 확장/구현 방향 (설계)

- **VALIDATED_LEGACY 승격**: `Paddle.php:343-368` 의 UNIQUE 자연키 멱등 + processing-state 재처리 판단을 **Decision Idempotency 의 정본 패턴**으로 채택. `notification_id → idempotency key`, `processed → processing state`, UNIQUE 위반 → 저장결과 반환.
- **결정 특화 확장**: §39 는 웹훅보다 엄격 — 동일 key **다른 hash 는 Conflict + Commit 차단 + Audit**(웹훅은 재전송 동일 payload 가정). request hash 컬럼을 추가해 payload 변조 재사용을 탐지해야 한다.
- **상태가드 ≠ 멱등**: `AdminGrowth:1327` 409 는 이중처리 차단은 되나 결과 재현이 아님 → §39 는 저장된 result/response 를 돌려줘야 한다(멱등의 정의).
- **Slot 바인딩**: idempotency key 는 §13 Slot(tenant·case·requirement·sequential step) 에 결속. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

# DSAR — Decision Conflict (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**CONFLICT(§50)** TYPE:
`MULTIPLE_COMMANDS` · `MULTIPLE_VALIDATIONS` · `MULTIPLE_COMMIT_REQUESTS` · `DUPLICATE_COMMITTED_DECISION` · `IDEMPOTENCY_KEY` · `REQUEST_HASH` · `DECISION_SLOT` · `ACTOR` · `ASSIGNMENT` · `CLAIM` · `LEASE` · `AUTHORITY` · `DELEGATION` · `STEP_STATE` · `CURSOR` · `VERSION` · `LOCK` · `FENCING_TOKEN` · `REPLAY` · `OUTBOX` · `EXTERNAL_SYSTEM_CONFLICT` · `CUSTOM`.

필드: `conflict_id` · instance id · slot id · command ids · commit ids · record ids · conflict type · expected state · actual state · expected version · actual version · severity · detected_at · resolution policy · winning command/record · resolved_by · resolved_at · status · evidence.

## 2. 기존 구현 대조

- **Decision Conflict = PARTIAL.** 실존하는 것은 **종결 후 재요청 차단(409)** 하나뿐이다: `AdminGrowth::approvalDecide`는 이미처리 시 409(`:1330` 경로의 `:1327`), pending 중복방지(`:1292`). `Catalog::approveQueue`는 CAS-lite WHERE status='...'(`:2397`). 이는 §50의 `DUPLICATE_COMMITTED_DECISION`/`STEP_STATE` 축을 **상태 컬럼 수준에서 부분 방어**하나, conflict를 **1급 레코드로 감지·기록·해소**하는 구조가 아니다.
- **동시 쓰기(concurrent-write) 충돌 감지 = 부재.** `MULTIPLE_COMMANDS`/`MULTIPLE_COMMIT_REQUESTS`/`VERSION`/`LOCK`/`FENCING_TOKEN` 충돌을 잡을 수 있는 Lock(§41)·Fencing(§43)·Optimistic Version(§44)이 모두 ABSENT이므로, 두 요청이 동시에 진입하면 충돌이 **감지되지 않고 마지막 쓰기가 이긴다**.
- **Mapping::approve = 무방비.** read approvals_json(`:273`)→UPDATE(`:288`)가 트랜잭션 없이(TOCTOU) 수행되어, 동시 승인 시 `IDEMPOTENCY_KEY`/`DECISION_SLOT` 충돌을 감지할 축이 없다 — dedup(`:278`)은 단일 요청 내 승인자 중복만 본다.
- `conflict_id`/`winning command/record`/`resolution policy`를 가진 충돌 레코드는 **어느 핸들러에도 없다**(grep 근거 없이 부재 확정 — §GROUND_TRUTH 미등재 = ABSENT).

## 3. 판정

- **Verdict: PARTIAL.** 종결 상태 재요청 409(AdminGrowth `:1327`)·CAS-lite(Catalog `:2397`)만 실존. 동시 쓰기 충돌 감지·충돌 레코드·해소 정책 = ABSENT.
- **선행 의존**: Lock(§41)·Fencing(§43)·Optimistic Version(§44)·Idempotency(§39) 부재로 대부분의 §50 TYPE이 **감지 불가**. Command(§14) 부재로 `MULTIPLE_COMMANDS` 축도 성립 불가.
- **cover: PARTIAL** — 상태 기반 재요청 차단만(409/CAS-lite). concurrent-write conflict cover 0.

## 4. 확장/구현 방향 (설계)

- 기존 **AdminGrowth 409**·**Catalog CAS-lite WHERE status**를 충돌 감지의 **최소 선례로 승계**하되, 이를 Expected Version(§44) 조건부 UPDATE로 일반화해 `VERSION`/`DECISION_SLOT` 충돌을 **감지 가능**하게 만든다.
- **Mapping TOCTOU 우선 봉합**(`:273→288`) — Slot Unique + Expected Version 검증을 원자 경계(§48 3·4단계)에 넣어야 `DUPLICATE_COMMITTED_DECISION`이 조용히 통과하지 않는다.
- 충돌은 **삼키지 말고 1급 레코드로**(`conflict_id`·winning record·resolution policy·evidence) 기록 + Audit — 마지막 쓰기 승리(silent last-writer-wins) 금지. `IDEMPOTENCY_KEY` 동일·`REQUEST_HASH` 상이 = §39 규칙대로 Commit 차단 + Conflict 승격.
- Lock/Fencing/Version 신설 전까지 대부분의 concurrent-write TYPE은 **BLOCKED_PREREQUISITE** — 선행 축 없이 충돌 레코드만 만들면 감지 소스가 없어 VACUOUS.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

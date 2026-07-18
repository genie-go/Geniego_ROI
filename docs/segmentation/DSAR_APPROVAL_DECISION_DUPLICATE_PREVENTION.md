# DSAR — Duplicate Prevention (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### DUPLICATE_PREVENTION (§45)

방어 대상(중복 Commit 시나리오):
- 동일 Slot 복수 Committed · 동일 Command 복수 Commit · 동일 Idempotency Key 복수 · 동일 Step 이중.
- API/Double-click/Mobile Retry · ERP/Workflow Redelivery.
- Email Link/Slack·Teams Action 재사용.
- Recovery Worker/Outbox Consumer 역방향 중복.

## 2. 기존 구현 대조

### 현행 = PARTIAL (상태가드 + dedup, 그러나 비원자 경합)
- **상태가드**(이미 처리 차단):
  - `AdminGrowth::approvalDecide` — 이미처리 시 409(`AdminGrowth.php:1327`), pending 중복 방지(`:1292`).
  - `Catalog::approveQueue` — CAS-lite WHERE status(`Catalog.php:2397`)로 이미 큐잉된 행 재큐 억제.
- **dedup**(중복 승인자 append 방지):
  - `Mapping::approve` — approvals_json 내 동일 actor dedup(`Mapping.php:278`), 자기승인 차단(`:268`), 정족수 maker-checker(`:287`).
- **한계 — 비원자 경합**:
  - `Mapping::approve` 는 **트랜잭션 없음(TOCTOU)** — read(`:273`)→dedup 판정→UPDATE(`:288`) 사이에 잠금이 없어, 동일 actor 의 double-click 두 요청이 **둘 다 read 시점엔 미존재**로 판정되면 dedup 이 무력화된다(경합 창).
  - `Alerting::decideAction`(`Alerting.php:572-599`) — idempotency key·중복 방지 없음. 재전송/재시도 시 매번 UPDATE.
  - Slot 단위 "단일 Committed" 불변식(§13·§37) 부재 — 상태가드는 **행 단위 status** 이지 Slot 유일성 보장이 아니다.
- ERP/Workflow redelivery·Email/Slack 재사용·Outbox consumer 역중복 = 결정 도메인에 방어 **no hits**.

## 3. 판정

- Verdict: **PARTIAL** — 상태가드(AdminGrowth 409·Catalog CAS-lite)+dedup(Mapping)은 실재하나, **비원자 경합**(Mapping TOCTOU)·**Slot 유일성 부재**·**channel/redelivery 미방어**로 §45 전 시나리오를 못 막는다.
- 선행 의존: §39 IDEMPOTENCY(key 기반 중복)·§13 SLOT(단일 Committed)·§41 LOCK(원자 경합 차단)·§47 INBOX_DEDUP(ERP/Workflow redelivery). 이들 부재로 완전 방어 불가.
- cover: **PARTIAL** — `AdminGrowth.php:1292,1327` · `Catalog.php:2397` · `Mapping.php:268,278,287`(dedup·정족수·자기승인 차단).

## 4. 확장/구현 방향 (설계)

- **원자화(핵심)**: `Mapping::approve` 의 무트랜잭션 read-append-UPDATE(`Mapping.php:273,288`)를 §41 Lock + 트랜잭션으로 감싸 double-click 경합 창 제거. dedup(`:278`) 판정과 UPDATE 를 원자 단위로.
- **Slot 유일성 신설**: §13 Slot Key(tenant·case·requirement·sequential step) 에 **단일 Committed Decision** DB 제약(UNIQUE)을 걸어 "동일 Slot 복수 Committed" 를 구조적으로 차단(§37 SEQUENCE).
- **Idempotency 결합**: §39 idempotency key + request hash 로 API/Mobile Retry·Double-click 을 결과 재현으로 흡수. Email Link/Slack(§16)은 §40 replay 방어와 결합.
- **Inbox Dedup**: ERP/Workflow redelivery 는 §47 INBOX_DEDUP(source event id) 신설로 방어. Recovery/Outbox consumer 역중복은 fencing token(§43)+멱등으로.
- **재사용 승격**: `AdminGrowth:1327` 409 상태가드 + `Mapping:278` dedup + `Catalog:2397` CAS-lite 를 **정본 패턴으로 유지**하되 원자·Slot·멱등 계층을 위에 얹음(Golden Rule = Extend·무후퇴). 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

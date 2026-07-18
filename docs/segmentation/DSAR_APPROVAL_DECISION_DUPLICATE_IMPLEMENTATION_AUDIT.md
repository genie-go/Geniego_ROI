# DSAR — Duplicate Implementation Audit (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §66 DUPLICATE_IMPLEMENTATION_AUDIT. file:line 인용은 허용목록만.
> 규율: "`status=approved` UPDATE ≠ Decision Record". 이름·주석 아닌 코드 기반 판정. **없는 중복을 만들지 않고, 실존 중복만 정직 열거.**

## 1. 원문 전사 (Canonical Contract §66 — 중복 안티패턴 목록)

§66이 감사 대상으로 지목하는 중복/난립 패턴:
- 여러 Decision/Approval Action Table
- Approve·Reject 별도 중복 구현
- Command·Record 혼합(분리 안 됨)
- History/Snapshot/Idempotency/Lock/Fencing 없음
- Direct Status Update(불변 Record 없이 상태 컬럼 덮어쓰기)
- Workflow Task Complete ↔ Decision Record 분리(이중 진실원)
- ERP ↔ Platform 이중 진실원
- Email/Slack·Teams 직접 Commit
- Email Actor·Current Assignee/Authority/Delegation/Lease 미검증
- 동일 Step 복수 결정
- Double-click/API Retry 중복
- Client Time 사용
- Record Update/Delete
- Outbox 없음 · Sequential Completion 누락 · Partial Commit
- Recovery Record 수정 · 과거 재해석 · Mandatory Control 제거

## 2. 기존 구현 대조 — 실존 중복 후보 정직 열거

### 2.1 in-place `status` UPDATE 4핸들러 (§66 "Direct Status Update"·"Approve/Reject 별도 중복" 실체)

| 핸들러 | file:line | 실측 | §66 위반 |
|---|---|---|---|
| `Mapping::approve` | `Handlers/Mapping.php:238-293` | read approvals_json(:273)→append→단일 UPDATE(:288)·**트랜잭션 없음(TOCTOU)**·정족수 maker-checker(:287)·자기승인차단(:268)·dedup(:278) | Command·Record 혼합·불변 Record 없음·Idempotency/Lock/Fencing 없음 |
| `AdminGrowth::approvalDecide` | `Handlers/AdminGrowth.php:1313-1344` | 단일 UPDATE status/decided_by(:1330)·이미처리 409(:1327)·pending 중복방지(:1292)·enum 화이트리스트(:1321) | Direct Status Update·History/Snapshot/Idempotency 없음 |
| `Alerting::decideAction`+`executeAction` | `Handlers/Alerting.php:572-599` / `:601-665` | 단일 UPDATE(:594)·집행 별도호출 `AdAdapters::pause`(:631)+UPDATE(:653)·**비원자·무아웃박스** | Direct Status Update·Partial Commit·Outbox 없음 |
| `Catalog::approveQueue` | `Handlers/Catalog.php:2383-2407` | bulk UPDATE status='queued'(:2397)+processWritebackQueue(:2404)·**승인자 미기록**·CAS-lite WHERE status | Direct Status Update·승인자 미검증·Command/Record 혼합 |

★이 4핸들러는 **동일 안티패턴의 4개 산재 구현** = §66 "Approve/Reject 별도 중복"의 실체. **CONSOLIDATION_REQUIRED**(단, Alerting은 아래 별도 보안판정). 통합 시 Golden Rule=Extend: Mapping actor/maker-checker(CANONICAL)를 정본으로 나머지 흡수.

### 2.2 `Alerting::decideAction/executeAction` — **BLOCKED_SECURITY**

- `Alerting::actor()`(`Handlers/Alerting.php:33-35`)가 `X-User-Email` 헤더 / `?actor=` 쿼리로 승인자 결정 → **클라이언트 승인자 위조 가능**. §66 "Email Actor·Current Assignee 미검증"의 실 위험.
- 결정↔집행 비원자·무아웃박스(Partial Commit) 중복.
- **판정 = BLOCKED_SECURITY**: canonical actor(Mapping::actorId 패턴) 선치유 전에는 통합/재사용 불가. 통합 우선순위 최상위.

### 2.3 이름충돌 — `Decisioning.php` = **KEEP_SEPARATE**

- `Decisioning.php`(`:36,235,432`) = 마케팅 집계 결정엔진(광고/세그/추천). "decision" 이름은 겹치나 **승인 결정과 무관**. §66 "여러 Decision Table" 오탐 회피 — **중복 아님·KEEP_SEPARATE**(재구현·병합 금지).

### 2.4 `omni_outbox` claim/lease/lock = **KEEP_SEPARATE**

- `Omnichannel.php:390-448` claim_id(random_bytes `:392`)+15분 리스+SKIP LOCKED = **메시지 발송 전용** Outbox/Lock/Lease. Decision Outbox(§46)와 **동일 이름/개념 아님** — 발송 인프라. **KEEP_SEPARATE**(Decision Outbox 설계 시 **참조 원형**으로만 인용·복사/병합 금지).

### 2.5 `Paddle` 웹훅 멱등 = **VALIDATED_LEGACY**

- `Paddle.php:343-368` UNIQUE(notification_id) 멱등 = 견고하나 **웹훅 국한**. Decision Idempotency(§39)로 **일반화 대상**(재구현 아님·확장). **VALIDATED_LEGACY**.

### 2.6 감사 substrate — 중복 아님·재사용

- `SecurityAudit::verify`(`SecurityAudit.php:56-68`) = 감사 무결 정본(audit_log는 장식·비 tamper-evident). Tenant Guard(index.php·49핸들러 WHERE tenant_id)·`app_user`(`UserAuth.php:155-157,296`) = 신원/격리 정본. **중복 신설 금지·재사용 substrate.**

## 3. 판정

- **Verdict 요약**:
  - 4핸들러 in-place UPDATE = **CONSOLIDATION_REQUIRED**(단일 안티패턴 산재·Mapping을 정본으로 통합).
  - `Alerting::decideAction/executeAction` = **BLOCKED_SECURITY**(actor 위조·선치유 필수).
  - `Decisioning.php` = **KEEP_SEPARATE**(이름충돌·마케팅 무관).
  - `omni_outbox` = **KEEP_SEPARATE**(발송 전용·참조 원형만).
  - `Paddle` 멱등 = **VALIDATED_LEGACY**(일반화 확장).
  - `SecurityAudit::verify`·Tenant Guard·app_user = **재사용 substrate**.
- **선행 의존**: 통합의 종착점(불변 Record·원자 Commit·Outbox)이 §3.1~§3.5 선행 6군 부재 위에 있어 실 통합은 **BLOCKED_PREREQUISITE**.
- **cover**: 실존 중복 후보 = 6군(위 §2.1~§2.6). 정본 Decision Core cover = 0.

## 4. 확장/구현 방향 (설계)

- **단일 Decision Commit 경로로 통합**: 4핸들러를 각각 Command→Validation→Commit 파이프라인(§25)의 클라이언트로 편입. `AdminGrowth`/`Catalog`/`Alerting`은 자체 UPDATE 폐기 → 공통 Commit 서비스가 불변 Record(§35) 생성. **Golden Rule=Extend**(재구현 아님·기존 진입점 보존, 내부 위임만 교체).
- **BLOCKED_SECURITY 선치유**: `Alerting::actor` 헤더 위조를 canonical actor(`Mapping::actorId` fail-closed 패턴)로 교체가 통합 착수 전제.
- **KEEP_SEPARATE 경계 명시**: Decisioning(마케팅)·omni_outbox(발송)은 통합 대상에서 제외 — 이름충돌로 인한 오통합 금지. omni_outbox는 Decision Outbox의 **설계 참조**로만.
- **VALIDATED_LEGACY 일반화**: Paddle UNIQUE 멱등 → Decision Idempotency(§39) 공통화.
- **무후퇴**: 통합은 [[DSAR_APPROVAL_DECISION_FUNCTION_REGRESSION_GATE]] 게이트(Mapping 정족수·AdminGrowth·Catalog·Alerting·Paddle·omni_outbox·SecurityAudit 무회귀) 통과 후에만.
- **실 통합 = 선행 6군 신설 후 별도 승인세션**. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_FUNCTION_REGRESSION_GATE]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

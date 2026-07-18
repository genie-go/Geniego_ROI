# DSAR — Approval Decision Registry (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 REGISTRY 필수 필드:
- `registry_id` · `tenant_id` · `registry_code` · `name` · `registry_type`
- `authoritative_source`
- `supported action types`
- `sync/async validation support`
- `transactional commit support`
- `outbox/idempotency/replay protection support`
- `signature/MFA support reference`
- `simulation/reconciliation support`
- `owner` · `active_version` · `valid_from/to` · `status` · `evidence`

REGISTRY_TYPE enum: `PLATFORM` / `TENANT` / `WORKFLOW` / `FINANCE` / `REBATE` / `CLAIM` / `SETTLEMENT` / `PAYMENT` / `CONTRACT` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `CUSTOM`.

## 2. 기존 구현 대조

- **Registry(권위원장) 테이블·코드 실존 부재.** 현행 승인 결정은 4개 핸들러에 하드코딩된 in-place UPDATE로만 존재하며, 어떤 승인 도메인이 어떤 능력(sync/async validation·transactional commit·outbox/idempotency/replay·signature/MFA·simulation/reconciliation)을 갖는지 선언하는 권위 등록소가 없다.
  - `Mapping::approve`(`Handlers/Mapping.php:238-293`) — approvals_json read(`:273`)→append→단일 UPDATE(`:288`), 트랜잭션 없음(TOCTOU), 정족수 maker-checker(`:287`).
  - `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1313-1344`) — 단일 UPDATE status/decided_by(`:1330`), 이미처리 409(`:1327`), enum 검증(`:1321`).
  - `Alerting::decideAction`(`Handlers/Alerting.php:572-599`)/`executeAction`(`:601-665`) — 단일 UPDATE(`:594`), 집행 별도호출(`:631`,`:653`), 비원자, 무아웃박스.
  - `Catalog::approveQueue`(`Handlers/Catalog.php:2383-2407`) — bulk UPDATE(`:2397`)+processWritebackQueue(`:2404`), 승인자 미기록.
- 위 4핸들러 어디에도 `registry_type`·`authoritative_source`·능력 플래그(transactional commit / outbox / replay protection)·`active_version`을 선언·조회하는 지점이 없다 → **no hits**.
- 인접 재사용 자산: Paddle 웹훅 UNIQUE(notification_id) 멱등(`Handlers/Paddle.php:343-368`) = 결정 멱등 일반화의 VALIDATED_LEGACY 근거이나, Registry 레벨의 `idempotency protection support` 선언과는 별개.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- 선행 의존: §3.1 Approval(**ABSENT** — chain/workflow 0, `AgencyPortal.php:20,80,381` 이진상태), §3.2 Authority(**ABSENT**), §3.5 Sequential(**ABSENT** — 하드코딩 status flip `AgencyPortal.php:381,400`). Registry는 이들 상위 개념의 권위 선언소이므로 선행 Approval/Authority 부재에 막힌다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_registry` 정본 테이블(테넌트별·PLATFORM/TENANT 스코프). Registry는 능력 선언소이지 결정 저장소가 아님 — Instance/Command/Record와 혼합 금지.
- 능력 플래그(`transactional commit support`·`outbox/idempotency/replay protection support`)는 장식이 아니라 Mandatory Control 게이트로 강제: 해당 Registry 하위 Definition/Command는 선언된 능력을 실제 구현으로 충족해야 Commit 허용(무후퇴).
- 재사용: 결정 멱등 능력은 Paddle UNIQUE 멱등 패턴(`Paddle.php:343-368`)을, outbox/lock 능력은 omni_outbox claim/lease/SKIP LOCKED(`Handlers/Omnichannel.php:390-448`)을 확장. SecurityAudit::verify(`SecurityAudit.php:56-68`)를 Registry evidence 무결 정본으로 참조(audit_log는 장식).
- 실위험: Registry 없이 4핸들러가 병렬로 status를 flip하는 현행 구조는 §66 중복 구현 감사의 "여러 Decision Table·Direct Status Update" 항목에 정면 해당 — Registry 신설이 이 중복을 정규화하는 선행 조건이다.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

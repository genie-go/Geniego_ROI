# DSAR — Block (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §40 BLOCK — REASON
`NO_ELIGIBLE_ASSIGNMENT` · `PREVIOUS_STEP_INCOMPLETE` · `MISSING_COMPLETION_EVENT` · `MISSING_COMPLETION_SNAPSHOT` · `AUTHORITY_MISMATCH` · `DELEGATION_MISMATCH` · `LEGAL_ENTITY_MISMATCH` · `DUPLICATE_ACTIVE_STEP` · `DUPLICATE_TRANSITION` · `VERSION_CONFLICT` · `CURSOR_CONFLICT` · `STALE_LOCK` · `STALE_FENCING_TOKEN` · `DEADLOCK` · `ORPHAN` · `RECONCILIATION_DRIFT` · `MANUAL_REVIEW_REQUIRED` · `CUSTOM`.

### 원칙
Block 은 진행 불가 사유를 명시 상태로 승격 · 자동 진행 차단 · Manual Review/Recovery 경유 후에만 해제.

## 2. 기존 구현 대조

- **승인 Instance 를 대상으로 한 Block State/Reason 은 ABSENT.** DUPLICATE_ACTIVE_STEP·VERSION/CURSOR_CONFLICT·DEADLOCK·ORPHAN·STALE_FENCING_TOKEN 을 명시 Block 사유로 표현하는 상태·enum 은 존재하지 않는다(다단 Stage/Level/Step 및 Cursor/Fencing 자체가 ABSENT).
- **잡 도메인의 유사물 = 'pending' 보류(KEEP_SEPARATE).** catalog_writeback_job 은 어댑터 미보유 채널의 잡을 `status='pending'` 에 머무르게 해 큐 기아를 만들지 않는다(`Catalog.php:1710` — 어댑터 보유 시에만 'queued' 복귀). 유사하게 CAS 선점 WHERE 절이 상태를 `'queued','awaiting_credentials'` 로 제한한다(`Catalog.php:1726`). 이 `awaiting_credentials`/`pending` 은 **자격/어댑터 미비 시 잡을 보류**하는 도메인 특화 대기이지 승인 상태머신의 Block(사유코드·Manual Review 해제 경로 보유)이 아니다 → **KEEP_SEPARATE**.
- **부분 대응 = affected-rows 0.** 선점 실패 시 반환은 `rowCount() < 1 → continue`(`Catalog.php:1730`)로, 이는 사실상 "이미 다른 워커가 가져감" 의 암묵 차단이지만 Block 상태·사유코드·severity 없이 조용히 스킵된다.
- **선행 SoT 부재.** `AUTHORITY/DELEGATION_MISMATCH`(§3.2·§3.3 ABSENT)·`NO_ELIGIBLE_ASSIGNMENT`(§3.4 ABSENT)·`STALE_FENCING_TOKEN`(fencing no hits)·`DEADLOCK`/`ORPHAN`(탐지기 ABSENT) 은 판단 대상 SoT 가 없다.

## 3. 판정

- Verdict: **ABSENT** — 승인 도메인의 Block State/Reason/Manual-Review 해제 경로 없음.
- 선행 의존: Assignment(§3.4)·Authority(§3.2)·Delegation(§3.3) 및 Fencing/Deadlock/Orphan 탐지 부재 → 사유 대부분 **BLOCKED_PREREQUISITE**. `awaiting_credentials`/`pending` 잡 보류(`Catalog.php:1710,1726`)는 별 개념 **KEEP_SEPARATE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **Block 상태 + Reason enum**. Next Step Resolution/Activation 계약(§29~§34)의 각 실패 지점을 조용한 스킵이 아니라 명시 Block 전이 + 사유코드 + Audit 로 승격(§59 Critical Gap: Orphan/Deadlock 미탐지·Duplicate Active 금지).
- ★잡 도메인 `pending`/`awaiting_credentials`(`Catalog.php:1710,1726`)는 **건드리지 않는다**(KEEP_SEPARATE) — 승인 Block 과 명명·의미 분리 유지(§67 중복구현 방지: 상태문자열 혼용 금지).
- 재사용: CAS WHERE 절(`Catalog.php:1726-1730` CANONICAL)의 affected-rows 판정을 `DUPLICATE_ACTIVE_STEP`/`VERSION_CONFLICT` Block 사유의 런타임 탐지 신호로 흡수하되, 스킵 대신 Block 전이로 표면화. `DEADLOCK`/`ORPHAN`/`STALE_FENCING_TOKEN` 사유는 각 탐지기·Fencing SoT 신설 후 실효.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

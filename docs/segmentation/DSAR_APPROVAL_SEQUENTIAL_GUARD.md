# DSAR — Guard (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §21 GUARD — 지원 Guard 목록
`TENANT_MATCH` · `INSTANCE_ACTIVE` · `VERSION_ACTIVE` · `EXPECTED_STATE/VERSION_MATCH` · `PREVIOUS_STAGE/LEVEL/STEP_COMPLETED` · `ALL_BLOCKING_DEPENDENCIES_COMPLETED` · `MANDATORY_LEVELS_COMPLETED` · `ASSIGNMENT_EXISTS/ACTIVE` · `ASSIGNEE_ELIGIBLE` · `CLAIM_ACTIVE` · `LEASE_ACTIVE` · `LOCK_ACQUIRED` · `FENCING_TOKEN_CURRENT` · `AUTHORITY_ACTIVE` · `DELEGATION_ACTIVE` · `LEGAL_ENTITY/ORGANIZATION/RESOURCE/ACTION_MATCH` · `AMOUNT_WITHIN_LIMIT` · `CURRENCY_MATCH` · `SECURITY_ACTIVE` · `SOD_PASS` · `CONFLICT_OF_INTEREST_PASS` · `NOT_PAUSED/SUSPENDED/BLOCKED/COMPLETED/CANCELLED/DUPLICATE/DEADLOCKED` · `CUSTOM`.

### 필드
guard_id · code · name · guard type · evaluation order · mandatory · fail open · failure severity · failure code · runtime/static evaluator reference · version · status · evidence. **★Mandatory Guard = Fail Closed.**

## 2. 기존 구현 대조

- **선언적 Guard 레지스트리 ABSENT.** guard_id·evaluation order·mandatory·fail open·evaluator reference 를 가진 재사용 Guard 테이블/평가기는 존재하지 않는다.
- **암묵 Guard = UPDATE의 WHERE 절뿐.** catalog_writeback_job 선점은 `... WHERE id=? AND status IN('queued','awaiting_credentials')`(`Catalog.php:1726`)로 상태 조건을 CAS WHERE 절에 인라인한다 — 이는 사실상 `EXPECTED_STATE_MATCH` 가드를 흉내 내지만, **산재·비선언·재사용 불가**하며 실패 시 반환은 affected-rows 0(가드 실패 코드·severity 없음).
- 부분 대응 가드 매핑: `TENANT_MATCH`=Tenant Guard(`UserAuth.php:403-406`)·`SECURITY_ACTIVE`≈SecurityAudit substrate(`SecurityAudit.php:56-68`)·`EXPECTED_STATE_MATCH`≈WHERE status 절(`Catalog.php:1726`). 이 셋만 부분 존재.
- **나머지 전부 부재**: `PREVIOUS_STAGE/LEVEL/STEP_COMPLETED`·`ALL_BLOCKING_DEPENDENCIES_COMPLETED`·`MANDATORY_LEVELS_COMPLETED`(다단 Stage/Level/Step 자체 ABSENT)·`ASSIGNMENT_*/ASSIGNEE_ELIGIBLE`·`CLAIM_ACTIVE`·`AUTHORITY_ACTIVE`·`DELEGATION_ACTIVE`·`FENCING_TOKEN_CURRENT`(fencing no hits)·`SOD_PASS`·`CONFLICT_OF_INTEREST_PASS`·`AMOUNT_WITHIN_LIMIT`·`NOT_DEADLOCKED` 등. 선행 5군 중 4군(Assignment/Authority/Delegation/Chain) 부재로 대응 가드가 참조할 SoT 없음.

## 3. 판정

- Verdict: **PARTIAL** — UPDATE WHERE 절에 인라인된 암묵 상태 guard(`Catalog.php:1726`)만 존재. 선언적 Guard 레지스트리·mandatory/fail-open 메타·평가기·failure 코드 **없음**.
- 선행 의존: 다단/Assignment/Authority/Delegation 가드는 §3.1~§3.4(전부 ABSENT)에 막힘 → 해당 가드군 **BLOCKED_PREREQUISITE**.
- cover: 부분(Tenant/Expected-State/Security substrate 3종) · 그 외 0

## 4. 확장/구현 방향 (설계)

- 순신규 **guard 레지스트리**(guard_id·evaluation order·mandatory·fail-open·failure severity/code·evaluator ref). WHERE 절 산재 조건을 명시 Guard 로 승격·정형화(§67 중복구현 방지).
- 재사용: CAS WHERE 절(`Catalog.php:1726-1730` **CANONICAL**)을 `EXPECTED_STATE_MATCH` 가드의 런타임 평가기로 흡수. Tenant Guard(`UserAuth.php:403-406`)→`TENANT_MATCH`. SecurityAudit::verify(`SecurityAudit.php:56-68`)→`SECURITY_ACTIVE`.
- ★Mandatory Guard = **Fail Closed** 원칙 강제(§59 Critical Gap: Mandatory Guard 제거 금지). `FENCING_TOKEN_CURRENT`·`ASSIGNMENT_ACTIVE`·`AUTHORITY_ACTIVE`·`DELEGATION_ACTIVE` 가드는 각 선행 SoT(Fencing/Assignment/Authority/Delegation) 신설 후에만 실효 — 그 전까지 Fail Closed 로 진행 차단이 정직한 기본값.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

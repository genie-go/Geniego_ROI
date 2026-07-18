# DSAR — Approval Decision Guard (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§24 GUARD` — 원문 전사(Mandatory Guard = Fail Closed):

`TENANT_MATCH` · `DECISION_VERSION_ACTIVE` · `CASE_ACTIVE` · `WORK_ITEM_ACTIVE` · `STEP_ACTIVE` · `STEP_WAITING_FOR_DECISION` · `CURSOR_MATCH` · `ASSIGNMENT_ACTIVE` · `ACTOR_IS_ASSIGNEE` · `ACTOR_IS_VALID_DELEGATE` · `CLAIM_ACTIVE` · `LEASE_ACTIVE` · `AUTHORITY_ACTIVE` · `DELEGATION_ACTIVE` · `LEGAL_ENTITY/ORGANIZATION/RESOURCE_MATCH` · `ACTION_ALLOWED` · `AMOUNT_WITHIN_LIMIT` · `CURRENCY_ALLOWED` · `SECURITY_ACTIVE` · `SOD_PASS` · `CONFLICT_OF_INTEREST_PASS` · `EXPECTED_VERSION_MATCH` · `IDEMPOTENCY_VALID` · `NONCE_VALID` · `NOT_EXPIRED` · `NO_EXISTING_COMMITTED_DECISION` · `LOCK_ACQUIRED` · `FENCING_TOKEN_CURRENT` · `CUSTOM`.

★Mandatory Guard = Fail Closed(미충족 시 결정 차단).

## 2. 기존 구현 대조

가드는 **선언적 Guard 객체 없이 핸들러 인라인 `if`로만 부분 실존**한다.

**실존(인라인 if)**:
- `TENANT_MATCH`: Tenant Guard(index.php·49핸들러 WHERE tenant_id)로 전역 실존 — 유일하게 견고한 가드 축.
- `NO_EXISTING_COMMITTED_DECISION` 근사: `AdminGrowth::approvalDecide`(:1327) 이미처리 409 · pending 중복방지(:1292). `Catalog::approveQueue`(:2397) CAS-lite `WHERE status='...'`.
- `ACTOR_IS_ASSIGNEE` 근사(불완전): `Mapping`(:268) 자기승인차단 · dedup(:278) · 정족수(:287). 배정 검증이 아니라 승인자 카운트/자기승인 필터.
- `ACTION_ALLOWED` 근사: `AdminGrowth`(:1321) enum 화이트리스트 · `Alerting::decideAction`(:572-599) action_json(:612).
- Fail-closed 근사: `Mapping`(:36-53→:247 403) 미확인 actor 차단.

**부재**:
- `DECISION_VERSION_ACTIVE`·`CASE_ACTIVE`·`WORK_ITEM_ACTIVE`·`STEP_ACTIVE`·`STEP_WAITING_FOR_DECISION`·`CURSOR_MATCH` — Instance/Sequential(§3.5 ABSENT) 부재.
- `ASSIGNMENT_ACTIVE`·`ACTOR_IS_VALID_DELEGATE`·`CLAIM_ACTIVE`·`LEASE_ACTIVE`·`AUTHORITY_ACTIVE`·`DELEGATION_ACTIVE` — 선행 §3.2/§3.3/§3.4 ABSENT.
- `AMOUNT_WITHIN_LIMIT`·`CURRENCY_ALLOWED`·`SOD_PASS`·`CONFLICT_OF_INTEREST_PASS`·`EXPECTED_VERSION_MATCH`·`IDEMPOTENCY_VALID`·`NONCE_VALID`·`NOT_EXPIRED`·`LOCK_ACQUIRED`·`FENCING_TOKEN_CURRENT` — 결정 도메인에 부재.
- ★**가드 우회 위험**: `Alerting::executeAction`(:601-665)는 집행 별도호출(:631 AdAdapters::pause + :653 UPDATE)이 **비원자**이고, actor()(:33-35) 헤더 위조로 `SECURITY_ACTIVE`/`SOD_PASS` 축이 근본적으로 신뢰 불가 → BLOCKED_SECURITY.

## 3. 판정

- Verdict: **PARTIAL** — 인라인 `if`(Tenant·이미처리·자기승인·enum)만 존재, 선언적/Versioned Guard 집합 없음. Mandatory Fail-closed 보증 미형식화.
- 선행 의존: §3.2 Authority · §3.3 Delegation · §3.4 Assignment · §3.5 Sequential(전부 ABSENT). 29개 가드 중 다수가 이 축 부재로 항구적 미평가.
- cover: `TENANT_MATCH` 견고 · `NO_EXISTING_COMMITTED_DECISION`/`ACTION_ALLOWED`/`ACTOR_IS_ASSIGNEE`는 근사(부분). 나머지 = 0.

## 4. 확장/구현 방향 (설계)

- **인라인 if → 선언적 Guard**: 핸들러에 흩어진 조건을 §24 명시 Guard 코드 집합으로 정규화하고 각 가드에 Mandatory/Optional·Fail-closed 플래그 부여. 결정 버전별 활성 가드 세트를 §25 Validation Pipeline 순서에 바인딩.
- **Tenant Guard 재사용**: 이미 견고한 `TENANT_MATCH`(index.php WHERE tenant_id)를 Guard 프레임의 정본 선례로 삼아 동일 패턴을 나머지 축으로 확장(중복 게이트 신설 금지).
- **BLOCKED_SECURITY 선차단**: `Alerting::actor()`(:33-35) 헤더 위조가 살아있는 한 `SECURITY_ACTIVE`·`SOD_PASS`·`ACTOR_IS_ASSIGNEE` 가드는 무의미 — Authenticated Principal 기반 Actor Resolution(§18)이 선결. 위조 경로 제거 전에는 해당 가드를 "통과"로 기록 금지(가짜녹색).
- **비원자 집행 시정**: `Alerting::executeAction` 집행(:631)+UPDATE(:653) 분리를 `LOCK_ACQUIRED`·`FENCING_TOKEN_CURRENT` 가드 하 원자 경계(§48)로 재구성.
- 실 구현 = 선행 6군 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

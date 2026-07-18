# DSAR — Decision Runtime Guards (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 정책 명세.

## 1. 원문 전사 (Canonical Contract)

**RUNTIME_GUARDS (§62)** — 원문 차단 목록(런타임에 Commit 직전 반드시 통과해야 할 Fail-Closed 가드; §24 Guard 축과 정합):
- `TENANT_MATCH` — 요청 tenant ↔ 대상 tenant 일치
- `DECISION_VERSION_ACTIVE` · `CASE_ACTIVE` · `WORK_ITEM_ACTIVE` · `STEP_ACTIVE` · `STEP_WAITING_FOR_DECISION` · `CURSOR_MATCH`
- `ASSIGNMENT_ACTIVE` · `ACTOR_IS_ASSIGNEE` · `ACTOR_IS_VALID_DELEGATE` · `CLAIM_ACTIVE` · `LEASE_ACTIVE`
- `AUTHORITY_ACTIVE` · `DELEGATION_ACTIVE` · `LEGAL_ENTITY_MATCH` · `ORGANIZATION_MATCH` · `RESOURCE_MATCH`
- `ACTION_ALLOWED` · `AMOUNT_WITHIN_LIMIT` · `CURRENCY_ALLOWED`
- `SECURITY_ACTIVE` · `SOD_PASS` · `CONFLICT_OF_INTEREST_PASS`
- `EXPECTED_VERSION_MATCH` · `IDEMPOTENCY_VALID` · `NONCE_VALID` · `NOT_EXPIRED` · `NO_EXISTING_COMMITTED_DECISION`
- `LOCK_ACQUIRED` · `FENCING_TOKEN_CURRENT`

**★ 원칙 (§62/§24)**: Mandatory Guard = **Fail Closed** — 미충족·미평가·불명이면 Commit 차단.

## 2. 기존 구현 대조

- **런타임 가드 체계 = 미구현.** Commit 직전 위 가드 묶음을 통과시키는 통합 게이트는 존재하지 않는다. 현행 결정은 단일 UPDATE 로 status 를 뒤집으며 대부분의 가드가 발화하지 않는다.
- **부분 실재 — Tenant 격리는 실재**: `TENANT_MATCH` 축은 Tenant Guard(index.php · 49핸들러 WHERE tenant_id, §GROUND_TRUTH 재사용 자산)로 **부분 실재**한다. app_user(`UserAuth.php:155-157,296`) Canonical 도 actor 기반 가드의 토대. `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 `SECURITY_ACTIVE`/감사 축의 정본.
- **부분 실재 — 산발적 개별 가드**:
  - `NO_EXISTING_COMMITTED_DECISION` 유사물 = Mapping dedup(:278)·자기승인차단(:268)·정족수(:287)
  - `IDEMPOTENCY_VALID` 유사물 = AdminGrowth 이미처리 409(:1327)·pending 중복방지(:1292) · Catalog CAS-lite WHERE status(:2397)
  - `ACTOR_IS_ASSIGNEE`/actor 해석 = Mapping actor fail-closed null·403(:36-53,:247)
- **부재 가드**: `DECISION_VERSION_ACTIVE`·`STEP_ACTIVE`·`CURSOR_MATCH`·`ASSIGNMENT_ACTIVE`·`ACTOR_IS_VALID_DELEGATE`·`CLAIM/LEASE_ACTIVE`·`AUTHORITY/DELEGATION_ACTIVE`·`AMOUNT_WITHIN_LIMIT`·`SOD/CoI_PASS`·`EXPECTED_VERSION_MATCH`·`NONCE_VALID`·`LOCK_ACQUIRED`·`FENCING_TOKEN_CURRENT` — 전부 부재(대응 선행 엔티티 ABSENT).
- **★ 위반 실코드**: `Alerting::actor()` 헤더 위조(`Alerting.php:33-35`)는 `ACTOR_IS_ASSIGNEE`/`SECURITY_ACTIVE` 가드를 정면으로 우회한다(BLOCKED_SECURITY).

## 3. 판정

- Verdict: **PARTIAL(대부분 미구현)** — Tenant 격리·app_user·SecurityAudit·산발 가드만 실재, 통합 Fail-Closed 게이트는 부재.
- 선행 의존: 대부분 가드가 Assignment(§3.4)·Delegation(§3.3)·Authority(§3.2)·Sequential(§3.5)·Lock/Fencing·Version·Idempotency ABSENT 에 막힘 → **BLOCKED_PREREQUISITE**.
- cover: `TENANT_MATCH`(Tenant Guard·index.php) 부분 실재 · `NO_EXISTING_COMMITTED_DECISION`≈Mapping(:268,:278,:287) · `IDEMPOTENCY_VALID`≈AdminGrowth(:1327,:1292)/Catalog(:2397) · `SECURITY_ACTIVE`≈SecurityAudit verify(:56-68). 그 외 커버 **0**.

## 4. 확장/구현 방향 (정책)

- **미구현 게이트 신설 — 기존 부분 가드 확장**: Tenant Guard(index.php)·Mapping actor/dedup/정족수·AdminGrowth 멱등·Catalog CAS-lite 를 통합 Commit-전 가드 파이프라인(§25 27단계)으로 편입. 신규 가드 엔진 난립 금지(Golden Rule = Extend).
- **Fail-Closed 절대**: 미평가·불명(Unknown)을 통과로 처리 금지 — MEMORY [Reference: Unknown≠Eligible Fail-closed]와 정합.
- **최우선 보안 치유**: `Alerting::actor()`(:33-35) 헤더 신뢰를 §18 Actor Resolution 통과분으로 대체 — `ACTOR_IS_ASSIGNEE`/`SECURITY_ACTIVE` 가드의 선행 조건.
- **정직판정**: PARTIAL 은 "Tenant 격리 등 일부 실재"의 의미이지 런타임 가드 체계가 있다는 뜻이 아니다. 통합 게이트·Fail-Closed 실증까지가 완료.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

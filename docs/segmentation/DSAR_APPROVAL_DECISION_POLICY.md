# DSAR — Approval Decision Policy (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 POLICY 필수 필드:
- `policy_id` · `tenant_id` · `code` · `name`
- `actor/assignment/claim/lease/authority/delegation/sequential state policy`
- `action/reason/comment/attachment/signature/MFA policy reference`
- `idempotency/locking/fencing/validation/commit/retry/recovery/outbox/snapshot/audit/evidence/conflict policy`
- `owner` · `active_version` · `valid_from/to` · `status` · `evidence`

## 2. 기존 구현 대조

- **결정 정책(Policy) 선언 자산 부재.** 현행 4핸들러는 정책을 데이터로 선언·버전화하지 않고 로직에 하드코딩한다:
  - 정족수/maker-checker 정책 → `Mapping::approve` 코드 상수(`Handlers/Mapping.php:287`), 자기승인차단 하드코딩(`:268`), dedup 하드코딩(`:278`). 정책 테이블 미참조.
  - action enum 정책 → `AdminGrowth::approvalDecide` in-code 검증(`Handlers/AdminGrowth.php:1321`). 별도 `action policy reference` 없음.
  - locking/fencing/validation/commit/retry/recovery/outbox/snapshot **정책** → **no hits**(개념 자체가 ABSENT — §GROUND_TRUTH 개념별 판정: Lock-Lease(결정)/Fencing/Outbox(결정)/Snapshot/Retry/Recovery = ABSENT).
  - idempotency 정책 → 결정 도메인엔 없음. 유일 근사치는 Paddle 웹훅 UNIQUE 멱등(`Handlers/Paddle.php:343-368`)이나 이는 결제 웹훅용이며 정책 선언이 아니라 스키마 제약.
- actor/assignment/claim/lease/authority/delegation/sequential **state policy** 는 선행 6군 부재에 종속: Assignment(§3.4 ABSENT — omni_outbox 패턴참조), Authority(§3.2 ABSENT — `TeamPermissions.php:604,628` = 메뉴 RBAC), Delegation(§3.3 ABSENT — `TeamPermissions.php:614-647` DELEGATION_EXCEEDED = 부여상한 오탐), Sequential(§3.5 ABSENT).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1~§3.5 전 축 부재. Policy는 actor·assignment·authority·delegation·sequential 정책을 참조·조립하는 상위 선언이므로 이들이 모두 없으면 실체 구성이 불가.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_policy` 정본 — Registry(§7)에 종속, Version(§10)으로 스냅샷되는 버전화 정책 문서. 정책은 데이터로 선언되고 코드는 이를 해석만 한다(하드코딩 상수 폐기).
- 확장 기반: `AdminGrowth::approvalDecide:1321`의 enum 화이트리스트를 `action policy` 정본 검증 패턴으로 승격(Golden Rule = Extend). `Mapping::approve`의 정족수/자기승인차단(`Mapping.php:268,287`)을 `authority/SoD policy` 로 데이터화.
- Mandatory Control: `validation/commit policy`는 Fail-Closed — 정책 미선언 결정은 Commit 금지. `idempotency/locking/fencing policy`는 Paddle 멱등(`Paddle.php:343-368`)·omni_outbox lease(`Omnichannel.php:390-448`) 패턴을 정책 파라미터로 흡수.
- 실위험: 현행은 정책 부재로 `Alerting::executeAction`이 헤더 위조 actor(`Handlers/Alerting.php:33-35` X-User-Email/?actor=)로 집행 가능(BLOCKED_SECURITY). Policy 신설 시 `actor policy` + `signature/MFA policy reference` 로 이 위조 경로를 정책 차원에서 봉쇄.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

# DSAR — Claim · Lease Effect Mapping (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§46 CLAIM_LEASE_EFFECT_MAPPING — 액션이 Claim / Lease에 미치는 효과 열거형:

1. `KEEP_CLAIM`
2. `RELEASE_CLAIM`
3. `COMPLETE_CLAIM`
4. `REVOKE_CLAIM`
5. `CLOSE_LEASE`
6. `EXTEND_LEASE_REFERENCE`
7. `SUSPEND_LEASE`
8. `NO_CHANGE`
9. `CUSTOM`

★ **무기한 Claim / Lease 금지** — Claim/Lease는 만료·해제 정책과 반드시 결합한다.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **결재 Claim / Lease 개념 = ABSENT.** 결정 슬롯을 특정 결재자가 **점유(claim)** 하거나 **시한부로 임차(lease)** 하는 축이 없다. §3.3 Assignment 부재의 하위 귀결 — 할당이 없으니 점유·임차도 없다.
- `orderhub_claims`(`OrderHub.php:93,530`)는 **CS 클레임 오탐**(주문 클레임 도메인) — 결재 Claim/Lease가 아니다. 전용 금지.
- 현행 승인은 **점유·해제 없는 즉시 in-place UPDATE**(`Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`) — "이 결정을 지금 누가 잡고 있고 언제 놓아야 하는가"라는 Claim/Lease 상태 자체가 없다. Fencing/Lock 축도 결재 도메인엔 부재(§3.6의 Tenant Guard는 격리이지 Lease 아님).
- 따라서 액션→Claim/Lease 효과 매핑(§46 9종)은 매핑할 대상이 없다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**
- **선행 의존**: §3.3 Assignment(부재)의 하위 개념인 Claim/Lease가 함께 부재. Claim/Lease 엔티티 신설 전에는 효과 매핑 정의 불가.
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Claim·Lease 및 그 효과 매핑은 **Assignment/Claim/Lease 선행 신설 후에만** 착수. `orderhub_claims`는 CS 도메인 — 전용 금지(KEEP_SEPARATE).
- 선행 신설 후 설계 원칙:
  - ★ **무기한 금지** — 모든 Claim/Lease는 `expires_at` 필수. APPROVE→`COMPLETE_CLAIM`+`CLOSE_LEASE`, RETURN→`RELEASE_CLAIM`, CANCEL/WITHDRAW→`REVOKE_CLAIM`+`CLOSE_LEASE`, DEFER→`SUSPEND_LEASE`(재활성 정책 동반).
  - **매핑은 versioned 데이터** — 코드 분기 금지.
  - **Lease 만료 자동 회수** — Lease 만료 시 자동 `RELEASE_CLAIM`으로 좀비 점유 방지(§58 "Claim·Lease Effect 누락" Gap).
- 실 구현 = Assignment/Claim/Lease 선행 신설 후 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

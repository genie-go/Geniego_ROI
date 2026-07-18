# DSAR — Action Precedence (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§48 ACTION_PRECEDENCE — 동시/경합 액션 발생 시 참고 우선순위:

1. Security / System Block
2. Administrative Cancel
3. Valid Withdraw
4. Reject
5. Return
6. Request Changes
7. Approve
8. Defer
9. Acknowledge
10. Abstain Reference

★ **단순 순위 자동 승자 금지** — 우선순위는 **참고(reference)** 일 뿐이다. 실제 승자 결정은 **Lock / Commit Sequence / Expected Version / Policy**를 **먼저** 적용한 뒤에만 하며, 순위표로 자동 낙점하지 않는다.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Action Precedence 개념 = ABSENT.** 동시에 여러 결정 액션이 경합할 때의 우선순위 규칙이 없다. 애초에 §48이 서열화하는 액션 상당수가 부재:
  - Security/System Block·Administrative Cancel·Valid Withdraw·Return·Request Changes·Defer·Acknowledge·Abstain = **승인 도메인 ABSENT**(withdraw=GDPR·cancel=구독결제 `routes.php:979,1198`·defer=메시지 STO 등 타 도메인 산재).
  - 실존은 APPROVE(`AdminGrowth::approvalDecide` `:1289-1344`·`Mapping::approve` `:238-331`·`Alerting::decideAction` `:572-655`·`Catalog::approveQueue` `:2383-2407`·`AgencyPortal::approveAgency` `:365-384`)와 이진 REJECT(`Alerting.php:593`·`AdminGrowth.php:1321`)뿐.
- 경합 자체를 다룰 축도 없다 — 현행은 단일 in-place UPDATE로, 두 액션이 같은 슬롯에 동시 도달하는 것을 조정하는 Lock/Commit Sequence/Expected Version이 결재 도메인에 부재(§50 Conflict·§51 Idempotency도 PARTIAL/ABSENT).

## 3. 판정

- **Verdict: ABSENT**
- **선행 의존**: §3.1 Decision Core(불변 Record + Commit Sequence/Expected Version) 및 다수 액션(REJECT scope·RETURN·CANCEL·WITHDRAW·DEFER·ACKNOWLEDGE·ABSTAIN) 부재 — 서열화 대상 자체가 아직 없음. §50 Action Conflict·§51 Idempotency에도 의존.
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Action Precedence는 **순신규 참고 규칙**이며, 서열화할 액션(§16~§34)과 경합 판정 인프라(§50 Conflict·§51 Idempotency·Optimistic Version)가 선행돼야 의미를 가진다.
- ★ **자동 승자 금지 원칙 고정** — 순위표(§48 1~10)는 **참고**로만 문서화하고, 승자 확정은 반드시 **① Lock/Fencing → ② Expected Version(Optimistic Concurrency) → ③ Policy 평가**를 먼저 통과한 뒤에만. 순위만으로 낙점하면 §58 "단순 순위 자동승자" 위배.
- **Terminal 충돌 우선 처리** — Security/System Block·Administrative Cancel·Valid Withdraw가 상위인 이유는 되돌릴 수 없는 결정을 막기 위함 — 이 상위 3항은 나머지보다 먼저 평가하되, 여전히 Lock/Version 게이트 통과가 전제.
- 실 구현 = 액션들 + Conflict/Idempotency 인프라 선행 후 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

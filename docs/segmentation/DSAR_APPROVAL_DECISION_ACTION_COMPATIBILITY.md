# DSAR — Action Compatibility (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§49 ACTION_COMPATIBILITY — 상호 배타(차단) 조합:

1. `APPROVE` + `REJECT`
2. `APPROVE` + `RETURN`
3. `APPROVE` + `REQUEST_CHANGES`
4. `APPROVE` + `CANCEL`
5. `APPROVE` + `WITHDRAW`
6. `REJECT` + `RETURN`
7. `REJECT` + `REQUEST_CHANGES`
8. `CANCEL` + `WITHDRAW`
9. `RETURN` + `RESUBMIT` (same round)
10. `REQUEST_CHANGES` + `RESUBMIT` (before response)
11. `DEFER` + Terminal (same Slot)
12. `ACKNOWLEDGE` + `APPROVE` (same Record)

핵심 계약: 하나의 결정 슬롯/레코드/라운드에 대해 위 조합은 **동시 성립 불가** — 상호 배타를 정책으로 선언해 모순된 결정(예: 승인이면서 거절)을 원천 차단한다.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Action Compatibility 개념 = ABSENT.** 액션 간 배타 조합을 검사하는 축이 없다. 애초에 §49가 조합하는 액션 대부분이 승인 도메인에 부재:
  - RETURN·REQUEST_CHANGES·CANCEL·WITHDRAW·RESUBMIT·DEFER·ACKNOWLEDGE = **승인 도메인 ABSENT**.
  - 실존은 APPROVE(5+ 도메인 · `AdminGrowth::approvalDecide` `:1289-1344` 등)와 이진 REJECT(`Alerting.php:593`·`AdminGrowth.php:1321`)뿐. `Mapping`(`:238-331`)의 approve↔reject는 이진 파생이라 조합 검사 대상이 아니다.
- 배타를 검사하려면 같은 슬롯에 복수 액션이 레코드로 남아야 하나, 현행은 in-place UPDATE(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`)로 **직전 상태를 덮어써** 이전 액션의 흔적이 없다 — 조합 검사 자체가 성립 불가(§50 Conflict·§52 Snapshot도 부재/PARTIAL).

## 3. 판정

- **Verdict: ABSENT**
- **선행 의존**: §3.1 Decision Core(불변 Record — 복수 액션이 슬롯에 공존해야 배타 검사 가능) 및 다수 액션(REJECT scope·RETURN·CANCEL·WITHDRAW·RESUBMIT·DEFER·ACKNOWLEDGE) 부재. §50 Action Conflict와 짝을 이룸.
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Action Compatibility는 **순신규 배타 규칙 세트**이며, 조합할 액션(§16~§34)과 불변 Record(액션이 덮어쓰이지 않고 누적)가 선행돼야 검사 가능하다.
- **차단은 정책·런타임 가드 양쪽** — §49의 12개 배타 조합을 정책으로 선언하고, 커밋 시점에 같은 Slot/Record/Round의 기존 액션과 대조해 위반 조합을 fail-closed(§58 "APPROVE+REJECT"·"Terminal 중복" High/Critical Gap).
- **in-place UPDATE 이관 필수** — 현행 덮어쓰기(`Alerting.php:594`·`Catalog.php:2383`)는 배타 검사의 전제(이력 보존)를 깨므로, Decision Core 신설 시 불변 누적 레코드로 교정. 기존 UPDATE 경로는 무후퇴로 병존시키되 SoT는 불변 Record.
- **§50 Conflict와 정합** — Compatibility 위반은 `INCOMPATIBLE_ACTIONS`·`MULTIPLE_TERMINAL_ACTIONS` Conflict로 귀결 — 두 문서의 판정을 일치시킨다.
- 실 구현 = 액션들 + Decision Core 선행 후 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

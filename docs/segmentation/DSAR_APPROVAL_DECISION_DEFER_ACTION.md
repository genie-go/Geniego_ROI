# DSAR — Defer Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§33 DEFER_ACTION — 필수 필드/규칙(원문 전사):
- `defer reason`
- `defer until`
- `blocking`(차단 여부)
- Assignment / Claim 유지
- Lease 처리(defer 중 Lease 만료 정책)
- `reactivation policy`
- `maximum defer period`
- `defer count`
- `escalation reference`
- ★ **무기한 Defer 금지**.
- ★ `Defer Until` 이후 **자동 재활성화 또는 Manual Review**.

## 2. 기존 구현 대조

- 승인 도메인 `DEFER`(결정 보류) = **부재** → ABSENT.
- 현행 "defer" hit = **메시지 발송 STO(Send-Time Optimization)** 계열 — 마케팅 발송 시각 최적화이지 승인 결정의 보류가 아님. §GROUND_TRUTH "defer=메시지 STO·결정보류 아님" 확정. 승인 Defer로 재사용 불가(대상·의미 상이).
- `defer until`·`reactivation policy`·`maximum defer period`·`defer count`·`escalation reference` 를 결정 보류로 선언 → **no hits**.
- Assignment/Claim 유지 전제인 Assignment 축 부재(§3.3 ABSENT — `orderhub_claims` `OrderHub.php:93,530`는 CS 클레임 오탐). Lease 처리 대상 Lease 개념도 승인 도메인에 부재.
- 보류 상태를 담을 비종결(non-terminal) Decision 상태 부재 — 승인은 `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`) approved/rejected 종결 이진뿐.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(비종결 Defer 상태·Snapshot) · §3.3 Assignment/Claim/Lease(Defer 중 유지·처리 대상) · Sequential(§3.2, 재활성화 전이). 보류→재활성화 라이프사이클은 이 축들 없이는 성립 불가.
- cover: **0** (결정 보류 액션·defer until·재활성화·escalation 전무. 메시지 STO는 별도 도메인).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_defer` — 마케팅 발송 STO defer와 **명명·도메인 격리**(중복 엔티티 금지). 승인 결정의 일시 보류(비종결) 상태.
- Mandatory Control(★무기한 금지): `defer until` + `maximum defer period` + `defer count` 상한 필수. `Defer Until` 도과 시 **자동 재활성화 또는 Manual Review**로 강제 — 무기한 보류는 승인 SLA를 무력화하는 우회.
- Assignment/Claim 유지 + Lease 처리 = 선행 §3.3(Assignment/Claim/Lease Foundation) 신설 종속. 무기한 Claim/Lease 금지(§46) 원칙과 정합 — Defer가 Lease를 무한 연장하면 안 됨.
- Sequential Effect Mapping(§47) `STEP_DEFERRED` 이벤트로만 전이 — Cursor 직접변경 금지. §49 Compatibility상 `DEFER + Terminal same Slot` 차단(보류와 종결 액션 동시 불가).
- `escalation reference` — Defer 반복/도과 시 상위 검토로 에스컬레이션. Audit/Snapshot 필수.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

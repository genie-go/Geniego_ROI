# DSAR — Authorization Twin Reconciliation (Part 3-22 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_TWIN_RECONCILIATION은 §22 Drift가 확정한 괴리를 **정합(reconcile)**시키는 계약이다. 트윈과 프로덕션이 어긋났을 때, 어느 쪽이 정본(source of truth)인지 판정하고 차이를 봉합한다. Reconciliation은 5개 상태(State)를 비교 축으로 삼는다:

- **Production State** — 현재 프로덕션 인가 substrate의 실결정 상태.
- **Twin State** — 트윈이 표상하는 예측/그림자 상태.
- **Snapshot State** — 특정 시점 봉인된 트윈 스냅샷.
- **Prediction State** — 예측 governance가 산출한 미래 기대 상태.
- **Historical State** — 감사 이력이 증언하는 과거 확정 상태.

Reconciliation은 (state_pair, discrepancy, resolution_direction, authority, sealed_ref)를 기록하며, 정본 판정은 항상 프로덕션 substrate 또는 봉인된 감사 이력을 우위에 둔다(트윈은 그림자이지 정본이 아니다).

## 2. Substrate 매핑

| SPEC 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| Historical State 원천 | `SecurityAudit.php:27` 확정 이벤트 이력 | 존재(원천만) |
| 정합 결과 봉인·정본 우위 기준 | `SecurityAudit.php:56-67` 해시체인 | 존재(봉인 substrate) |
| Production State 실결정 스냅 | — | **ABSENT (grep 0)** |
| Twin/Snapshot/Prediction State | — | **ABSENT (grep 0)** |
| 5-state 비교기·resolution_direction 판정기 | — | **ABSENT (grep 0)** |

## 3. 설계 계약

- **정본(Authority)**: 정합 방향은 프로덕션 substrate 또는 `SecurityAudit.php:27` 감사 이력을 정본으로 삼는다. 트윈은 절대 정본이 될 수 없다(그림자 원칙).
- **비교(Compare)**: 5-state를 쌍(pair)으로 대조해 discrepancy를 추출. Twin↔Production은 실결정 괴리, Snapshot↔Historical은 시점 무결성, Prediction↔Production은 예측 오차.
- **봉합(Resolve)**: resolution_direction에 따라 트윈을 프로덕션에 재정렬하거나, 프로덕션 이상을 §23 Revalidation으로 환류. 프로덕션 자동 변경은 승인 정책 존중(자동 집행 금지).
- **봉인(Seal)**: 정합 결과를 `SecurityAudit.php:56-67` 해시체인에 append하여 tamper-evident.
- **선행 의존**: Twin/Snapshot State 부재 시 비교 대상 자체가 미완이므로 §22·§23 완결이 선행 조건.

## 4. KEEP_SEPARATE

- **정산 reconciliation**(`PgSettlement.php:294-295`·`Connectors.php:896-902`·`KrChannel.php:415-419`) — PG 정산 금액·채널 주문·한국 채널 데이터 정합. 도메인은 **금전/거래 대사**이며 인가 상태 정합과 무관. 이름이 "reconciliation"으로 동일하나 흡수하면 도메인 오염. 별개 유지.
- authz twin reconciliation은 인가 결정 정합, 정산 reconciliation은 금액 대사 — 대상·정본·복구 규칙 전부 상이.

## 5. 판정

**ABSENT (Twin/Snapshot 부재라 비교 대상 미완)** · BLOCKED_PREREQUISITE. 5-state 중 Historical만 `SecurityAudit.php:27`로 원천 존재, Production/Twin/Snapshot/Prediction 전부 부재하여 비교 자체가 성립 불가. §22 Drift·§23 Revalidation 선행 완결이 절대 조건. 순신설 · 코드 변경 0 · NOT_CERTIFIED.

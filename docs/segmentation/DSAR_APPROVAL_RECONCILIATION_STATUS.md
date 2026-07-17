# DSAR — Approval Reconciliation Status (§44·상태 22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §44**
> ✅ **REQ 집계 일치**: 상태 **22** — 원문 실측과 동일.

## 0. 현행 실측 (file:line)

| 대상 | 현행 | 분류 |
|---|---|---|
| **Reconciliation Status** 열거형 | **부재**(grep 0) — 대조 결과를 담을 상태 축 자체가 없음 | **NOT_APPLICABLE(부재→신설)** |
| 현행 승인 상태 어휘 — `action_request` | `approved\|rejected\|executed\|failed\|approved_manual`(`Handlers/Alerting.php:628,644`) — **요청 상태**이지 **대조 결과 아님** | **KEEP_SEPARATE_WITH_REASON**(축 상이) |
| 현행 승인 상태 어휘 — `mapping_change_request` | `pending\|approved\|applied`(`Handlers/Mapping.php:287,309,327`) | **KEEP_SEPARATE_WITH_REASON**(축 상이) |
| **불일치(Mismatch)를 표현하는 값** | **부재** — 위 두 어휘 어디에도 "원천 간 불일치"를 담는 값이 없음 | **NOT_APPLICABLE** |
| 대조 **미수행**과 **일치**를 구분하는 값 | **부재** — 현행은 대조 자체가 없으므로 두 상태가 **미분화** | **NOT_APPLICABLE** |

> **★축 혼합 금지**: Request Status(§27·25종) · Case Status(§27·22종) · **Reconciliation Status(§44·22종)**은 **개수가 비슷하나 서로 다른 것을 세는 독립 축**이다(REQ §14 인용 규칙). 개수가 같다는 이유로 재사용하거나 합계를 섞지 말 것 — 289차 ② "351 사건"(근거 없는 숫자가 복제돼 정본이 된 사고)의 재현 경로다.

## 1. Reconciliation Status = **대조 사건의 결과**이지 요청의 상태가 아니다

Request Status가 **"이 요청은 지금 어디 있는가"**라면, Reconciliation Status는 **"원천들이 서로 맞는가"**다. 한 요청이 `approved`이면서 동시에 대조 결과는 `mismatch`일 수 있다 — **두 축은 동시에 성립**하므로 한 컬럼에 뭉치면 표현 불가.

### 1.1 상태 열거형 — **원문 전사 22** (§44)

| # | 상태(원문) | 대응 비교 대상(§43) | 현행 |
|---|---|---|---|
| 1 | MATCH | (전체 일치) | 부재 |
| 2 | SOURCE_REQUEST_MISMATCH | #1 Source System Request | 부재 |
| 3 | UI_BACKEND_STATUS_MISMATCH | #2 UI vs Backend | 🔴 **부재하나 조건은 이미 성립** — `Alerting.php:562` vs `:589-591` 실측(§0 드리프트 (a)) |
| 4 | API_CASE_STATUS_MISMATCH | #3 API vs Case | 부재 |
| 5 | REQUEST_RESOURCE_VERSION_MISMATCH | #4 | 부재 |
| 6 | POLICY_VERSION_MISMATCH | #5 | 부재 |
| 7 | PARTICIPANT_ROLE_MISMATCH | #6 | 부재 |
| 8 | ACTOR_SCOPE_MISMATCH | #7 | 부재 |
| 9 | DECISION_AMOUNT_MISMATCH | #8 | 부재 |
| 10 | DECISION_CURRENCY_MISMATCH | #9 | 부재 |
| 11 | DECISION_RESOURCE_VERSION_MISMATCH | #10 | 부재 |
| 12 | EXECUTED_ACTION_MISMATCH | #11 | 부재 |
| 13 | EXECUTED_SCOPE_MISMATCH | #12 | 부재 |
| 14 | CONSUMPTION_EXECUTION_MISMATCH | #13 | 부재 |
| 15 | ERP_APPROVAL_MISMATCH | #14 | 부재 |
| 16 | PROVIDER_APPROVAL_MISMATCH | #15 | 부재 |
| 17 | NOTIFICATION_STATE_MISMATCH | #16 | 부재 |
| 18 | AUDIT_DECISION_MISMATCH | #17 | 부재 |
| 19 | CANCELLED_REQUEST_EXECUTED | #18 | 부재 |
| 20 | REVOKED_APPROVAL_STILL_USABLE | #19 | 부재 |
| 21 | MANUAL_REVIEW | (수동 검토 회부) | 부재 |
| 22 | BLOCKED | (대조 차단) | 부재 |

🔴 **상태 22/22 전부 부재(grep 0)** — 커버리지 0/22. 열거형 자체가 없다.

**★원문 실측이 확인해 준 것**: 22종 중 **20종(#2~#20 + #1)이 §43 비교 대상 19종과 1:1 대응**하고, 나머지 2종(#21 MANUAL_REVIEW · #22 BLOCKED)은 **대조 사건의 처리 경로**다. 즉 §44는 §43의 **결과 축**이지 독립 열거가 아니다 — 이 대응 관계는 원문 수령 전에는 **주장 불가**했던 것이며, 이제 원문으로 확정된다.

**★"미수행" 상태값의 부재 — 원문 실측 결과**: 원문 22종에 **Unknown / NOT_RECONCILED에 해당하는 값이 없다**. 아래 §2 "Fail-closed 기본값"은 **원문 열거에 명시된 요구가 아니라 저장소 원칙에서 도출한 설계 판단**임을 명시한다(원문에 없는 것을 원문 요구로 승격 금지). 구현 시 미수행을 어떻게 표현할지는 **별도 스펙 확인 대상**이다.

영속된 요구(§0 Q21·§61·§62 항목 40)에서 확정 가능한 구조 요구:
- **미수행 ≠ 일치**(Unknown ≠ Match) — 대조한 적 없음을 "일치"로 표시하면 **가짜녹색**이다(288차 systemic 교훈 · Part 3-2 "Unknown ≠ Eligible" 선례와 동형).
- 상태는 **대조 시각과 함께** 기록된다 — 언제 기준의 일치인지 없으면 신선도 판정 불가.
- Mismatch는 **해소(resolve)돼도 삭제되지 않는다**(§4.9 Append-only) — 불일치가 있었다는 사실이 §62 항목 40의 분자다.

## 2. 규칙

- **Request Status(§27)를 Reconciliation Status로 전용 금지** — 축이 다르다. 현행 어휘(`approved`/`applied`/`executed`)에 대조 결과를 끼워 넣으면 **두 축이 영구히 뒤엉킨다**.
- **Fail-closed 기본값**: 대조 결과가 없는 건은 **Unknown**이며, Unknown을 통과로 취급하지 않는다.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 상태 열거형이 확정되기 전까지 UI에 대조 배지를 노출하지 않는다.
- 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.

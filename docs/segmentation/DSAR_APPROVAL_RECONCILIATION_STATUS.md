# DSAR — Approval Reconciliation Status (§44·상태 22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

**상태 22종** — 스펙 §44 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `22`만 고정 · 원문 나열 부재).
→ 분류 **UNVERIFIED**. 상태명을 **지어내지 않는다**(REQ §15 역산 금지 · 자기가 쓴 것을 요구로 삼는 사고). 스펙 원문 §44 수령 시 본 절을 채운다. **현 시점 상태 축 커버리지 주장 불가**.

영속된 요구(§0 Q21·§61·§62 항목 40)에서 확정 가능한 구조 요구:
- **미수행 ≠ 일치**(Unknown ≠ Match) — 대조한 적 없음을 "일치"로 표시하면 **가짜녹색**이다(288차 systemic 교훈 · Part 3-2 "Unknown ≠ Eligible" 선례와 동형).
- 상태는 **대조 시각과 함께** 기록된다 — 언제 기준의 일치인지 없으면 신선도 판정 불가.
- Mismatch는 **해소(resolve)돼도 삭제되지 않는다**(§4.9 Append-only) — 불일치가 있었다는 사실이 §62 항목 40의 분자다.

## 2. 규칙

- **Request Status(§27)를 Reconciliation Status로 전용 금지** — 축이 다르다. 현행 어휘(`approved`/`applied`/`executed`)에 대조 결과를 끼워 넣으면 **두 축이 영구히 뒤엉킨다**.
- **Fail-closed 기본값**: 대조 결과가 없는 건은 **Unknown**이며, Unknown을 통과로 취급하지 않는다.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 상태 열거형이 확정되기 전까지 UI에 대조 배지를 노출하지 않는다.
- 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.

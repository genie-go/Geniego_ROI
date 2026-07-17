# DSAR — Approval Decision Effect (§23·12종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §23 — 원문 그대로 전사.
> **분모 정합**: REQ 집계 12 ↔ **원문 실측 12 — 일치**.

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| Decision **Effect** 개념 | **부재**(`decision_effect` grep 0) — 결정의 **효과**가 별도 축으로 존재하지 않음 | **NOT_APPLICABLE(부재→신설)** |
| 효과 = 코드에 하드와이어 | `Mapping::approve:287` — 정족수 충족 시 **즉시 `approved`**(효과 선택 불가) · `AdminGrowth::approvalDecide:1335-1341` — `ref_type` 별 **후속 상태 반영 분기**(content→campaign approved · live_mode→`setSetting('mode','live')`) | **MIGRATION_REQUIRED** |
| 효과 ↔ 집행 분리 | `Catalog::approveQueue:2352-2359` — 승인 UPDATE **직후 같은 요청에서** `processWritebackQueue` **즉시 실행** = 결정과 집행이 **원자적으로 융합** | **MIGRATION_REQUIRED** |
| 🔴 효과 없는 집행 | `Alerting::executeAction:601-660` — `:612` status **SELECT 후 미판독** → pending/rejected 도 `AdAdapters::pause`(`:631`)/`updateBudget`(`:634`) 도달 | **승인 우회** · `INSERT INTO action_request` **grep 0 → 생산자 전무 → VACUOUS** |
| Conditional / Obligation 동반 효과 | **부재**(grep 0) | **NOT_APPLICABLE** |

**핵심**: 현행에 Effect 축이 없다 = **"승인되면 무슨 일이 일어나는가"가 데이터가 아니라 코드 분기**다.
따라서 효과를 **정책으로 바꿀 수 없고**, 승인 이력만 봐서는 **무엇이 집행됐는지 알 수 없다**.

## 1. Decision Effect 12종

스펙 §23 **원문 전사**(실측 12 · REQ 집계 12 와 **일치**):

| # | Effect | # | Effect |
|---|---|---|---|
| 1 | `APPROVED` | 7 | `BLOCKED` |
| 2 | `REJECTED` | 8 | `CANCELLED` |
| 3 | `CONDITIONALLY_APPROVED` | 9 | `EXPIRED` |
| 4 | `CHANGES_REQUIRED` | 10 | `SUPERSEDED` |
| 5 | `RETURNED` | 11 | `REVERSED` |
| 6 | `NO_DECISION` | 12 | `ERROR` |

> 5-2 의 `DSAR_AUTHORIZATION_DECISION_EFFECT.md`(9종)는 **다른 도메인의 다른 열거형**이다 — 원문 대조 결과 **항목명·개수 모두 상이**하며,
> 본 문서로 **전용하지 않는다**(Authorization Effect ≠ Approval Effect · §4.7 Deny ≠ Rejection). 전사 후에도 이 분리는 유지된다.

**현행 커버리지 = 12 중 2종**(원문 수령으로 매핑 확정):
- **#1 `APPROVED`** ← `Mapping::approve:287` 정족수 충족 시 즉시 `approved` · `AdminGrowth:1321`.
- **#2 `REJECTED`** ← `Alerting::decideAction:593` · `AdminGrowth:1321`.
- **#3~12 = 10종 부재.** 효과가 **데이터가 아니라 코드 분기**(§0 핵심)이므로 Effect 축 자체가 없다.
- 특히 **#6 `NO_DECISION` · #7 `BLOCKED` · #12 `ERROR`** 부재 = 결정 실패/미결을 표현할 값이 없어 **`rejected` 로 뭉개진다**(§4.8 위배 · WITHDRAWAL 문서 §0 과 동형).

## 2. 규칙

- **Effect 는 데이터**여야 한다 — `ref_type` 별 하드코딩 분기(`AdminGrowth.php:1335-1341`)는 Effect 축의 **선례가 아니라 부채**.
- **결정 ≠ 집행 분리** — `Catalog::approveQueue:2352-2359` 의 승인·실행 융합은 §61 "Execution Binding 연결"·"Consumption 기록" 게이트를 만족 못함(§40/§41 = 후속 문서).
- **Effect 를 실 평가 없이 성공으로 기록 금지**(287/288차 fake-looks-real 클래스) — 특히 `required_approvals=2` 하드코딩(`Alerting.php:562`) 같은 **표시≠실제** 재발 금지.
- `Alerting::executeAction` 은 **VACUOUS**(생산자 부재) — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 수정은 생산자 결정 후 별도 세션.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

# DSAR — Approval Decision Effect (§23·12종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

스펙 §23 의 **12종 원문 항목명은 저장소 미영속**(REQ 는 개수 `12` 만 고정 · 나열 부재) → **UNVERIFIED**.
**항목명 창작 금지**(REQ §15 역산). 5-2 의 `DSAR_AUTHORIZATION_DECISION_EFFECT.md`(9종)는 **다른 도메인의 다른 열거형**이므로
**그 이름을 본 문서로 전용하지 않는다**(Authorization Effect ≠ Approval Effect · §4.7 Deny ≠ Rejection).

확정 사실만:
- 현행 실측 효과 = **암묵 1종**(승인 → 즉시 상태전이 + 일부 경로는 즉시 집행). Conditional·유예·부분승인 **전무**.
- **12 대비 커버리지 주장 금지**(분모 항목명 부재).

## 2. 규칙

- **Effect 는 데이터**여야 한다 — `ref_type` 별 하드코딩 분기(`AdminGrowth.php:1335-1341`)는 Effect 축의 **선례가 아니라 부채**.
- **결정 ≠ 집행 분리** — `Catalog::approveQueue:2352-2359` 의 승인·실행 융합은 §61 "Execution Binding 연결"·"Consumption 기록" 게이트를 만족 못함(§40/§41 = 후속 문서).
- **Effect 를 실 평가 없이 성공으로 기록 금지**(287/288차 fake-looks-real 클래스) — 특히 `required_approvals=2` 하드코딩(`Alerting.php:562`) 같은 **표시≠실제** 재발 금지.
- `Alerting::executeAction` 은 **VACUOUS**(생산자 부재) — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 수정은 생산자 결정 후 별도 세션.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

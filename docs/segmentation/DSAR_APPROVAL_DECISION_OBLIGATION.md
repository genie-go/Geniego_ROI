# DSAR — Approval Decision Obligation (§26·16종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §26 — 원문 그대로 전사.
> **분모 정합**: REQ 집계 16 ↔ **원문 실측 16 — 일치**.

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| **Approval Obligation** | **전면 부재**(`approval_obligation` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 승인 후 **이행 의무** 추적 | **부재** — 승인은 상태전이로 **종결**되고 이후 의무가 남지 않음(`Mapping.php:287-289` · `AdminGrowth.php:1330`) | **NOT_APPLICABLE** |
| 의무 이행 여부 **검증** | **부재** — 미이행 탐지·리마인더·만료 없음 | **NOT_APPLICABLE** |
| 타 도메인 Obligation 선례 | `DSAR_AUTHORIZATION_OBLIGATION.md`(5-2 · **설계 명세** · 코드 아님) · `CANONICAL_PRIVACY_SCHEMA.md` | **KEEP_SEPARATE_WITH_REASON**(Authorization Obligation ≠ Approval Obligation) |
| 의무 **집행 지점** 후보 | `AdAdapters::pause`/`updateBudget`(`Alerting.php:631,634`) · `Catalog::processWritebackQueue`(`Catalog.php:2358`) — 실 액추에이터 존재 | **재료**(의무 바인딩 대상) |
| 🔴 의무 없는 즉시 집행 | `Catalog::approveQueue:2352-2359` — 승인 UPDATE 직후 **같은 요청에서 즉시 집행** = 의무를 걸 **틈이 없음**(결정·집행 원자 융합) | **MIGRATION_REQUIRED** |

**핵심**: §62 완료보고 **20 Obligation 수** 현행 집계 = **0**. 승인이 **"조건 없이 끝나는 사건"** 으로 모델링돼 있어 의무 개념이 들어갈 자리가 없다.

## 1. Obligation 16종

`APPROVAL_DECISION_OBLIGATION` — 스펙 §26 **원문 전사**(실측 16 · REQ 집계 16 와 **일치**):

원문 순서 그대로(좌 1~8 · 우 9~16):

| # | Obligation | # | Obligation |
|---|---|---|---|
| 1 | `LOG_DECISION` | 9 | `LIMIT_SCOPE` |
| 2 | `LOG_SENSITIVE_DECISION` | 10 | `REQUIRE_DUAL_CONTROL_REFERENCE` |
| 3 | `NOTIFY_REQUESTER` | 11 | `REQUIRE_POST_ACTION_REVIEW` |
| 4 | `NOTIFY_FINANCE` | 12 | `REQUIRE_RECONCILIATION` |
| 5 | `NOTIFY_LEGAL` | 13 | `REQUIRE_AUDIT_SAMPLE` |
| 6 | `NOTIFY_CUSTOMER` | 14 | `REQUIRE_EXECUTION_EVIDENCE` |
| 7 | `MASK_DATA` | 15 | `REQUIRE_EXPIRY` |
| 8 | `LIMIT_AMOUNT` | 16 | `CUSTOM` |

**현행 커버리지 = 16 중 0종**(§0 실측 "Obligation 전면 부재" 와 정합 · §62 완료보고 20 Obligation 수 = 0 유지).

> 원문 대조 결과 **5-2 Authorization Obligation 과 항목명이 상이**함이 확인됐다 — 인가 의무(마스킹·내보내기 제한 등)와
> 승인 의무(승인 후 이행 조건)는 **다른 축**이라는 §4.7 판정은 전사 후에도 **유지**된다. 명칭 전용 금지.

확정 가능한 구조적 요구(§61 "Conditional Condition·Obligation 지원" 에서 직접 도출):
- Obligation 은 **Decision 행에 종속**(§22) · Condition(§25)과 **쌍** — Decision 부재 시 선행 구현 불가.
- Obligation 은 **이행 상태**(미이행/이행/만료)를 갖는다 — 상태 없는 의무는 검증 불가.
- **미이행 의무 = 집행 차단 또는 사후 회수** 근거가 된다(fail-closed).

## 2. 규칙

- **§26 원문 16종이 정본** — 전사 완료(위 §1). 항목명 변경·추가·삭제 금지.
- **Conditional Approval 은 Obligation 동반 필수**(§25 ↔ §26) — 의무 없는 조건부 승인은 **무조건 승인과 동일**(가짜 구분).
- **결정·집행 분리 선행** — `Catalog::approveQueue:2352-2359` 의 원자 융합을 풀지 않으면 의무를 **삽입할 지점이 없다**. Execution Binding(§40)·Consumption(§41) = 후속 문서 소관.
- **의무 이행을 실 검증 없이 "이행" 으로 기록 금지**(287/288차 fake-looks-real 클래스 · `Alerting.php:562` `required_approvals=2` 하드코딩과 동형 재발 금지).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Obligation 테이블만 만들고 생산자·검증자가 없으면 `action_request`(생산자 grep 0 = **VACUOUS**)의 재판이다.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

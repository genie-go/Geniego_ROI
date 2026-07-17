# DSAR — Approval Decision Reason (§24·Reason Code 28 · 필드 10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §24 — 원문 그대로 전사.
> **분모 정합**: Reason Code — REQ 28 ↔ **원문 실측 28 일치**.
> 🔴 **분모 불일치**: 필드 — **REQ 집계 9 ↔ 원문 실측 10 — 원문이 정본.** REQ §7 의 `9` 는 정정 대상.

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| **Reason 저장** | **전면 부재**(`decision_reason`·`rejection_reason`·`reject_reason` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| Reason Code 열거형 | **부재**(grep 0) | **NOT_APPLICABLE** |
| 🔴 **Rejection Reason 강제**(§61) | **불만족** — `Alerting::decideAction:593` 은 **reason 없이 `rejected` 확정** · `AdminGrowth::approvalDecide:1330` 은 `status/decided_by/decided_at` 만 UPDATE(**reason 컬럼 없음**) | **MIGRATION_REQUIRED** |
| 거부 경로 자체 부재 | `Mapping::approve:238-294`(approve 전용) · `Catalog::approveQueue:2341-2364`(approve 전용) → **거부 사유 이전에 거부가 없음** | **MIGRATION_REQUIRED** |
| Reason 유사물(유일) | `menu_audit_log.reason TEXT` `Handlers/AdminMenu.php:123-131` — **자유문자열**(코드 아님)·승인 도메인 아님 | **CANONICAL 참조**(구조만 · 코드화 필요) |
| 거부 **메시지**(≠Reason) | `Mapping.php:248,263,269,280` — `"self-approval is not allowed"` 등 **HTTP detail 문자열** = **응답용·미저장** | **KEEP_SEPARATE_WITH_REASON**(Authorization Deny ≠ Approval Rejection · §4.7) |

**핵심**: 현행은 **거부의 이유를 묻지도 저장하지도 않는다**. §0 Q20("결정 근거·Evidence 재현 가능한가") = **불가**.

## 1. Reason Code 28 · 필드 10

`APPROVAL_DECISION_REASON`

### 1-1. Reason Code — 원문 전사 (실측 28 · REQ 28 **일치**)

원문 순서 그대로(좌 1~14 · 우 15~28):

| # | Reason Code | # | Reason Code |
|---|---|---|---|
| 1 | `BUSINESS_REQUIREMENT_MET` | 15 | `FUNDING_UNCONFIRMED` |
| 2 | `FINANCIAL_REVIEW_PASSED` | 16 | `CONTRACT_INVALID` |
| 3 | `LEGAL_REVIEW_PASSED` | 17 | `WRONG_LEGAL_ENTITY` |
| 4 | `COMPLIANCE_REVIEW_PASSED` | 18 | `WRONG_TENANT` |
| 5 | `RISK_ACCEPTABLE` | 19 | `WRONG_ENVIRONMENT` |
| 6 | `EVIDENCE_SUFFICIENT` | 20 | `RISK_TOO_HIGH` |
| 7 | `BUDGET_AVAILABLE` | 21 | `AMOUNT_EXCEEDS_LIMIT` |
| 8 | `FUNDING_CONFIRMED` | 22 | `POLICY_VIOLATION` |
| 9 | `CONTRACT_VALID` | 23 | `CONFLICT_OF_INTEREST_REFERENCE` |
| 10 | `RESOURCE_SCOPE_VALID` | 24 | `RESOURCE_CHANGED` |
| 11 | `AMOUNT_WITHIN_LIMIT` | 25 | `VERSION_CHANGED` |
| 12 | `DUPLICATE_REQUEST` | 26 | `REQUEST_INCOMPLETE` |
| 13 | `INSUFFICIENT_EVIDENCE` | 27 | `MANUAL_REVIEW_REQUIRED` |
| 14 | `BUDGET_INSUFFICIENT` | 28 | `OTHER` |

> **§24 Reason Code 구조 관찰**(원문에서 직접 도출 · 창작 아님): #1~#11 = **승인 사유**, #13~#27 = **거부/보류 사유**, #12 `DUPLICATE_REQUEST` = **Idempotency(§35) 연동 축**, #28 `OTHER` = 미분류.
> 특히 **#24 `RESOURCE_CHANGED` · #25 `VERSION_CHANGED`** 는 §31 Critical Field 변경 정책의 **Reason 측 대응 축**이다.

### 1-2. 필수 필드 — 원문 전사 (실측 10)

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_decision_reason_id` | 6 | policy reference |
| 2 | `approval_decision_id` | 7 | evidence reference |
| 3 | `reason_code` | 8 | customer visible 여부 |
| 4 | reason category | 9 | internal only 여부 |
| 5 | reason detail reference | 10 | `status` |

> 스펙 §24 원문 말미: **"민감한 내부 Risk Signal 이나 개인정보를 고객 노출 Reason 에 포함하지 마라."**
> → 본 문서 §2 규칙(내부/고객 분리)은 **창작이 아니라 원문 요구**임이 전사로 확인됨. **#8 customer visible · #9 internal only** 가 그 필드 축이다.

> 🔴 **필드 원문 실측 10 ↔ REQ 집계 9 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

확정 사실:
- 현행 Reason = **0종**(코드·자유문자열 **모두 미저장**). 28 대비 **전무** · 필드 10 중 **0**.
- **Reason 은 Decision 행의 종속 엔티티**(§22 Decision 과 1:N) — Decision 이 부재(Append-only 미구현)하므로
  **Reason 만 선행 구현 불가**. 순서: Decision 행 → Reason.

## 2. 규칙 — 민감정보 노출 금지가 핵심

- **Rejection 은 Reason 필수**(§61 강제) — reason 없는 `rejected` UPDATE 금지(현행 `Alerting.php:593`·`AdminGrowth.php:1330` 대상).
- 🔴 **내부 Risk Signal·PII 를 고객 노출 금지** — Reason 은 **내부 저장분**과 **고객 표시분**을 **분리**한다.
  - 내부 전용: Risk Score·이상탐지 신호·내부 정책 위반 상세·타 테넌트 비교치 → **응답 본문에 실지 말 것**.
  - 고객 표시: **Reason Code + 중립 문구**. 원문 상세 유출 금지.
  - 근거: 데이터 헌법(테넌트 격리 절대) · `ChannelCreds` 마스킹 선례 · §50 "Evidence 저장 금지 7항".
- **Reason Code 는 화이트리스트**(자유문자열 금지) — `AdminGrowth.php:1321` `in_array` 검증 패턴 재사용(Golden Rule = Extend).
- **HTTP detail 문자열을 Reason 으로 승격 금지** — 그것은 Authorization **Deny** 메시지이지 Approval **Rejection** 사유가 아니다(§4.7).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

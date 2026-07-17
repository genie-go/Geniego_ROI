# DSAR — Approval Withdrawal (§36·필드 13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §36 — 원문 그대로 전사.
> 🔴 **분모 불일치**: **REQ 집계 12 ↔ 원문 실측 13 — 원문이 정본.** REQ §7 의 `12` 는 정정 대상.

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q18 "요청 철회를 어떻게 처리하는가") | 현행 | 분류 |
|---|---|---|
| 승인 도메인 **Withdrawal** 엔티티·컬럼·상태 | **부재** — `withdraw` grep 결과는 전부 **GDPR 동의 철회**(`Handlers/GdprConsent.php:193,202` · `routes.php:516`)로 **승인 도메인 아님** | **NOT_APPLICABLE(부재→신설)** |
| `action_request` 종료 상태 | `approved\|rejected\|executed\|failed\|approved_manual`(`Alerting.php:628,644`) — **철회 상태 없음** | **MIGRATION_REQUIRED** |
| `mapping_change_request` 종료 상태 | `pending\|approved\|applied`(`Mapping.php:309,327`) — **철회 상태 없음** | **MIGRATION_REQUIRED** |
| **요청자 본인**이 결정 전에 요청을 거두는 경로 | **부재**(grep 0). 현행에서 pending 요청을 없애는 유일한 수단은 **타인의 `reject`** = 철회를 거부로 위장 | **NOT_APPLICABLE** |
| APPROVAL_WITHDRAWAL | grep 0 | **NOT_APPLICABLE(부재→신설)** |

> **§4.8 위배 실측**: 현행은 Withdrawal·Cancellation·Rejection·Expiration·Supersession **5종을 전부 `rejected` 한 값에 뭉갠다**. 사후에 "요청자가 스스로 거뒀다"와 "승인자가 반려했다"를 구분할 수 없다 — 반려율 지표가 오염된다.

## 1. Withdrawal = **요청자가 · 결정 전에 · 스스로** 거두는 행위

세 조건이 모두 성립할 때만 Withdrawal이다. 하나라도 어긋나면 다른 개념이다.

| 축 | Withdrawal | 인접 개념 |
|---|---|---|
| 주체 | **요청자(Requester) 본인** | Cancellation(§37) = 요청자 외 권한자·시스템 |
| 시점 | **Decision 확정 전**(pending) | Rejection = 승인자의 Decision **결과** |
| 성격 | 요청의 **회수** — Decision 미발생 | Supersession(§39) = 새 Version으로 **대체** |

### 1-1. 스펙 §36 필수 필드 — 원문 전사 (실측 13)

`APPROVAL_WITHDRAWAL`

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_withdrawal_id` | 8 | affected items |
| 2 | `approval_request_id` | 9 | completed decisions |
| 3 | `approval_case_id` | 10 | reversible 여부 |
| 4 | `requested_by` | 11 | downstream execution state |
| 5 | reason | 12 | `status` |
| 6 | `requested_at` | 13 | `evidence` |
| 7 | `effective_at` | | |

> 스펙 §36 원문 말미: **"이미 실행된 Financial Action 은 단순 Withdrawal 로 되돌리지 마라. 필요하면 별도의 Reversal 또는 Correction 절차를 요구한다."**
> → 본 문서 §2 첫 규칙은 **창작이 아니라 원문 요구**임이 전사로 확인됨. 원문 **#10 reversible 여부 · #11 downstream execution state** 가 그 판정 필드 축이다.

> 🔴 **원문 실측 13 ↔ REQ 집계 12 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**현행 커버리지 = 13 중 0**(§0 실측 `APPROVAL_WITHDRAWAL` grep 0 · Withdrawal 개념 자체 부재).
원문 대조로 확정: **#9 completed decisions · #11 downstream execution state** 는 "철회 시점에 이미 내려진 결정·집행 상태를 남기라"는 요구인데,
현행은 §0 판정대로 **5종을 `rejected` 하나에 뭉개므로** 이 축을 담을 자리가 없다.

영속된 요구(§0 Q18·§4.8·§4.9·§61)에서 도출되는 구조 요구(전사 후에도 유지):
- Withdrawal은 **Append-only 사건 레코드**다(§4.9) — 원 Request 행을 지우거나 `rejected`로 덮어쓰지 않는다.
- Withdrawal은 **Tenant·Workspace 스코프**를 갖는다(§61 Tenant 기록).
- Withdrawal 사유는 **Decision Reason(§24)이 아니다** — Decision이 없으므로 Reason 축을 재사용하면 §4.3(필요성≠결과) 위배.

## 2. 규칙

- 🔴 **이미 실행된 Financial Action은 Withdrawal로 되돌리지 않는다.** Withdrawal은 **Decision 전** 개념이므로, 실행이 끝난 건에 적용하면 **원장은 그대로인데 승인만 사라지는** 상태가 된다. 실행 후 되돌림은 **Reversal/Correction 절차**(별도 요구 — 현행 **부재**, `Alerting::executeAction` `:601-660`에 역분개 경로 grep 0)로 처리한다.
- **Withdrawal ≠ Rejection** — 두 개념을 한 상태값에 합치지 않는다(§4.8). 현행 `rejected` 뭉개기는 **MIGRATION_REQUIRED**.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Withdrawal 테이블이 생기기 전까지 UI에 "철회" 버튼을 노출하지 않는다(가짜녹색).
- 실 구현 = **별도 승인 세션**. 본 문서는 **코드변경 0**.

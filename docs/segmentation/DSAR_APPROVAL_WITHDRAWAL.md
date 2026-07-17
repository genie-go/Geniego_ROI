# DSAR — Approval Withdrawal (§36·필드 12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

**필드 12** — 스펙 §36 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `12`만 고정 · 원문 나열 부재).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 스펙 원문 §36 수령 시 본 절을 채운다. **현 시점 필드 축 커버리지 주장 불가**.

영속된 요구(§0 Q18·§4.8·§4.9·§61)에서 **직접 도출 가능한 구조 요구만** 확정한다:
- Withdrawal은 **Append-only 사건 레코드**다(§4.9) — 원 Request 행을 지우거나 `rejected`로 덮어쓰지 않는다.
- Withdrawal은 **Tenant·Workspace 스코프**를 갖는다(§61 Tenant 기록).
- Withdrawal 사유는 **Decision Reason(§24)이 아니다** — Decision이 없으므로 Reason 축을 재사용하면 §4.3(필요성≠결과) 위배.

## 2. 규칙

- 🔴 **이미 실행된 Financial Action은 Withdrawal로 되돌리지 않는다.** Withdrawal은 **Decision 전** 개념이므로, 실행이 끝난 건에 적용하면 **원장은 그대로인데 승인만 사라지는** 상태가 된다. 실행 후 되돌림은 **Reversal/Correction 절차**(별도 요구 — 현행 **부재**, `Alerting::executeAction` `:601-660`에 역분개 경로 grep 0)로 처리한다.
- **Withdrawal ≠ Rejection** — 두 개념을 한 상태값에 합치지 않는다(§4.8). 현행 `rejected` 뭉개기는 **MIGRATION_REQUIRED**.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Withdrawal 테이블이 생기기 전까지 UI에 "철회" 버튼을 노출하지 않는다(가짜녹색).
- 실 구현 = **별도 승인 세션**. 본 문서는 **코드변경 0**.

# DSAR — Approval Decision Reason (§24·Reason Code 28 · 필드 9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

## 1. Reason Code 28 · 필드 9

스펙 §24 의 **원문 항목명 저장소 미영속**(REQ 는 개수 `28`/`9` 만 고정 · 나열 부재) → **UNVERIFIED**.
**28종 코드명 창작 금지**(REQ §15 역산 — 자작 코드표는 분모가 아니다). 스펙 §24 원문 수령 시 채운다.

확정 사실만:
- 현행 Reason = **0종**(코드·자유문자열 **모두 미저장**). 28 대비 **전무**.
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

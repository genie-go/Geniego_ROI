# DSAR — Utilization 계산 원칙 · 상태 구분 (§32)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §32(1563-1586) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4(§30/§31 ★FLIP) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§32 측정기 정합)**: `measure_spec_denominator.mjs --sec=32` 실측 **9**(불릿 9·번호 0). §32 = **상태 구분 9**. 본 문서가 전량 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Utilization 상태 구분 정책 | 🔴 remaining 계산에 어떤 상태를 포함할지 정의하는 정책 축 부재 · `authority_utilization` 원장 상태 구분 grep **0**(ⓑ §1·§4) | `NOT_APPLICABLE`(부재→신설) |
| **유일 실 "누적 소진" 판정** = `AutoCampaign.php:843-889` | 🔴★ⓑ §4 FLIP — `periodSpentToDate:855`(실현 지출)→`$spent < $budget*$margin`(`:856`) **단순 비교** · 상태별 원장 구분 없음(Approved 한 상태만) | `LEGACY_ADAPTER`(마케팅·단순 spent≥budget·정책화 안 됨) |
| remaining 계산식 | 🔴 원문(`:1581`) `remaining = limit - approved - pending - reserved + reversed + released` 예시 — 현행은 `budget - spent`(단일 상태)뿐·9상태 구분 0(ⓑ §4) | `ABSENT`(상태별 원장 구분 부재) |

★**상태별 원장 구분(9종)이 전무하므로 상태 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. AutoCampaign 은 `performance_metrics.spend`(실현 지출)만 SUM 하여 **Approved 한 상태만** 계산할 뿐, Pending/Reserved/Committed 를 구분해 remaining 에 포함/제외하는 정책이 없다.

## 1. 원문 전사 + 판정 — **§32 상태 구분 9**

| # | 원문 상태 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Approved | 인접 = `periodSpentToDate:855` 실현 지출 누적 → remaining 판정(`AutoCampaign:856`) — 단 **단순 `spent≥budget` 비교**이지 Authority Type별 정책 아님(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 2 | Pending | 🔴 대기 상태 원장 구분 부재 — remaining 에 pending 을 포함/제외하는 정책 축 0(ⓑ §4) | `ABSENT` |
| 3 | Reserved | 🔴 예약 상태 원장 부재 — Reservation 엔진 부재(ⓑ §4) | `ABSENT` |
| 4 | Committed | 🔴 약정 상태 원장 부재 — `commitment_authority` grep 0(ⓑ §1·§4) | `ABSENT` |
| 5 | Paid | 🔴 지급완료 상태 원장 부재 — `payment_authority`/payout 원장 상태 구분 0(ⓑ §1) | `ABSENT` |
| 6 | Reversed | 도메인 역분개 로직 인접(주문/정산 역분개 실재·ⓑ ACTION_TYPE §1) — 단 **authority utilization 역분개 상태 아님**·remaining 정책에 미반영 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | Cancelled | 도메인 취소 파이프라인 인접(주문 취소 실재) — 단 **authority utilization 취소 상태 아님**·상태별 원장 구분 없음(ⓑ §2) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | Expired | 🔴 만료 상태 부재 — effective dating(valid_to) 부재로 만료 판정 대상 없음(ⓑ §5) | `ABSENT` |
| 9 | Released | 🔴 해제 상태 원장 부재 — 예약 부재로 해제 대상 없음(ⓑ §4) | `ABSENT` |

**실측 개수: 9 / 9 전사** (§32 상태 구분). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 6.

> 🔴 **커버 0.** 상태별 원장 구분이 통째로 부재하므로 어떤 상태도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(Approved = AutoCampaign 실현 지출 누적)은 **확장 대상 인접 자산**이나 마케팅 광고예산·단순 `spent≥budget` 비교이지 정책화된 상태 구분이 아니다. `KEEP_SEPARATE_WITH_REASON` 2건(Reversed/Cancelled)은 **도메인 역분개·취소 파이프라인이 실재하나** authority utilization 상태가 아니므로 별도 도메인으로 분리 유지한다(파이프라인 유무 ≠ 승인권한 사용량 상태). `ABSENT` 6건(Pending/Reserved/Committed/Paid/Expired/Released)은 상태별 원장 구분이 저장계층부터 부재.

## 2. 규칙

- 🔴 **원문 §32 "`remaining = limit - approved - pending - reserved + reversed + released` 공식을 하드코딩하지 말고 Authority Type별 Policy 로 관리하라"를 반드시 이행하라** — 현행 `AutoCampaign:856`은 `spent ≥ budget*margin` **단일 상태(Approved) 단순 비교**이지 9상태를 구분하지 않는다. remaining 에 어떤 상태를 포함/제외할지는 Authority Type별 정책(Utilization Policy)으로 선언하고, 상태 전이·계산식을 코드 리터럴로 굳히지 마라.
- 🔴 **Approved 를 `AutoCampaign` 소진 판정으로 재구현하지 마라**(`LEGACY_ADAPTER`) — `periodSpentToDate`(`:855`)는 마케팅 광고예산 실현 지출이고 정책화되지 않았다(ⓑ §4). 그 누적 판정 패턴을 참조하되 Authority 도메인 전용 상태 구분(9종) 위에 remaining 정책을 세워라(중복 엔진 금지).
- 🔴 **Reversed/Cancelled 를 도메인 역분개·취소 파이프라인으로 흡수하지 마라**(`KEEP_SEPARATE_WITH_REASON`) — 파이프라인은 실재하나 authority utilization 상태가 아니다(ⓑ ACTION_TYPE §1). 도메인 실행과 **승인권한 사용량 원장 상태**는 분리 유지하되, 상태별 원장(Pending/Reserved/Committed/Paid/Expired/Released) 신설은 재무 통제 위험을 동반하므로 별도 승인세션에서 `BLOCKED_FINANCIAL_CONTROL_RISK` 검토를 선행하라.
- 🔴 **상태별 원장이 부재한 채로 remaining 을 낙관 계산하지 마라** — pending/reserved 를 차감하지 못하면(원장 부재) 실제 미확정 소진분을 무시해 §65 "누적 Limit 초과인데 승인 성공" gap 을 유발한다. Utilization Reference([DSAR_APPROVAL_AUTHORITY_UTILIZATION_REFERENCE.md](DSAR_APPROVAL_AUTHORITY_UTILIZATION_REFERENCE.md))의 상태별 금액 필드와 본 상태 구분 정책을 함께 신설해 remaining 정합을 보장하라.

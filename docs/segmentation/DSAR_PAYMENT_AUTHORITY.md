# DSAR — Payment Authority (§40 · Payment 분할)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §40(1762-1792, Payment 필수속성 1766-1777) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 분모 정본: `measure_spec_denominator.mjs --sec=40` = **20**(Payment 10 + Payout 10). 본 문서 = Payment **10**. Payout 10 = [DSAR_PAYOUT_AUTHORITY.md](DSAR_PAYOUT_AUTHORITY.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Payment Authority` 엔티티 | `payment_authority` grep **0**(backend/src·ⓑ §1) — 자금 지급 **승인권한** 개념 부재 | `ABSENT`(부재→신설) |
| 결제/빌링(인접) | `Payment.php:23`(Toss PG · `TOSS_TEST_SK`) · Paddle 구독빌링 — **구독 결제 처리이지 Payment Authority(자금이동 승인권한) 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 자동집행 억제 훅(인접) | `AdAdapters::agentMode:42` · `agentAutoAllowed:53-55`(`agent_mode==='auto'`만 자동집행) — 원문 "Payment Execution Control Hook"의 유일 인접(단 마케팅 도메인) | `KEEP_SEPARATE_WITH_REASON` |

★**Authority 엔티티 전체가 부재.** `Payment.php`/Paddle 은 **구독 결제를 처리**하지만 "자금 이동을 승인할 권한"의 축이 아니다 → 필드 커버 원천 불가. `VALIDATED_LEGACY`(§72) 판정 **금지**.

## 1. 원문 전사 + 판정 — **원문 10종**(§40 Payment 필수 속성)

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | payment type | 인접 = `Payment.php:23`(Toss)·Paddle 구독빌링 유형 — 결제수단 유형 · 승인권한 유형 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | payer legal entity | 🔴 지급 법인실체(payer legal entity) 0(`biz_no`/`corp_reg` grep 0·ⓑ §1) | `ABSENT` |
| 3 | payee type | 🔴 수취인 유형(payee type) authority 0 | `ABSENT` |
| 4 | funding account reference | 🔴 자금 출처 계좌 참조(funding account) 0 — treasury 계좌 마스터 부재 | `ABSENT` |
| 5 | currency | 인접 = 빌링 통화(`Payment.php`/Paddle 결제통화)·`fxToKrw`(`Connectors.php:1749` 변환) — 결제 통화 데이터 · authority 통화스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | amount | 🔴 지급 금액에 대한 authority 한도·band 부재 + `agent_mode==='auto'` 자동집행 경로(`AdAdapters:53-55`) + 살아있는 집행기 `executeAction:601-655`(287차·AdAdapters 실호출) → **승인만으로 자금이동이 억제되지 않을 구조적 위험**(원문 "Payment Execution Control Hook" 미보유·§65 "Amount>Limit인데 승인성공" 프로파일) | `BLOCKED_FINANCIAL_CONTROL_RISK` |
| 7 | payment batch 여부 | 🔴 지급 배치(payment batch) 개념 0 — 일괄 지급 묶음 축 부재 | `ABSENT` |
| 8 | treasury review reference | 🔴 자금(treasury) 검토 참조 0 — treasury 검토 링크 부재 | `ABSENT` |
| 9 | status | 인접 = 결제 상태(`Payment.php`/Paddle) — 결제 처리 상태 · **승인 상태전이 아님**(합법 전이집합 선언 0·ⓑ §5) | `KEEP_SEPARATE_WITH_REASON` |
| 10 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 5 · `BLOCKED_FINANCIAL_CONTROL_RISK` 1 · `LEGACY_ADAPTER` 1.

> 🔴 **커버 0.** `Payment.php`/Paddle 은 **구독 결제를 처리**하지만 Payment **Authority**(자금이동 승인권한)가 아니다. amount(#6)는 authority 한도 없이 자동집행 경로가 존재해 `BLOCKED_FINANCIAL_CONTROL_RISK` — 통제훅 선결 전 자동 자금이동을 허용해선 안 된다.

## 2. 규칙

- 🔴 **원문 §40 "Approval Decision만으로 실제 자금 이동이 자동 실행되지 않도록 Payment Execution Control Hook을 유지한다"를 선결로 반영하라** — 현행 유일 인접 = `AdAdapters::agentAutoAllowed:53-55`(`agent_mode==='auto'` 이진 게이트)이며 이는 **마케팅 예산 자동집행 억제**용이다. Payment Authority 신설 시 이 패턴을 **참조**하되, 자금 지급은 "승인 성공 ≠ 자금 이동"을 강제하는 별도 Execution Control Hook(승인→집행 사이 treasury 게이트)을 반드시 두라. #6 amount 의 `BLOCKED_FINANCIAL_CONTROL_RISK` 는 이 훅이 없는 현행 위험을 표기한 것이다.
- 🔴 **`Payment.php`/Paddle 을 Payment Authority 로 재해석하지 마라** — 구독 빌링(결제 처리)과 자금 지급 승인권한은 도메인이 다르다(`KEEP_SEPARATE_WITH_REASON`). 결제 상태·통화·유형을 승인권한 필드로 오해하지 마라.
- 🔴 **`payer legal entity`/`funding account reference`/`treasury review reference` 를 tenant_id·app_setting 으로 대체하지 마라** — 법인실체·자금계좌·treasury 검토는 각각 권위 마스터가 선결되어야 한다(부재→신설·ⓑ §1).
- 🔴 **`agent_mode` 를 Payment 승인 게이트로 전용하지 마라** — `VARCHAR(20)` 코드 in_array 강제(DB CHECK 아님·ⓑ §2)이며 마케팅 자동집행 축이다. 자금이동 통제 훅을 여기에 얹으면 §65 통제붕괴를 유발한다.

# DSAR — Payout Authority (§40 · Payout 분할)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §40(1762-1792, Payout 필수속성 1779-1790) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 분모 정본: `measure_spec_denominator.mjs --sec=40` = **20**(Payment 10 + Payout 10). 본 문서 = Payout **10**. Payment 10 = [DSAR_PAYMENT_AUTHORITY.md](DSAR_PAYMENT_AUTHORITY.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Payout Authority` 엔티티 | `payout_authority`·`payout_release` grep **0**(backend/src·ⓑ §1) — 지급 릴리스 **승인권한** 개념 부재 | `ABSENT`(부재→신설) |
| 지급/정산(인접) | 광고비 정산·Kakao 등 지급 · `PgSettlement`(정산 대사) — **정산·지급 처리이지 Payout Release Authority(릴리스 승인권한) 아님** | `KEEP_SEPARATE_WITH_REASON` |
| release 게이트 | 🔴 승인 후 **릴리스(release) 액션** 축 0 — "승인 ≠ 지급 릴리스" 2단계 구분 부재 | `ABSENT` |

★**Authority 엔티티 전체가 부재.** 정산/지급 파이프라인은 **금액을 계산·지급**하지만 "이 지급을 릴리스할 권한이 누구인가"의 축이 아니다 → 필드 커버 원천 불가. `VALIDATED_LEGACY`(§72) 판정 **금지**.

## 1. 원문 전사 + 판정 — **원문 10종**(§40 Payout 필수 속성)

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | payout program | 인접 = 광고비 정산·Kakao 등 지급 프로그램 — 정산/지급 도메인 · 릴리스 승인권한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | payout recipient | 🔴 지급 수취인(payout recipient) authority 0 — 수취인 마스터·검증 부재 | `ABSENT` |
| 3 | payout channel | 인접 = 지급 채널(Kakao/광고 정산 채널)·`PgSettlement.provider` — 채널 데이터 · 승인권한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | payout batch | 🔴 지급 배치(payout batch) 개념 0 — 일괄 지급 묶음 축 부재 | `ABSENT` |
| 5 | payout release action | 🔴 승인 후 릴리스 액션(payout release) 0 — 승인 릴리스 게이트 없음. 원문 "Payment ≠ Payout Release 구분"의 핵심 축이 미보유(§2 `BLOCKED_FINANCIAL_CONTROL_RISK` 근거) | `ABSENT` |
| 6 | settlement reference | 인접 = `PgSettlement`(`pg_settlement`·정산 대사 `reconcile:222-282`) — 정산 참조 데이터 · 승인 릴리스 참조 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | amount band | 인접 = `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`·boolean만·ⓑ §4) — band 아님 | `LEGACY_ADAPTER` |
| 8 | currency | 🔴 지급 통화 스코프 0 · `fxToKrw`(`Connectors.php:1749`)=변환 전용 — authority 통화축 아님 | `ABSENT` |
| 9 | status | 🔴 Payout 승인/릴리스 상태머신 부재 — 합법 전이집합 선언 0(전 도메인·ⓑ §5) | `ABSENT` |
| 10 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 5 · `LEGACY_ADAPTER` 2.

> 🔴 **커버 0.** 정산/지급 파이프라인은 **금액을 계산·지급**하지만 Payout Release **Authority**(릴리스 승인권한)가 아니다. payout release action(#5)이 부재해 "승인 ≠ 지급 릴리스" 2단계가 없다 — 살아있는 집행기(`executeAction:601-655`·287차) 위에서 릴리스 게이트 없이 자금/예산이 이동할 구조적 위험이 있다.

## 2. 규칙

- 🔴 **원문 §40 "Payment Authority와 Payout Release Authority를 구분하라"를 선결로 반영하라** — 현행에는 지급(payout)과 그 **릴리스 승인**을 나누는 축이 전무하다(#5 ABSENT). Payout Authority 신설 시 **① 지급 계획 승인**과 **② 실제 지급 릴리스(release action)** 를 별도 authority record 로 분리하고, ①이 자동으로 ②가 되지 않도록 하라(Payment Execution Control Hook 과 동형).
- 🔴 **`PgSettlement`/광고비·Kakao 정산을 Payout Authority 로 재해석하지 마라** — 정산 대사(`reconcile:222-282`)와 지급 채널은 지급을 **계산·실행**하지만 릴리스 승인권한이 아니다(`KEEP_SEPARATE_WITH_REASON`). settlement reference 는 **참조 링크**로만 연결하라.
- 🔴 **`payout release action` 을 기존 `executeAction`(action_request)로 대체하지 마라** — 집행기는 실코드지만 생산자 0의 죽은 파이프라인이며(ⓑ §2 VACUOUS·287차) 릴리스 승인 게이트가 아니다. 릴리스 액션에는 별도 authority·treasury 게이트를 선결하라.
- 🔴 **`amount band` 를 HIGH_VALUE_KRW 상수로 채우지 마라** — 상수는 boolean만 켠다(ⓑ §4). 지급 금액 구간은 통화·effective dating 있는 **§24 Amount Band** 로.

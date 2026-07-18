# DSAR — Settlement Authority (§39)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §39(1740-1758) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 분모 정본: `measure_spec_denominator.mjs --sec=39` = **15**(육안 금지)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Settlement Authority` 엔티티 | `settlement_authority`·`settlement_limit` grep **0**(backend/src·ⓑ §1) — 정산 **승인권한** 개념 부재 | `ABSENT`(부재→신설) |
| 정산 파이프라인(인접) | `PgSettlement`(`pg_settlement` 테이블 · `gross`/`fee`/`net`/`currency`/`status`/`txn_at` · 대사 `reconcile` `:222-282`) — **정산 계산·대사 실재하나 승인권한 아님** | `KEEP_SEPARATE_WITH_REASON` |
| accounting/legal entity | 🔴 accounting entity·legal entity 엔티티 0(`biz_no`/`corp_reg` grep 0·ⓑ §1) | `ABSENT` |

★**Authority 엔티티 전체가 부재.** 정산 파이프라인(`PgSettlement`)은 **금액을 계산·대사**하지만, "누가 이 정산을 승인할 권한이 있는가"의 축이 아니다 → 필드 커버는 원천 불가. `VALIDATED_LEGACY`(§72) 판정 **금지**.

## 1. 원문 전사 + 판정 — **원문 15종**(§39 필수 속성)

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | settlement type | 인접 = `pg_settlement.type`(`PgSettlement.php:157` · PG 정산 유형) — 파이프라인 분류 · 승인권한 유형 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | settlement cycle | 인접 = `kr_channel.settlement_cycle`(`KrChannel.php:70`) · PgSettlement 주기 — 정산 주기 실재 · 승인 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 3 | counterparty | 인접 = `pg_settlement.provider`(PG사·`:157`) — 정산 상대방 데이터 · 승인 counterparty 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 5 | accounting entity | 🔴 회계실체(accounting entity) 엔티티 0 — 원장/전표 실체 축 없음 | `ABSENT` |
| 6 | settlement currency | 인접 = `pg_settlement.currency`(`:157`·`fxToKrw` KRW 정규화 `:277`) — 정산 통화 데이터 · authority 통화스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | gross amount | 인접 = `pg_settlement.gross`(`:87` `DECIMAL(16,2)`·`:163` SUM) — 정산 계산값 · 승인 금액축 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | deduction amount | 인접 = `pg_settlement.fee`(`:163` 수수료 차감) — 정산 계산값 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | net amount | 인접 = `pg_settlement.net`(`:163`·`net=gross-fee`) — 정산 계산값 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | adjustment amount | 인접 = 대사 조정(`reconcile` `match_gross`/`match_fee` `:282`) — 대사 조정값 · 승인 조정축 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | threshold basis | 🔴 정산 승인 임계 근거(threshold basis) 0 — `amount_threshold`/`approval_threshold` grep 0(ⓑ §4) | `ABSENT` |
| 12 | amount band | 인접 = `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`·boolean만·ⓑ §4) — band 아님 | `LEGACY_ADAPTER` |
| 13 | accounting review reference | 🔴 회계 검토 참조(accounting review) 0 — 원장 대사 참조 링크 부재 | `ABSENT` |
| 14 | status | 인접 = `pg_settlement.status`(`:157`) — 정산 파이프라인 상태 · **승인 상태전이 아님**(합법 전이집합 선언 0·ⓑ §5) | `KEEP_SEPARATE_WITH_REASON` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 9 · `ABSENT` 4 · `LEGACY_ADAPTER` 2.

> 🔴 **커버 0.** `pg_settlement` 은 정산 **금액을 계산·대사**하지만 Settlement **Authority**(승인권한)가 아니다. gross/deduction/net/currency/type/cycle 인접 9건은 전부 `KEEP_SEPARATE_WITH_REASON` — 파이프라인 데이터를 승인권한 필드로 오해하지 마라.

## 2. 규칙

- 🔴 **`PgSettlement` 파이프라인을 Settlement Authority 로 재해석하지 마라** — `pg_settlement` 은 PG 정산 **금액 계산·주문 대사**(`reconcile:222-282`)다. "이 정산을 승인·확정할 권한이 누구에게 있는가"는 별도 authority record 로 신설하되, gross/fee/net 계산 로직은 **참조**만 하라(중복 정산엔진 금지·`KEEP_SEPARATE_WITH_REASON`).
- 🔴 **`accounting entity`/`legal entity` 를 tenant_id 로 대체하지 마라** — 회계실체·법인실체는 tenant 와 다른 축이다(한 tenant 다법인 가능). Legal/accounting entity 마스터 부재(ⓑ §1)를 상속하지 말고 권위 실체 참조를 선결하라.
- 🔴 **`amount band` 를 HIGH_VALUE_KRW 상수로 채우지 마라** — 상수는 boolean만 켠다(ⓑ §4). 정산 금액 구간은 통화·effective dating 있는 **§24 Amount Band** 로.
- 🔴 **`accounting review reference` 를 evidence(SecurityAudit)와 혼동 금지** — 전자는 회계 원장 대사 링크(부재·신설), 후자는 변조증거 해시체인(실재·확장). 서로 다른 축이다.

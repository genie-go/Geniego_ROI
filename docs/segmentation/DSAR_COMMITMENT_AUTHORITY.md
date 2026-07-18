# DSAR — Commitment Authority (§35)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §35(1629-1648) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §1·§4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Commitment Authority 엔티티 | `commitment_authority`·`contract_limit`·`signature_authority` grep **0**(ⓑ §1) — 향후 지급·비용·계약 의무 확정 권한 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 계약/약정 엔티티 | 🔴 contract·commitment 마스터 테이블 0(ⓑ §1) — 계약가치·연환산·해지위약 축 자체가 없음 | `ABSENT` |
| signature authority | 🔴 `signature_authority`·`signatureAuthority` grep **0**(재실증) — 서명권한 참조 없음 | `ABSENT` |
| total lifetime value 인접 | `CustomerAI.php` 고객 LTV(`ltv`/`lifetime_value` 27히트) — **고객가치 예측 도메인** · 계약 총생애가치(commitment)와 상이 | `KEEP_SEPARATE_WITH_REASON` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 12종**(측정기 `--sec=35` = 불릿 12 / 번호 0 / 합계 12)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | commitment type | 🔴 `commitment_authority`·commitment 엔티티 grep **0**(ⓑ §1) — 약정 유형 축 부재 | `ABSENT` |
| 2 | contract value | 🔴 `contract_limit`·계약 마스터 grep **0**(ⓑ §1) — 계약가치 필드 없음 | `ABSENT` |
| 3 | annualized value | 🔴 연환산 가치 산출·저장 0(계약 엔티티 부재) | `ABSENT` |
| 4 | total lifetime value | 인접 = `CustomerAI.php` 고객 LTV(`ltv`/`lifetime_value` 27히트) — **고객가치 예측 도메인** · 계약 총생애가치와 목적·주체 상이(고객 ≠ 회사 약정) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | cancellation liability | 🔴 해지 위약금·부채 엔티티 0(계약 부재) — 취소 시 회사 부담액 축 없음 | `ABSENT` |
| 6 | legal entity | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`tax_id`/`legal_entity` grep **0** | `ABSENT` |
| 7 | contract term | 🔴 계약 기간(term) 엔티티 0(계약 마스터 부재) | `ABSENT` |
| 8 | currency | 🔴 `currency_scope`·`allowed_currency` grep **0**(ⓑ §4) · 통화 변환 전용(`Connectors.php:1749` `fxToKrw`) · 이력 부재 | `ABSENT` |
| 9 | amount band | 유일 금액기준 = `HIGH_VALUE_KRW` PHP 상수(`Catalog.php:1016`·`:1103`) — 필요여부 boolean · 밴드 구조 없음 | `LEGACY_ADAPTER` |
| 10 | signature authority reference | 🔴 `signature_authority`·`signatureAuthority` grep **0**(재실증) — 서명권한 참조 대상 자체가 없음 | `ABSENT` |
| 11 | status | 🔴 Commitment 엔티티 부재 → 상태를 가질 대상 없음(합법 전이집합 선언도 전 도메인 0·ⓑ §5) | `NOT_APPLICABLE` |
| 12 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 8(commitment type·contract value·annualized value·cancellation liability·legal entity·contract term·currency·signature authority reference) · `LEGACY_ADAPTER` 2(amount band·evidence) · `KEEP_SEPARATE_WITH_REASON` 1(total lifetime value) · `NOT_APPLICABLE` 1(status).

> 🔴 **커버 0.00%.** Commitment Authority 는 **12종 중 8종이 전면 부재(ABSENT)**로 세 문서 중 부재 깊이가 가장 크다. 계약/약정 엔티티가 없어 대부분의 축이 저장계층부터 부재이며, `LEGACY_ADAPTER` 2건(amount band=HIGH_VALUE_KRW·evidence=SecurityAudit)도 커버가 아니다.

## 2. 규칙

- 🔴 **원문 규칙: "Payment 실행 권한과 Commitment 생성 권한을 분리하라"**(§35 원문 1648행) — 향후 지급·비용·계약 의무를 **확정(commitment 생성)**하는 권한은 실제 **지급 실행(payment)** 권한과 별개다. 신설 시 계약 체결 승인과 지급 실행 승인을 하나의 게이트로 합치지 마라(§34 Spending≠Payment 규칙과 짝).
- 🔴 **`total lifetime value` 를 `CustomerAI` LTV 로 채우지 마라** — 고객 LTV(`ltv`/`lifetime_value`)는 **고객가치 예측 도메인**이며 주체(고객)·목적(마케팅 타깃팅)이 계약 총생애가치(회사가 부담하는 약정 총액)와 다르다. 격리 유지(`KEEP_SEPARATE_WITH_REASON`) · 재사용 시 의미 오염.
- 🔴 **`signature authority reference` 는 grep 0** — 서명권한 참조가 저장계층부터 없다. Commitment 신설 시 서명권한(누가 어느 금액대 계약에 서명할 권한을 갖는가)을 승인 체인(5-3-3-3 · 커버 0)과 연동해 선결하라. 체인 없이 참조를 지어내면 fake-looks-real.
- 🔴 **`amount band` 를 `HIGH_VALUE_KRW` 로 재사용 금지** — 단일 상수는 상품가 승인 필요여부 boolean 전용이다(`Catalog.php:1103`). 계약 금액대는 effective-dated·통화 인지 밴드로 신설(§24 Amount Band 승격과 정합).
- 🔴 **`status` 는 엔티티 선행** — Commitment 엔티티가 없으면 상태 전이도 없다. 상태를 표기하기 전 계약/약정 마스터를 신설하고 합법 전이집합을 선언하라(전 도메인 전이집합 선언 0 반복 금지·ⓑ §5).

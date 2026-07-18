# DSAR — Spending Authority (§34)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §34(1605-1625) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §1·§4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Spending Authority 엔티티 | `spending_limit`·`budget_limit`·`cost_center_limit` grep **0**(ⓑ §1) — 비용/구매/예산 집행 승인권한 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| cost center | 🔴 `cost_center`·`costCenter` grep **0**(재실증) — 비용 귀속 축 자체가 없음 | `ABSENT` |
| procurement | 🔴 `procurement`·`purchase_order` grep **0**(재실증) · `po_*`=Price Optimization 오탐(ⓑ §1) | `ABSENT` |
| 유일 예산 상한 | 인접 = `AutoCampaign.php:843-889` 광고예산 상한·누적차감 — **마케팅 도메인 · 승인 아님**(ⓑ §4) | `LEGACY_ADAPTER` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 13종**(측정기 `--sec=34` = 불릿 13 / 번호 0 / 합계 13)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | expense category | 🔴 `expense_category` grep **0**(재실증) — 비용 분류 승인축 부재 | `ABSENT` |
| 2 | procurement category | 🔴 `procurement`·`purchase_order` grep **0** · `po_*`=Price Optimization 오탐(ⓑ §1) — 구매 카테고리 부재 | `ABSENT` |
| 3 | cost center | 🔴 `cost_center`·`costCenter` grep **0**(재실증) — 원가 센터 귀속 없음 | `ABSENT` |
| 4 | budget | 인접 실재 = `AutoCampaign.php:843-889` 배정예산·초과 시 자동 정지(`:864`·`:879`) — **마케팅 예산 도메인 · 승인 워크플로 아님**(ⓑ §4·§31 FLIP) | `LEGACY_ADAPTER` |
| 5 | legal entity | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`tax_id`/`legal_entity` grep **0** | `ABSENT` |
| 6 | vendor·partner scope | 인접 = `SupplyChain.php`/`Wms.php` 공급사(supplier) 마스터 · `PartnerPortal.php` — **재고 소싱/파트너 도메인** · Spending Authority vendor 스코프에 연결된 승인권한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | amount band | 유일 금액기준 = `HIGH_VALUE_KRW` PHP 상수(`Catalog.php:1016`·`:1103`) — 필요여부 boolean · 밴드 구조 없음 | `LEGACY_ADAPTER` |
| 8 | currency | 🔴 `currency_scope`·`allowed_currency` grep **0**(ⓑ §4) · 통화 변환 전용(`Connectors.php:1749` `fxToKrw`) · 환율 이력 부재 | `ABSENT` |
| 9 | fiscal period | 인접 = `AutoCampaign` `period`(monthly/quarterly/annual 예산창 · `:791`·`:855`) — **마케팅 예산 기간 · 회계기간(fiscal calendar) 아님** · `fiscal_year`/`fiscal_period` grep 0 | `LEGACY_ADAPTER` |
| 10 | commitment 여부 | 🔴 Commitment 엔티티 부재(문서 [DSAR_COMMITMENT_AUTHORITY.md](DSAR_COMMITMENT_AUTHORITY.md) 참조) — 지출이 약정을 생성하는지 판별할 대상 축 없음 | `ABSENT` |
| 11 | approval action | 인접 = 승인 4경로 상태전이(mapping/catalog/action_request/admin_growth · ⓑ §2) · `acl_permission.approve` 비트는 🔴소비처 0(장식·ⓑ §3) — 승인 action 을 판정·집행하는 정본 축 아님 | `LEGACY_ADAPTER` |
| 12 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(budget·amount band·fiscal period·approval action·status·evidence) · `ABSENT` 6(expense category·procurement category·cost center·legal entity·currency·commitment 여부) · `KEEP_SEPARATE_WITH_REASON` 1(vendor·partner scope).

> 🔴 **커버 0.00%.** Spending Authority 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건은 확장 대상 인접 자산(budget/fiscal period=AutoCampaign·amount band=HIGH_VALUE_KRW·evidence=SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **원문 규칙: "Spending Authority 와 Payment Authority 를 동일시하지 마라"**(§34 원문 1625행) — 비용 발생·구매·예산 집행 승인 권한(Spending)은 **실제 지급 실행 권한(Payment)과 분리**해 모델링하라. 승인 4경로 어디에도 이 분리가 없으므로, 신설 시 두 권한을 하나의 승인 통과로 합치지 마라(§65 gap 유발).
- 🔴 **`cost center`/`procurement category`/`expense category` 를 "있음"으로 표기 금지** — 세 축 모두 grep 0 이다(`po_*`=Price Optimization 오탐 주의). 비용 귀속·구매 분류를 신설하되 기존 식별자와 이름 충돌을 피하라.
- 🔴 **`budget`/`fiscal period` 를 `AutoCampaign` 로 재구현하지 마라** — 마케팅 예산 페이싱(`:843-889`)은 **참조**하되 승인권한 예산 축으로 복제하면 중복 엔진이다(§73). AutoCampaign `period` 는 회계기간(fiscal calendar)이 아니라 캠페인 예산창이다.
- 🔴 **`vendor·partner scope` 는 SupplyChain/WMS supplier 와 혼동 금지** — 공급사 마스터는 **재고 소싱 도메인**이며 Spending Authority 의 vendor 스코프(어느 벤더에 대해 지출을 승인할 권한)와 다르다. 격리 유지(§66) · 필요 시 참조만.

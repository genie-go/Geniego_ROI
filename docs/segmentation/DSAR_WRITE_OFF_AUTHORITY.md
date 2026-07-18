# DSAR — Write-off Authority (§43)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §43(1835-1853) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Write-off Authority` 승인권한 엔티티 | `writeoff_limit`·`write_off` grep **0**(ⓑ §1) — 상각 **승인권한** 부재 | `NOT_APPLICABLE`(부재→신설) |
| 회계 엔티티(AR/AP·회계기간·회계승인) | 🔴 receivable/payable 원장·accounting period·accounting approval grep **0** | `ABSENT` |
| tax impact | 인접 = `kr_fee_rule.vat_rate`(`Pnl.php:410`,`:454`) — VAT 세율 도메인·상각 세무영향 아님 | `KEEP_SEPARATE_WITH_REASON` |
| reason | 인접 = `menu_audit_log.reason TEXT`(`AdminMenu.php:127`) — 감사 자유텍스트 필드패턴 | `LEGACY_ADAPTER` |

★**Write-off Authority 승인권한 엔티티와 회계 원장이 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | write-off type | 🔴 상각(Write-off) 엔티티 자체 부재 → 유형 열거 원천 불가 | `NOT_APPLICABLE` |
| 2 | receivable·payable reference | 🔴 AR/AP(미수금/미지급금) 원장 엔티티 부재 | `ABSENT` |
| 3 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 4 | accounting period | 🔴 회계기간(period close) 엔티티 부재 | `ABSENT` |
| 5 | reason | 인접 = `menu_audit_log.reason TEXT`(`AdminMenu.php:127`,`:143`) 자유텍스트 필드패턴 — 상각 사유 저장 형식 참조 가능(범주 체계는 아님) | `LEGACY_ADAPTER` |
| 6 | amount | 금액 처리 = `fxToKrw` 변환계층만(`Connectors.php:1749`) · 상각 금액 저장·이력 부재 | `LEGACY_ADAPTER` |
| 7 | currency | 인접 = `fxToKrw`/`krwToCurrency`(`Connectors.php:1749`,`:1763`) 변환 전용 · 통화 스코프·과거환율 이력 부재(ⓑ §4) | `LEGACY_ADAPTER` |
| 8 | amount band | 인접 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`) — 필요여부 boolean만(밴드 아님·ⓑ §4) → §24 Amount Band 로 승격 대상 | `LEGACY_ADAPTER` |
| 9 | tax impact reference | 인접 = `kr_fee_rule.vat_rate`(`Pnl.php:410`·`:454` `ORDER BY effective_from DESC`) — VAT 세율 도메인이며 상각 세무영향 축 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | accounting approval reference | 🔴 회계 승인(전표 승인) 엔티티 부재 | `ABSENT` |
| 11 | status | 상태 전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Write-off Authority 상태머신 부재 | `LEGACY_ADAPTER` |
| 12 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56`·tenant 해시·prev_hash·검증기) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 4 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Write-off 는 **회계 원장(AR/AP·회계기간·회계승인)이 전무**하여 전 재무 필드가 `ABSENT`/`NOT_APPLICABLE` 이다. `LEGACY_ADAPTER` 6건은 상각 특유 자산이 아니라 전 도메인 공통 인접 자산(evidence·amount·currency·reason 필드패턴 등)이며, 상각 승인권한을 신설할 때 **회계 통합이 선행**되어야 한다.

## 2. 규칙

- 🔴 **`kr_fee_rule.vat_rate` 를 write-off tax impact 로 오인하지 마라** — VAT 세율(`Pnl.php:410`)은 판매 세금계층이고 상각 세무영향은 손금/대손 인식이다. 도메인이 다르므로 참조는 FK 로만, 스키마 통합 금지.
- 🔴 **`menu_audit_log.reason` 을 상각 사유 **범주**로 사용 금지** — 자유텍스트 필드패턴(`AdminMenu.php:127`)은 저장 형식 참조용일 뿐 상각 사유 분류체계가 아니다. 사유 카탈로그는 확장 가능 형태로 신설.
- 🔴 **AR/AP·회계기간·회계승인 을 "있음"으로 표기 금지** — 회계 원장이 저장부터 부재하다. 상각 승인권한은 **회계 시스템 연동을 선결**하지 않으면 §65 gap(권한/한도 없이 승인 성공)을 구조적으로 유발한다.
- 🔴 **amount band 는 §24 로 승격** — `HIGH_VALUE_KRW` boolean 상수를 재사용해 새 임계상수를 추가하지 마라.
- 🔴 **실 결함은 별도 승인세션** — 본 문서는 비파괴 전사 명세이며 코드 변경 0.

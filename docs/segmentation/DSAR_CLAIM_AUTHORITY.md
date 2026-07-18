# DSAR — Claim Authority (§38)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §38(1717-1736) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 분모 정본: `measure_spec_denominator.mjs --sec=38` = **14**(육안 금지)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Claim Authority` 엔티티 | `claim_authority` grep **0**(backend/src) — Claim 승인권한 개념 부재(ⓑ §1) | `ABSENT`(부재→신설) |
| Claim 도메인 자산 | `claim`=`RuleEngine`/워크플로 task claim(작업 점유)·`claim_limit` grep 0(ⓑ §1) — **승인권한 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 검토 vs 최종 승인 구분 | 원문 "Claim 검토 권한 ≠ Claim 최종 승인 권한"(§38 마지막 줄) — 현행 4승인경로(ⓑ §2) 어디에도 검토/최종 2단계 축 없음 | `ABSENT` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY`(§72) 판정 **금지** — 커버 0.

## 1. 원문 전사 + 판정 — **원문 14종**(§38 필수 속성)

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | claim type | Claim 엔티티 부재 → 유형 분류 축 없음 | `NOT_APPLICABLE` |
| 2 | claimant type | claimant(청구인) 유형 부재 | `NOT_APPLICABLE` |
| 3 | program | rebate/claim program authority 0(ⓑ §1) | `NOT_APPLICABLE` |
| 4 | partner | partner scope authority 부재 | `NOT_APPLICABLE` |
| 5 | customer | 인접 = `crm_customers`(`CRM.php`·고객 마스터) — **CRM 도메인 · Claim 승인 대상 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 7 | claim amount basis | amount basis(금액 산정 근거) 축 부재 — 유일 금액조건=HIGH_VALUE_KRW boolean(ⓑ §4) | `ABSENT` |
| 8 | adjustment inclusion | claim 금액의 adjustment 포함 규칙 부재(adjustment는 정산/귀속 도메인 한정) | `ABSENT` |
| 9 | tax inclusion | 인접 = `kr_fee_rule.vat_rate`(`KrChannel.php:70` `vat_rate 0.10` · VAT 계산 실재) — **수수료/세율 도메인 · Claim 세금포함 승인 아님** | `LEGACY_ADAPTER` |
| 10 | currency | 🔴 통화 스코프 0 · `fxToKrw`(`Connectors.php:1749`)=변환 전용(ⓑ §4) — authority 통화축 아님 | `ABSENT` |
| 11 | amount band | 인접 = `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`·승인 필요여부 boolean만·ⓑ §4) — band(구간) 아님 | `LEGACY_ADAPTER` |
| 12 | fraud·risk hook | 인접 = `AnomalyDetection`(`AnomalyDetection.php:21`·이상탐지) — **리스크 도메인 상이 · Claim 승인훅 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 13 | status | Claim 승인 상태머신 부재 — 합법 전이집합 선언 0(전 도메인·ⓑ §5) | `ABSENT` |
| 14 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 4 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 5 · `LEGACY_ADAPTER` 3.

> 🔴 **커버 0.** Claim Authority 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(tax=kr_fee_rule VAT·amount band=HIGH_VALUE_KRW·evidence=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **원문 §38 마지막 문장 "Claim 검토 권한 ≠ Claim 최종 승인 권한을 구분한다"를 선결로 반영하라** — 현행 4승인경로(ⓑ §2)는 전부 단일 상태전이(검토=최종)라 이 2단계 축이 없다. Claim Authority 신설 시 **검토(review) 권한과 최종 승인(final approval) 권한을 별도 authority record로 분리**하고, 검토 통과가 자동으로 최종 승인이 되지 않도록 하라.
- 🔴 **`tax inclusion` 을 `kr_fee_rule.vat_rate` 재구현하지 마라** — VAT 산정 계층은 이미 실재(`KrChannel.php:70`). Claim 세금포함 여부는 그 질의계층을 **참조**하되 새 세율 저장소를 만들지 마라(중복 엔진 금지).
- 🔴 **`fraud·risk hook` 을 `AnomalyDetection` 안에 끼워넣지 마라** — 이상탐지(리스크)와 Claim 승인훅은 도메인이 다르다. Claim Authority가 리스크 신호를 **읽는 훅**으로 연결하되, AnomalyDetection 로직을 승인 판정으로 전용하지 마라(`KEEP_SEPARATE`).
- 🔴 **`amount band` 를 HIGH_VALUE_KRW 상수 확장으로 오인 금지** — 상수는 boolean(₩5M+ 승인필요)만 켠다. Claim 금액 구간(band)은 테넌트·통화·effective dating을 갖춘 **§24 Amount Band** 로 승격하라(신규 임계상수 추가 금지·ⓑ §4).

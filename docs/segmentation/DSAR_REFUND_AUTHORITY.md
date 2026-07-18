# DSAR — Refund Authority (§41)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §41(1796-1815) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Refund Authority` 승인권한 엔티티 | `refund_limit`·`refund_authority` grep **0**(ⓑ §1) — 환불 **승인권한** 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 인접 "refund" 선례 | Paddle 웹훅 `transaction.refunded`(`Paddle.php:426`)·full/chargeback→즉시 다운그레이드(`:723`) — **PSP 환불 알림·승인권한 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 금액축 | 유일 = `HIGH_VALUE_KRW=5000000.0` 상수(`Catalog.php:1016`·필요여부 boolean만·ⓑ §4) · 통화=`fxToKrw` 변환전용(`Connectors.php:1749`·이력 부재) | `LEGACY_ADAPTER` |
| legal entity | 🔴 `biz_no`/`corp_reg`/`tax_id`/`legal_entity` grep **0** | `ABSENT` |

★**Refund Authority 승인권한 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | refund type | 인접 = Paddle `transaction.refunded`(`Paddle.php:426`) — PSP 환불 유형·**승인권한 유형 아님**(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | original transaction | 인접 = 주문/OrderHub 엔티티(도메인 상이·환불 승인권한의 원거래 참조 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | customer | 인접 = CRM(`CustomerAI`·crm) 고객 엔티티(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 5 | reason category | 환불 사유 **범주 체계** 부재 · `menu_audit_log.reason`(`AdminMenu.php:127`)은 자유텍스트(범주 아님) | `NOT_APPLICABLE` |
| 6 | original amount | 금액 처리 = `fxToKrw` 변환계층만(`Connectors.php:1749`) · 환불 승인권한 저장·as-of 이력 부재 | `LEGACY_ADAPTER` |
| 7 | refund amount | 동일 — 변환계층 인접이나 Refund Authority 금액 미보존 | `LEGACY_ADAPTER` |
| 8 | partial·full 여부 | 인접 = Paddle full refund/chargeback 처리(`Paddle.php:723`) — 부분/전액 구분 플래그이나 도메인 상이·승인권한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | currency | 인접 = `fxToKrw`/`krwToCurrency`(`Connectors.php:1749`,`:1763`) 변환 전용 · 통화 스코프·과거환율 이력 부재(ⓑ §4) | `LEGACY_ADAPTER` |
| 10 | amount band | 인접 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`) — 필요여부 boolean만(밴드 아님·ⓑ §4) → §24 Amount Band 로 승격 대상 | `LEGACY_ADAPTER` |
| 11 | fraud review reference | 인접 = `AnomalyDetection`(이상탐지 엔진·`Handlers/AnomalyDetection.php`) — 부정검토 도메인 인접이나 환불 승인권한 축 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | status | 상태 전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Refund Authority 상태머신 부재 | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56`·tenant 해시·prev_hash·검증기) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `KEEP_SEPARATE_WITH_REASON` 5 · `ABSENT` 1 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Refund **승인권한** 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건은 **확장 대상 인접 자산**(evidence=SecurityAudit·currency=fxToKrw·amount band=HIGH_VALUE_KRW 상수)이지 커버가 아니다. `KEEP_SEPARATE` 5개 필드는 도메인이 다른 인접 자산(Paddle 환불 type·부분/전액·주문·CRM·AnomalyDetection)으로 재사용 대상이 아니다.

## 2. 규칙

- 🔴 **Paddle `transaction.refunded` 를 Refund Authority 로 오인하지 마라** — PSP 환불 알림(`Paddle.php:426`,`:723`)은 외부 결제사가 이미 실행한 환불의 **사후 통지**이며 "누가 이 환불을 승인할 권한이 있는가"를 판정하지 않는다(§41 마지막 문단 "Payment Execution Control Hook 유지"와 정반대 관심사). 도메인 분리 유지.
- 🔴 **amount band / currency 를 "있음"으로 표기 금지** — `HIGH_VALUE_KRW` 는 필요여부 boolean 상수이고 통화는 변환 전용이다(ⓑ §4). Refund Authority 신설 시 금액 밴드는 §24 Amount Band 로 승격하고 새 임계상수를 추가하지 마라.
- 🔴 **fraud review reference 를 AnomalyDetection 에 인라인하지 마라** — 부정검토는 별도 엔진이며 환불 승인권한이 그 결과를 **참조**할 뿐이다(중복 엔진 금지). Reference 는 FK 형태로 보관.
- 🔴 **evidence 는 `SecurityAudit::verify()` 확장** — `menu_audit_log.hash_chain` 은 preimage ts 소실로 검증 불가능한 장식이므로 인용 금지.
- 🔴 **실 결함(1인 결재 3경로·high_value 라우팅 갭·Actor Auth Snapshot 부재)은 별도 승인세션** — 본 문서는 비파괴 전사 명세이며 코드 변경 0.

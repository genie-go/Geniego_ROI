# DSAR — Rebate Authority (§37 Action 19 + 필수속성 12)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §37(1676-1716) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §1·§4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§37 측정기 정합)**: `measure_spec_denominator.mjs --sec=37` 실측 **31**(불릿 31·번호 0) = Action 19 + 필수속성 12 과 정합.
>
> **★★이름 혼동 절대 금지** — 레포에 `docs/architecture/ADR_DSAR_REBATE_*.md` **설계 문서군(20+편)**(REBATE_PROGRAM·CLAIM_SETTLEMENT·MAKER_CHECKER·APPROVAL_WORKFLOW 등)이 존재하나 **전부 5-3-2/5-3-3-x 설계 명세이지 실행 코드가 아니다.** `backend/src` **rebate grep 전수 0**(대소문자 무시). **실 코드 rebate authority = 0.**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `REBATE_AUTHORITY` 엔티티·파이프라인 | 🔴 `rebate`·`rebate_program`·`rebate_authority`·`reward_rate`·`payout_release`·`rebate_claim` grep **0**(backend/src 전수·대소문자 무시) — 리베이트 프로그램 엔티티·집행 파이프라인 전무 | `NOT_APPLICABLE`(부재→신설) |
| 설계 문서 vs 코드 | 🔴 `ADR_DSAR_REBATE_*.md` 20+편(설계) 실재하나 **코드 아님** — 문서 히트를 구현으로 오독 금지 | (혼동 방지 명시) |
| funding source / legal entity | 🔴 `funding_source`·`legal_entity`·`biz_no`·`corp_reg`·`tax_id` grep **0** — 재원/법인 축 저장계층부터 부재 | `ABSENT` |
| Retroactive Change 인접 반례 | 🔴 `AgencyPortal.php:304`,`:381`,`:400` `revoked_at=NULL` **in-place 소거/덮어쓰기**(ⓑ §5:74) — 소급 변경의 **정면 반례**(이력 소실·as-of 재구성 불가) · rebate 도메인 아님 | `BLOCKED_HISTORICAL_INTEGRITY_RISK`(복제 금지) |
| amount band / currency / evidence | `HIGH_VALUE_KRW`(`Catalog.php:1016`·boolean)·`fxToKrw:1749`(변환 전용)·`SecurityAudit::verify:56-68` — 전부 **인접 자산**(rebate 전용 아님) | `LEGACY_ADAPTER` |

★**Rebate Authority 엔티티가 통째로 부재하므로 Action·속성 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 (A) — **§37 Action 19**

> rebate 프로그램 엔티티·파이프라인·집행기가 전무하므로 **19 Action 전량 `NOT_APPLICABLE`**(신설). "Approve/Submit/Activate" 명칭이 승인 4경로(mapping/catalog/action_request/admin_growth·ⓑ §2)와 표면 유사하나 **rebate 대상 엔티티가 없어 부착할 곳이 없다** — 승인 경로 재사용 금지(도메인·스키마 상이).

| # | 원문 Action | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Rebate Program Create | 🔴 rebate 프로그램 엔티티 grep 0 → 생성 대상 없음 | `NOT_APPLICABLE` |
| 2 | Program Submit | 🔴 rebate 상태머신 부재 | `NOT_APPLICABLE` |
| 3 | Program Approve | 🔴 승인 4경로 존재하나 rebate 프로그램 대상 0(ⓑ §2) | `NOT_APPLICABLE` |
| 4 | Program Activate | 🔴 rebate 활성화 전이 부재 | `NOT_APPLICABLE` |
| 5 | Program Modify | 🔴 rebate 수정 대상 0 | `NOT_APPLICABLE` |
| 6 | Budget Increase | 🔴 rebate 예산 엔티티 0 · 인접 `AutoCampaign.budget`(`:844`)은 광고예산(rebate 아님) | `NOT_APPLICABLE` |
| 7 | Threshold Change | 🔴 rebate 임계 0 · `amount_threshold` grep 0(ⓑ §4:53) | `NOT_APPLICABLE` |
| 8 | Eligibility Rule Change | 🔴 rebate 자격 규칙 0 · `RuleEngine`(`:24`)은 마케팅 세그 DSL(rebate 아님) | `NOT_APPLICABLE` |
| 9 | Reward Rate Change | 🔴 `reward_rate` grep 0 — 리워드율 축 부재 | `NOT_APPLICABLE` |
| 10 | Retroactive Change | 🔴 rebate 소급 대상 0 · **정면 반례** `AgencyPortal.php:304`,`:381`,`:400` `revoked_at=NULL` in-place 소거(이력 소실·ⓑ §5:74) = `BLOCKED_HISTORICAL_INTEGRITY_RISK` — 신설 시 소급을 **불변 correction 레코드**로(반례 복제 금지) | `NOT_APPLICABLE` |
| 11 | Program Extend | 🔴 rebate 유효기간 연장 대상 0 · `valid_to`/`effective_to` grep 0(ⓑ §5:72) | `NOT_APPLICABLE` |
| 12 | Program Terminate | 🔴 rebate 종료 전이 부재 | `NOT_APPLICABLE` |
| 13 | Claim Approve | 🔴 `rebate_claim` grep 0 · claim authority 부재(ⓑ §1:21) | `NOT_APPLICABLE` |
| 14 | Settlement Approve | 🔴 rebate settlement 승인 대상 0 · 정산 파이프라인은 있으나 rebate 승인 권한 아님 | `NOT_APPLICABLE` |
| 15 | Payment Approve | 🔴 payment authority grep 0(ⓑ §1:21) | `NOT_APPLICABLE` |
| 16 | Payout Release | 🔴 `payout_release`·`payout_authority` grep 0 | `NOT_APPLICABLE` |
| 17 | Adjustment Approve | 🔴 rebate 조정 승인 대상 0 | `NOT_APPLICABLE` |
| 18 | Cancellation Approve | 🔴 rebate 취소 승인 대상 0 | `NOT_APPLICABLE` |
| 19 | Write-off Approve | 🔴 `writeoff_limit` grep 0 — 상각 승인 권한 부재(ⓑ §1:21) | `NOT_APPLICABLE` |

## 2. 원문 전사 + 판정 (B) — **§37 필수속성 12**

| # | 원문 속성명 | 현행 대조 | 판정 |
|---|---|---|---|
| 20 | rebate program type | 🔴 rebate 프로그램 엔티티 부재 → 유형 분류 대상 없음 | `NOT_APPLICABLE` |
| 21 | funding source | 🔴 `funding_source` grep 0 — 재원(제조사/유통사/플랫폼 부담) 축 부재 | `ABSENT` |
| 22 | legal entity | 🔴 `legal_entity`·`biz_no`·`corp_reg`·`tax_id` grep 0 — Legal Entity 엔티티 0(ⓑ §4 표) | `ABSENT` |
| 23 | program owner organization | 🔴 조직 단위 rebate 소유 스코프 부재 · cost/profit center grep 0 → 프로그램 소유 조직 축 없음 | `ABSENT` |
| 24 | partner·customer scope | 🔴 rebate 대상 스코프 부재 · 인접 `crm_segments`(고객)·`AgencyPortal`(파트너)는 **rebate 대상 스코프 아님**(도메인 상이) | `NOT_APPLICABLE` |
| 25 | amount basis | 🔴 rebate 금액 산정 기준(매출/수량/증분) 축 0 · §37 전 Action NOT_APPLICABLE 와 정합 | `NOT_APPLICABLE` |
| 26 | currency | 인접 = `fxToKrw:1749`·`krwToCurrency:1763` **변환 전용**(`currency_scope`/`allowed_currency` grep 0·ⓑ §4:54) — 통화 스코프 아님 | `LEGACY_ADAPTER` |
| 27 | amount band | 유일 인접 = `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`·boolean 스위치·ⓑ §4:53) — 금액 Band(구간) 아님 | `LEGACY_ADAPTER` |
| 28 | action | 🔴 위 Action 19 전량 NOT_APPLICABLE → action 축 부착 대상 없음 | `NOT_APPLICABLE` |
| 29 | effective period | 🔴 `valid_from`/`valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5:72) — 유효기간 폐구간 부재 | `ABSENT` |
| 30 | status | 🔴 rebate 상태 엔티티 부재 → 상태전이 부착 대상 없음(§36 auto_campaign.status 같은 인접행도 rebate엔 없음) | `NOT_APPLICABLE` |
| 31 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash 교차·ⓑ §5:70) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 31 / 31 전사**(Action 19 + 속성 12). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 24(Action 19 + rebate program type·partner·customer scope·amount basis·action·status) · `ABSENT` 4(funding source·legal entity·program owner organization·effective period) · `LEGACY_ADAPTER` 3(currency·amount band·evidence).

> 🔴 **커버 0.** Rebate Authority 는 Action·속성·파이프라인·집행기가 **전량 부재**다. `LEGACY_ADAPTER` 3건(currency·amount band·evidence)은 **rebate 전용이 아닌 범용 인접 자산**(환율변환·고액상수·감사해시)이지 커버가 아니다. `ABSENT` 4건은 재원/법인/조직/유효기간 축이 **저장계층부터 부재**임을 뜻한다.

## 3. 규칙

- 🔴★**"REBATE" 명칭 때문에 5-3-2/5-3-3-x `DSAR_REBATE_*` 설계 문서군을 구현으로 인용 금지** — `ADR_DSAR_REBATE_PROGRAM_*`·`_CLAIM_SETTLEMENT_*`·`_MAKER_CHECKER_*`·`_APPROVAL_WORKFLOW_*` 등 20+편은 **설계 명세**이며 `backend/src` rebate 실코드 = **0**. 문서 히트를 능력으로 오독하면 §77 "이름/필드 히트≠능력"(fake-looks-real) 재발이다.
- 🔴 **19 Action 을 승인 4경로에 얹지 마라** — mapping/catalog/action_request/admin_growth(ⓑ §2)는 **rebate 대상 엔티티가 없어** 부착 불가하고 스키마·정족수도 상이하다. rebate 프로그램 엔티티를 선신설한 뒤 Action 권한을 그 위에 정의하라(§73 중복엔진 금지 — 유일 실 정족수 `Mapping.php:238-294` maker-checker 패턴은 **참조**하되 재구현 금지).
- 🔴 **Retroactive Change 를 `AgencyPortal` in-place 소거로 구현 금지**(BLOCKED_HISTORICAL_INTEGRITY_RISK) — `revoked_at=NULL` 덮어쓰기(`:304`,`:381`,`:400`)는 이력 소실·as-of 재구성 불가(ⓑ §5:74·§59 정면 반례). 소급 변경은 **불변 correction 레코드 + prev 링크**로 남겨라.
- 🔴 **funding source·legal entity·program owner organization 을 "있음"으로 표기 금지** — grep 0(저장계층 부재). 재원 부담 주체·법인·소유 조직이 없는 rebate 권한은 "누가 무엇으로 지급을 승인하는가"를 답할 수 없다.
- 🔴 **currency·amount band·evidence 인접 자산 재구현 금지** — 환율은 `fxToKrw`(변환 전용·과거환율 조회 불가·ⓑ §4:55), 금액은 `HIGH_VALUE_KRW` → §24 Amount Band 승격, evidence 는 `SecurityAudit::verify()` 확장. `menu_audit_log.hash_chain` **인용 금지**.

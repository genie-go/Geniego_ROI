# DSAR — Budget Authority (§36 필수필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §36(1652-1675) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§36 측정기 정합)**: `measure_spec_denominator.mjs --sec=36` 실측 **15**(불릿 15·번호 0)과 정합. 본 문서는 §36 필수 필드 15를 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `BUDGET_AUTHORITY` 엔티티 | 🔴 `budget_authority`·`budget_owner`·`fiscal_year` grep **0** — 재무 Budget Authority(예산 편성·승인·집행 권한) 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 🔴★유일 실 budget 인접 | **`AutoCampaign.php:843-889`** — `budget`(`:844`) 한도 + `periodSpentToDate:855`(기간 내 누적 지출) → `spent < budget*margin` 비교(`:856`) → 상한 도달 시 `AdAdapters::pause`(`:864`) + `optimization_log action='budget_cap_pause'`(`:878-879`). **레포 유일의 "한도 + 기간 + 누적차감 + 상한집행" 실 로직**(ⓑ §4:64 FLIP) | `LEGACY_ADAPTER`(마케팅 광고예산 · 재무 budget authority 아님 · 승인 워크플로 아님) |
| cost center / profit center | 🔴 `cost_center`·`profit_center` grep **0**(backend/src 전수) — 원가/이익 중심점 축 저장계층부터 부재 | `ABSENT` |
| budget version | 🔴 불변 prev-링크 예산 버전체인 선례 0(version 6컬럼 전부 하드코딩/서술 태그·ⓑ §5:72) | `ABSENT` |
| amount band | 🔴 유일 금액 조건 = `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(PHP 상수) · `:1103` `$price >= HIGH_VALUE_KRW` → boolean 스위치(ⓑ §4:53) — Band(구간) 아님 | `LEGACY_ADAPTER`(상수 → §24 Amount Band 승격 대상) |

★**Budget Authority 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 유일 실 인접 = `AutoCampaign` 광고예산 페이싱 로직이며 이는 **재무 예산 승인 권한이 아니라 마케팅 채널 지출 상한 자동정지**다. 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§36 필수 필드 15**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | budget id | 🔴 Budget Authority 엔티티 부재 → PK 없음 · 인접 `auto_campaign.id`는 **마케팅 캠페인 PK**(예산 권한 엔티티 아님) | `NOT_APPLICABLE` |
| 2 | budget version | 🔴 예산 버전체인 0 · version 6컬럼 전부 하드코딩/서술 태그(ⓑ §5:72) → 불변 prev-링크 선례 부재 | `ABSENT` |
| 3 | fiscal year | 🔴 `fiscal_year` grep 0 · `AutoCampaign` 은 `period`(monthly 등) + `created_at` 창(`:847`,`:868`)이지 **회계연도 축 아님** | `ABSENT` |
| 4 | budget owner | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3:44) · `auto_campaign.tenant_id`(`:846`) 테넌트 스코프 — **팀 owner/테넌트이지 budget owner 아님** | `LEGACY_ADAPTER` |
| 5 | budget organization | 🔴 조직 단위 예산 스코프 부재 — `acl_permission` org 시드는 있으나 예산에 부착 0 · cost/profit center 부재와 동일 계층 | `ABSENT` |
| 6 | cost center | 🔴 `cost_center` grep 0 — 원가 중심점 축 부재 | `ABSENT` |
| 7 | profit center | 🔴 `profit_center` grep 0 — 이익 중심점 축 부재 | `ABSENT` |
| 8 | approved budget | 🔴★인접 실재 = `auto_campaign.budget`(`AutoCampaign.php:844` 정수 한도·`:856` 비교 기준) — **승인된 예산 총액 성격 · 단 마케팅 채널 예산이지 승인 워크플로 산출물 아님** | `LEGACY_ADAPTER` |
| 9 | available budget reference | 🔴★인접 실재 = `periodSpentToDate:855`(기간 내 누적 지출) → `budget − spent = 잔여`(`:856` `$spent < $budget*$margin`) — **누적차감 후 가용예산 참조 실로직**(ⓑ §4:64) · 단 마케팅 도메인 | `LEGACY_ADAPTER` |
| 10 | amount band | 유일 인접 = `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`·boolean 스위치·ⓑ §4:53) — 금액 Band(구간) 아님 · 승인필요 여부만 켬 | `LEGACY_ADAPTER` |
| 11 | transfer authority | 🔴 예산 이전(transfer)/재배정 권한 개념 0 — `allocations`(`:848`)는 채널 배분이지 예산 이전 권한 아님 | `ABSENT` |
| 12 | over-budget policy | 🔴★인접 실재 = 상한 도달 시 전 채널 `pause`(`:864`) + `budget_cap_pause` 로그(`:878-879`) = **초과지출 차단 정책 실집행**(ⓑ §4:64) · 단 마케팅 pause 이지 재무 over-budget 승인/이월 정책 아님 | `LEGACY_ADAPTER` |
| 13 | valid period | 인접 = `auto_campaign.period` + `periodWindowStart:868` 기간창(`:847`,`:868`) — 반복 주기 개념 실재 · 🔴 단 `valid_from`/`valid_to` 폐구간 grep 0(ⓑ §5:72) | `LEGACY_ADAPTER` |
| 14 | status | 인접 = `auto_campaign.status='active'` 유지(`:841`,`:859-860`) 등 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5:72) | `LEGACY_ADAPTER` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash 교차·검증기·ⓑ §5:70) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]] · verify() 0·preimage ts 소실) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 1 · `ABSENT` 6 · `LEGACY_ADAPTER` 8.

> 🔴 **커버 0.** Budget Authority 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 8건(approved budget·available budget reference·over-budget policy·amount band·budget owner·valid period·status·evidence)은 **확장 대상 인접 자산**(예산한도·누적차감·상한집행 = `AutoCampaign:843-889` · evidence = `SecurityAudit`)이지 커버가 아니다. `ABSENT` 6건(budget version·fiscal year·budget organization·cost center·profit center·transfer authority)은 **저장계층부터 부재**임을 뜻한다.

## 2. 규칙

- 🔴 **원문 "Budget Owner라고 Payment·Settlement 권한을 자동 부여하지 마라"(§36 마지막 문장)를 §65 gap 으로 상속하지 마라** — Budget Owner ⇒ Payment/Settlement 자동전이는 §65 "Actor에게 Authority 없는데 승인 성공"·"Manager 자동 Authority" 유형과 동형이다. Budget Authority 신설 시 Payment 실행 권한·Settlement 승인 권한을 **별개 Authority 엔티티로 분리**하고 budget owner 비트가 결제/정산 가부를 판정하지 못하게 하라.
- 🔴★**`AutoCampaign.php:843-889` 는 마케팅 광고예산이지 재무 Budget Authority 가 아니다** — 한도+기간+누적차감+상한집행 로직은 레포 유일의 실 예산 페이싱이나(ⓑ §4:64) (a)도메인이 광고 채널 지출 (b)승인 워크플로가 아니라 자동 pause (c)fiscal year·cost/profit center·transfer authority 축 없음. **재무 Budget Authority 로 승격 시 도메인 확장이 선행**돼야 하며, 페이싱 패턴(`periodSpentToDate`·상한 비교·`budget_cap_pause`)은 **참조·확장**하되 **중복 예산엔진 신설 금지**(§73).
- 🔴 **`cost center`/`profit center`/`budget organization` 을 "있음"으로 표기 금지** — grep 0(저장계층 부재). 조직/원가/이익 중심점 축이 없는 상태에서 Budget Authority 플래그가 조직 스코프를 초과 선언하면 §65 gap 을 구조적으로 유발한다.
- 🔴 **`amount band` 는 `HIGH_VALUE_KRW` 상수를 §24 Amount Band 로 승격해 참조**([문서 `DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md`](DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md)) — 신규 임계 상수 추가 금지.
- 🔴 **evidence 를 `SecurityAudit::verify()` 로 확장**(재구현 금지) · `menu_audit_log.hash_chain`(verify() 0·preimage ts 소실) **인용 금지**.

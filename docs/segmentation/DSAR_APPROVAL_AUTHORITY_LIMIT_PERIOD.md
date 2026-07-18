# DSAR — Approval Authority Limit Period · 필수필드 (§30 분할2)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §30(1482-1524) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4(§30/§31 ★FLIP) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§30 측정기 정합)**: `measure_spec_denominator.mjs --sec=30` 실측 **31**(불릿 31·번호 0). §30 = **Period Type 16 + 필수필드 15 = 31**. 본 문서(분할2)는 **필수필드 15**를 전사한다. Period Type 16 = [DSAR_APPROVAL_AUTHORITY_PERIOD_TYPE.md](DSAR_APPROVAL_AUTHORITY_PERIOD_TYPE.md)(분할1).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_LIMIT_PERIOD` 엔티티 | 🔴 한도 집계 기간 엔티티 부재 · `approval_authority_limit_period` grep **0**(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| **유일 실 "한도+기간+누적차감"** = `AutoCampaign.php:843-889` | 🔴★ⓑ §4 FLIP — `periodSpentToDate:855`(기간 누적 지출)→`budget` 비교(`:856`)→상한 도달 시 `AdAdapters::pause:864`+`optimization_log:878` · 집계 = `SUM(spend)` `tenant_id`+`campaign_ext_id IN` (`:819`) · 창 = `periodWindowStart:816` | `LEGACY_ADAPTER`(마케팅 광고예산·승인 아님) |
| timezone 실값 | 🔴 `periodWindowStart`/`periodSpentToDate` 전부 `gmdate`(**UTC 고정**·`:797`,`:805`) — 테넌트 타임존 미반영 · authority timezone 축 없음 | `ABSENT`(집계 경계 UTC 하드코딩) |
| 예약(reservation) 계층 | 🔴 지출 = `performance_metrics.spend` **실현치 SUM만**(`:819`) — 예약/약정 원장 계층 전무 | `ABSENT`(Reservation 엔진 부재) |

★**Limit Period 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§30 필수필드 15**

| # | 원문 필드 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_limit_period_id | 엔티티 부재 → PK 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | period_type | 인접 = `AutoCampaign.period` 컬럼(`:847` `monthly`/`quarter`/`halfyear`/`annual`) — 마케팅 페이싱 값(승인 한도 기간 아님). **Type 열거·판정 상세=별문서** [DSAR_APPROVAL_AUTHORITY_PERIOD_TYPE.md](DSAR_APPROVAL_AUTHORITY_PERIOD_TYPE.md) | `LEGACY_ADAPTER` |
| 3 | fiscal calendar reference | 🔴 회계기간 캘린더 엔티티 0 · `periodWindowStart`는 달력 월초/N일 창일 뿐 회계기간 아님(ⓑ §57·§4) | `ABSENT` |
| 4 | rolling window days | 인접 = `periodWindowStart:798` `$days` 맵(90/180/365) — 단 **코드 하드코딩 리터럴**·테넌트/authority별 저장·설정값 아님(ⓑ §4) | `LEGACY_ADAPTER` |
| 5 | reset policy | 인접 = 기간마다 롤포워드 리셋(`periodWindowStart:801-804` `elapsedPeriods` 계산으로 현재 기간 시작 산출) — 단 **암묵적 코드 동작**·정책 선언 아님(ⓑ §4) | `LEGACY_ADAPTER` |
| 6 | timezone | 🔴 `gmdate` **UTC 고정**(`periodWindowStart:797,805`) — 테넌트 타임존 미반영 · 타임존 인접은 cron/스케줄 도메인(승인 한도 경계 아님·KEEP_SEPARATE 성격)이나 authority timezone 축 자체는 부재 | `ABSENT` |
| 7 | aggregation key policy | 인접 = `periodSpentToDate` 집계키 = `tenant_id` + `campaign_ext_id IN(...)`(`:819`) — 단 코드 고정 집계키·정책화 안 됨(마케팅 도메인·ⓑ §4) | `LEGACY_ADAPTER` |
| 8 | utilization source | 인접 = `SUM(spend) FROM performance_metrics`(`:819`) — AutoCampaign 누적 지출 소스(마케팅 예산 한정·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 9 | reservation support | 🔴 예약(reserve) 계층 부재 — 지출은 실현치 SUM만·예약/홀드 원장 0(ⓑ §4) | `ABSENT` |
| 10 | release policy | 🔴 예약 부재 → 해제(release)할 대상 없음 · release 정책 축 0(ⓑ §4) | `ABSENT` |
| 11 | reversal policy | 🔴 한도 집계 역분개(reverse) 계층 부재 — `performance_metrics.spend` SUM은 역분개 개념 없음(ⓑ §4) | `ABSENT` |
| 12 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval valid-from·수수료/VAT 도메인·`Db.php:898`·ⓑ §5 FLIP) — Limit Period 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 13 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 14 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2·5-3-3-3) | `LEGACY_ADAPTER` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사** (§30 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 8 · `ABSENT` 6 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Limit Period 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 8건은 **확장 대상 인접 자산**(period_type=AutoCampaign.period·utilization source=SUM(spend)·aggregation key=tenant+campaign_ext_id·reset=롤포워드·rolling window days=$days 하드코딩·valid_from=kr_fee_rule·status·evidence=SecurityAudit)이지 커버가 아니다 — 전부 마케팅/수수료/감사 인접 도메인이며 승인권한 한도 집계가 아니다. `ABSENT` 6건(fiscal calendar·timezone·reservation·release·reversal·valid_to)은 저장계층부터 부재. `NOT_APPLICABLE` 1건(PK)은 엔티티 부재의 종속.

## 2. 규칙

- 🔴 **utilization source/aggregation key 를 `AutoCampaign` SUM 로직으로 재구현하지 마라**(`LEGACY_ADAPTER`) — `SUM(spend) … tenant_id + campaign_ext_id IN`(`:819`)은 **마케팅 광고예산** 집계다. Limit Period 신설 시 그 누적·집계키 패턴을 참조하되 Authority 도메인 전용 utilization source 로 분리하라(중복 엔진 금지).
- 🔴 **reservation/release/reversal support 를 "있음"으로 표기 금지** — AutoCampaign 은 `performance_metrics.spend` **실현치 SUM만** 읽는다(`:819`). 예약/홀드/역분개 원장 계층이 저장계층부터 없다. 원문 §31 "실제 Ledger·Reservation Engine 은 기존 Finance·Approval Transaction Service 와 통합"이 전제하는 그 서비스가 **현행 부재**다 — 신설 시 예약 지원 플래그를 실제 능력 없이 켜면 §65 "누적 Limit 초과인데 승인 성공" gap 을 유발한다.
- 🔴 **timezone 을 `gmdate`(UTC) 로 두지 마라** — 현행 기간 경계는 UTC 하드코딩(`periodWindowStart:797,805`)이라 테넌트 로컬 자정 기준 DAILY/MONTHLY 리셋이 어긋난다. cron/스케줄 도메인의 타임존은 별도 관심사(KEEP_SEPARATE)이니 흡수하지 말고 Limit Period 전용 timezone 필드로 저장·집계 경계에 반영하라.
- 🔴 **valid_from/valid_to 를 `kr_fee_rule` 최신승 패턴으로 재구현하지 마라** — `effective_from`은 open-interval 이나 `valid_to`가 없어 질의계층이 전부 최신승(`ORDER BY effective_from DESC LIMIT 1`·ⓑ §57)이다. Limit Period 는 폐구간(valid_from + valid_to)으로 신설해 as-of 재구성을 1급 시민으로 세워라. reset policy 는 코드 암묵동작이 아니라 **명시 정책**으로 선언하라.

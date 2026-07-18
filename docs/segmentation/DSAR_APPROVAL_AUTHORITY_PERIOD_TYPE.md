# DSAR — Approval Authority Limit Period · Period Type (§30 분할1)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §30(1482-1524) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4(§30/§31 ★FLIP) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§30 측정기 정합)**: `measure_spec_denominator.mjs --sec=30` 실측 **31**(불릿 31·번호 0). §30 = **Period Type 16 + 필수필드 15 = 31**. 본 문서(분할1)는 **Period Type 16**을 전사한다. 필수필드 15 = [DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md](DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md)(분할2).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_LIMIT_PERIOD` 엔티티 | 🔴 Registry(§6)·Matrix(§12)·Utilization(§31) 전량 부재 → Limit Period(한도 집계 기간) 엔티티 부재 · `daily_limit`·`monthly_limit`·`annual_limit` grep **0**(광고 budget_cap 외·ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| **유일 실 "기간+누적차감" 로직** = `AutoCampaign.php:843-889` | 🔴★ⓑ §4 FLIP — `periodSpentToDate:855`(기간 내 누적 지출)→`budget` 비교(`:856`)→상한 도달 시 `AdAdapters::pause:864`+`optimization_log action='budget_cap_pause':878`. **기간 창은 `periodWindowStart:795`**(`period` 컬럼 `:847`으로 분기·기간마다 롤포워드 리셋 `:801-804`) | `LEGACY_ADAPTER`(마케팅 광고예산 페이싱 · 승인 워크플로 아님) |
| period 컬럼 실값 = **`monthly`/`quarter`/`halfyear`/`annual`**(기타 30d 기본) | `periodWindowStart:797-798` — `monthly`→달력 월초·`quarter`→90d·`halfyear`→180d·`annual`→365d · **`daily`/`weekly` 값 없음**(코드 미분기) | `LEGACY_ADAPTER`(MONTHLY/QUARTERLY/ANNUAL만 인접) |

★**Limit Period 엔티티 전체가 부재하므로 Period Type 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **AutoCampaign의 period 값이 특정 Period Type에 인접해도 그것은 `authority limit period`(승인권한 한도 집계 기간)가 아니라 마케팅 광고예산 페이싱 창**이다.

## 1. 원문 전사 + 판정 — **§30 Period Type 16**

| # | 원문 Period Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PER_TRANSACTION | 건당 authority 한도 축 부재 · 금액축(monetary authority) 자체가 없음(ⓑ §4) · HIGH_VALUE_KRW는 필요여부 boolean만(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | PER_APPROVAL_CASE | 건별 한도 부재 · `required_approvals`는 고정 상수 2(리터럴 `Mapping.php:209`·`Db.php:634 DEFAULT 2`)로 금액·건종류 무관(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | PER_ITEM | 품목 단위 한도 집계 부재 · 품목축 authority 없음(ⓑ §4) | `NOT_APPLICABLE` |
| 4 | PER_PROGRAM | 프로그램 단위 집계 부재 · `program_limit` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 5 | PER_PROJECT | 프로젝트 단위 집계 부재 · 프로젝트 축 0(ⓑ §1) | `NOT_APPLICABLE` |
| 6 | PER_COST_CENTER | 🔴 Cost Center 엔티티 0 — `cost_center_limit`·`cost_center` grep 0(ⓑ §1) | `ABSENT` |
| 7 | PER_PROFIT_CENTER | 🔴 Profit Center 엔티티 0 — profit center 집계 축 grep 0(ⓑ §1) | `ABSENT` |
| 8 | DAILY | 일 단위 집계 부재 · AutoCampaign `period` 값에 `daily` 미분기(`periodWindowStart:797-798`) · `daily_limit`=광고 budget_cap 외 0(ⓑ §1) | `NOT_APPLICABLE` |
| 9 | WEEKLY | 주 단위 집계 부재 · AutoCampaign `period` 값에 `weekly` 미분기(ⓑ §4) | `NOT_APPLICABLE` |
| 10 | MONTHLY | 인접 실재 = `AutoCampaign` `period='monthly'` → `periodWindowStart:797` 달력 월초 기준 누적(`periodSpentToDate:855`·기간마다 리셋) — 단 마케팅 광고예산 페이싱(승인 한도 아님·ⓑ §4) | `LEGACY_ADAPTER` |
| 11 | QUARTERLY | 인접 실재 = `AutoCampaign` `period='quarter'` → `periodWindowStart:798` 90d 창 누적(롤포워드 리셋 `:801-804`) — 마케팅 도메인 한정(ⓑ §4) | `LEGACY_ADAPTER` |
| 12 | ANNUAL | 인접 실재 = `AutoCampaign` `period='annual'` → `periodWindowStart:798` 365d 창 누적 — 마케팅 도메인 한정(ⓑ §4) | `LEGACY_ADAPTER` |
| 13 | FISCAL_PERIOD | 🔴 회계기간 캘린더 부재 · fiscal calendar reference 원천 0(ⓑ §4·§57) — AutoCampaign은 달력/롤포워드일 뿐 회계기간 아님 | `NOT_APPLICABLE` |
| 14 | ROLLING_DAYS | 롤링 윈도우 설정 축 부재 · AutoCampaign `$days` 맵은 90/180/365 **하드코딩**(`periodWindowStart:798`)이지 테넌트/authority별 설정값 아님(ⓑ §4) | `NOT_APPLICABLE` |
| 15 | LIFETIME | 누적(무기한) 한도 집계 부재 · lifetime authority 축 0(ⓑ §1·§4) | `NOT_APPLICABLE` |
| 16 | CUSTOM | 확장 Period Type 카탈로그 부재(ⓑ §1) | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사** (§30 Period Type). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `ABSENT` 2 · `NOT_APPLICABLE` 11.

> 🔴 **커버 0.** Limit Period 엔티티가 통째로 부재하므로 어떤 Period Type도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(MONTHLY/QUARTERLY/ANNUAL = AutoCampaign 광고예산 페이싱 창)은 **확장 대상 인접 자산**이지 커버가 아니다 — 마케팅 도메인·승인 워크플로 아님. `ABSENT` 2건(PER_COST_CENTER/PER_PROFIT_CENTER)은 집계 축(Cost/Profit Center) 자체가 부재. 나머지 11건은 authority 한도 집계 기간 축이 구조적으로 부재하여 `NOT_APPLICABLE`.

## 2. 규칙

- 🔴 **MONTHLY/QUARTERLY/ANNUAL 를 `AutoCampaign` 페이싱 로직으로 재구현하지 마라**(`LEGACY_ADAPTER`) — `periodWindowStart`/`periodSpentToDate`(`:795`,`:812`)는 **마케팅 광고예산** 도메인의 누적·리셋 패턴이지 승인권한 한도 집계가 아니다. Limit Period 신설 시 그 **기간 창 계산·기간별 리셋 롤포워드 패턴**을 참조하되(중복 엔진 금지), Authority 도메인 전용 집계 축으로 분리하라.
- 🔴 **DAILY/WEEKLY/ROLLING_DAYS 를 "있음"으로 표기 금지** — AutoCampaign `period` 컬럼은 `monthly`/`quarter`/`halfyear`/`annual`만 분기하고 `daily`/`weekly`는 미분기(`periodWindowStart:797-798`)다. 인접 자산이 특정 Type만 커버한다고 전 Type 지원으로 승격하면 §65 "누적 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **`$days` 하드코딩 맵(90/180/365)을 ROLLING_DAYS 설정으로 오인하지 마라** — 이는 코드 리터럴이지 테넌트/authority별 저장·설정값이 아니다(effective dating 부재·ⓑ §5). ROLLING_DAYS 는 신설 필수필드 `rolling window days`([DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md](DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md))로 저장·버전화하라.
- 🔴 **FISCAL_PERIOD 를 달력 롤포워드로 대체하지 마라** — `periodWindowStart`는 달력 월초·N일 창일 뿐 회계기간(fiscal calendar) 개념이 없다(ⓑ §57). Period Type 16종을 ENUM 하드코딩하지 말고 확장 가능 카탈로그로 두어라(5-3-3-1 §8 `pm_audit_log.entity_type` ENUM INSERT 예외 선례 반복 금지).

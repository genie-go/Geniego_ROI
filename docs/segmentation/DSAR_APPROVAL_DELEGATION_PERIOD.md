# DSAR — Approval Delegation Period (§20)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §20 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · Type: [DSAR_APPROVAL_DELEGATION_TYPE.md](DSAR_APPROVAL_DELEGATION_TYPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=20` → **§20 = 19**(줄범위 1078-1107 · 불릿 19 · 번호 0). 분할 = **필수필드 19**(하위 ENUM 없음 · period_id/version_id 2 + start_at/end_at/timezone/all-day 4 + recurrence policy/business calendar reference/holiday policy 3 + early activation/automatic activation/automatic expiration/grace period/review date/maximum duration policy 6 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_PERIOD` 엔티티 | `delegation_period`·`delegated_period` grep **0** — 위임 유효기간 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| Delegation 시작/종료(start_at·end_at) | 🔴 위임 자체가 부재 → 위임 **시작·종료 시점 개념 0** · `acl_permission` 위임상한도 **영구**(expiry 컬럼 없음·ⓑ §2.1) | `ABSENT` |
| Effective 개념(인접) | 인접 = `kr_fee_rule.effective_from`(수수료 open-interval·`KrChannel.php:102,151,459`·`Pnl.php:454`) — 수수료 도메인·위임 기간 아님 | `LEGACY_ADAPTER` |
| Timezone(인접) | 인접 = `gmdate()` **UTC 각인**(`AbTesting.php:154` 등 전역 서버시각 UTC) — 위임 tz 필드 아님 | `LEGACY_ADAPTER` |
| Business Calendar/Holiday | 🔴 영업일/휴일 캘린더 **0** · `sharedCalendarEvents`/`DEMO_CALENDAR_EVENTS`=**콘텐츠 캘린더**(OOO/영업일 아님·오탐·ⓑ §1) | `ABSENT` |
| 자동 활성/만료 스케줄러 | 🔴 위임 자동 활성/만료 워커 **0**(스케줄 위임 개념 부재) | `ABSENT` |

★**Delegation Period 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 19종**(필수 필드 19 · 하위 ENUM 없음)

### 필수 필드 (19)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_period_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | start_at | 🔴 위임 시작 시점 개념 0 · `acl_permission` 위임상한=영구(시작/종료 컬럼 없음·ⓑ §2.1) | `ABSENT` |
| 4 | end_at | 🔴 위임 종료 시점 개념 0(expiry 컬럼 부재) — 원문 §5.3 "모든 Delegation 에 시작·종료" 충족 대상 없음 | `ABSENT` |
| 5 | timezone | 인접 = `gmdate()` UTC 각인(`AbTesting.php:154` 등 전역 서버시각 UTC) — 위임 period tz 필드 아님 | `LEGACY_ADAPTER` |
| 6 | all-day 여부 | 종일 위임 개념 0 | `ABSENT` |
| 7 | recurrence policy | 반복 위임(주기) 개념 0(인접 `cycle`=빌링주기/lifecycle 오탐·ⓑ 헤더) | `ABSENT` |
| 8 | business calendar reference | 🔴 영업일 캘린더 0 · `sharedCalendarEvents`=콘텐츠 캘린더 오탐 | `ABSENT` |
| 9 | holiday policy | 휴일 정책 0 | `ABSENT` |
| 10 | early activation allowed 여부 | 조기 활성 개념 0 | `ABSENT` |
| 11 | automatic activation 여부 | 🔴 위임 자동 활성 스케줄러/워커 0 | `ABSENT` |
| 12 | automatic expiration 여부 | 🔴 위임 자동 만료 스케줄러/워커 0 — 원문 §5.11 "Decision 시점 만료 재검증" 대상 계층 부재 | `ABSENT` |
| 13 | grace period | 유예기간 개념 0 | `ABSENT` |
| 14 | review date | 🔴 Review Date 개념 0 — `PERMANENT_WITH_REVIEW`(§8) Review Date 필수인데 저장 대상 부재 | `ABSENT` |
| 15 | maximum duration policy | 최대 위임 기간 정책 0 | `ABSENT` |
| 16 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·`KrChannel.php:102`·ⓑ §2) — Period 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 17 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 18 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 19 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4 · `ABSENT` 13 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Delegation Period 엔티티가 전면 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건(timezone→gmdate UTC·valid_from→kr_fee_rule.effective_from·status·evidence)은 **확장/참조 대상 인접 자산**이지 커버가 아니다 — `effective_from` 은 **수수료 open-interval** 이지 위임 기간이 아니며, `gmdate` UTC 는 위임 timezone 필드가 아니다. 시작/종료/Review Date 를 포함한 기간 축 13필드는 Delegation Period 엔티티 신설이 **선행**돼야 존재한다.

## 2. 규칙

- 🔴 **원문 §20 "종료일 없는 Delegation 은 `PERMANENT_WITH_REVIEW` 유형에서만 허용하며 Review Date 를 필수로 요구하라" — 그러나 현행엔 기간 축 자체가 없다.** 스펙은 종료일 없는 Temporary Delegation 을 차단하고 영구성 위임은 `PERMANENT_WITH_REVIEW`(§8) + Review Date 필수로 규정하지만, 현행 레포에는 **위임 기간 엔티티가 전면 부재**(`start_at`/`end_at`/`review date` 저장 대상 0·`acl_permission` 위임상한=영구·expiry 컬럼 없음)하여 이 게이트를 집행할 대상이 없다. 따라서 `start_at`·`end_at`·`review date`=`ABSENT` — **Delegation Period 신설이 선행**돼야 "종료일 없는 위임 차단" 규칙이 성립한다. 현행의 영구적 acl 위임상한을 "PERMANENT_WITH_REVIEW 준수"로 오독하지 마라(Review Date 없는 영구는 스펙 위반·우연한 부재≠준수·§58 ⑦).
- 🔴 **`timezone` 을 `gmdate()` UTC 각인으로 대체하지 마라** — `gmdate()`(`AbTesting.php:154` 등)는 서버 전역 시각을 UTC 로 각인하는 **표기 관례**이지 위임 period 의 tz 필드가 아니다. 원문 §0 "위임은 언제 시작되고 언제 종료되는가"는 테넌트/법인 로컬 tz + `start_at`/`end_at` 를 기록해야 성립한다.
- 🔴 **`automatic activation`/`automatic expiration` 을 "없음=수동 안전"으로 처리 금지** — 자동 활성/만료 스케줄러가 부재(`ABSENT`)하므로, 원문 §5.11 "Decision 시점에 Delegation 이 만료/취소/정지되면 승인 불가" 재검증이 얹힐 만료 판정 계층부터 없다. 신설 시 만료는 **Decision 시점 재계산(fail-closed)** 으로 두고, `business calendar reference`/`holiday policy` 는 영업일 캘린더 신설과 연동하라(`sharedCalendarEvents` 콘텐츠 캘린더 재사용 금지).
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규 도입. `valid_from` 은 `kr_fee_rule.effective_from` 질의계층을 참조하되 수수료 도메인과 혼용 금지.

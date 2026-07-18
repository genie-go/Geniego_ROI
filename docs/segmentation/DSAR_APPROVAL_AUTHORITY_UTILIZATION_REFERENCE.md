# DSAR — Authority Utilization Reference (§31)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §31(1525-1562) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4(§30/§31 ★FLIP) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§31 측정기 정합)**: `measure_spec_denominator.mjs --sec=31` 실측 **25**(불릿 25·번호 0). §31 = **필수필드 25**. 본 문서가 전량 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_UTILIZATION_REFERENCE` 엔티티 | 🔴 누적 사용량 Reference Contract 엔티티 부재 · `authority_utilization`·`cumulative_authority` grep **0**(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| **유일 실 "누적 사용량" 계산** = `AutoCampaign.php:843-889` | 🔴★ⓑ §4 FLIP — `periodSpentToDate:855`(기간 누적 지출 = `approved`/실현 사용량)→`budget` 비교(`:856`)로 `remaining`(=budget-spent) 판정 · 소스 = `SUM(spend) FROM performance_metrics`(`:819`) | `LEGACY_ADAPTER`(마케팅 광고예산 한정·승인 아님) |
| Ledger/Reservation 계층 | 🔴 원문(`:1559`) "실제 Ledger·Reservation Engine 은 기존 Finance·Approval Transaction Service 와 통합"이 전제하는 그 서비스가 **현행 부재** — 지출은 실현치 SUM만·committed/reserved/pending 원장 0(ⓑ §4) | `ABSENT`(Ledger/Reservation 엔진 부재) |

★**Utilization Reference 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **AutoCampaign 의 누적 지출은 `approved`(실현 사용) 한 상태만** 계산할 뿐, §32의 9개 상태(Pending/Reserved/Committed/…)를 구분하지 않는다.

## 1. 원문 전사 + 판정 — **§31 필수필드 25**

| # | 원문 필드 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | authority_utilization_reference_id | 엔티티 부재 → PK 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | authority definition | 🔴 Authority Definition 엔티티 0 — "Approval Authority(Domain·Action·Scope·Amount)" 개념 자체 부재(ⓑ §0·§1) | `NOT_APPLICABLE` |
| 3 | authority version | 🔴 불변 prev-링크 버전체인 선례 0 · version 컬럼 6개 전부 하드코딩/서술 태그(ⓑ §5) | `ABSENT` |
| 4 | subject | 🔴 authority 보유 주체(사람) 반환 축 부재 — Manager Resolver ABSENT·`parent_user_id` 판독은 owner/tenant 상속뿐(ⓑ §3) | `ABSENT` |
| 5 | role | 인접 = `roleRank`(api-key API 등급·`index.php:554`)/`team_role`(owner>manager>member) — 단 두 축 완전 직교·승인 authority role 아님(ⓑ §4.2·§3) | `LEGACY_ADAPTER` |
| 6 | position | 🔴 직급/직위 축 0 — `position_threshold`·`job_grade_threshold` grep 0(ⓑ §1) | `ABSENT` |
| 7 | legal entity | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`legal_entity_limit` grep 0(ⓑ §1) | `ABSENT` |
| 8 | organization | 인접 = 누적 스코프 = `tenant_id`(`AutoCampaign:846` 집계키) + `seedOrg` 조직 시드(`TeamPermissions.php:708~717`) — 단 authority-utilization 조직 축 아님(ⓑ §2) | `LEGACY_ADAPTER` |
| 9 | resource | 인접 = 누적 대상 = `campaign_ext_id IN(...)`(`AutoCampaign:819`)·`acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — authority 리소스 스코프 아님(ⓑ §4·§3) | `LEGACY_ADAPTER` |
| 10 | currency | 🔴 통화 스코프 0 · 금액은 KRW 암묵·multi-currency support 부재(`Connectors.php:1790`·ⓑ §4) | `ABSENT` |
| 11 | limit period | 인접 = `AutoCampaign.period`(`:847`) + `periodWindowStart`(`:795`) 기간 창 — 마케팅 페이싱 기간([DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md](DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md)) | `LEGACY_ADAPTER` |
| 12 | period start | 인접 = `periodWindowStart:816`(`winStart` 산출 → 집계 하한 `date >= winStart` `:819`) — 마케팅 도메인 한정(ⓑ §4) | `LEGACY_ADAPTER` |
| 13 | period end | 인접 = 집계 상한 = **암묵적 now**(`periodSpentToDate`는 `winStart..현재` 무경계·저장 안 됨) — 명시 period end 컬럼 없음(ⓑ §4) | `LEGACY_ADAPTER` |
| 14 | approved amount | 인접 = `periodSpentToDate:855` 기간 누적 지출(=실현 사용량) → `budget` 비교(`:856`) — 마케팅 광고예산 한정(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 15 | committed amount | 🔴 약정(commit) 원장 부재 — `commitment_authority` grep 0 · 지출은 실현치 SUM만(ⓑ §1·§4) | `ABSENT` |
| 16 | pending amount | 🔴 대기(pending) 금액 원장 부재 — 상태별 금액 구분 축 0(ⓑ §4) | `ABSENT` |
| 17 | reserved amount | 🔴 예약(reserve) 금액 원장 부재 — Reservation 엔진 부재(ⓑ §4) | `ABSENT` |
| 18 | reversed amount | 🔴 역분개(reverse) 금액 원장 부재 — 한도 집계 역분개 계층 0(ⓑ §4) | `ABSENT` |
| 19 | released amount | 🔴 해제(release) 금액 원장 부재 — 예약 부재로 해제 대상 없음(ⓑ §4) | `ABSENT` |
| 20 | remaining amount | 인접 = `budget - spent` 암묵 계산(`AutoCampaign:856` `$spent < $budget*$margin`) — 마케팅 광고예산 한정·상태 미구분(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 21 | source transactions | 인접 = 소스 = `performance_metrics` 지출행 SUM(`:819`) — 마케팅 성과 지표행(승인 트랜잭션 아님·ⓑ §4) | `LEGACY_ADAPTER` |
| 22 | calculated_at | 🔴 누적 사용량 스냅샷 미보존 — `periodSpentToDate`는 매 실행 **라이브 재계산**·persisted calculated_at 0(ⓑ §5 Actor Snapshot ABSENT 동축) | `ABSENT` |
| 23 | consistency state | 🔴 대사(reconciliation) 계층 부재 — Authority 정의 vs 실 부여 대사 0·Tenant 마스터 부재로 대사 기준 자체 없음(ⓑ §7 §63) | `ABSENT` |
| 24 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2·5-3-3-3) | `LEGACY_ADAPTER` |
| 25 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 25 / 25 전사** (§31 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 11 · `ABSENT` 12 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Utilization Reference 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 11건은 **확장 대상 인접 자산**(approved/remaining amount·period start/end·source transactions=AutoCampaign 지출 누적 · limit period=마케팅 기간 · role/organization/resource=직교 권한/스코프 · status · evidence=SecurityAudit)이지 커버가 아니다 — **전부 마케팅 예산 or 직교 권한 도메인**이며 승인권한 누적 사용량이 아니다. `ABSENT` 12건은 상태별 금액 원장(committed/pending/reserved/reversed/released)·통화·직위·법인·버전·calculated_at·consistency state 로 **저장계층부터 부재**. `NOT_APPLICABLE` 2건(PK·authority definition)은 상위 엔티티 부재의 종속.

## 2. 규칙

- 🔴 **원문 §31 전제 "실제 Ledger·Reservation Engine 은 기존 Finance·Approval Transaction Service 와 통합"의 그 서비스가 현행 부재다** — committed/reserved/pending/reversed/released 를 담을 원장 계층이 저장계층부터 없다(ⓑ §4). Utilization Reference 신설 시 이 다섯 금액 상태를 **실제 능력 없이 필드만 채워 넣지 마라** — 값이 항상 0 인 fake-looks-real 을 만들면 §65 "누적 Limit 초과인데 승인 성공" gap 을 구조적으로 재현한다.
- 🔴 **approved/remaining amount 를 `AutoCampaign` 로직으로 재구현하지 마라**(`LEGACY_ADAPTER`) — `periodSpentToDate`(`:855`)·`budget-spent`(`:856`)는 **마케팅 광고예산** 누적이지 승인권한 사용량이 아니다. 그 누적 패턴을 참조하되 Authority 도메인 전용 utilization source 로 분리하라(중복 엔진 금지). remaining 은 §32 상태 정책에 따라 계산하라(하드코딩 금지 — [DSAR_APPROVAL_AUTHORITY_UTILIZATION_POLICY.md](DSAR_APPROVAL_AUTHORITY_UTILIZATION_POLICY.md)).
- 🔴 **calculated_at/consistency state 를 라이브 재계산으로 대체하지 마라** — `periodSpentToDate`는 매 실행 재계산이라 as-of 스냅샷·대사 기준이 없다(ⓑ §5·§7). Utilization Reference 는 계산 시점(calculated_at)과 정합 상태(consistency state)를 보존해 Authority 정의 vs 실 사용량 대사(§63 Reconciliation)를 가능케 하라 — 단 Tenant 마스터 부재(ⓑ §7)를 상속하지 말고 권위 tenant 참조를 선결하라.
- 🔴 **subject/position/legal entity 를 `parent_user_id`/role 축으로 오인하지 마라** — Manager Resolver 는 상급자(사람)를 반환하지 않고(ⓑ §3), roleRank/team_role 은 완전 직교하며(ⓑ §4.2), Legal Entity 는 엔티티 0 이다. 누적 사용량의 귀속 주체 축을 신설하되 `parent_user_id` 의미를 변경하면 tenant 해석이 전역 붕괴하므로 재사용 금지.

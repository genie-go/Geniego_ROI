# DSAR — Approval Authority Conflict Type (§53 · 열거)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §53(2165-2213) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · 필수 필드: [DSAR_APPROVAL_AUTHORITY_CONFLICT.md](DSAR_APPROVAL_AUTHORITY_CONFLICT.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **분모 분할**: §53 측정기 합계 = **40**(필수 필드 20 + Conflict Type 20). 본 문서는 **분할 2/2 = Conflict Type 20**을 다룬다. 필수 필드 20은 [DSAR_APPROVAL_AUTHORITY_CONFLICT.md](DSAR_APPROVAL_AUTHORITY_CONFLICT.md)(분할 1/2). §54 Conflict Resolution 권장 순서 13종은 [DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md](DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_CONFLICT` 엔티티 | `authority_conflict`·`approval_conflict` grep **0** — Authority 충돌 탐지/해소 개념 통째 부재. 승인은 단일 게이트 통과/거부만(ⓑ §6) | `NOT_APPLICABLE`(부재→신설) |
| 🔴 "conflict" 60+ 히트 = **전부 오탐** | SQL `ON CONFLICT ... DO UPDATE` upsert 다수 + `RuleEngine.php:250` `ad_schedule` precedence(마케팅 세그 규칙 우선순위) — **Authority 충돌과 무관**(ⓑ §6) | `KEEP_SEPARATE_WITH_REASON` |
| explicit deny 표현 | 🔴 `acl_permission` = **allow-only**(deny 비트·거부 표현 자체 없음·ⓑ §6) → ALLOW_DENY / MULTIPLE_DENY 성립 불가 | `ABSENT` |
| 복수 Authority 후보 | 🔴 후보 도출(§47) 부재 · binding/authority 복수성 자체 없음(ⓑ §3·§6) → 어떤 유형의 충돌도 발동 대상이 없음 | `BLOCKED_PREREQUISITE` |
| 임계(Threshold) 저장 | 🔴 임계 저장 **0**(§28 커버 0·`HIGH_VALUE_KRW` 상수만·ⓑ §4) → THRESHOLD_OVERLAP/GAP 판정 원천 부재 | `BLOCKED_THRESHOLD_CONFLICT` |

★**Conflict 탐지 엔진이 통째 부재**하므로 충돌 유형 열거는 **원문 신설 카탈로그**다. 아래 20종은 전부 "탐지·발동 대상이 없음"을 기록하며, THRESHOLD_OVERLAP/GAP만은 **임계 자체가 없어 gap 판정을 시작조차 못하는**(§65 gap 원천) 상태다.

## 1. 원문 전사 + 판정 — **Conflict Type 20**(§53 분할 2/2 · 측정기 40 중 20)

| # | 원문 Type | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | ALLOW_DENY_CONFLICT | 🔴 deny 표현 자체 부재 — `acl_permission`=allow-only(ⓑ §6) · allow vs deny 충돌이 성립할 deny 축이 없음 | `ABSENT` |
| 2 | MULTIPLE_ALLOW_DIFFERENT_LIMIT | 복수 allow Authority(서로 다른 한도) 부재 — Authority 후보 복수성·금액 한도축 전무(ⓑ §4·§6) | `NOT_APPLICABLE` |
| 3 | MULTIPLE_DENY_CONFLICT | 복수 deny 충돌 부재 — deny 표현 자체가 없어(ⓑ §6) 복수 deny는 더욱 불가 | `NOT_APPLICABLE` |
| 4 | SUBJECT_ROLE_CONFLICT | Subject vs Role Authority 충돌 부재 — 승인 자격 판독 축이 없음(ⓑ §3 "정본 축 부재") | `NOT_APPLICABLE` |
| 5 | ROLE_POSITION_CONFLICT | Role vs Position 충돌 부재 — Position(직위) binding 개념 0(ⓑ §3) | `NOT_APPLICABLE` |
| 6 | POSITION_ORGANIZATION_CONFLICT | Position vs Organization 충돌 부재 — 사람 계층 walk 0·`parent_user_id`는 tenant/owner용(ⓑ §3) | `NOT_APPLICABLE` |
| 7 | LEGAL_ENTITY_CONFLICT | Legal Entity 충돌 부재 — Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ Registry §12) | `NOT_APPLICABLE` |
| 8 | GEOGRAPHIC_CONFLICT | 지리 Authority 충돌 부재 — `Geo`(IP→ISO→언어)는 Authority 지리 스코프 아님(ⓑ Registry §13) | `NOT_APPLICABLE` |
| 9 | RESOURCE_SCOPE_CONFLICT | 리소스 스코프 충돌 부재 — `acl_permission` scopeSql은 데이터-행 필터(장식)·Authority 리소스 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 10 | ACTION_SCOPE_CONFLICT | Action 스코프 충돌 부재 — Authority Action 축 자체 없음(ⓑ §6) | `NOT_APPLICABLE` |
| 11 | CURRENCY_CONFLICT | 통화 충돌 부재 — 통화 스코프 0·변환 전용(`Connectors.php:1749`·ⓑ §4) | `NOT_APPLICABLE` |
| 12 | THRESHOLD_OVERLAP | 🔴 임계 겹침 판정 원천 부재 — 임계 저장 0(§28 커버 0)·`HIGH_VALUE_KRW` 상수만(boolean 게이트·ⓑ §4) → lower/upper 자체가 없어 겹침을 계산할 두 임계가 없음(§65 gap 원천) | `BLOCKED_THRESHOLD_CONFLICT` |
| 13 | THRESHOLD_GAP | 🔴 임계 구멍 판정 원천 부재 — 동일(§28 임계 미저장) · 밴드/폐구간 부재로 연속성 검사 대상 없음(ⓑ §4·§8) | `BLOCKED_THRESHOLD_CONFLICT` |
| 14 | PERIOD_LIMIT_CONFLICT | 기간 한도 충돌 부재 — 승인 도메인 기간 한도 0(`AutoCampaign` 예산은 마케팅·승인 아님·ⓑ §4 §31) | `NOT_APPLICABLE` |
| 15 | UTILIZATION_CONFLICT | 사용량 충돌 부재 — 승인 Authority 누적사용량 축 0(§31·ⓑ §4) | `NOT_APPLICABLE` |
| 16 | SOURCE_PRIORITY_CONFLICT | 소스 우선순위 충돌 부재 — Authority 소스 우선순위(§48) 코드 0(ⓑ §6) | `NOT_APPLICABLE` |
| 17 | VERSION_CONFLICT | 버전 충돌 부재 — 불변 prev-링크 버전체인 선례 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `NOT_APPLICABLE` |
| 18 | EXPIRED_AUTHORITY_ACTIVE | 만료 Authority 활성 충돌 부재 — effective dating(valid_to/effective_to) grep 0(ⓑ §5)·만료 판정 대상 Authority 없음 | `NOT_APPLICABLE` |
| 19 | INELIGIBLE_AUTHORITY | 부적격 Authority 충돌 부재 — Eligibility 판정(§45/§46) `BLOCKED_PREREQUISITE`(자격 판독 축 부재·ⓑ §3) | `NOT_APPLICABLE` |
| 20 | CUSTOM | 사용자 정의 충돌 유형 부재 | `NOT_APPLICABLE` |

**실측 개수: 20 / 20 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 1(#1) · `BLOCKED_THRESHOLD_CONFLICT` 2(#12·13) · `NOT_APPLICABLE` 17(#2~11·14~20).

> 🔴 **커버 0.** Conflict 탐지/해소가 통째 부재하므로 어떤 유형도 `VALIDATED_LEGACY` 가 아니다. 20종 중 18종은 "충돌을 발동시킬 복수 Authority·deny 축·판독 축 자체가 없음"이고, THRESHOLD_OVERLAP/GAP 2종은 **임계 저장이 없어 판정을 시작조차 못하는**(§65 gap 원천) `BLOCKED_THRESHOLD_CONFLICT` 다.
> 🔴 **오탐 명기 (재플래그 금지)**: 레포의 "conflict" 60+ 히트는 **전부** SQL `ON CONFLICT ... DO UPDATE`(upsert) 또는 `RuleEngine.php:250` `ad_schedule` precedence(마케팅 세그 규칙 우선순위)다 — **Authority 충돌과 무관**하다(ⓑ §6). 이를 "충돌 해소 구현 존재"로 오판하지 마라.

## 2. 규칙

- 🔴 **`ON CONFLICT` upsert·RuleEngine precedence 를 "충돌 해소 구현"으로 오독 금지** — DB upsert 는 행 중복 병합이고 RuleEngine precedence 는 광고 스케줄 규칙 우선순위(`:250`)다. Authority 후보 간 ALLOW/DENY/한도 충돌 해소(§54)는 별개이며 코드 부재다(ⓑ §6).
- 🔴 **deny 없는 상태에서 ALLOW_DENY / MULTIPLE_DENY 를 "탐지 가능"으로 표기 금지** — `acl_permission` 은 allow-only 다(ⓑ §6). explicit deny 표현(§54 1순위)을 먼저 신설해야 이 두 유형이 성립한다.
- 🔴 **THRESHOLD_OVERLAP/GAP 를 임계 저장 없이 구현 금지** — 겹침/구멍은 **두 개 이상의 lower/upper 임계**를 전제한다. §28 Threshold(lower_limit/upper_limit)·§24 Amount Band 신설이 선행이며, 이것 없이는 `HIGH_VALUE_KRW` 단일 boolean 상수만 있어 판정 대상이 없다(§65 "Amount가 Limit 초과인데 승인 성공" gap 의 구조적 원천).
- 🔴 **Conflict Type 20종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로. CUSTOM(#20) 확장을 스키마 변경 없이 수용해야 한다.

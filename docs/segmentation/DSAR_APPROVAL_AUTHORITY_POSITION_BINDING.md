# DSAR — Position Authority Binding (§18)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §18(1067-1091) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_POSITION_BINDING` 엔티티 | `position_authority`·`position_binding` grep **0** — Position↔Authority 결속 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| Position(직급/직위) 엔티티 | 🔴 **부재** — `position`·`job_title`·`job_grade`·`job_level` grep 0(오탐 `po_*`=Price Optimization · `position`=CSS/DOM 좌표 제외) · 사람의 직급/직위 마스터 없음 | `ABSENT` |
| Incumbent(재직자) 엔티티 | 🔴 **부재** — `incumbent`/`office_holder` 0 · 사람↔직위 배정 테이블 없음 · `parent_user_id`은 owner/tenant 상속용이지 직위 배정 아님(ⓑ §3) | `ABSENT` |
| 공석(Vacancy) 정책 | 🔴 **부재** — vacancy/공석 정책 0 · §65 "Position Vacancy Actor" gap 대상 | `ABSENT` |

★**Position·Incumbent·Vacancy 3 엔티티가 전무하므로 Position Binding 은 결속할 대상 자체가 없다.** 아래 15필드는 전량 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이"만 기록한다. 커버 대상 인접 자산조차 없다(Role Binding §17 이 roleRank 인접을 갖던 것과 대비 · 직위 축은 인접 자산 0).

## 1. 원문 전사 + 판정 — **원문 15종**(필수 필드 15)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | position_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 결속 대상 Authority Matrix Entry(§16) 미신설 → FK 없음 | `NOT_APPLICABLE` |
| 3 | position_id | 🔴 Position(직급/직위) 엔티티 0 — 참조할 직위 없음 | `ABSENT` |
| 4 | position version | 🔴 직위 엔티티 부재 → 버전 축 없음 · 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 5 | incumbent required 여부 | 🔴 Incumbent(재직자) 엔티티 0 — 필수 재직자 판정 불가 | `ABSENT` |
| 6 | vacancy policy | 🔴 공석 정책 0 — §65 "공석 Position Actor 자동 해석 금지" gap 대상(원문 §18 말미) | `ABSENT` |
| 7 | organization scope | 🔴 조직 엔티티 부재 확정(5-3-3-1 · `organization_unit` 0) — 직위 조직 스코프 원천 불가 | `ABSENT` |
| 8 | legal entity scope | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` 0 · ⓑ §4) | `ABSENT` |
| 9 | minimum job level | 🔴 job level/직급 서열 축 0(오탐 `HIGH_VALUE_KRW` 금액상수 제외) | `ABSENT` |
| 10 | executive level | 🔴 임원/executive 직급 구분 0 | `ABSENT` |
| 11 | multiple incumbent policy | 🔴 복수 재직자 정책 0(재직자 엔티티부터 부재) | `ABSENT` |
| 12 | valid_from | 🔴 직위 엔티티 부재로 바인딩 무발동 · dating 인접(`kr_fee_rule.effective_from`)은 수수료 도메인 한정이며 직위 축엔 없음(ⓑ §5) | `NOT_APPLICABLE` |
| 13 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(ⓑ §5) · 직위 바인딩 대상도 없음 | `ABSENT` |
| 14 | status | 🔴 직위 바인딩 엔티티 부재로 상태 대상 없음 · 합법 전이집합 선언 0(ⓑ §5) | `NOT_APPLICABLE` |
| 15 | evidence | 🔴 evidence SoT 는 `SecurityAudit::verify()`(ⓑ §5)이나 **증적을 남길 직위 바인딩 이벤트 자체가 없음** · `menu_audit_log.hash_chain` 인용 금지 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사(§18 측정기 `--sec=18` = 15 일치).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 0 · `ABSENT` 10 · `NOT_APPLICABLE` 5 · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_CROSS_TENANT` 0.

> 🔴 **커버 0 · 인접 자산도 0.** Role Binding(§17)이 roleRank/team_role 인접을 `LEGACY_ADAPTER` 로 가졌던 것과 달리, **직위·재직자·공석 3 엔티티가 전무해 확장할 인접 자산조차 없다.** 신설 시 직위/재직자/공석 마스터부터 세워야 하며, 이는 5-3-3-1 이 확정한 "조직·직위 엔티티 부재"의 직접 귀결이다.

## 2. 규칙

- 🔴 **공석(Vacancy) Position 에 Authority 를 부여하더라도 실제 승인 Actor 로 자동 해석하지 마라**(원문 §18 말미 명령 = §65 "Position Vacancy Actor" gap 원칙). Position Authority 는 원문대로 **현재 Active Incumbent 에게 Resolution 시점에만 연결**하고, 재직자가 없으면 승인 Actor 를 도출하지 말고 fail-closed 처리하라 — 공석을 "누구나 통과"로 확장하는 순간 §65 "Actor 에게 Authority 없는데 승인 성공" gap 을 구조적으로 재생산한다.
- 🔴 **직위(Position)를 `roleRank`/`team_role` 로 대체하지 마라** — 직위는 사람의 조직 직급 축이고 roleRank 는 기계 api-key 등급이다(ⓑ §3). 둘을 등치하면 직위 없는 승인 경로가 API 등급만으로 통과된다. 직위 마스터는 **별도 신설**(Role Binding §17 과 결속 축이 다름 · 중복 아님).
- 🔴 **직위/재직자/공석 엔티티를 임시 컬럼으로 급조하지 마라** — 5-3-3-1 이 확정한 조직 엔티티 부재를 상속하므로, Position Binding 은 조직 엔티티(§19)·Incumbent 마스터가 선결돼야 성립한다. 선행 엔티티 없이 position_id 를 느슨한 VARCHAR 로 두면 tenant_id 와 동일한 무권위 참조 문제(ⓑ §7)를 직위 축에 복제한다.

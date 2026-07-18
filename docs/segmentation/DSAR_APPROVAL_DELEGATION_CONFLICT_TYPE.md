# DSAR — Approval Delegation Conflict Type (§34)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §34(1541-1568) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs … --sec=34` → §34 합계 **46**(= 본편 Conflict Type **22** + 필수필드 24). 본편 분모 = **22 / 22**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation Conflict 엔티티 | `APPROVAL_DELEGATION_CONFLICT`·`delegation_conflict` grep **0** — Delegation 개념 자체 부재(ⓑ §0·§1) | `NOT_APPLICABLE`(부재→신설) |
| **복수 Delegation 성립성** | Delegation 관계 엔티티 0 → "동시 활성 다수 위임"이 **발생 불가**(ⓑ §2.1: acl_permission=member 절대 매트릭스·기간/수락/재위임 전무) | `NOT_APPLICABLE`(충돌 원천 부재) |
| 충돌 **탐지기** | Delegation conflict detection/resolution 코드 grep **0** — 어떤 conflict type도 산출·비교하는 로직 없음 | `NOT_APPLICABLE` |
| 🔴 오탐 A — SQL `ON CONFLICT` | upsert 관용구 **163회 / 45파일**(`Attribution.php`·`Pnl.php`·`Connectors.php` 등) = PK 중복 시 갱신. **Delegation 충돌 아님**(DB 무결성 관용구) | 오탐 |
| 🔴 오탐 B — RuleEngine precedence | `Handlers/RuleEngine.php:250` docblock "★M1 디컨플릭트/precedence" = 마케팅 세그 룰 소유 우선(AutoCampaign guardrails). **위임 승인 충돌 아님** | 오탐 |

★**엔티티 전체가 부재하므로 Conflict Type 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/신설 필요성"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 22종**(Conflict Type)

원문 verbatim (SPEC §34 · 1545-1568):

```
Conflict Type:
* MULTIPLE_ACTIVE_DELEGATIONS      * MULTIPLE_DELEGATES
* SAME_PRIORITY_CONFLICT           * FULL_PARTIAL_CONFLICT
* EMERGENCY_STANDARD_CONFLICT      * VACATION_OUT_OF_OFFICE_CONFLICT
* SUBJECT_ROLE_CONFLICT            * DELEGATOR_AUTHORITY_CONFLICT
* DELEGATE_OWN_AUTHORITY_CONFLICT  * LEGAL_ENTITY_CONFLICT
* ORGANIZATION_CONFLICT            * RESOURCE_CONFLICT
* ACTION_CONFLICT                  * MONETARY_LIMIT_CONFLICT
* CURRENCY_CONFLICT                * PERIOD_OVERLAP
* REDELEGATION_CONFLICT            * DELEGATION_CYCLE
* DEPTH_CONFLICT                   * TASK_ASSIGNMENT_REFERENCE_CONFLICT
* VERSION_CONFLICT                 * CUSTOM
```

| # | 원문 Conflict Type | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | MULTIPLE_ACTIVE_DELEGATIONS | Delegation 활성체 0 → 복수 동시활성 불가(ⓑ §2.1 기간/expiry 컬럼 부재) | `NOT_APPLICABLE` |
| 2 | MULTIPLE_DELEGATES | delegate 관계 엔티티 0 → 다수 수임자 성립 불가(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | SAME_PRIORITY_CONFLICT | 위임 우선순위 축 0 → 동순위 충돌 없음 | `NOT_APPLICABLE` |
| 4 | FULL_PARTIAL_CONFLICT | full/partial delegation scope 0(ⓑ §2.1 scope reduction 부재) | `NOT_APPLICABLE` |
| 5 | EMERGENCY_STANDARD_CONFLICT | Emergency Delegation·Break-glass grep 0(ⓑ §3.4) | `NOT_APPLICABLE` |
| 6 | VACATION_OUT_OF_OFFICE_CONFLICT | vacation/ooo grep **0**(ⓑ §1) · calendar=콘텐츠 캘린더 오탐 | `NOT_APPLICABLE` |
| 7 | SUBJECT_ROLE_CONFLICT | Position/Incumbency 0·role=`team_role` flat 3값(ⓑ §3.3) | `NOT_APPLICABLE` |
| 8 | DELEGATOR_AUTHORITY_CONFLICT | 🔴 Authority Registry/Matrix ABSENT(ⓑ §3.2 `authority_matrix` grep 0) → 위임자 권한단위 미정의 = 충돌 판정 선행조건 부재 | `BLOCKED_PREREQUISITE` |
| 9 | DELEGATE_OWN_AUTHORITY_CONFLICT | 수임자 자체 권한 vs 위임권한 비교 = Authority 부재로 불가(ⓑ §3.2) | `NOT_APPLICABLE` |
| 10 | LEGAL_ENTITY_CONFLICT | Legal Entity 엔티티 0·회사프로필 단일 문자열(ⓑ §3.3 `business_number`≠법인) | `NOT_APPLICABLE` |
| 11 | ORGANIZATION_CONFLICT | Org Unit/Hierarchy 0·Resolver ABSENT(ⓑ §3.3) | `NOT_APPLICABLE` |
| 12 | RESOURCE_CONFLICT | 위임 리소스 스코프 0 · 인접 acl scopeSql=데이터행 필터(장식·ⓑ §2.1) | `NOT_APPLICABLE` |
| 13 | ACTION_CONFLICT | 위임 action 축 0 · acl action은 부여상한만(ⓑ §2.1) | `NOT_APPLICABLE` |
| 14 | MONETARY_LIMIT_CONFLICT | 🔴 금액축 부재 — 유일 조건 HIGH_VALUE_KRW 상수(boolean·ⓑ §3.2) | `NOT_APPLICABLE` |
| 15 | CURRENCY_CONFLICT | 통화 스코프 0(ⓑ Authority §4 환율 저장계층 부재) | `NOT_APPLICABLE` |
| 16 | PERIOD_OVERLAP | 위임 유효기간 컬럼 0(ⓑ §2.1 expiry 부재) → 기간중첩 불가 | `NOT_APPLICABLE` |
| 17 | REDELEGATION_CONFLICT | 재위임 경로 0(ⓑ §2.1 member 재부여 경로 0) | `NOT_APPLICABLE` |
| 18 | DELEGATION_CYCLE | 🔴 Delegator→Delegate 재위임 체인 0(ⓑ §2.4) · 인접 cycle 검출(`PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`)은 **PM/메뉴 도메인**이라 재사용 참조만 가능 → 신설 시 필수 방어 | `BLOCKED_CYCLE_RISK`(신설) |
| 19 | DEPTH_CONFLICT | 재위임 depth 축 0(ⓑ §2.1) · 인접 depth<100/10000은 타 도메인 | `NOT_APPLICABLE` |
| 20 | TASK_ASSIGNMENT_REFERENCE_CONFLICT | 위임-태스크 배정 참조 0 · PM 태스크는 승인위임 무관(ⓑ §2.4) | `NOT_APPLICABLE` |
| 21 | VERSION_CONFLICT | 불변 prev-링크 위임 버전체인 0(ⓑ §2.5 Snapshot 엔티티 grep 0) | `NOT_APPLICABLE` |
| 22 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 22 / 22 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 20 · `BLOCKED_CYCLE_RISK` 1(DELEGATION_CYCLE) · `BLOCKED_PREREQUISITE` 1(DELEGATOR_AUTHORITY_CONFLICT).

> 🔴 **커버 0.** Conflict Type 22종 전체가 "탐지·비교·해소하는 실 로직"으로 존재하지 않는다. 20종은 **충돌 원천(복수 위임·기간·권한·조직 축)이 부재**하여 발생 자체가 불가(`NOT_APPLICABLE`)이고, `DELEGATION_CYCLE`/`DELEGATOR_AUTHORITY_CONFLICT`만 신설 시 각각 Cycle 방어·Authority 선행조건이 걸린 `BLOCKED_*`이다. **`ON CONFLICT`·RuleEngine precedence 히트는 Delegation 충돌이 아니다.**

## 2. 규칙

- 🔴 **`ON CONFLICT`/RuleEngine precedence 히트를 Delegation 충돌 탐지로 오독하지 마라** — 전자는 DB upsert 관용구(163회), 후자는 마케팅 세그 룰 소유 우선(`RuleEngine.php:250`). Delegation Conflict Type과 **무관**하다.
- 🔴 **Conflict Type 22종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 신규타입 INSERT 예외 선례(5-3-3-1 §8)를 반복하지 말고 확장 카탈로그로.
- 🔴 **`DELEGATION_CYCLE` 방어를 재구현하지 마라** — `PM/Dependencies.php`(DFS·tenant 매홉)·`AdminMenu::wouldCycle`(조상 walk) **알고리즘을 참조**하되 Delegation 전용 path_hash(§36) 위에서 신설하라. 중복 엔진 금지.
- 🔴 **`DELEGATOR_AUTHORITY_CONFLICT`을 Authority 없이 판정하지 마라** — §3.2 Authority Registry/Matrix 신설이 **선행**(BLOCKED_PREREQUISITE). 선행조건 미비 상태에서 충돌 판정을 "성공"으로 위장하면 무권한 위임을 통과시킨다.

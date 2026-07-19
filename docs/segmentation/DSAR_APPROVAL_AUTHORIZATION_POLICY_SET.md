# DSAR — Authorization Policy Set (§11)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§11 `APPROVAL_AUTHORIZATION_POLICY_SET` 필수 필드 (원문 전사):

- `policy ids` · `ordering`
- **`combining algorithm`**
- `default effect`
- `missing policy behavior` · `error behavior` · `indeterminate behavior` · `challenge behavior`
- `obligation aggregation` · `advice aggregation`
- `scope` · `version`

**Combining Algorithm enum (9종)**: `DENY_OVERRIDES` / `PERMIT_OVERRIDES` / `FIRST_APPLICABLE` / `ONLY_ONE_APPLICABLE` / `ORDERED_DENY_OVERRIDES` / `ORDERED_PERMIT_OVERRIDES` / `UNANIMOUS_PERMIT` / `MAJORITY_REFERENCE` / `CUSTOM`.

핵심 규칙 (원문): **고위험 Approval / Platform Security / Legal = `DENY_OVERRIDES` 기본**. `default effect`=DENY, missing/error/indeterminate behavior는 Fail-Closed(§45)로 결속.

의미: Policy Set은 다수 Policy(§10)를 `combining algorithm`으로 **결정론적 결합**해 단일 Effect를 산출하는 결합 선언체다. 하나의 Deny가 전체를 뒤집는(DENY_OVERRIDES) 등 Allow vs Deny 우선순위를 데이터로 버전화한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **선언적 정책 결합(Combining Algorithm) 구조체는 부재** — GROUND_TRUTH §1 **Policy Set/Combining Algorithm = ABSENT**(`선언적 정책결합 부재`·주석만 `UserAuth.php:332-333`).
- 실존하는 **암묵적 결합 관용구**(코드 단락평가, 선언 아님):
  - **DENY_OVERRIDES 유사 idiom** = DENY_SCOPE fail-closed(`TeamPermissions.php:234`)·effectiveScope(`TeamPermissions.php:236-322,251`) — 스코프 미해결 시 Deny로 단락하는 코드형 deny-override이나 알고리즘 선택·버전 부재.
  - **AND 결합 관용구** = 중앙 RBAC 다중 조건 순차 통과(`index.php:553-603` roleRank∧scope∧tenant)·requireTeamWrite(`UserAuth.php:1088-1127`) — 코드 순차 if로 결합, `ordering`/`combining algorithm` 데이터 아님.
  - **정족수(N-of-M 유사)** = Maker-Checker(`Mapping.php:238-292` dedup/정족수/fail-closed actor·`Alerting.php:598-658` 정족수2) — UNANIMOUS/MAJORITY의 도메인 특화 코드 구현(일반화된 Combining 아님).
- `combining algorithm`·`ordering`·`default effect`·`missing policy behavior`/`error behavior`/`indeterminate behavior`/`challenge behavior`·`obligation aggregation` → **no hits**. 정책 다수를 결합하는 선언적 알고리즘 전무.

## 3. 판정

- **Verdict: ABSENT** (선언적 Combining Algorithm 부재). 코드형 deny-override·AND·정족수 관용구만 **PARTIAL-substrate**.
- **선행 의존**: Policy Set은 §10 Policy(버전화)에 결속 — Policy 선언체 부재로 결합 대상 자체가 없어 **BLOCKED_PREREQUISITE**. 코드 관용구만 substrate.
- **cover: 0** (선언적 정책 결합·9종 알고리즘·버전화 전무).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_policy_set` — `combining algorithm`(9종)·`ordering`·`default effect`를 데이터 선언. **코드형 deny-override(`TeamPermissions.php:234` DENY_SCOPE)·정족수(`Mapping.php:238-292`·`Alerting.php:598-658`)를 CANONICAL Combining Algorithm으로 일반화 흡수** — 도메인 특화 정족수를 UNANIMOUS_PERMIT/MAJORITY_REFERENCE로 표준화(중복 결합 로직 신설 금지).
- **Mandatory Control**: **고위험 Approval/Platform Security/Legal = DENY_OVERRIDES 기본**(원문·§5.3 Explicit Deny 우선)·`default effect`=DENY·missing/error/indeterminate behavior=Fail-Closed(§45·§5.13). 현재 결합이 코드 단락평가라 알고리즘 명시성·버전 추적 불가 → 데이터 선언으로 감사가능화.
- **실위험**: ① 결합 알고리즘 미선언으로 다수 정책 중첩 시 Allow/Deny 우선순위가 코드 순서에 암묵 의존 → §43 Ambiguous Resolution 임의선택 위험. Policy Set `combining algorithm`으로 결정론화(Ambiguous→INDETERMINATE/DENY). ② isAdmin 4중 미러(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·`App.jsx:377`)가 서로 다른 결합 순서를 가질 수 있어 Allow/Deny 우선순위 불일치(§59) → 단일 Policy Set으로 통합(설계, 배선 후속).

관련: [[DSAR_APPROVAL_AUTHORIZATION_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_DEFINITION]] · [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

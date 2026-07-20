# DSAR — Dynamic Policy Decision 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Policy Decision · 스펙 §18)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2·핵심 안전 규율) · PEP≠PDP(§19는 Enforcement, 본 §18은 Decision) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §18 Policy Decision은 Rule Evaluation(§9)·Runtime Policy(§17)를 종합해 **Permit/Deny/Challenge/Escalate/Manual Review** 5상태 판정을 내리는 Policy Decision Point(PDP)의 산출물이다. EXISTING_IMPLEMENTATION §6·§10이 "PDP/PEP/Policy Decision = ABSENT(용어 grep 0)·근접은 이진 게이트뿐"으로 명시한 이번 Part 3-5의 핵심 공백 축이다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | decision id | Policy Decision 식별자 |
| 2 | subject / role binding | 판정 대상 |
| 3 | decision outcome | 아래 §3 열거형 |
| 4 | input rule evaluations | 이 판정에 사용된 Rule Evaluation(§9) 결과 목록 |
| 5 | input runtime policies | 이 판정에 사용된 Runtime Policy(§17) 목록 |
| 6 | decided at | 판정 시각 |
| 7 | enforcement reference | 이 판정을 집행한 §19 Policy Enforcement 참조 |

## 3. 열거형 / 타입

**Decision Outcome**(스펙 §18 원문): `PERMIT` · `DENY` · `CHALLENGE` · `ESCALATE` · `MANUAL_REVIEW`

## 4. 실 substrate 매핑 (근접 이진 게이트만)

| Decision Outcome | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| PERMIT / DENY | index.php RBAC 게이트(roleRank 비교·method별 rank/scope 비교) + `guardTeamWrite` 전역 쓰기가드 | `index.php:572-598,82-89`(EXISTING_IMPLEMENTATION §6·§10 "근접=이진 게이트" · DUPLICATE_AUDIT §D-2 "PEP 근접·이진") | **근접(2상태만)** — 5상태 중 2개(Permit/Deny)만 이진 형태로 근접, 다중결정 모델 아님 |
| CHALLENGE | OTP 챌린지(미제출 시 401 mfa_required) | `UserAuth.php:965-978`(EXISTING_IMPLEMENTATION §8) | **근접(MFA 챌린지 한정)** — 로그인 시점 MFA 챌린지 게이트일 뿐 범용 Policy Decision의 Challenge 출력 아님 |
| ESCALATE | grep 0 — 이번 ground-truth 2편에 "위험도 상승 시 상위 결재로 이관"류 인용 없음 | — | **ABSENT** |
| MANUAL_REVIEW | grep 0 — 인용 없음 | — | **ABSENT** |

## 5. 설계 원칙

- ★핵심 안전 규율(ADR D-2): Rule Evaluation TRUE/FALSE/UNKNOWN/ERROR 중 **UNKNOWN·ERROR는 Permit 금지**(fail-closed). 현행 `effectiveScope` fail-closed(DENY_SCOPE·`TeamPermissions.php:234`·ADR §D-2)가 이 철학의 근접 substrate — Dynamic Policy Decision 신설 시 이 fail-closed 원칙을 5상태 전역(특히 UNKNOWN→PERMIT 경로 원천 차단)으로 확장해야 한다.
- index.php RBAC 이진 게이트(PERMIT/DENY 근접)를 **다중결정 PDP의 하위 특수케이스**로 재사용하되, CHALLENGE/ESCALATE/MANUAL_REVIEW 3상태는 순신규 설계가 필요하다 — 이진 게이트를 5상태로 억지 확장(존재하지 않는 상태를 있는 것처럼 표기)은 금지.
- OTP 챌린지(`UserAuth.php:965-978`)를 CHALLENGE 상태의 유일한 실재 근접으로 인정하되, 이는 "로그인" 단일 트리거에 한정됨을 명시 — 임의 민감동작(고액 승인 등)에 대한 범용 Challenge 산출은 부재.
- Policy Decision(§18)과 Policy Enforcement Foundation(§19)은 **PDP≠PEP** 원칙에 따라 분리 설계한다 — index.php 게이트는 §19 PEP_NEAR로 분류하고(§4 별편 참조), 본 §18은 그 게이트가 참조할 판정 로직 자체로 승격 설계한다.

## 6. Gap / BLOCKED_PREREQUISITE

- 5상태 중 PERMIT/DENY만 이진 근접(2/5), CHALLENGE는 로그인 한정 근접(1/5 부분), ESCALATE/MANUAL_REVIEW 2개는 완전 ABSENT.
- 무통합 정적 rank 4곳(TeamPermissions/index.php/PlanPolicy/AdminMenu·DUPLICATE_AUDIT §D-2)을 단일 PDP로 수렴하는 작업 자체가 선행 필요 — 지금은 4곳이 각자 독립 판정.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

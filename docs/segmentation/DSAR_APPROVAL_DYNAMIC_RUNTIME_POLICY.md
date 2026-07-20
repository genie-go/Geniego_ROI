# DSAR — Dynamic Runtime Policy 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Policy · 스펙 §17)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · PEP≠PDP(§19와 구분) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §17 Runtime Policy는 Rule Evaluation(§9) 결과를 실제 동작 지시로 변환하는 계층이다. 유형: Allow · Deny · Require MFA · Require Approval · Require Re-authentication. ADR D-1은 이 중 **Require MFA**를 유일한 실재 근접 substrate(CONTEXT_ATTRIBUTE 분류)로 명시한다 — 단 "로그인 게이트"이며 role 활성 조건으로 조립된 적은 없다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | policy id | Runtime Policy 식별자 |
| 2 | subject / role binding | 정책이 평가되는 대상 |
| 3 | policy type | 아래 §3 열거형 |
| 4 | triggering rule | 이 정책을 발동시킨 Rule Evaluation(§9) 참조 |
| 5 | outcome | 정책 적용 결과 |
| 6 | evaluated at | 평가 시각 |
| 7 | status | 활성/만료 |

## 3. 열거형 / 타입

**Policy Type**(스펙 §17 원문): `ALLOW` · `DENY` · `REQUIRE_MFA` · `REQUIRE_APPROVAL` · `REQUIRE_REAUTHENTICATION`

## 4. 실 substrate 매핑 (PRESENT/ABSENT)

| Policy Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| REQUIRE_MFA | MFA 정책 3단계(`MFA_STRICTNESS`)·로그인 강제 판정·TOTP 검증·OTP 챌린지·break-glass 우회+불변감사·Enroll 강제 | `UserAuth.php:929-1036,3719-3760`(ADR §D-1·EXISTING_IMPLEMENTATION §8 "가장 강한 확증") | **PRESENT(근접·단 로그인 게이트)** — 그러나 role 활성 입력으로 조립된 적 없음(ADR D-1: CONTEXT_ATTRIBUTE 확장 필요) |
| REQUIRE_REAUTHENTICATION | MFA disable 시 current_password 재확인 | `UserAuth.php:3929`(EXISTING_IMPLEMENTATION §8 "좁은 사례") | **PARTIAL(단일 좁은 사례)** — 임의 민감동작 단위 범용 step-up re-auth 엔진은 EXISTING_IMPLEMENTATION §8이 명시적으로 "부재"로 판정 |
| ALLOW / DENY | index.php RBAC 게이트(roleRank 비교·method별 rank/scope 비교·403/통과) + `guardTeamWrite` 전역 쓰기가드 | `index.php:572-598,82-89`(EXISTING_IMPLEMENTATION §6·DUPLICATE_AUDIT §D-2) | **근접(이진)** — Permit/Deny 2상태 게이트는 실재하나 Rule Evaluation(§9) 출력을 소비하는 Runtime Policy로 조립된 적 없음(현재는 정적 role rank 비교) |
| REQUIRE_APPROVAL | 없음 — 이번 ground-truth 2편에 "승인 요구" 형태의 Runtime Policy 인용 없음. ★반날조 준수: Role Assignment/Approval 워크플로 관련 인용이 이 문서들에 없으므로 지어내지 않고 ABSENT | **ABSENT** |

## 5. 설계 원칙

- REQUIRE_MFA·REQUIRE_REAUTHENTICATION은 "실재하되 로그인/좁은 사례 게이트"이지 Runtime Policy 엔진의 산출물이 아니다 — ADR D-1이 이를 "결정 입력(CONTEXT_ATTRIBUTE)"으로 분류했을 뿐 "Runtime Policy 자체"로 승격하지 않았다는 점을 유지(과신 금지).
- ALLOW/DENY는 index.php의 정적 rank 비교(DUPLICATE_AUDIT §D-2 "무통합 정적 rank/게이트 4곳" 중 하나)이며, Rule Engine(§6)·Rule Evaluation(§9)의 TRUE/FALSE/UNKNOWN/ERROR 출력을 받아 정책을 산출하는 구조가 아니다. 신설 시 이 이진 게이트를 Runtime Policy의 **Enforcement 입력**으로 재사용하되(§19), 판정 로직 자체는 Policy Decision(§18)으로 승격한다.
- REQUIRE_APPROVAL은 근접 substrate조차 이번 ground-truth에 없으므로, 실 구현 세션에서 별도 Approval 관련 전수조사를 거친 뒤에만 근접 여부를 재판정한다(임의 연결 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- 5개 Policy Type 중 REQUIRE_MFA만 강한 근접 substrate(단 로그인 게이트로 한정), REQUIRE_REAUTHENTICATION은 좁은 단일 사례, ALLOW/DENY는 이진 게이트 근접, REQUIRE_APPROVAL은 완전 ABSENT.
- Rule Evaluation(§9) 출력을 소비해 Policy Type을 산출하는 매핑 로직 = 순신규(Rule Engine §6 자체가 ABSENT).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

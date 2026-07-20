# DSAR — Dynamic Policy Enforcement Foundation 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Policy Enforcement Foundation · 스펙 §19)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · **PEP≠PDP**(본 §19는 집행점, §18은 판정점 — 혼동 금지) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §19 Policy Enforcement Foundation은 "후속 PEP/PDP 구현을 위한 Foundation 제공"을 명시한다(스펙 원문). ADR D-1은 index.php RBAC를 **PEP_NEAR(확장 대상)**로 분류한다 — Policy Enforcement Point(PEP)에 가장 근접한 실 substrate이나, 그것이 참조할 Policy Decision Point(PDP·§18)가 부재하므로 "판정 없는 집행점"에 머문다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | enforcement point id | PEP 식별자 |
| 2 | enforced decision reference | 집행 대상 Policy Decision(§18) 참조 |
| 3 | enforcement location | 게이트 위치(예: 미들웨어) |
| 4 | outcome applied | 실제 적용된 결과(허용/차단/제약 부착) |
| 5 | enforced at | 집행 시각 |
| 6 | bypass / exception | 우회 경로 기록(있다면) |

## 3. 열거형 / 타입

스펙 §19는 열거형을 명문화하지 않고 "PEP/PDP 구현을 위한 Foundation 제공"으로만 기술한다. 본 편은 상위 §18 Decision Outcome(`PERMIT`/`DENY`/`CHALLENGE`/`ESCALATE`/`MANUAL_REVIEW`)을 **집행 대상**으로 참조한다(자체 열거형 없음 — 지어내지 않음).

## 4. 실 substrate 매핑 (PEP_NEAR)

| 요소 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| PEP(집행점) | index.php api_key RBAC 게이트 — roleRank 비교·method별 rank/scope 비교·403/통과 | `index.php:572-598`(ADR §D-1 PEP_NEAR·EXISTING_IMPLEMENTATION §6·DUPLICATE_AUDIT §D-2) | **근접(PEP_NEAR·이진)** |
| 전역 쓰기 가드 | `guardTeamWrite` — 쓰기 요청 전역 가드 | `index.php:82-89`(EXISTING_IMPLEMENTATION §6·DUPLICATE_AUDIT §D-2) | **근접(PEP_NEAR)** |
| PDP(판정점, §19가 참조할 대상) | 없음 — §18 Policy Decision 자체가 ABSENT | — | **ABSENT**(§18 참조) |
| MFA 챌린지 집행 | OTP 챌린지 미제출 시 401 mfa_required 응답 | `UserAuth.php:965-978`(EXISTING_IMPLEMENTATION §8) | **근접(로그인 시점 집행 한정)** |
| break-glass 우회 + 불변감사 | MFA 우회 경로 + SecurityAudit 기록 | `UserAuth.php:995-999`(EXISTING_IMPLEMENTATION §8) | **근접(bypass/exception 기록 substrate)** |

## 5. 설계 원칙

- ★**PEP≠PDP 원칙**(본 편 핵심): index.php 게이트는 "판정 로직을 스스로 계산"하지 않고 **정적 rank 비교**만 수행한다(roleRank 값 자체가 team_role 스냅샷·EXISTING_IMPLEMENTATION §1). 이는 "집행은 있으나 그 집행이 참조할 판정 엔진(PDP)이 없다"는 정확한 상태이며, "PEP가 이미 PDP 역할까지 겸한다"고 과신하지 않는다.
- Foundation 신설 순서: (1) §18 Policy Decision(PDP) 설계·구현 → (2) index.php 게이트를 §18 산출물을 조회하는 방식으로 재배선(PEP_NEAR→실 PEP 승격) → (3) MFA 챌린지·break-glass 우회를 §18 CHALLENGE/ESCALATE 출력의 특수 집행 사례로 통합. 순서 역전(PEP 먼저 확장) 금지 — PDP 없는 PEP 확장은 판정 없는 집행 확대(권한 오남용 위험).
- `guardTeamWrite`(전역 쓰기 가드)는 §19 Foundation의 "쓰기 경로 공통 집행점" 원형으로 재사용하되, 그 판정 조건(현재는 하드코딩 role 비교 — DUPLICATE_AUDIT §D-3)을 Static Lint(§29) 대상으로 별도 봉인한다.

## 6. Gap / BLOCKED_PREREQUISITE

- PEP_NEAR(index.php·guardTeamWrite)는 실재하나, 그것이 참조해야 할 PDP(§18)가 ABSENT라 "Foundation"으로서 완결되지 않음(집행은 있으나 판정 없음).
- 5상태 Decision Outcome 중 Enforcement가 실제로 다루는 것은 사실상 PERMIT/DENY 2상태(이진)뿐 — CHALLENGE(MFA 한정)·ESCALATE·MANUAL_REVIEW 집행 경로 = ABSENT.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 및 §18 Policy Decision 설계·구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

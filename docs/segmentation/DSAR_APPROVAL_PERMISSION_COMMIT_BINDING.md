# DSAR — Permission Commit-time Binding (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002)**
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule · 선행 Decision Core 부재.

---

## ① 목적

**집행(commit) 직전, 초기 인가 시점에 해소된 Permission이 여전히 유효한지 재검증(TOCTOU 방어).** [Permission Binding](DSAR_APPROVAL_PERMISSION_BINDING.md)이 "인가되었다"의 링크라면, Commit Binding은 "**집행 순간에도 그 인가가 아직 성립하는가**"를 재확인하는 게이트다. 초기 해소와 실제 집행 사이에 Grant 폐기·Version 변경·세션 세대 변경·Deny 추가가 끼어들 수 있으므로, commit-time에 요구 Permission·버전·Grant 상태·Scope·Actor·세션을 재대조한다. ★결합 대상 Decision/집행 record가 코드 0 → **BLOCKED_PREREQUISITE**(형상만 규정).

## ② Canonical 필드 — Commit-time 재검증 대조 집합

`PERMISSION_COMMIT_BINDING` — 집행 직전 모든 항이 동시 충족돼야 통과(하나라도 실패 시 fail-closed 거부).

| # | 재검증 항 | 요구 |
|---|---|---|
| 1 | Required Permission | 초기 해소와 **동일 Permission** |
| 2 | Version | Definition Version **동일** 또는 Revalidation 통과 |
| 3 | Grant 상태 | **Active · 미만료 · 미폐기 · 미정지** |
| 4 | Explicit Deny | **없음**(Deny overrides) |
| 5 | Scope | 일치 |
| 6 | Resource Version | 일치 |
| 7 | Action | 일치 |
| 8 | Actor | 일치(Effective Actor) |
| 9 | Session Generation | 일치(세션 세대) |
| 10 | Group / Bundle / Hierarchy Version | 일치 |
| 11 | Constraint / Dependency | 충족 |
| 12 | Conflict | 없음 |
| 13 | Digest | 일치([Digest](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |
| 14 | Cache | 유효(version-aware) |
| 15 | Critical Drift | 없음 |

## ③ 열거형

- **revalidation_result**: `PASS / FAIL`(FAIL → fail-closed 거부 + Audit `RUNTIME_BLOCKED`/`DRIFT_DETECTED`).
- **drift_severity**: `NONE / NON_CRITICAL / CRITICAL`(CRITICAL → 집행 차단).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| 재검증 항 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| 집행 직전 권한 게이트(패턴) | 중앙 RBAC PEP `index.php:553-603`(write `:590-596`)·team_role 전역 `guardTeamWrite`(`UserAuth.php:1167`·`index.php:82` 403 `TEAM_READ_ONLY`)·위임 상한 `putMemberPermissions :628-647` | CANONICAL(PEP) | EXISTS(요청 게이트)·단 **commit-time 재해소 아님** |
| Grant 상태(Active) | `acl_permission`(현재값·`replacePerms :325`) | CANONICAL | PARTIAL(미폐기/미만료 상태 없음) |
| Scope 일치 | `scopeSql :286-293`·`effectiveScope :236-265` | ROW/DATA_SCOPE | EXISTS(4핸들러)·commit 재대조 아님 |
| Action | `ACTIONS :39` | CANONICAL | EXISTS(vocabulary) |
| Session Generation | 세션 토큰(289차 P5 at-rest 해시·replay 차단) | VALIDATED_IAM | PARTIAL(세대 대조 미배선) |
| Digest 일치 | Part 1 Hash Chain `SecurityAudit::verify` | CANONICAL(재사용) | 미결선 |
| Version / Resource Version / Group·Bundle·Hierarchy Version | 버전 축 부재 | — | **ABSENT** |
| Explicit Deny 없음 | first-class deny 부재(`1=0` 센티넬 `:290,303`) | — | PARTIAL |
| Cache 유효(version-aware) | Effective-Set 미캐시 | — | **ABSENT** |
| Critical Drift 없음 | 드리프트 탐지기 부재 | — | **ABSENT** |
| Commit Binding 자체·Decision 결합 | Part 1 Decision Core·집행 record 코드 0 | — | **BLOCKED_PREREQUISITE** |

**커버리지 = 요청 게이트는 EXISTS·commit-time 재해소/재검증은 0.** 현행 PEP는 요청 진입 시 1회 검사이며, 집행 직전 재대조(TOCTOU 방어)는 없다.

## ⑤ 설계 원칙

- **Fail-closed 재검증** — §② 15항 중 하나라도 실패 시 집행 거부. 초기 인가만으로 집행 허용 금지(TOCTOU).
- **Version-aware 재대조** — Definition/Resource/Group/Bundle/Hierarchy Version이 초기와 달라지면 Revalidation 강제.
- **PEP 패턴 확장·무후퇴** — `index.php:553-603`·`guardTeamWrite` 게이트를 완화 방향으로 바꾸지 않고 commit-time 재해소를 얹는다.
- **Critical Drift → 차단** — Grant 폐기·Deny 추가·세션 세대 변경은 CRITICAL Drift로 집행 중단.
- **Permission ≠ Authority**: commit 재검증은 Permission 유효성이지 금액 한도 재검증(Part 5)이 아니다.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002·핵심)**: commit이 재검증할 Part 1 Decision/집행 record·Permission Binding·Resolution Result 영속체 코드 0.
- **G2 ABSENT**: Definition/Resource/Group/Bundle/Hierarchy Version 축·version-aware Cache·Critical Drift 탐지 순신규.
- **G3 PARTIAL**: 요청 게이트(PEP)·Scope·Session 재료는 존재하나 **집행 직전 재해소(TOCTOU 방어)로 재구성 필요** — 현행은 진입 1회 검사.

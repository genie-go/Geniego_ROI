# DSAR — Authorization Evaluation (06-A-03-02-03-04 Part 1 · §22)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §22)

`APPROVAL_AUTHORIZATION_EVALUATION` 필수 필드 (원문 전사):
- `definition version` · `policy set version` · `engine version` · `strategy`
- `evaluated policies` · `applicable policies` · `non-applicable policies` · `failed policies` · `indeterminate policies`
- `subject result` · `resource result` · `action result` · `environment result`
- `combining result`
- `obligations` · `advice` · `challenge` · `denial reasons`
- `started` · `completed` · `duration` · `evaluation digest`

의미: Evaluation은 Request(§21)를 입력으로 Policy Set(§11)의 각 Policy 적용가능성·조건·Effect를 계산하고 **Combining Algorithm으로 결합**한 판정 과정의 기록이다. 어떤 정책이 평가·적용·비적용·실패·미결(indeterminate)됐는지를 명시적으로 남겨(§5.9 Allow도 Evidence) Decision(§24)·Evidence(§35)의 근거가 된다. `evaluation digest`로 무결성 결합(§37). ★Ambiguous/실패 정책은 임의 Permit 금지 → INDETERMINATE/DENY로 귀결(§43·§5.13).

## 2. 기존 구현 대조

- **선언적 Evaluation 결과체는 부재(ABSENT)**. 현재 인가는 단일 함수/미들웨어의 즉시 분기다: 중앙 RBAC roleRank 비교(`index.php:554`·viewer0/connector1/analyst2/admin3)·write 메서드 게이트(`index.php:568-578`)·팀 RBAC 서열 판정(`TeamPermissions.php:120-136`)·ABAC data_scope 행필터(`TeamPermissions.php:236-322`). 이들은 boolean/rank 비교로 즉시 통과·차단하며, **"어떤 policy가 평가되어 어떤 combining으로 결합됐다"는 평가 과정 기록을 남기지 않는다**.
- **`policy set`/`combining algorithm` 부재**: Policy Set·정책결합 알고리즘은 명시적으로 ABSENT이며 주석만 존재(`UserAuth.php:332-333`, GROUND_TRUTH §1 표). 여러 정책을 evaluated/applicable/failed/indeterminate로 분류·결합하는 substrate가 없다.
- **`definition/policy set/engine version` 부재**: 인가규칙이 코드 상수(하드코딩 roleRank `index.php:554`·plan==='admin' 분포 `UserAuth.php:72,104,3668,3712,3738,4208` 등)라 evaluated policy에 버전이 없다.
- **유사 substrate(결합 부재)**: `TeamPermissions.php:236-322`의 effectiveScope/scopeSql은 subject result(scope)를 산출하고 DENY_SCOPE fail-closed(`TeamPermissions.php:234`)를 적용하나, 이는 단일 ABAC 행필터 계산이지 다정책 combining result가 아니다. `acl_permission` 매트릭스(`TeamPermissions.php:39,152-159,325-336`·subject_type×menu×8action·manage 슈퍼셋)는 action result 계산의 부분 substrate.
- `evaluation digest`/`started·completed·duration` 평가 트레이스 → 인가 도메인 부재.

## 3. 판정

- Verdict: **ABSENT** (Evaluation 결과체·다정책 combining·evaluation digest 순신규).
- cover: **0** — evaluated/applicable/failed/indeterminate 분류와 combining result 데이터 선언 전무. `TeamPermissions.php:236-322`(scope)·`:39,152-159,325-336`(acl action)은 PRESENT-substrate(단일 계산)로 combining을 대체하지 못함(KEEP_SEPARATE substrate).
- 선행 의존: Policy Set(§11 ABSENT)·Definition Version(§13 ABSENT) 부재로 evaluated policy set 자체가 없어 상위 공회전(BLOCKED_PREREQUISITE).
- ★INDETERMINATE/failed policy를 Permit으로 절대 변환 금지 원칙(§5.13·§43)은 순신규 — 현행은 이진(rank 통과 여부)이라 indeterminate 구분 자체가 없다.

## 4. 확장/구현 방향 (설계)

- 순신규 `authorization_evaluation` — `definition/policy set/engine version`·`strategy`·`evaluated/applicable/non-applicable/failed/indeterminate policies`·`subject/resource/action/environment result`·`combining result`·`obligations/advice/challenge/denial reasons`·`evaluation digest`. Evaluation Pipeline(§42 37단계)의 산출물로 표준화.
- Golden Rule=Extend: `TeamPermissions.php:236-322`(ABAC scope 계산)를 subject/resource result 산출기로, `acl_permission` 매트릭스(`TeamPermissions.php:39,152-159,325-336`)를 action result 산출기로 흡수. 이들을 Policy(§10)로 데이터화하고 그 위에 Combining Algorithm(§11 DENY_OVERRIDES/PERMIT_OVERRIDES/FIRST_APPLICABLE 등)을 얹어 combining result를 도출. ★고위험 Approval/Platform Security/Legal은 DENY_OVERRIDES 고정(§11).
- **Ambiguous/실패=Fail-closed**: policy set이 모호하거나 정책 평가가 실패/미결이면 임의 Permit 금지 → INDETERMINATE 또는 DENY로 귀결하고 Gap 기록(§43·§45). 현행 `TeamPermissions.php:234` DENY_SCOPE·`:120-131` roleOf fail-closed(미해결→member)의 fail-closed idiom을 Evaluation 수준 표준으로 승격.
- `evaluation digest`는 앞 블록 Hash Chain 정책(§37) 재사용(`SecurityAudit.php:27` SHA-256 패턴) — Evaluation을 Evidence(§35)·Decision(§24)에 무결성 결합.

관련: [[DSAR_APPROVAL_AUTHORIZATION_REQUEST]] · [[DSAR_APPROVAL_AUTHORIZATION_EFFECT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[DSAR_APPROVAL_AUTHORIZATION_REASON]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

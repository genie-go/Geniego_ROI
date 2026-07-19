# DSAR — Authorization Policy Resolution (06-A-03-02-03-04 · §43)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §43 Policy Resolution 우선순위 · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§43 Policy Resolution 우선순위 (원문 전사):

`Tenant / Legal Entity / Organization / Resource / Action / Subject Type / Actor Type / Decision Definition / Channel / Client / Amount Range Specificity · Effective Time · Priority · Explicit Deny · Policy Version.`

**Ambiguous Resolution 임의선택 금지 → INDETERMINATE/DENY + Gap 기록.**

의미: Policy Resolution은 하나의 인가 요청에 다수 Policy/Scope가 매칭될 때 **가장 구체적인(specificity 최고) Scope를 결정론적으로 선택**하는 규칙이다. Tenant→Legal Entity→Organization→Resource→Action→Subject/Actor Type→Decision Definition→Channel→Client→Amount Range 순으로 구체성 점수를 매기고, 동률 시 Effective Time·Priority·Explicit Deny 우선·Policy Version으로 tie-break한다. ★핵심 안전규칙: 우선순위로도 유일 해가 나오지 않으면(Ambiguous) 임의로 하나를 고르지 않고 **INDETERMINATE 또는 DENY로 귀결하고 Gap을 기록**한다(§5.2 Default Deny·§5.3 Explicit Deny 우선).

## 2. 기존 구현 대조

- **specificity 점수 기반 Policy/Scope 선택은 부재** — 다수 매칭 정책 중 "가장 구체적" 하나를 결정론적으로 고르는 우선순위 엔진 전무. Registry Scope(§8)의 specificity score 필드도, 그를 소비하는 resolver도 없음.
- 실존하는 유사 자산(매트릭스 조회 유사, specificity resolution 아님):
  - **acl_permission 매트릭스 `TeamPermissions.php:39,152-159,325-336`** — subject_type×menu×8action(manage 슈퍼셋)의 직접 조회. menu×action 좌표로 허용/거부를 찾는 점에서 "specificity 기반 매칭"과 유사하나, **scope specificity 선언(Tenant/Org/Resource/Amount Range 구체성 점수)도 tie-break 규칙도 없다** — 단일 매트릭스 룩업이지 다정책 우선순위 해석이 아님.
  - roleRank 서열 `index.php:554`(viewer0<connector1<analyst2<admin3) — 역할 상하만, Scope specificity 아님.
  - RBAC 서열 `TeamPermissions.php:120-136`(owner>manager>member)·isAdmin 직교 상위(`TeamPermissions.php:132`) — 주체 등급 우선순위이나 정책 구체성 우선순위가 아님.
  - ABAC data_scope 행필터 `TeamPermissions.php:236-322`(`:234` DENY_SCOPE fail-closed) — 행 가시성 제한. Amount Range/Resource specificity 선언 없음.
- **Effective Time / Priority / Explicit Deny 우선 / Policy Version tie-break** → no hits. 정책 버전화(§44) 부재 → Policy Version 기준 해석 불가.
- **Ambiguous → INDETERMINATE/DENY + Gap 기록** → no hits. 모호 해석 시 Gap을 기록하는 경로 부재. 현 구조는 매트릭스에 없으면 부재(member fallback `TeamPermissions.php:120-131`)일 뿐 "Ambiguous"라는 상태 자체가 없음.
- Explicit Deny 우선 선언체 → no hits(DENY_SCOPE `TeamPermissions.php:234`는 idiom, 선언적 Deny Override 아님).

## 3. 판정

- Verdict: **PARTIAL (매트릭스 조회 유사 substrate · specificity/tie-break/Ambiguous 정책 부재)**
- 근거: acl_permission 매트릭스(`TeamPermissions.php:39,152-159,325-336`)가 subject×menu×action 좌표 조회로 "매칭 정책 선택"의 원시형을 제공 → substrate PRESENT. 그러나 Scope specificity 점수·Effective Time/Priority/Explicit Deny/Policy Version tie-break·Ambiguous→INDETERMINATE/DENY 규칙은 전부 부재.
- 선행 의존: Policy Resolution은 Registry Scope(§8 specificity score)·Policy(§10)·Policy Set(§11 Combining Algorithm)·Version(§44)을 소비 — 이들이 ABSENT라 우선순위 해석의 입력 데이터 자체가 부재.
- cover: **부분** (menu×action 매트릭스 룩업만. Scope specificity·tie-break·Ambiguous 처리는 0).
- ★위험: 현 매트릭스는 미매칭 시 조용히 member/부재 처리(`TeamPermissions.php:120-131`)라 "Ambiguous"와 "미매칭"을 구분하지 않는다 — §5.2에 따라 모호 시 명시적 INDETERMINATE/DENY로 분기해야 함.

## 4. 확장/구현 방향 (설계)

- 순신규 Policy Resolver — Registry Scope(§8)에 specificity score를 데이터로 선언하고, Tenant→Legal Entity→Organization→Resource→Action→Subject/Actor Type→Decision Definition→Channel→Client→Amount Range 순 구체성 점수 + Effective Time·Priority·**Explicit Deny 우선**·Policy Version으로 결정론적 단일 해를 산출.
- Golden Rule=Extend: 기존 acl_permission 매트릭스(`TeamPermissions.php:39,152-159`)를 Resolver의 초기 Policy 입력 소스로 흡수 — menu×action 좌표를 Canonical Resource/Action Scope로 정형화, 재구현 금지.
- ★Ambiguous 봉인: specificity·tie-break로도 유일 해가 안 나오면 **임의선택 절대 금지 → INDETERMINATE/DENY + Gap 기록**(§5.2). 현 매트릭스의 "미매칭=조용한 member fallback"을 "Ambiguous=명시적 INDETERMINATE"로 승격.
- Explicit Deny 우선(§5.3): DENY_SCOPE idiom(`TeamPermissions.php:234`)을 선언적 Deny Override Policy로 정형화 — 고위험 도메인 Policy Set은 DENY_OVERRIDES(§11) 기본.
- 실 배선/수정은 후속 enforcement Part(Part2 Permission Engine이 Resolver를 소비) — 이번 Part=설계·확장 포인트만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION_PIPELINE]] · [[DSAR_APPROVAL_AUTHORIZATION_VERSION_RESOLUTION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

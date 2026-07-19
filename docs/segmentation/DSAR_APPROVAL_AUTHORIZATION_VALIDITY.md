# DSAR — Authorization Validity (§40)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§40 `APPROVAL_AUTHORIZATION_VALIDITY` 필수 필드 (원문 전사):

- `valid from` / `valid until`
- `max age`
- `reusable` · `max reuse count` / `current reuse count`
- `subject bound` · `session bound` · `resource bound` · `version bound` · `action bound` · `slot bound` · `policy version bound` · `environment bound`
- `invalidation triggers`:
  - `Policy/Definition Version Changed`
  - `Subject Identity` · `Session` · `Role/Permission` Changed
  - `Resource Version/State` Changed
  - `Amount/Currency` Changed
  - `Assignment/Authority/Delegation` Changed
  - `Kill Switch` · `Incident` · `Expiration`

의미: Validity는 인가 판정(§24 Decision)의 **재사용 범위와 무효화 조건**을 데이터로 규정한다. 판정이 언제부터/까지 유효하고(`valid from/until`·`max age`), 재사용 가능한지·몇 회까지인지(`reusable`·`max/current reuse count`), 어떤 축에 결속되어(subject/session/resource/version/action/slot/policy version/environment bound) 그 밖으로 못 나가는지, 그리고 어떤 변경이 판정을 즉시 무효화하는지(`invalidation triggers`)를 명시한다. §38 Decision Binding이 결속 축을, Validity가 그 유효기간·무효화를 담당한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 판정의 유효기간·재사용·무효화 규정은 부재** — 판정을 `valid until`·`max age`·`reuse count`·`bound` 축·`invalidation triggers`로 규정하는 구조체 전무(GROUND_TRUTH §1 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**). 현재 인가는 **매요청 재평가**(중앙 RBAC `index.php:553-603`·TeamPermissions `TeamPermissions.php:120-322`·세션 재검증 `UserAdmin.php:33-62`·`UserAuth.php:2920`)라 판정을 저장·재사용하지 않으므로 유효기간/재사용 개념 자체가 없음.
- **역설적 안전점**: 매요청 재평가는 stale 판정 재사용 위험은 없으나, 판정 캐싱·재사용을 도입하는 순간 Validity가 없으면 무효화 트리거(policy/resource version/session/role 변경) 미반영 위험 발생.
- **부분 무효화 신호(재사용 아님)**: agency 위임 격리(`index.php:74-104`)의 `status='approved'` 매요청 재검증·roleOf fail-closed(`TeamPermissions.php:120-131`)는 상태 변경을 매번 반영하나, 이는 저장된 판정의 무효화가 아니라 **매번 재평가**다.
- `max age`/`max reuse count`/`policy version bound`/`invalidation triggers` → **no hits**. `Assignment/Authority/Delegation Changed` 트리거 → **no hits**(선행 §3.3 Assignment/Authority/Delegation·후속 기능 부재).
- `Kill Switch`/`Incident` 트리거 → **no hits**(§46 Kill Switch Foundation 부재).

## 3. 판정

- **Verdict: ABSENT** (판정 유효기간·재사용·무효화 규정 전무). 현재 **매요청 재평가**라 재사용 위험은 낮으나, Validity 부재는 향후 캐싱/재사용 도입 시 Critical Gap(§53 Expiration 없음·Validation 무조건 Commit 재사용).
- **선행 의존: BLOCKED_PREREQUISITE** — bound 축(policy version·resource version·slot·assignment/authority/delegation)과 invalidation trigger 대상이 §3.2/§3.3 선행 및 후속 Part 부재로 다수 미존재. Versioned Policy 부재(GROUND_TRUTH §1)로 `policy version bound`·`Policy Version Changed` 트리거 결합 불가.
- **cover: 0** (인가 validity 전무). 매요청 재평가는 대체가 아니라 Validity가 정형화할 재사용 정책의 부재 상태.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_validity` — §24 Decision마다 `valid from/until`·`max age`·`reusable`·`max/current reuse count`·bound 축·`invalidation triggers`를 규정. §38 Decision Binding(결속 축)과 짝을 이뤄, 재사용 시 bound 축 동일성+미만료+trigger 미발생을 강제.
- **무효화 트리거 배선**: Policy/Definition Version·Subject Identity·Session·Role/Permission·Resource Version/State·Amount/Currency·Assignment/Authority/Delegation·Kill Switch·Incident 변경 시 판정 즉시 무효화 — 현재 매요청 재평가가 사실상 "무한 무효화"이나, 캐싱 도입 시 Validity가 이를 선택적·정형적으로 대체. roleOf fail-closed(`TeamPermissions.php:120-131`)·agency 재검증(`index.php:74-104`)의 상태변경 반영 로직을 무효화 트리거 소스로 재사용.
- **고위험 재사용 제한(§5.11·§41 연계)**: 고위험 Approval 판정은 `reusable=false` 또는 짧은 `max age`로 규정(§41 Expiration에서 장기 재사용 금지). Cross-Tenant/다른 Resource·Action 재사용은 bound 위반으로 차단(§65 Property: Resource/Action 변경 Permit 재사용 금지·Cross-Tenant Isolation). 실 배선은 선행 Version/Assignment/Kill Switch 신설 후 별도 승인세션. Part 1=재사용·무효화 계약 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EXPIRATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_BINDING]] · [[DSAR_APPROVAL_AUTHORIZATION_COMMIT_BINDING]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

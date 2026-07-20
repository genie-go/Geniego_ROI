# DSAR — Approval Scope Reduction (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Reduction · 스펙 §30)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §30 Scope Reduction은 Narrow Scope · Restricted Scope · Child Scope 3종으로 구성된다 — Expansion(§29·확대)의 반대 방향으로, scope를 좁히는 것은 항상 안전측이라는 전제다. 근접 substrate는 `effectiveScope`의 `company`=null(무제한) 판정과 대비되는 나머지 축들의 fail-closed 귀결(비owner+무tenant=DENY_SCOPE, 예외=DENY_SCOPE)이며, 이는 사실상 "판정 실패 시 가장 좁은 scope(=0)로 수렴"하는 동형 패턴이다. 단 이는 축소를 **의도적으로 요청·기록하는 Reduction Entity**가 아니라 판정 실패의 부산물이라는 점을 정직하게 구분한다.

## 2. Canonical 필드

스펙 §30은 축소 유형만 정의(필드 섹션 없음). 설계 제안: Reduction ID · Reduction Type(§3 열거값) · Parent Scope Definition · Reduced Scope Value · Requested By · Applied Version.

## 3. 열거형 / 타입

스펙 §30 원문 — **Reduction Type**: Narrow Scope · Restricted Scope · Child Scope.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical Reduction Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Narrow Scope(의도적 축소 요청) | — | — | **ABSENT** — 명시적 축소 API/기록 grep 0 |
| Restricted Scope(제약된 하위집합) | `effectiveScope` fail-closed 귀결(비owner+무tenant=DENY_SCOPE·예외=DENY_SCOPE) | `TeamPermissions.php:236-265` | **PARTIAL(근접)** — 판정 실패 시 결과적으로 가장 제한된 상태(DENY)로 귀결되나, 이는 Reduction Entity가 아니라 fail-closed 부작용 |
| Child Scope(부모-자식 축소) | — | — | **ABSENT** — ADR D-3(Scope Hierarchy ≠ Organization Hierarchy·data_scope FLAT·`TeamPermissions.php:145-151`)에 따라 부모-자식 scope 구조 자체가 부재 |
| company(wildcard) → 비-company 축소 대비 | `company`=null(무제한)·미설정 시 fail-open 예외 | `TeamPermissions.php:255-256,258` | **PARTIAL(반대 극단 관측점)** — Reduction의 반대 극(확대)이 어떻게 실재하는지 보여주는 대비 자료로만 인용 |

## 5. 설계 원칙

- Reduction은 항상 안전측(narrower = safer)이므로, Expansion Guard(§29)처럼 강한 차단 로직이 필요하지 않다 — 오히려 승인 없이도 자기 자신의 scope를 좁히는 행위(self-restrict)는 허용 가능한 설계로 검토한다(단, 이번 편은 설계만이며 정책 확정은 실 구현 세션 몫).
- `effectiveScope`의 fail-closed DENY_SCOPE 귀결(`TeamPermissions.php:236-265`)을 Reduction Entity의 "의도치 않은 축소"(판정 실패)와 "의도된 축소"(Narrow Scope 요청)로 분리해서 설계한다 — 부작용과 명시적 기능을 혼동하지 않는다.
- Child Scope는 ADR D-3의 FLAT 구조 원칙(부모-자식 없음)을 침해하지 않는 범위에서 설계한다 — Scope Hierarchy를 조기 도입해 Child Scope 구현의 명분으로 삼지 않는다. Child Scope가 실제로 필요하면 별도 Scope Hierarchy 설계(Part 3-4 범위 밖)가 선행되어야 한다.
- Default Intersection(ADR D-2) 원칙상 Reduction 결과는 항상 Intersection 계산의 자연스러운 산출물이어야 하며, Reduction 자체가 새로운 확대 경로가 되지 않도록 한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: Narrow Scope(의도적 축소 요청)·Child Scope(부모-자식) 전부 ABSENT. Restricted Scope만 fail-closed 부산물로 근접.
- **BLOCKED_PREREQUISITE(RP-002)**: Child Scope는 Scope Hierarchy(FLAT→계층 전환 여부) 결정이 선행되어야 하며, 이는 Part 3-4 범위를 넘는 별도 논의가 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

# DSAR — Permission Hierarchy Edge (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Hierarchy Edge는 Hierarchy의 **두 Permission 노드(parent/child) 사이의 단일 방향성 관계 1건**을 정형 선언한다. 상위 Permission이 하위를 포함하는지(`INCLUDES`)·함의하는지(`IMPLIES`)·특수화하는지(`SPECIALIZES`)·제약하는지(`RESTRICTS`)·배제하는지(`EXCLUDES`)를 edge type으로 구분하고, scope·effect의 전파 방식과 전이(transitive) 여부·우선순위를 담는다. Effective Permission Set 계산의 그래프 간선 원자 단위다.

## ② Canonical 필드

- `edge id` · `tenant` · `hierarchy id`(소속 계층) · `parent permission`(상위 Canonical Code) · `child permission`(하위 Canonical Code)
- `edge type`(아래 열거) · `scope propagation`(scope 전파 규칙: Inherit / Intersect / None) · `effect propagation`(allow/deny 전파: PropagateAllow / PropagateDeny / Block)
- `transitive`(전이 허용 여부) · `priority`(동순위 결합 우선순위) · `digest`(edge 봉인 해시)
- `owner` · `status` · `valid_from` · `valid_to` · `evidence`

## ③ 열거형

- **EDGE_TYPE**(6종): `INCLUDES` / `IMPLIES` / `SPECIALIZES` / `RESTRICTS` / `EXCLUDES` / `CUSTOM`.
- **SCOPE_PROPAGATION**: `INHERIT` / `INTERSECT`(권한 확장 금지·ADR D-5 Scope Intersection) / `NONE`.
- **EFFECT_PROPAGATION**: `PROPAGATE_ALLOW` / `PROPAGATE_DENY`(Deny-overrides 우선) / `BLOCK`.

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| action 수준 포함 간선(`manage`⊃하위·`view` 자동포함) | `actions` superset 규칙 | PARTIAL(action-only·edge 아님) | EXISTING `TeamPermissions.php:39,182-192` |
| scope 전파(Intersect·확장금지) | data_scope fail-closed(`1=0` 센티넬) | ROW/DATA_SCOPE_CANDIDATE(전파 아님) | EXISTING `TeamPermissions.php:234,290,303` |
| parent/child edge·edge type·transitive·priority·digest·순환/자기참조 차단 | — | **ABSENT(순신규)** | ADR §D-4 "Hierarchy/Graph=순신규" |

- parent→child Permission 간선을 edge type·전파규칙·전이·우선순위로 선언하는 구조체 → **no hits(ABSENT)**.

## ⑤ 설계원칙

- **Circular Edge · Self-reference 차단**: `parent == child`(자기참조) 및 순환 경로(A→B→A) 감지 시 edge 삽입 거부 — Hierarchy의 `circular prohibited`·`self reference prohibited`를 edge 커밋 시점에 강제(Mandatory Control·ADR §6.16).
- **Scope 확장 금지(ADR D-5)**: `scope propagation=INTERSECT`가 기본. 하위 노드가 상위보다 넓은 scope를 상속받지 못하도록 교집합만 전파 — data_scope fail-closed(`TeamPermissions.php:234`) 성향을 계층 전파로 확장.
- **Deny 우선 전파**: `effect propagation`은 Deny-overrides 원칙을 따름(Explicit Deny가 Allow 간선을 이긴다). `EXCLUDES` edge는 명시적 배제로 하위 grant를 차단.
- **Golden Rule = Extend**: edge의 action 포함 의미론은 기존 `manage=superset` 규칙을 Canonical화(재구현 금지). Permission ≠ Role — edge는 Permission 간 관계이며 역할 상속(Part 3 RBAC)과 별개.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: edge가 연결할 Canonical Permission Definition·소속 Hierarchy·전파 결과를 봉인할 Decision Core가 모두 코드 0(ADR §D-4).
- **cover 0**: Permission 간선 데이터 선언 전무. 실 엔진은 기존 action superset·data_scope 전파 성향을 edge로 정형화하는 "조립"(선행 신설 후).
- **NOT_CERTIFIED**: 코드/DB 변경 0. Part 1 D-2 위험 4건 재플래그 금지.

관련: [[DSAR_APPROVAL_PERMISSION_HIERARCHY]] · [[DSAR_APPROVAL_PERMISSION_HIERARCHY_VERSION]] · [[DSAR_APPROVAL_PERMISSION_GRAPH]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].

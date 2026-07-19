# DSAR — Permission Expansion Guard (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Grant/scope/constraint 변경이 **주체의 유효 권한을 넓히는 방향(Privilege Expansion)** 인지 탐지하고, High/Critical 확대는 승인·보안 검토 훅으로 게이팅하는 계약을 정의한다. 현행 위임상한 fail-closed(`putMemberPermissions` 403 `DELEGATION_EXCEEDED`, TeamPermissions.php `:628-647`)와 `clampActions`(`:396-402`)가 **관리자가 자기 권한 이상 위임하는 것**은 막지만, 이는 위임 상한 한 축일 뿐 — tenant/legal entity/org subtree 확대, resource/action 추가, field deny 제거, amount 상한 증가, wildcard·implication 추가 같은 **전 축 확장 탐지**는 부재하다.

- Expansion은 문서 7 Scope Intersection(결합=축소)과 짝을 이루는 **변경 시점(diff) 가드**.
- Permission≠Authority: amount 상한 증가는 Permission 확장이자 Part 5 Authority 결합점 — 둘 다 게이팅.

## ② Canonical 필드 (Canonical Fields)

`permission_expansion_check`:

- `check_id` · `tenant_id` · `subject_ref` · `before_grant_digest` · `after_grant_digest`
- `expansion_findings[]`(각: `expansion_type`(열거) · `axis` · `before_value` · `after_value` · `severity`(LOW/MEDIUM/HIGH/CRITICAL) · `direction`(EXPAND/CONTRACT/NEUTRAL))
- `max_severity` · `gate_action`(열거) · `approval_ref` · `security_review_ref`
- `check_digest`

## ③ 열거형 — `expansion_type`

`TENANT_WIDEN` · `LEGAL_ENTITY_WIDEN` · `ORG_SUBTREE_WIDEN` · `RESOURCE_TYPE_ADD` · `RESOURCE_INSTANCE_ADD` · `ACTION_ADD` · `FIELD_DENY_REMOVE` · `ROW_FILTER_RELAX` · `AMOUNT_CAP_INCREASE` · `WILDCARD_ADD` · `DENY_REMOVE` · `CONSTRAINT_REMOVE` · `GROUP_WIDEN` · `BUNDLE_WIDEN` · `HIERARCHY_WIDEN` · `IMPLICATION_ADD`

**`gate_action`**: `ALLOW`(LOW/MEDIUM) · `REQUIRE_APPROVAL`(HIGH) · `REQUIRE_APPROVAL_AND_SECURITY_REVIEW`(CRITICAL) · `BLOCK`.

**severity 규칙**: `WILDCARD_ADD`·`DENY_REMOVE`·`TENANT_WIDEN`·`AMOUNT_CAP_INCREASE`(고액)·`FIELD_DENY_REMOVE`(민감)=기본 CRITICAL/HIGH.

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Expansion 축 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| 위임 상한(관리자≥위임) | `putMemberPermissions` 403 DELEGATION_EXCEEDED | TeamPermissions.php `:628-647` | REAL(한 축·fail-closed) |
| action 상한 clamp | `clampActions`·`assignableMap`·`reclampTeamMembers` | TeamPermissions.php `:396-402`·`:354-360`·`:779-800` | REAL(action 축) |
| `TENANT_WIDEN` 방지 | tenant 강제주입(월경 불가) | index.php `:619` | REAL(격리) |
| `WILDCARD_ADD` 범위 | wildcard=api_key 프로그래매틱 한정(일반 부여 아님) | Keys.php `:191,204` · index.php `:577` · ADR §D-3(56행) | REAL(제한 범위) |
| `ROW_FILTER_RELAX` 탐지 | `effectiveScope` diff 미정형 | TeamPermissions.php `:236-265` | PARTIAL |
| `LEGAL_ENTITY_WIDEN`·`ORG_SUBTREE_WIDEN`·`RESOURCE_TYPE_ADD`·`ACTION_ADD`(canonical)·`FIELD_DENY_REMOVE`·`AMOUNT_CAP_INCREASE`·`DENY_REMOVE`·`CONSTRAINT_REMOVE`·`GROUP/BUNDLE/HIERARCHY_WIDEN`·`IMPLICATION_ADD` | before/after grant diff 정형·security review hook 부재 | ADR §1(24행) | ABSENT(신설) |
| `check_digest`·security review hook | 부재 | ADR §1(24행)·§3 | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Expansion=변경 diff 가드**: before/after grant digest를 비교해 확장 방향만 탐지. 축소·중립은 통과.
2. **High/Critical 게이팅**: 위험 확장은 `REQUIRE_APPROVAL`(+Security Review) 훅 — Part 5 Approval Authority/Part 8 Dual-Control 연결점.
3. **위임 상한 확장 승격**: 현행 `DELEGATION_EXCEEDED`(action 축 한 축)를 전 축 Expansion Guard로 일반화(무후퇴·기존 확장).
4. **Wildcard 최소화**: wildcard 추가는 CRITICAL · api_key 프로그래매틱 범위 유지(일반 사용자 부여 금지, ADR §D-3).
5. **fail-closed**: 미해석 축의 변경은 보수적으로 EXPAND 간주(안전 우선).

## ⑥ Gap

- **전 축 Expansion 탐지 부재**(ABSENT) — 위임 상한/action clamp는 실재하나 tenant/legal entity/org/field/amount/wildcard/deny-remove/implication 확대 탐지는 순신규.
- **before/after grant digest 부재** — grant version화(문서 4) 의존.
- **Security Review Hook 부재** — Part 5/8 승인·이중통제와 결합 필요.
- Part 1 D-2 위임/writeGuard 관련 4건은 289차 해소분 → **재플래그 금지**. 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE).

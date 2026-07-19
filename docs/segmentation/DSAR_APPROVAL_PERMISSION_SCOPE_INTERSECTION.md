# DSAR — Permission Scope Intersection (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

주체가 여러 Grant(direct·role·group·bundle)를 통해 동일 permission을 여러 scope로 획득할 때, **Effective Scope = 여러 scope의 교집합(Intersection)** 임을 정형화한다. 현행 `effectiveScope`(TeamPermissions.php `:236-265`)는 row scope를 계산하지만 다중 grant 결합을 **교집합으로 좁히는 규칙이 명시화되지 않았다**. 잘못하면 grant를 합칠 때 권한이 넓어지는(Union) 사고가 난다. 본 문서는 **결합=축소(Intersection)** 를 계약으로 못박는다.

- **권한 확장 금지**: 두 grant를 합쳐도 scope는 절대 넓어지지 않는다.
- **더 구체적 scope 적용**: 겹치는 축에서는 더 좁은(구체적) 값이 이긴다.

## ② Canonical 필드 (Canonical Fields)

`permission_scope_intersection`:

- `intersection_id` · `context_digest` · `permission_ref`
- `contributing_grant_refs[]`(교집합에 참여한 grant들)
- `scope_axes[]`(각 축: `axis_code`(열거) · `input_values_per_grant[]` · `intersected_value` · `narrowing_applied`(bool))
- `effective_scope`(축별 교집합 최종) · `empty_result`(bool · 교집합 공집합 시 → 거부)
- `intersection_digest`

## ③ 열거형 — `axis_code` (Scope 축)

`TENANT` · `LEGAL_ENTITY` · `ORG_UNIT` · `RESOURCE` · `RESOURCE_TYPE` · `ROW_FILTER` · `FIELD` · `ACTION` · `AMOUNT` · `CURRENCY` · `CHANNEL` · `TIME_WINDOW`

**교집합 규칙**: `TENANT ∩ LEGAL_ENTITY ∩ ORG_UNIT ∩ RESOURCE`(핵심 4축) 및 나머지 축 모두 교집합. 한 축이라도 공집합 → `empty_result=true` → **거부**(fail-closed).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Scope 축 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| `TENANT` | tenant 강제주입(모든 grant 귀속) | index.php `:619` | REAL(격리) |
| `ROW_FILTER` / `RESOURCE` | `effectiveScope`·`scopeSql`·`scopeSqlNamed` | TeamPermissions.php `:236-265`·`:286-293`·`:299-307` | REAL(계산·4핸들러) |
| `CHANNEL`(+product) | `scopeChannelProduct` | TeamPermissions.php `:315-322` | REAL(특정 도메인) |
| `ACTION` | ACTIONS 8종 | TeamPermissions.php `:39` | PARTIAL |
| 다중 grant **Intersection 규칙** | `effectiveScope` 계산은 있으나 교집합 정형 부재 | TeamPermissions.php `:236-265` | PARTIAL(Union 위험 미봉인) |
| `LEGAL_ENTITY` · `ORG_UNIT` · `FIELD` · `AMOUNT` · `CURRENCY` · `TIME_WINDOW` | 정형 scope 축 부재 | ADR §1(24행) | ABSENT(신설) |
| `intersection_digest` · `empty_result` 처리 | 부재 | ADR §1(24행) | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **결합=축소**: 다중 grant scope는 항상 Intersection · **절대 Union 금지**(권한 확장 방지). 문서 8 Expansion Guard와 짝.
2. **More-Specific 우선**: 겹치는 축은 더 좁은 값 채택(문서 6 Precedence 밴드 9 정합).
3. **공집합=거부**: 어느 축이든 교집합이 비면 `empty_result` → fail-closed 거부.
4. **핵심 4축 필수**: `TENANT∩LEGAL_ENTITY∩ORG_UNIT∩RESOURCE`는 항상 평가 · 미해석 축은 Deny 쪽으로 보수적 처리.
5. **감사 가능**: 어떤 grant가 어떤 축을 얼마나 좁혔는지(`narrowing_applied`) 기록.

## ⑥ Gap

- **Intersection 정형 부재**(PARTIAL) — `effectiveScope` 계산은 있으나 다중 grant 교집합 규칙 미명시 → Union 확장 사고 미봉인.
- **LEGAL_ENTITY/ORG_UNIT/FIELD/AMOUNT/CURRENCY/TIME 축 전무**(ABSENT) — scope 축 정형모델 순신규.
- **row scope enforce 4핸들러 한정** — 넓은 미필터 표면(ADR §1 26행). Part 1 D-2 writeGuard 서버배선은 289차 해소분 → **재플래그 금지**.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED). Snapshot 결합은 Part 1 의존 → **BLOCKED_PREREQUISITE**.

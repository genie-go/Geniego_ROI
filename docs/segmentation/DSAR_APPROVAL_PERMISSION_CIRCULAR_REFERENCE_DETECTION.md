# DSAR — Permission Circular Reference Detection (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Permission 확장(implication)·group nesting·bundle inclusion·hierarchy 부모-자식·legacy alias가 **순환 참조(Cycle)** 를 형성해 Resolution이 무한 루프·비결정에 빠지는 것을 차단하는 계약을 정의한다. 현행에는 implication/group nesting/bundle/hierarchy graph 자체가 없어(ADR §1 24행) 순환도 없지만, Part 3 RBAC·집계 primitive가 신설되면 순환 위험이 필연 발생한다. Pipeline 29단계 `CIRCULAR_CHECK`(문서 2)의 상세 계약을 여기서 정의한다.

- Circular ≠ Ambiguity(문서 9): Circular=참조 사이클(종료 불가), Ambiguity=다중 유효 후보.
- 안전 규율: 순환 탐지 시 해당 경로 **차단**(fail-closed) + Audit/Gap 기록.

## ② Canonical 필드 (Canonical Fields)

`permission_circular_finding`:

- `finding_id` · `context_digest` · `graph_type`(열거)
- `cycle_path[]`(순환을 이루는 노드 ref 순서) · `cycle_length` · `entry_node_ref`
- `detection_stage`(Pipeline 29 `CIRCULAR_CHECK`) · `action`(BLOCK_PATH/BLOCK_DEFINITION/QUARANTINE)
- `audit_ref` · `finding_digest`

## ③ 열거형 — `graph_type`

`PERMISSION_SELF_CYCLE` · `PERMISSION_DEPENDENCY_CYCLE` · `IMPLICATION_CYCLE` · `HIERARCHY_PARENT_CHILD_CYCLE` · `GROUP_NESTING_CYCLE` · `BUNDLE_INCLUSION_CYCLE` · `GROUP_BUNDLE_CROSS_CYCLE` · `MIGRATION_ALIAS_CYCLE`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Cycle 유형 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| role hierarchy(owner>manager>member) | `roleOf` — 3계 선형(순환 불가 구조) | TeamPermissions.php `:120-131` | REAL(선형·사이클 없음) |
| team membership | `app_user.team_id` 컬럼(중첩 team 부재) | TeamPermissions.php `:175`(team `:145-151`) | REAL(중첩 없음) |
| `PERMISSION_SELF/DEPENDENCY_CYCLE`·`IMPLICATION_CYCLE` | permission dependency/implication graph 부재 | ADR §1(24행) | ABSENT(신설) |
| `HIERARCHY_PARENT_CHILD_CYCLE` | permission hierarchy 부재(role 3계 선형뿐) | ADR §1(24행) | ABSENT(신설) |
| `GROUP_NESTING_CYCLE`·`BUNDLE_INCLUSION_CYCLE`·`GROUP_BUNDLE_CROSS_CYCLE` | group/bundle 개념 부재 | ADR §1(24행) | ABSENT(신설) |
| `MIGRATION_ALIAS_CYCLE` | legacy(menu_key→Canonical) alias 매핑 미착수 | TeamPermissions.php `:55-82` · ADR §3(77행) | ABSENT(신설) |
| `cycle_path`·`finding_digest`·차단 처리 | 부재 | ADR §1(24행) | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **탐지=차단**: 순환 발견 시 해당 경로/정의를 차단(fail-closed) · 절대 무한 확장 금지(Pipeline 조기 종료, 문서 2 §29).
2. **선형 성질 보존**: 현행 role 3계 선형·비중첩 team의 순환 불가 성질을 신설 graph에도 계승(무후퇴).
3. **정의 시점 + 해석 시점 이중 검사**: grant/definition 생성 시(정적) + Resolution 중(29단계) 모두 순환 검사.
4. **Audit/Gap 필수**: 모든 순환 finding은 audit + Gap 레지스트리에 기록(설명 가능성).
5. **Migration alias 순환 방지**: legacy→canonical 매핑이 서로를 가리키는 alias 사이클 차단.

## ⑥ Gap

- **implication/group/bundle/hierarchy graph 전무**(ABSENT) — 현행은 순환 위험이 원천적으로 없으나, Part 3 RBAC·집계 primitive 신설과 동시에 본 가드가 필수화됨(선제 계약).
- **migration alias graph 미착수** — menu_key→Canonical Code 매핑(ADR §3) 도입 시 alias 순환 가드 필요.
- **cycle 탐지 알고리즘·차단·audit 저장체 부재** — 순신규.
- 실 구현 = 선행 graph primitive 신설 후 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE).

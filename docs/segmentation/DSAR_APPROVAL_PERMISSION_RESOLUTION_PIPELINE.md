# DSAR — Permission Resolution Pipeline (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Resolution Context(문서 1)를 입력으로 받아 **결정론적 45단계**를 거쳐 Effective Allow/Deny Set(문서 4·5)과 Result(문서 3)를 산출하는 파이프라인 계약을 정의한다. 현행은 `effectiveForUser`(TeamPermissions.php `:366`)가 온디맨드로 계산하고 index.php RBAC(`:553-603`)가 게이트를 통과/차단할 뿐, **단계·순서·근거가 명시적으로 정형화되어 있지 않다**. 본 문서는 그 흐름을 감사·재현 가능한 순서로 고정한다.

- **핵심 규율**: **Explicit Deny를 Allow 확장보다 먼저 평가**한다(Default Deny + Deny Override).
- Permission≠Role≠Authority: Role/Group/Bundle grant 확장은 Permission Definition 해석 이후에만, Authority(금액 한도)는 별도 축 참조로만.

## ② Canonical 필드 (Canonical Fields)

`permission_resolution_pipeline_run`:

- `pipeline_run_id` · `context_ref`(문서 1) · `context_digest` · `pipeline_schema_version`
- `step_index` · `step_code`(열거) · `step_input_refs[]` · `step_output_refs[]` · `step_status`(PASS/DENY/SKIP/ERROR) · `step_reason_code`
- `first_explicit_deny_ref`(조기 발견 시) · `terminated_at_step` · `resolution_result_ref`(문서 3)
- `effective_allow_set_ref`(문서 4) · `effective_deny_set_ref`(문서 5)
- `pipeline_digest`(단계 순서+결과 해시 · 재현성)

## ③ 열거형 — 45단계 `step_code` (순서 고정)

1. `TENANT_RESOLVE` — 2. `SUBJECT_RESOLVE` — 3. `ACTOR_RESOLVE` — 4. `AUTH_VERIFY` — 5. `RESOURCE_RESOLVE` — 6. `ACTION_RESOLVE` — 7. `REGISTRY_LOOKUP` — 8. `NAMESPACE_RESOLVE` — 9. `DEFINITION_RESOLVE` — 10. `VERSION_SELECT` — 11. `DIRECT_GRANT_COLLECT` — 12. `ROLE_GRANT_COLLECT` — 13. `GROUP_GRANT_COLLECT` — 14. `BUNDLE_GRANT_COLLECT` — 15. `DELEGATED_GRANT_COLLECT` — 16. `SERVICE_ACCOUNT_GRANT_COLLECT` — 17. `SYSTEM_ACTOR_GRANT_COLLECT` — 18. `API_CLIENT_GRANT_COLLECT` — **19. `EXPLICIT_DENY_COLLECT`(★Allow 확장 전 우선 평가)** — 20. `VALIDITY_CHECK`(valid_from/until) — 21. `STATUS_CHECK`(active/suspended/revoked) — 22. `SCOPE_CHECK` — 23. `CONSTRAINT_CHECK` — 24. `DEPENDENCY_CHECK` — 25. `EXCLUSION_CHECK` — 26. `CONFLICT_CHECK` — 27. `HIERARCHY_EXPANSION` — 28. `IMPLICATION_EXPANSION` — 29. `CIRCULAR_CHECK`(문서 10) — 30. `SCOPE_INTERSECTION`(문서 7) — 31. `PRECEDENCE_APPLY`(문서 6) — 32. `DENY_OVERRIDE_APPLY` — 33. `EFFECTIVE_ALLOW_SET_BUILD`(문서 4) — 34. `EFFECTIVE_DENY_SET_BUILD`(문서 5) — 35. `REQUESTED_MATCH` — 36. `RESULT_DERIVE`(문서 3) — 37. `SNAPSHOT_WRITE` — 38. `EVIDENCE_CAPTURE` — 39. `AUDIT_EMIT` — 40. `DIGEST_COMPUTE` — 41. `DECISION_BINDING`(Part 1 결합) — 42. `EXPANSION_GUARD_CHECK`(문서 8) — 43. `AMBIGUITY_CHECK`(문서 9) — 44. `CACHE_DECISION`(version-aware 캐시 판단) — 45. `FINALIZE`

**`step_status`**: `PASS` · `DENY` · `SKIP` · `ERROR`. **`terminated_at_step`**: Explicit Deny(19)·Tenant/Auth 실패(1·4)·Circular(29)는 조기 종료 가능.

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| 단계 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| 1 `TENANT_RESOLVE` | index.php tenant 강제주입 | index.php `:619` | REAL(재사용) |
| 2·3 Subject/Actor | subject_type + `resolveAdminByToken` | TeamPermissions.php `:152-159` · UserAuth.php `:2998` | PARTIAL/REAL |
| 4 `AUTH_VERIFY` | 중앙 RBAC Bearer 게이트 | index.php `:553-603` | REAL(PEP) |
| 6 `ACTION_RESOLVE` | ACTIONS 8종 substrate(menu-domain 한정) | TeamPermissions.php `:39` | PARTIAL |
| 7~10 Registry/Namespace/Definition/Version | ABSENT — Canonical Code·Version화 없음 | ADR §1(24행) | ABSENT(신설) |
| 11·12 Direct/Role Grant | `acl_permission` + `roleOf` | TeamPermissions.php `:152-159`·`:120-131` | PARTIAL |
| 13~18 Group/Bundle/Delegated/SvcAcct/System/ApiClient | Group=acl subject_type · ApiClient=scopes | TeamPermissions.php `:152-159` · Keys.php `:191,204` | PARTIAL(Bundle/Delegated/System ABSENT) |
| **19 `EXPLICIT_DENY_COLLECT`** | first-class deny 부재 · `1=0` 센티넬만 | TeamPermissions.php `:290,303` | ABSENT(신설·★우선평가 미실현) |
| 22 `SCOPE_CHECK` | `effectiveScope`/`scopeSql`(4핸들러 소비) | TeamPermissions.php `:236-265`·`:286-293` | PARTIAL(넓은 미필터 표면) |
| 30 `SCOPE_INTERSECTION` | `effectiveScope` 계산 있으나 Intersection 정형 부재 | TeamPermissions.php `:236` | PARTIAL |
| 33 `EFFECTIVE_ALLOW_SET_BUILD` | `effectiveForUser`(계산·미영속) | TeamPermissions.php `:366` | REAL(계산)·미영속 |
| 31 `PRECEDENCE_APPLY` | 3계통 rank 분리·통합 resolver 부재 | index.php `:573-576` · PlanPolicy.php `:19` | PARTIAL |
| 27·28 Hierarchy/Implication · 41 Binding · 44 Cache | ABSENT | ADR §1(24행)·§3 | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Deny-first**: 19단계 `EXPLICIT_DENY_COLLECT`가 11~18의 Allow 확장 결과보다 **논리적 우선**. 32단계 Deny Override로 최종 봉인.
2. **결정론·재현성**: 동일 `context_digest`+`pipeline_schema_version` → 동일 `pipeline_digest`. 단계 순서 재배열 금지.
3. **조기 종료 안전**: Tenant/Auth/Circular 실패는 Allow 산출 이전에 종료(fail-closed).
4. **계산≠영속의 승격**: `effectiveForUser`(계산)를 Snapshot/Evidence(37·38)로 영속화하되 SSOT는 TeamPermissions 유지(무후퇴).
5. **UI≠Server**: UI hint 단계는 Precedence 최하위(문서 6). Pipeline 결정이 정본.

## ⑥ Gap

- **19단계 Explicit Deny 우선평가 미실현** — first-class deny row 부재로 현재는 "grant 부재"로만 거부 표현(ABSENT).
- **7~10 Registry/Namespace/Definition/Version 전무** — Canonical Code·Version화 순신규.
- **27·28·41·44(Hierarchy/Implication/Binding/Cache)** — 상위 Part 1 Decision Core(코드 0) 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- **22단계 Scope enforce 4핸들러 한정** — 넓은 미필터 mutating 표면(enforcement gap, ADR §1). Part 1 D-2 writeGuard 서버배선은 289차 해소분이므로 **재플래그 금지**.
- 실 구현 = 선행 Decision Core 신설 후 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).

# DSAR — Permission Resolution Context (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 본 문서의 모든 `file:line` 인용은 이 문서 + 상위 ADR §92 로 한정한다(**반날조**). 근거 없는 신규 file:line 인용 금지.

---

## ① 목적 (Purpose)

Permission Resolution의 **입력 계약**을 정형화한다. 현행은 게이트마다 흩어진 입력(토큰→`resolveAdminByToken`, `X-Tenant-Id` 주입, `app_user.team_role`, `data_scope`)을 그때그때 조회한다. Resolution Context는 이 흩어진 입력을 **하나의 불변 스냅샷 입력 구조**로 모아 Pipeline(문서 2)이 결정론적·재현 가능하게 소비하도록 한다.

- **Permission ≠ Role ≠ Authority**: Context는 "누가(actor)·무엇에(resource)·어떤 행위를(action)·어떤 조건에서" 만 담는다. Role은 grant 참조로만, Authority(금액 승인 한도 등)는 Part 5의 별도 축으로 참조만 한다.
- Context는 **평가 대상**이지 결정이 아니다. Result(문서 3)와 분리한다.

## ② Canonical 필드 (Canonical Fields)

`permission_resolution_context`:

- `context_id` · `context_schema_version` · `tenant_id`(모든 해석의 최상위 격리 경계)
- **Principal / Subject**: `principal_ref` · `canonical_subject_ref`(정규화된 주체) · `subject_type`(열거)
- **Effective Actor**: `effective_actor_ref` · `actor_type`(열거) · `on_behalf_of_ref`(위임/대행 시 원 주체)
- **Grant 참조(값 아님, 참조만)**: `role_refs[]` · `group_refs[]` · `bundle_refs[]` · `direct_grant_refs[]` · `deny_refs[]` · `delegation_refs[]`
- **비인간 Actor**: `service_account_ref` · `system_actor_ref` · `api_client_ref`
- **Auth 상태**: `auth_session_ref` · `identity_snapshot_ref` · `auth_assurance_level` · `authorization_context_ref`(Part 1 결합점)
- **Resource**: `resource_type` · `resource_id` · `resource_version`
- **Action**: `action_code`(`{DOMAIN}:{RESOURCE}:{ACTION}` Canonical)
- **조직/법인/거래 속성(ABAC)**: `legal_entity_ref` · `org_unit_ref` · `amount` · `currency` · `channel`
- **시간**: `effective_time`(결정 시점 · 유효성 창 판정 기준)
- **무결성**: `context_digest`(위 필드 정규화 후 해시 · Snapshot/Evidence 결합용)

## ③ 열거형 (Enumerations)

- **`subject_type`**: `HUMAN_USER` · `TEAM` · `MEMBER` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT`
- **`actor_type`**: `INTERACTIVE_USER` · `DELEGATED_USER` · `IMPERSONATED_USER` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `ADMIN_BYPASS`
- **`auth_assurance_level`**: `NONE` · `SESSION` · `API_KEY` · `MFA` · `STEP_UP`
- **`context_completeness`**: `COMPLETE` · `PARTIAL`(속성 미해석) · `UNRESOLVABLE`(fail-closed 대상)

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| `tenant_id` | index.php 중앙 RBAC의 tenant 강제주입(위조불가) | index.php `:619` (§92 CANONICAL·PEP) | REAL(재사용) |
| `canonical_subject_ref` / `subject_type` | `acl_permission.subject_type`(user/team/member) | TeamPermissions.php `:152-159` | PARTIAL(정규화 필요) |
| `effective_actor_ref` / `ADMIN_BYPASS` | `resolveAdminByToken`(admin 판정 SSOT) | UserAuth.php `:2998` (§92 CANONICAL·admin bypass) | REAL(확장) |
| `role_refs`(team_role) | `roleOf`(owner>manager>member·fail-closed) | TeamPermissions.php `:120-131` | PARTIAL |
| `direct_grant_refs` / `group_refs` | `acl_permission` row(Direct/Group substrate) | TeamPermissions.php `:152-159` | PARTIAL |
| `deny_refs` | first-class deny row 부재 · `1=0` 센티넬만 | TeamPermissions.php `:290,303` (DENY_SCOPE `:234`) | ABSENT(신설) |
| `api_client_ref` | api_key scopes(read/write/ingest…) | Keys.php `:191,204` · UserAuth.php `:4307` | REAL(프로그래매틱 한정) |
| `auth_session_ref` | 세션 토큰 at-rest 해시(289차 P5) — ADR §2 부수 | ADR §2(52행) | REAL(참조) |
| `legal_entity_ref` · `org_unit_ref` · `amount` · `currency` · `channel` | ABSENT — 정형 ABAC 속성모델 없음 | ADR §1(24행) | ABSENT(신설) |
| `bundle_refs` · `delegation_refs` · `system_actor_ref` · `identity_snapshot_ref` · `authorization_context_ref` · `context_digest` | ABSENT | ADR §1(24행)·§3 | ABSENT(신설·BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Context는 불변 입력**: 조립 후 변경 금지. Pipeline·Result·Snapshot이 동일 `context_digest`를 참조해 재현성 보장.
2. **참조만, 값 복제 금지**: role/group/bundle/grant/deny는 ref로만 담아 SSOT(TeamPermissions) 드리프트 방지(무후퇴).
3. **Tenant 최상위 경계**: `tenant_id` 없는 Context는 `UNRESOLVABLE`(Cross-tenant 격리 정본 index.php `:619` 재사용).
4. **Permission≠Role≠Authority**: Context는 3축을 서로 다른 필드로 분리 보관(role_refs vs action/resource vs amount/legal_entity).
5. **PARTIAL은 곧 fail-closed 신호**: 속성 미해석은 Pipeline에서 Default Deny로 귀결(문서 6 §Precedence 최하단).

## ⑥ Gap

- **legal_entity / org_unit / amount / currency / channel 정형 속성모델 부재**(ABSENT) — ABAC 확장은 순신규.
- **identity_snapshot / authorization_context 결합점 부재** — 상위 Part 1 Decision Core(코드 0)에 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- **context_digest 미영속** — `effectiveForUser`는 온디맨드 계산일 뿐 입력 스냅샷을 남기지 않음(TeamPermissions.php `:366`).
- 실 구현은 선행 Decision Core 신설 후 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).

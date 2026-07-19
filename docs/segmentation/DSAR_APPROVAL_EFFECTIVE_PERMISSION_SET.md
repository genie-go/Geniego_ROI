# DSAR — Effective Permission Set (Allow) (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

특정 주체·actor·resource/action context에서 **최종적으로 허용되는 permission 집합(Allow)** 을 시점 고정한 산출물로 정의한다. 현행 `effectiveForUser`(TeamPermissions.php `:366`)는 이 집합을 **온디맨드로 계산**하지만 **영속·캐시하지 않는다**(ADR §1 24행 "미영속·미캐시"). Effective Permission Set은 그 계산을 불변 스냅샷으로 결정화(結晶化)하여 Result·Snapshot·Evidence가 재사용하도록 한다.

- **Global vs Resource-specific 구분**: 리소스 인스턴스 무관 전역 Allow와 특정 resource_id/version 종속 Allow를 명시 분리.
- Deny는 별도(문서 5 Effective Deny Set)로 보존. 본 집합은 **Allow만**.

## ② Canonical 필드 (Canonical Fields)

`effective_permission_set`:

- `set_id` · `set_scope`(GLOBAL/RESOURCE_SPECIFIC) · `context_digest`(문서 1)
- `subject_ref` · `effective_actor_ref` · `resource_type` · `resource_id`(RESOURCE_SPECIFIC 시) · `action_context_ref`
- `permission_definition_refs[]` · `permission_version_refs[]`
- `source_chains[]`(각 allow의 유래: direct/role/group/bundle/hierarchy 경로)
- `effective_scopes[]`(문서 7 Intersection 결과) · `effective_constraints[]`
- `valid_from` · `valid_until`
- `identity_version` · `session_version` · `group_versions[]` · `bundle_versions[]` · `hierarchy_versions[]`(무엇이 바뀌면 재계산해야 하는지)
- `grant_digest` · `set_digest`(불변·캐시 무효화 키)

## ③ 열거형 (Enumerations)

- **`set_scope`**: `GLOBAL` · `RESOURCE_SPECIFIC`
- **`set_state`**: `FRESH`(방금 계산) · `SNAPSHOTTED`(영속됨) · `STALE`(버전 참조 변경으로 무효) · `INVALIDATED`(명시 무효화)
- **`source_chain_origin`**: `DIRECT` · `ROLE` · `GROUP` · `BUNDLE` · `HIERARCHY` · `DELEGATED` · `SERVICE_ACCOUNT` · `API_CLIENT` · `ADMIN_BYPASS`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| **effective set 계산** | `effectiveForUser`(온디맨드) | TeamPermissions.php `:366` (§92 Resolver substrate) | REAL(계산)·**미영속** |
| `effective_scopes` | `effectiveScope`(row scope 계산) | TeamPermissions.php `:236-265` (§92 Resolver substrate) | REAL(계산)·4핸들러 소비 |
| `source_chain_origin=DIRECT/ROLE/GROUP` | `acl_permission` subject_type + `roleOf` | TeamPermissions.php `:152-159`·`:120-131` | PARTIAL |
| `source_chain_origin=ADMIN_BYPASS` | `resolveAdminByToken` | UserAuth.php `:2998` | REAL(확장) |
| `source_chain_origin=API_CLIENT` | api_key scopes | Keys.php `:191,204` · index.php `:577` | REAL(프로그래매틱) |
| `permission_definition_refs` | ACTIONS 8종·MENU_CATALOG 26 | TeamPermissions.php `:39`·`:55-82` | PARTIAL(menu-domain) |
| `set_scope=RESOURCE_SPECIFIC` | data_scope row 필터 | TeamPermissions.php `:160-166` | PARTIAL |
| `permission_version_refs` · `group_versions` · `bundle_versions` · `hierarchy_versions` | Version화 전무 | ADR §1(24행) | ABSENT(신설) |
| `set_digest` · `grant_digest` · 영속/캐시 | 미영속·미캐시 | ADR §1(24행) | ABSENT(신설·BLOCKED_PREREQUISITE) |
| `source_chain_origin=BUNDLE/HIERARCHY/DELEGATED/SERVICE_ACCOUNT` | 부재 | ADR §1(24행) | ABSENT |

## ⑤ 설계원칙 (Design Principles)

1. **계산의 결정화**: `effectiveForUser`의 온디맨드 계산을 SSOT로 유지하되, 결과를 시점·버전 태그와 함께 불변 Set으로 영속(무후퇴·SSOT 단일화).
2. **Global/Resource 분리**: 전역 Allow와 리소스 종속 Allow를 섞지 않음 → 캐시 무효화 범위 최소화.
3. **버전 참조 = 무효화 신호**: identity/session/group/bundle/hierarchy 버전 중 하나라도 변하면 `STALE`(문서 2 44단계 Cache 판단).
4. **Allow만**: Deny는 문서 5로 별도 보존 · 본 Set은 Deny를 뺀 후의 순수 Allow가 아니라 **원 Allow 집합**(Deny Override는 Pipeline 32단계에서 결합).
5. **Permission≠Role**: `source_chains`로 role 유래를 추적하되 Set 자체는 permission 단위(role 단위 아님).

## ⑥ Gap

- **미영속·미캐시**(ABSENT) — `effectiveForUser`는 계산만, 스냅샷/버전 태그/digest 부재(ADR §1 24행).
- **Version 참조군 전무** — permission/group/bundle/hierarchy version화 순신규.
- **BUNDLE/HIERARCHY/DELEGATED source chain 부재** — 집계 확장은 선행 grant 모델 신설 의존.
- Snapshot/Evidence 결합은 상위 Part 1 Decision Core(코드 0) 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).

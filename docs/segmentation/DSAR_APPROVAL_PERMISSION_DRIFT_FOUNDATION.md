# DSAR — Permission Drift Foundation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — Drift 대사 기준인 Snapshot/Version substrate 부재)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

한 Authorization Decision이 산출된 시점의 Permission Resolution 결과(original resolution result·snapshot digest)와, **커밋/집행 시점의 현재 상태**가 달라졌는지(Drift)를 탐지한다. Drift가 있으면 원 결정에 근거한 집행을 **차단(commit blocked)**하고 재검증([`REVALIDATION`](DSAR_APPROVAL_PERMISSION_REVALIDATION_FOUNDATION.md))을 요구한다. 승인·결정과 실제 집행 사이에 권한이 변한(취소/축소/Deny 추가) 경우 stale 권한으로 집행되는 것을 막는 안전장치.

**순신규 근거**: Permission Snapshot=ABSENT, Version=ABSENT — 원 결정 시점 상태를 고정할 대사 기준 자체가 아직 부재.

## ② Canonical 필드 (Drift Record)

| 필드 | 설명 |
|---|---|
| `drift_id` | Drift 레코드 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `decision_id` / `resolution_result_id` | 원 결정·원 Resolution Result FK |
| `drift_type` | 아래 ③ 열거형(다중 가능) |
| `original_resolution_result` | 원 결정 시점 Effective Allow/Deny Set·Scope 스냅샷 |
| `previous_digest` | 원 결정 시점 다이제스트 |
| `current_digest` | 재평가 시점 다이제스트 |
| `severity` | INFO / LOW / MEDIUM / HIGH / CRITICAL |
| `commit_blocked` | Drift로 집행 차단 여부(bool) |
| `revalidation_required` | 재검증 요구 여부(bool) |
| `detected_at` | 탐지 시각 |

## ③ 열거형 — Drift Type

- `PERMISSION_VERSION_DRIFT`
- `GRANT_VERSION_DRIFT`
- `GRANT_STATUS_DRIFT`
- `GRANT_EXPIRATION_DRIFT`
- `DENY_DRIFT`
- `SCOPE_DRIFT`
- `CONSTRAINT_DRIFT`
- `DEPENDENCY_DRIFT`
- `CONFLICT_DRIFT`
- `EXCLUSION_DRIFT`
- `IMPLICATION_DRIFT`
- `GROUP_VERSION_DRIFT`
- `BUNDLE_VERSION_DRIFT`
- `HIERARCHY_VERSION_DRIFT`
- `ROLE_REFERENCE_DRIFT`
- `DELEGATION_REFERENCE_DRIFT`
- `CLIENT_DRIFT`
- `RESOURCE_VERSION_DRIFT`
- `ORGANIZATION_HIERARCHY_DRIFT`

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Drift Type | substrate | §92 태그 | 근거 |
|---|---|---|---|
| `GRANT_STATUS_DRIFT` | acl_permission row 존재/재기록 | Grant EXISTS | `TeamPermissions:325` |
| `GRANT_EXPIRATION_DRIFT` | (grant 만료 필드 부재) | **ABSENT** (Temporary/Expiration 신설 대상) | ADR §3 |
| `DENY_DRIFT` | `1=0` 센티넬 | Deny PARTIAL | `:290,303` |
| `SCOPE_DRIFT` | data_scope scope_values/effectiveScope | ROW/DATA_SCOPE_CANDIDATE | `:236-265` |
| `ROLE_REFERENCE_DRIFT` | team_role owner/manager/member | roleOf fail-closed | `:120-131` |
| `DELEGATION_REFERENCE_DRIFT` | assignableMap·reclampTeamMembers | 위임상한 | `:354-360`·`:779-800` |
| `PERMISSION_VERSION_DRIFT`/`GRANT_VERSION_DRIFT` | — | **ABSENT** (Version 부재) | Version=ABSENT |
| `GROUP/BUNDLE/HIERARCHY_VERSION_DRIFT` | — | **ABSENT** (Group/Bundle/Hierarchy 부재) | ABSENT |
| `DEPENDENCY/CONFLICT/EXCLUSION/IMPLICATION_DRIFT` | — | **ABSENT** (관계 모델 부재) | ABSENT |
| `RESOURCE_VERSION_DRIFT` | — | **ABSENT** (Resource Version Registry 부재) | ABSENT |
| `ORGANIZATION_HIERARCHY_DRIFT` | — | **ABSENT** (Org Hierarchy 부재) | ABSENT |
| `original_resolution_result`/digest 대사 | — | **ABSENT** (Snapshot/Digest 부재) | Snapshot=ABSENT |

## ⑤ 설계 원칙

- **Fail-closed on drift**: Drift 탐지 시 기본 `commit_blocked=true`·`revalidation_required=true`. 무드리프트 확정 전 집행 금지.
- **Deny/축소 방향 우선 차단**: Grant 취소·Scope 축소·Deny 추가 방향의 Drift는 severity 상향(권한이 줄었는데 옛 Allow로 집행하는 것을 최우선 차단).
- **원 결과 불변**: `original_resolution_result`는 절대 수정하지 않음 — Drift는 원 결과 대비 현재 상태의 **차이 기록**일 뿐. 정정은 새 Resolution Result 생성([`REVALIDATION`](DSAR_APPROVAL_PERMISSION_REVALIDATION_FOUNDATION.md)).
- **Digest 대사**: `previous_digest` vs `current_digest` 불일치 = Drift 후보. 다이제스트는 정규화된 Effective Set + Scope AST 기반.
- **Permission ≠ Role ≠ Authority**: `ROLE_REFERENCE_DRIFT`(Role 부여 변경)와 `PERMISSION_VERSION_DRIFT`(Permission 정의 변경)를 별개 Drift Type으로 분리.
- **Part 1 D-2 재플래그 금지**: writeGuard·requireFeaturePlan·admin_roles/user_roles·isAdmin 중복 4건은 289차 P1~P4 해소분 — Drift 대상 아님.

## ⑥ Gap

- Drift 탐지의 대사 기준(Snapshot·Digest·Version)이 전부 ABSENT — 현 단계에서 Drift 계산 불가(BLOCKED_PREREQUISITE).
- 다수 Drift Type(Version/Group/Bundle/Hierarchy/Dependency/Conflict/Exclusion/Implication/Resource/Org)이 순신규 substrate 위에서만 성립.
- Grant 만료/일시 부여 필드 부재로 `GRANT_EXPIRATION_DRIFT`는 Expiration Entity 신설 후.
- Part 1 Authorization Decision/Snapshot 실 저장체 + Decision Core 신설이 선행(공회전 방지).

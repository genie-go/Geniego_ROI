# DSAR — Role Retirement (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

`RETIRED` 상태 Role의 **행동 규약**을 규정하는 명세. 은퇴 역할은 런타임 Effective Role Set에서 **완전히 배제**되고 신규 부여가 금지되며 기존 부여는 무효화/이관되지만, Permission Mapping·Snapshot·Evidence·Audit·Alias·Replacement 등 **Historical 참조 자산은 불변 보존**된다. Deprecation(유예·기존 유지)의 다음 단계로, 런타임 무효화가 핵심. ★**순신규**.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `retired_at` | 은퇴 시각 |
| `retired_by` | 은퇴 수행 actor |
| `retirement_reason` | 은퇴 사유 |
| `runtime_effective_excluded` | 런타임 Effective Set 배제(=true) |
| `new_assignment_blocked` | 신규 Assignment 차단(=true) |
| `existing_assignment_invalidated` | 기존 부여 무효화/Migration 처리 |
| `permission_mapping_retained` | Permission Mapping Historical 보존 |
| `snapshot_retained` | Snapshot 보존 |
| `evidence_retained` | Evidence 보존 |
| `audit_retained` | Audit 보존 |
| `alias_retained` | Legacy Alias 보존 |
| `replacement_role_ref` | 대체 Role 참조(Historical) |

## 3. 열거형 / 타입

**Retirement 규약(모두 강제)**: Runtime Effective Set 포함 금지 · 신규 Assignment 금지 · 기존 부여 무효화/Migration · Permission Mapping 유지 · Snapshot 유지 · Evidence 유지 · Audit 유지 · Alias 유지 · Replacement Historical 유지.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 런타임 Effective 계산(배제 지점) | `effectiveForUser`/`roleOf` | EXISTS(배제 게이트 부착 지점) | `TeamPermissions.php:120-131` |
| 폐기 후 고아 보존 선례 | `admin_roles`/`user_roles`(고아 유지) | DEPRECATED 선례(재부활 금지) | `routes.php:1670`·`UserAdmin.php:596-599` |
| 변경 감사 로그 | `auth_audit_log` | PARTIAL(Evidence 로그) | ADR §1·EXISTING §3 |

★**정직**: `retired_at`/`runtime_effective_excluded`/`existing_assignment_invalidated`/`permission_mapping_retained`/`snapshot_retained`/`evidence_retained`/`alias_retained`/`replacement_role_ref` = **전부 순신규 ABSENT**. Snapshot/Evidence(EXISTING §3)=ABSENT/PARTIAL로 보존 대상 자산 자체가 미구축. 런타임 배제 게이트도 미구현(roleOf는 하드코딩 값만 해석). Alias/Replacement 개념 전무.

## 5. 설계 원칙 / 결정

- **런타임 완전 배제(fail-closed)**: Retired Role은 `roleOf`/`effectiveForUser` 결과에서 제외 — Deprecated와 달리 유예 없음. 캐시된 Effective에서도 무효화 트리거(`ROLE_RETIRED`·Validity 문서)로 회수.
- **기존 부여 무효화/Migration**: 잔존 Assignment는 무효 처리하되 `replacement_role_ref`로 이관 안내.
- **Historical 불변 보존**: Permission Mapping·Snapshot·Evidence·Audit·Alias·Replacement는 삭제 금지(감사 추적성·과거 Decision 재현). 파괴적 DROP 금지(폐기 admin_roles 고아 유지 원칙 계승).
- Retirement ≠ Suspension(가역 중지) ≠ Deprecation(유예 유지) — Retirement는 런타임 종료+Historical 보존.
- Golden Rule: `roleOf` 해석 경로에 배제 게이트 부착·`auth_audit_log`를 Evidence로 확장 — 중복 store 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Retirement 상태·런타임 배제·Historical 보존 자산 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Snapshot/Evidence/Permission Mapping 보존은 해당 엔티티(Snapshot·Part 2 Permission Mapping) 실 구현 부재로 공회전 — 보존할 대상이 아직 없음.
- 기존 부여 무효화는 Role Assignment(Part 3-3) 선행.
- 폐기 admin_roles/user_roles 재부활·재플래그 금지. 289차 P1~P4 재플래그 금지.

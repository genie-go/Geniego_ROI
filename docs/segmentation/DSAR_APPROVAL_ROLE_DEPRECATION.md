# DSAR — Role Deprecation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

`DEPRECATED` 상태 Role의 **행동 규약**을 규정하는 명세. 폐기된 역할은 신규 부여를 막되 기존 부여는 유지하며 대체 역할로의 이관을 유도한다. 폐기는 **삭제가 아니다** — 런타임에서 즉시 사라지는 Suspension/Retirement과 구분되며, 유예기간을 두고 마이그레이션을 안내한다. Lifecycle(`ACTIVE→DEPRECATED`) 전이의 상태별 세칙. ★**순신규**.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `deprecated_at` | 폐기 시각 |
| `deprecated_by` | 폐기 수행 actor |
| `deprecation_reason` | 폐기 사유 |
| `replacement_role_ref` | 대체 Role 참조 |
| `migration_marker` | 기존 Assignment의 마이그레이션 표시 |
| `new_assignment_blocked` | 신규 Assignment 차단(=true) |
| `new_temp_assignment_blocked` | 신규 임시 부여 차단(=true) |
| `emergency_exception_policy` | Emergency 예외 별도 검토 정책 |
| `certification_intensified` | 잔존 Assignment Certification 강화 |
| `ui_api_warning` | UI/API Deprecated 경고 노출 |

## 3. 열거형 / 타입

**Deprecation 규약(모두 강제)**: 신규 Assignment 금지 · 신규 Temp Assignment 금지 · Emergency 예외 별도 검토 · 기존 Assignment Migration 표시 · Replacement 안내 · UI/API Warning · 잔존 Certification 강화 · Cache Invalidation · Audit.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 폐기 후 고아 유지 선례 | `admin_roles`/`user_roles`(파괴적 DROP 대신 고아 유지) | DEPRECATED 선례(재부활 금지) | `routes.php:1670`·`UserAdmin.php:596-599` |
| 변경 감사 로그 | `auth_audit_log` | PARTIAL(Evidence 로그) | ADR §1·EXISTING §3 |

★**정직**: `deprecated_at`/`replacement_role_ref`/`migration_marker`/`new_assignment_blocked`/`new_temp_assignment_blocked`/`emergency_exception_policy`/`certification_intensified`/`ui_api_warning` = **전부 순신규 ABSENT**. 현 substrate에는 역할 폐기 상태·신규 부여 차단·대체 안내·Migration 표시 개념이 전무. 유일한 선례는 폐기 admin_roles의 "파괴적 DROP 대신 고아 테이블 유지" 원칙(재부활·재플래그 금지)뿐.

## 5. 설계 원칙 / 결정

- **신규 부여 차단·기존 유지**: Deprecated Role은 신규/신규Temp Assignment 모두 거부. 기존 부여는 `migration_marker`로 표시하며 `runtime_allowed_until`(Validity)까지 유예.
- **Emergency 예외**: 긴급 상황의 신규 부여는 자동 금지가 원칙이나, `emergency_exception_policy`로 별도 검토·감사 후에만 허용(자동 우회 금지).
- **Replacement 안내**: `replacement_role_ref` 를 UI/API Warning으로 노출해 마이그레이션 유도.
- **Certification 강화·Cache Invalidation·Audit**: 잔존 Assignment는 재인증 강화, 폐기 시 Effective 캐시 무효화, 전 과정 감사.
- **삭제 금지**: Deprecation은 상태 전이 — Definition In-place 삭제/DROP 금지(폐기 admin_roles 고아 유지 원칙 계승).
- Deprecation ≠ Suspension(즉시 런타임 제거) ≠ Retirement(런타임 무효) — 세 폐지 계열은 별 엔티티·행동 상이.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Deprecation 상태·신규 부여 차단·Migration/Replacement·Warning = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Migration 표시·Certification 강화는 선행 Role Assignment(Part 3-3)·Certification(후속) 부재로 공회전.
- Cache Invalidation은 Effective Role Cache 엔티티([`DSAR_APPROVAL_ROLE_SUSPENSION`](DSAR_APPROVAL_ROLE_SUSPENSION.md)) 실 구현 선행.
- 폐기 admin_roles/user_roles 재부활·재플래그 금지. 289차 P1~P4 재플래그 금지.

# DSAR — Permission Suspension (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Grant를 **삭제하지 않고 일시적으로 비활성화**하는 이벤트의 Canonical 명세. Revocation(영구 회수)과 달리 Suspension은 복원(reactivation) 가능한 정지다 — 근거 조사·일시적 위험·미납/보류 상태 등에 사용. 정지 사유·주체·시각·유효기한·자동 재활성 정책을 기록한다. ★**Critical/Incident 사유의 Suspension은 자동 재활성 금지**(사람의 명시 검토·해제 필요). Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `suspension_id` | Suspension 식별자 |
| `grant_id` | 정지 대상 Grant 참조(삭제하지 않음) |
| `reason` | 정지 사유(필수) |
| `suspend_type` | 정지 유형(§3) |
| `suspended_by` / `suspended_at` | 정지 실행 주체 / 시각 |
| `valid_until` | 정지 유효 한계(도래 시 정책에 따름) |
| `auto_reactivation_policy` | 자동 재활성 정책(§3·Critical/Incident=금지) |
| `reactivated_by` / `reactivated_at` | 해제 주체 / 시각(사후 기록) |
| `digest` | Suspension 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**suspend_type**: `ROUTINE` · `INVESTIGATION` · `RISK` · `BILLING_HOLD` · `CRITICAL` · `INCIDENT`.
**auto_reactivation_policy**: `AUTO_ON_EXPIRY`(정지 만료 시 자동 복원) · `MANUAL_ONLY`(사람 해제만) · `FORBIDDEN`(자동 재활성 금지·Critical/Incident 강제).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Grant 존재 유지 | `acl_permission` row(삭제 없이) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171` |
| 활성/비활성 판정 substrate | (없음·활성 플래그 부재) | ABSENT | — |
| 정지 감사 | `auth_audit_log`(변경 기록) | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/ABSENT**: `suspension_id`·`suspend_type`·`suspended_by`/`suspended_at`·`valid_until`·`auto_reactivation_policy`·`reactivated_by/at`·`digest` = **전부 순신규 ABSENT**. 현 `acl_permission`에는 grant를 유지한 채 비활성으로 표시하는 **활성 플래그/상태 컬럼 자체가 없음**(존재=활성, 부재=미부여의 이분법만). 따라서 "삭제 없는 일시정지" 개념을 담을 substrate 부재.

## 5. 설계 원칙 / 결정

- Suspension은 Grant를 **삭제하지 않음** — Revocation([`DSAR_APPROVAL_PERMISSION_REVOCATION`](DSAR_APPROVAL_PERMISSION_REVOCATION.md))과 명시 구분(복원 가능).
- **Critical/Incident Suspension은 자동 재활성 금지**(`auto_reactivation_policy=FORBIDDEN` 강제) — 사람의 명시 검토·해제 필수(fail-closed).
- 정지 중 Grant는 Resolution에서 비활성 취급(정지=일시 Deny와 동등 효과·Explicit Deny와 정합).
- 정지·해제 모두 불변 감사로 영속.
- Golden Rule: acl_permission에 활성/정지 상태 축을 확장(중복 정지 store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 정지 상태 축·suspend_type·자동 재활성 정책·해제 추적 = 순신규(활성 플래그 substrate 부재).
- **BLOCKED_PREREQUISITE**: 정지→Resolution 반영·자동/수동 해제는 선행 Effective-Set 영속 + Decision Core 부재로 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.

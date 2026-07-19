# DSAR — Permission Revocation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

이미 부여된 Grant를 **영구 회수**하는 이벤트의 Canonical 명세. Suspension(일시 비활성·복원 가능)과 달리 Revocation은 되돌리지 않는 종료다. 누가·왜·언제 요청/발효했는지, 즉시성 여부, 사고/퇴직/역할변경 등 연계 사유, 캐시 무효화 시점과 영향받는 활성 세션을 기록한다. ★**Immediate Revocation = 현재 Session Effective Cache에 즉시 반영**(지연 없이 차단). Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `revocation_id` | Revocation 식별자 |
| `grant_id` | 회수 대상 Grant 참조 |
| `revoked_by` | 회수 실행/승인 주체 |
| `reason` | 회수 사유(필수) |
| `requested_at` / `effective_at` | 요청 시각 / 발효 시각 |
| `immediate` | Boolean(즉시 반영 여부) |
| `related_incident_ref` | 연계 사고 참조 |
| `related_termination_ref` | 연계 퇴직/계약종료 참조 |
| `related_role_change_ref` | 연계 역할 변경 참조 |
| `cache_invalidated_at` | Session Effective Cache 무효화 시각 |
| `active_sessions_affected_ref` | 영향받은 활성 세션 참조 |
| `digest` | Revocation 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**revocation trigger**: `MANUAL` · `INCIDENT` · `TERMINATION` · `ROLE_CHANGE` · `POLICY` · `EXPIRATION_CASCADE`.
**timing**: `IMMEDIATE`(캐시 즉시 무효) · `SCHEDULED`(effective_at 도래 시).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Grant 제거 | `acl_permission` DELETE/replace | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:325-336`(replacePerms) |
| 위임상한 재클램프(연쇄 회수) | `reclampTeamMembers` | 인접 substrate | `TeamPermissions.php:779-800` |
| 회수 감사 | `auth_audit_log`(변경 기록) | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/ABSENT**: `revocation_id`·`revoked_by`·`reason`·`requested_at`/`effective_at`·`immediate`·`related_incident/termination/role_change_ref`·`cache_invalidated_at`·`active_sessions_affected_ref`·`digest` = **전부 순신규 ABSENT**. 현재 acl_permission replace/DELETE는 회수 이벤트를 별도 엔티티로 남기지 않음(변경 후 상태만)·Session Effective Cache 자체가 미영속(effectiveForUser 온디맨드 계산)이라 무효화 대상 캐시 부재.

## 5. 설계 원칙 / 결정

- **Immediate Revocation = 현재 Session Effective Cache 즉시 반영** — 발효 후 남은 세션이 회수된 권한을 계속 쓰지 못하게 차단(cache_invalidated_at 기록).
- Revocation은 되돌리지 않음(재부여는 새 Grant) — Suspension([`DSAR_APPROVAL_PERMISSION_SUSPENSION`](DSAR_APPROVAL_PERMISSION_SUSPENSION.md))과 명시 구분.
- INCIDENT/TERMINATION trigger는 항상 `immediate=true` 원칙(지연 회수 금지).
- 회수 이벤트는 불변 감사로 영속(사후 추적 가능).
- Golden Rule: acl_permission replace/reclamp를 Revocation substrate로 확장(중복 회수 store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Revocation 이벤트 엔티티·즉시 캐시 무효화·활성 세션 영향 추적 = 순신규.
- **BLOCKED_PREREQUISITE**: Session Effective Cache 즉시 무효화는 선행 Effective-Set 영속/캐시(version-aware) 부재로 공회전 — 현재 캐시가 없어 무효화 대상 자체가 미존재. RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.

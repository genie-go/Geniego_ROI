# DSAR — Permission Emergency Grant (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

장애·보안사고 등 **긴급 상황에서만** 예외적으로 부여되는 Grant. 일반 Temporary Grant(예정된 만기부 부여)와 **명시적으로 분리**되는 별도 1급 엔티티다 — Emergency는 incident/ticket 근거·강제 post-review·session 결속·최소 사용횟수를 상시 강제하는 반면, 일반 Temporary는 그렇지 않다. Break-glass 절차의 Canonical 명세이며, 부여 자체가 사후 감사·회수 대상이다. Permission ≠ Role ≠ Approval Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `emergency_grant_id` | Emergency Grant 식별자(전역 유일) |
| `grant_kind` | 상수 `EMERGENCY`(일반 Snapshot의 `TEMPORARY`와 명시 구분) |
| `permission_code` / `permission_version` | 부여되는 Permission Canonical Code + 버전 결속 |
| `subject_ref` | 부여 대상 actor(HUMAN_USER 원칙) |
| `incident_ref` | 연계 사고 식별자(장애/보안 incident) |
| `ticket_ref` | 티켓/변경요청 참조(감사 근거) |
| `reason` | 긴급 부여 사유(자유서술·필수) |
| `approver_ref` | 승인자 참조(Break-glass 승인 주체) |
| `activated_by` | 실제 활성화 실행 actor |
| `scope` | 결합 Scope(Tenant/Resource/Row·Intersection·Expansion Guard) |
| `valid_from` / `valid_until` | 유효 개시/만기(강제 만기·무기한 금지) |
| `use_count` / `max_use` | 사용 횟수/최대 허용(초과 시 자동 소진) |
| `session_binding` | 결속 세션 식별자(세션 외 재사용 금지) |
| `notification_ref` | 부여 즉시 통지 대상/기록 |
| `post_review_required` | Boolean(항상 true·Mandatory) |
| `post_review_due_at` | 사후검토 기한 |
| `revoked` / `revoked_ref` | 회수 여부 + 회수 레코드 참조([`DSAR_APPROVAL_PERMISSION_REVOCATION`](DSAR_APPROVAL_PERMISSION_REVOCATION.md)) |
| `digest` | Emergency Grant 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**grant_kind**: `EMERGENCY`(본 엔티티) — 일반 `TEMPORARY` / `PERMANENT`와 구분.
**lifecycle status**: `REQUESTED` · `ACTIVATED` · `IN_USE` · `EXHAUSTED`(max_use 초과) · `EXPIRED`([`DSAR_APPROVAL_PERMISSION_EXPIRATION`](DSAR_APPROVAL_PERMISSION_EXPIRATION.md)) · `REVOKED` · `POST_REVIEW_PENDING` · `CLOSED`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Grant row 자체 | `acl_permission` INSERT(menu_key×actions) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171`·`:325-336` |
| scope 결합 substrate | `data_scope`(행필터·Intersection 후보) | ROW/DATA_SCOPE_CANDIDATE | `TeamPermissions.php:160-171`·`:218-322` |
| approver/activated_by 감사 | `auth_audit_log`(변경 기록 SSOT) | Evidence PARTIAL | `UserAuth::logAudit`(per-request 결정 미감사) |

★**정직/ABSENT**: `grant_kind=EMERGENCY` 분류·`incident_ref`/`ticket_ref`/`approver_ref`/`activated_by`·`valid_from`/`valid_until`·`use_count`/`max_use`·`session_binding`·`notification_ref`·`post_review_required`/`post_review_due_at`·`revoked`·`digest` = **전부 순신규 ABSENT**. 현 acl_permission은 (menu_key, actions, updated_at)만·Emergency/Temporary 구분·만기·사용횟수·session 결속 축 전무. Break-glass 워크플로 부재.

## 5. 설계 원칙 / 결정

- Emergency Grant는 일반 Snapshot/Temporary와 **명시적으로 분리**(`grant_kind=EMERGENCY` 상수 강제) — 혼용 금지.
- 무기한 Emergency 금지 — `valid_until`·`max_use` 둘 중 하나 이상 필수(fail-closed·미지정=즉시 만료).
- `post_review_required`는 항상 true·비활성 불가(Mandatory Control·ADR §6.16). 사후검토 미이행 = 자동 회수/차단 대상.
- Session 외 재사용 금지 — `session_binding` 불일치 시 Deny(Explicit Deny 우선).
- Emergency도 Explicit Deny([`DSAR_APPROVAL_PERMISSION_DENY`](DSAR_APPROVAL_PERMISSION_DENY.md))에 우선하지 않음 — SECURITY/INCIDENT Deny가 상위.
- Golden Rule: acl_permission grant를 확장(별도 emergency store 신설 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Emergency 분류·incident/session 결속·use count·post-review = 순신규.
- **BLOCKED_PREREQUISITE**: post-review·통지·회수 반영은 선행 Decision Core + Grant Version + Revocation 엔티티 부재로 상위 결합 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.

# DSAR — Permission Expiration (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

시간 도래로 Grant가 **자동 만료**되는 규칙의 Canonical 명세. 만료는 사람의 개입 없이 유효기간 종료 시 권한을 소멸시키는 안전장치다 — 한시·긴급·고위험·외부·계약직·서비스계정·API·위임·예외·이관·검토지연 Grant에 적용된다. ★**Expired Grant는 Resolution에서 제외되고 Session Effective Cache가 무효화**된다(만료 후 재사용 불가). Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `expiration_id` | Expiration 레코드 식별자 |
| `grant_id` | 만료 대상 Grant 참조 |
| `applies_to_kind` | 적용 Grant 종류(§3) |
| `valid_from` / `expires_at` | 유효 개시 / 만료 시각(필수) |
| `expired_state` | 만료 후 상태(Resolution 제외) |
| `cache_invalidated_at` | Session Effective Cache 무효화 시각 |
| `grace_period` | 유예(선택·기본 없음·fail-closed) |
| `renewal_ref` | 갱신 시 새 Grant 참조(자동갱신 아님·명시 재부여) |
| `digest` | Expiration 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**applies_to_kind(Expiration 적용 대상)**: `TEMPORARY` · `EMERGENCY` · `DIRECT_HIGH_RISK` · `EXTERNAL` · `CONTRACTOR` · `SERVICE_ACCOUNT` · `API_CLIENT` · `DELEGATED` · `EXCEPTION` · `MIGRATION_PROVISIONAL` · `REVIEW_OVERDUE`.
**expired_state**: `EXPIRED`(Resolution 제외·재사용 불가).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Grant row | `acl_permission`(만기 컬럼 없음) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171` |
| 유효 grant 계산 | `effectiveForUser`(온디맨드·만기 미필터) | EXISTS(미영속) | `TeamPermissions.php:366` |
| 만료 감사 | `auth_audit_log`(변경 기록) | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/ABSENT**: `expiration_id`·`applies_to_kind` 11종·`valid_from`/`expires_at`·`expired_state`·`cache_invalidated_at`·`grace_period`·`renewal_ref`·`digest` = **전부 순신규 ABSENT**. 현 `acl_permission`에는 **만기/유효기간 컬럼 자체가 없어**(updated_at만) 시간 기반 자동 만료 개념이 부재하며, `effectiveForUser`도 만기 필터를 하지 않음(존재하면 유효). 한시/긴급/위임 등 종류별 만료 정책 없음.

## 5. 설계 원칙 / 결정

- **Expired → Resolution 제외 + Cache 무효화** — 만료된 Grant는 실효 권한 집합에서 배제(재사용 불가).
- 자동 갱신 금지 — 만료 시 소멸이 기본, 연장은 명시 재부여(`renewal_ref`·새 Grant).
- `grace_period` 기본 없음(fail-closed) — 유예는 명시 정책일 때만.
- Emergency([`DSAR_APPROVAL_PERMISSION_EMERGENCY_GRANT`](DSAR_APPROVAL_PERMISSION_EMERGENCY_GRANT.md))·Service Account·API Client·위임·예외·이관·검토지연 Grant 모두 만기 필수(무기한 금지).
- Golden Rule: acl_permission에 만기 축을 확장(중복 만료 스케줄러/store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 만기 컬럼·종류별 만료 정책·만료 후 Resolution 제외·캐시 무효화 = 순신규(만기 substrate 부재).
- **BLOCKED_PREREQUISITE**: 만료 후 Cache 무효화·Resolution 제외는 선행 Effective-Set 영속/캐시(version-aware) + Decision Core 부재로 공회전(무효화 대상 캐시 미존재) — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.

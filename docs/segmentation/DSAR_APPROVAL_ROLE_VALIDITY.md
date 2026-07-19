# DSAR — Role Validity (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Role Definition의 **시간·버전 유효성**과 무효화 트리거를 규정하는 명세. 역할이 언제부터/언제까지 유효한지, 어느 버전이 활성인지, 언제까지 Assignment/런타임에 쓸 수 있는지를 선언하고, 상시 재평가되는 **Invalidation Trigger** 집합으로 유효성을 fail-closed로 회수한다. Lifecycle 상태(별 엔티티)와 직교 — 상태가 `ACTIVE`여도 유효성 트리거가 걸리면 무효. ★**순신규**.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `valid_from` | 유효 시작 |
| `valid_until` | 유효 종료 |
| `active_version` | 현재 활성 Role Definition 버전 |
| `assignment_allowed_from` | Assignment 허용 시작 |
| `assignment_allowed_until` | Assignment 허용 종료 |
| `runtime_allowed_until` | 런타임 Effective 포함 허용 종료 |
| `deprecation_date` | 폐기 예정/시각 |
| `retirement_date` | 은퇴 예정/시각 |
| `archive_date` | 보관 예정/시각 |
| `replacement_ref` | 대체 Role 참조 |
| `invalidation_triggers` | 활성 무효화 트리거 집합(§3) |

## 3. 열거형 / 타입

**Invalidation Trigger**: `REGISTRY_SUSPENDED`(Registry 중단) · `ROLE_SUSPENDED` · `ROLE_RETIRED` · `ACTIVE_VERSION_MISSING`(활성 버전 소실) · `PERMISSION_RETIRED`(결합 Permission 은퇴) · `OWNER_MISSING`(Owner 부재) · `APPROVAL_MISSING`(승인 부재) · `ACTOR_ELIGIBILITY_INVALID` · `CRITICAL_REVIEW_OVERDUE`(중요 Review 기한 초과) · `TAMPER`(변조 탐지) · `KILL_SWITCH`(비상 정지).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 활성 유효 계산(미영속) | `effectiveForUser`/`roleOf`(요청 시점 해석) | EXISTS(미영속·버전 무개념) | `TeamPermissions.php:120-131` |
| 권한상승 차단(부분 유효성 통제) | 신규 admin=sub 강제 | 부분 통제 | `UserAdmin.php:298-301,436-438` |

★**정직**: `valid_from`/`valid_until`/`active_version`/`assignment_allowed_*`/`runtime_allowed_until`/`deprecation·retirement·archive_date`/`replacement_ref`/`invalidation_triggers` = **전부 순신규 ABSENT**. 현 역할은 시간 유효성·버전 개념이 전무(EXISTING §3 Version=ABSENT)하고, 유효성은 요청 시점 `roleOf`가 즉석 계산할 뿐 영속 유효 창·무효화 트리거 집합이 없다. Owner/Approval/Tamper/Kill Switch 트리거 substrate 전무.

## 5. 설계 원칙 / 결정

- **fail-closed 유효성**: `valid_from`~`valid_until` 밖·`active_version` 소실·트리거 발동 시 Role은 즉시 무효(런타임 Effective 미포함·신규 Assignment 거부).
- **Invalidation Trigger 상시 재평가**: 위 11 트리거는 캐시된 Effective Role 위에서도 재평가 — 하나라도 참이면 무효(캐시 무효화 연동은 Suspension 문서 참조).
- **Assignment/Runtime 창 분리**: `assignment_allowed_until` < `runtime_allowed_until` 가능(신규 부여는 막되 기존 런타임은 유예). Deprecated 역할의 전형.
- **replacement_ref 유도**: 폐기/은퇴 시 대체 Role 안내(Migration 근거).
- Validity ≠ Lifecycle status: 상태 전이 없이도 트리거로 무효화 가능(예 `ACTIVE`+`OWNER_MISSING`→무효).
- Golden Rule: `effectiveForUser`/`roleOf` 해석 경로에 유효성 게이트를 얹어 확장 — 별도 resolver 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 시간 유효 창·활성 버전·Invalidation Trigger 11종 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: `PERMISSION_RETIRED` 트리거는 선행 Part 2 Permission Version, `TAMPER`는 불변 Ledger/Hash Chain(`SecurityAudit::verify`가 유일 실 append-only 해시체인), `ACTIVE_VERSION_MISSING`은 Role Version 엔티티 실 구현 부재로 공회전.
- `OWNER_MISSING`/`APPROVAL_MISSING` 트리거는 Role Owner/Approval 엔티티(후속 Part) 선행.
- 289차 P1~P4·폐기 admin_roles 재플래그 금지.

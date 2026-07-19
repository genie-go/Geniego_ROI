# DSAR — Role Suspension (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

`SUSPENDED` 상태 Role의 **행동 규약**을 규정하는 명세. 정지된 역할은 신규 부여가 금지되고 기존 부여의 런타임 효력이 **즉시 중지**되며, Effective Role 캐시·연관 Permission 캐시가 즉시 무효화되고 활성 세션이 재검증된다. 정지는 **가역적**(→`ACTIVE` 복원 가능)이며, Definition을 삭제하지 않는다 — Retirement/삭제와 명확히 구분. ★**순신규**.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `suspended_at` | 정지 시각 |
| `suspended_by` | 정지 수행 actor |
| `suspension_reason` | 정지 사유 |
| `new_assignment_blocked` | 신규 Assignment 차단(=true) |
| `runtime_halted` | 기존 부여 런타임 효력 즉시 중지(=true) |
| `effective_role_cache_invalidated` | Effective Role Cache 즉시 무효화 |
| `permission_cache_invalidated` | 연관 Permission Cache 무효화 |
| `active_session_revalidation` | 활성 세션 재검증 트리거 |
| `notification_sent` | 관련 actor 통지 |
| `reversible` | 가역(=true·복원 가능) |

## 3. 열거형 / 타입

**Suspension 규약(모두 강제)**: 신규 Assignment 금지 · 기존 Runtime 중지 · Effective Role Cache 즉시 무효화 · 연관 Permission Cache 무효화 · Active Session Revalidation · Audit · Notification.

**금지**: Definition 삭제로 정지 처리 금지(가역성 파괴). 삭제는 별 경로(불가 — 상태 전이만).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 세션 기반 관리자 판정 SSOT(재검증 부착 지점) | `resolveAdminByToken`(289차 P4·plan\|plans+admin_level 폴백) | EXISTS(Revalidation 정합 패턴) | ADR §D-2 |
| 세션 무효화 패턴(P4/P5 정합 대상) | 세션 무효화(289차 P4/P5) | EXISTS(Active Session Revalidation 정합) | ADR §D-2·§2 |
| 요청 시점 역할 해석(중지 게이트 지점) | `effectiveForUser`/`roleOf` | EXISTS(런타임 halt 부착 지점) | `TeamPermissions.php:120-131` |
| 변경 감사 로그 | `auth_audit_log` | PARTIAL(Audit) | ADR §1·EXISTING §3 |

★**정직**: `suspended_at`/`runtime_halted`/`effective_role_cache_invalidated`/`permission_cache_invalidated`/`active_session_revalidation`/`notification_sent`/`reversible` = **전부 순신규 ABSENT**. Effective Role Cache 엔티티 자체가 미구축(roleOf는 요청마다 즉석 계산·영속 캐시 무개념). 정지 상태·즉시 무효화·세션 재검증 트리거 전무. 단 세션 재검증은 289차 P4/P5의 `resolveAdminByToken`/세션무효화 패턴과 **정합**(그 위에 얹어 확장).

## 5. 설계 원칙 / 결정

- **즉시 효력 정지(fail-closed)**: Suspension은 유예 없이 기존 부여의 런타임 효력을 중지. Deprecation(유예)과 대비되는 핵심.
- **캐시 즉시 무효화 연쇄**: Effective Role Cache → 연관 Permission Cache 순 무효화. 캐시 TTL 잔존으로 인한 정지 지연 금지(Criticality의 `cache_ttl_max`와 연동).
- **Active Session Revalidation**: 정지 즉시 활성 세션 재검증 — `resolveAdminByToken`/세션 무효화(289차 P4/P5) 패턴을 재사용해 이미 로그인된 actor의 유효 권한을 재계산.
- **가역성 보존**: Definition/Assignment 파괴 금지 — `SUSPENDED→ACTIVE` 복원 시 원상 회복. 삭제로 처리 금지.
- Suspension ≠ Deprecation ≠ Retirement: 가역 즉시 중지(이 문서) / 유예 유지(Deprecation) / 런타임 종료+보존(Retirement).
- Golden Rule: 세션 재검증·역할 해석 경로를 확장 — 중복 세션/캐시 엔진 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Suspension 상태·즉시 캐시 무효화·세션 재검증 트리거 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Effective Role Cache/Permission Cache 무효화는 해당 캐시 엔티티(본 Registry·Part 2) 실 구현 부재로 공회전 — 무효화할 캐시가 아직 없음.
- Notification은 Alerting/통지 채널 배선 선행.
- 289차 P4/P5(resolveAdminByToken·세션무효화) 정합 재사용 — 재플래그 금지. 폐기 admin_roles 재부활 금지.

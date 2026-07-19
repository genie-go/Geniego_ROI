# DSAR — Approval Role Temporary Assignment Policy (per-entity 설계 명세)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 엔진은 선행 Permission Engine 실구현 + 별도 승인세션)
- **상위 ADR**: [`../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **ⓑ GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **★범위 경계**: **Temporary Assignment Policy(정책 계약)만**. 실 한시 배정 행·만료 워커·집행은 **Part 3-3**. 여기서는 한시 배정의 **허용·기간·만료·갱신·증거 정책**만 설계한다.

> **반날조 규율**: `파일:라인`은 위 2문서에서 확인된 것만 인용. 확인 불가 substrate는 **ABSENT**. Role ≠ Permission ≠ Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

한시(temporary) Role 배정의 정책 계약을 정의한다. **무기한 배정은 금지**하며, 한시 배정은 반드시 **최대 유효기간·자동 만료·만료 후 캐시 무효화**를 갖도록 강제하는 정책 스키마를 세운다. 현행 substrate에는 team_role의 `valid_to`/만료 개념이 없다(ⓑ §3 Lifecycle=ABSENT). 본 정책은 sensitive/production/High Role의 한시성을 규정하되, **실 한시 배정 데이터·만료 워커는 생성하지 않는다**(Foundation only).

## ② Canonical 필드

| 필드 | 의미 |
|---|---|
| `temporary_assignment_allowed` | 한시 배정 허용 여부 |
| `max_duration` | 최대 유효기간(무기한 불가) |
| `min_duration` | 최소 유효기간(즉시 만료 남용 방지) |
| `auto_expiration_required` | 자동 만료 필수(기본 true) |
| `renewal_allowed` | 갱신 허용 여부 |
| `max_renewal_count` | 최대 갱신 횟수 |
| `approval_required` | 배정/갱신 승인 필수 |
| `review_required` | 만료 전 재검토 필수 |
| `evidence_required` | 요청·승인·만료 증거 캡처 필수 |
| `notification_required` | 배정/만료 임박/만료 통지 필수 |
| `post_expiration_cache_invalidation` | 만료 후 결정 캐시·세션 무효화 필수 |

## ③ 열거형

- **DurationBound**: `MAX_DURATION` · `MIN_DURATION` (둘 다 필수 설정 — 무기한 `NULL` 금지)
- **ExpirationBehavior**: `AUTO_EXPIRE`(기본) · `NOTIFY_THEN_EXPIRE`
- **RenewalPolicy**: `NOT_ALLOWED` · `LIMITED`(max_renewal_count 상한) · `APPROVAL_PER_RENEWAL`
- **CacheInvalidationScope**: `DECISION_CACHE` · `SESSION` · `BOTH`
- **NotificationEvent**: `ON_ASSIGN` · `PRE_EXPIRY` · `ON_EXPIRE`

## ④ substrate 매핑 (§5.2)

| Canonical 정책 요소 | 현행 substrate | §5.2 분류 | file:line |
|---|---|---|---|
| Role 위계(한시 대상의 기반) | `team_role`(owner/manager/member) | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188` |
| max_duration / min_duration / valid_to | — | ABSENT | ABSENT |
| auto_expiration | — | ABSENT | ABSENT |
| renewal / max_renewal_count | — | ABSENT | ABSENT |
| post-expiration cache invalidation | — | ABSENT | ABSENT |
| notification | — | ABSENT | ABSENT |
| evidence(변경 로그) | auth_audit_log | PARTIAL(Evidence) | ⓑ §3 |

**정직한 부재**: 현행 team_role은 만료·갱신·자동 소멸 개념이 전무한 **영구 컬럼값**이다. Temporary Assignment substrate는 ⓑ GROUND_TRUTH에 존재하지 않는다(전부 ABSENT).

## ⑤ 설계원칙

1. **무기한 금지** — `max_duration` `NULL`/미설정 배정은 정책상 거부. 모든 한시 배정은 유한 기간을 명시해야 한다.
2. **자동 만료 필수** — `auto_expiration_required` 기본 true. 만료 도과 시 즉시 무효(수동 회수 대기 금지).
3. **만료 후 캐시 무효화 필수** — `post_expiration_cache_invalidation`으로 만료된 Role이 캐시된 결정·활성 세션으로 잔존하지 못하게 한다.
4. **갱신 상한** — `renewal_allowed`+`max_renewal_count`로 무한 갱신(사실상 영구화)을 차단. 갱신 시 승인 재요구 가능.
5. **★Role Assignment Table 생성 안 함** — 만료 워커·한시 배정 행은 Part 3-3. 본 Part는 한시성 **정책 스키마만**.
6. **Golden Rule·무후퇴** — 실존 부여 게이트(`requireTeamWrite` `UserAuth.php:1134`)를 확장하며, 한시 정책 도입이 현행 영구 배정의 실효 동작을 후퇴시키지 않는다.

## ⑥ Gap

| 능력 | 상태 | 근거 |
|---|---|---|
| max/min duration · auto-expiration | ABSENT | team_role=영구 컬럼값(ⓑ §3) |
| renewal · max_renewal_count | ABSENT | 갱신 개념 부재 |
| post-expiration cache invalidation | ABSENT | Snapshot/Lifecycle=ABSENT |
| notification(assign/pre-expiry/expire) | ABSENT | — |
| evidence | PARTIAL | auth_audit_log(변경 로그만) |
| **선행 전제** | BLOCKED_PREREQUISITE | 실 만료 집행=Part 3-3 · Permission Version 결합=Part 2(RP-002) |

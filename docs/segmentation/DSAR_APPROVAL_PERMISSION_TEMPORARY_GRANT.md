# DSAR — Permission Temporary Grant (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_TEMPORARY_GRANT`는 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)의 `grant_type=TEMPORARY` 특화 규율이다. **명확한 유효기간과 자동 만료를 가진 한시적 부여**로, 긴급 대응·프로젝트 기간 접근·대리 수행 등에 쓰인다. 핵심은 **무기한 임시 부여 절대 금지** — 반드시 Valid From/Until을 갖고, 만료 시 자동 회수되며, 만료 후 **권한 캐시가 무효화**되어야 한다. 그렇지 않으면 임시가 사실상 영구가 되거나, 만료 후에도 캐시된 권한으로 접근이 지속되는 위험이 생긴다.

## ② Canonical 필드

(공통 필드는 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md) 상속 · Temporary 특화 필드만 표기)

| 필드 | 설명 |
|---|---|
| `grant_ref` | 소속 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)(`grant_type=TEMPORARY`) |
| `valid_from` | **필수** — 시작 시각 |
| `valid_until` | **필수** — 종료 시각(무기한 금지) |
| `business_justification` | **필수** — 한시 부여 사유 |
| `requester_ref` | 요청자(위조불가 신원) |
| `approver_ref` | 승인자 참조 |
| `scope` | 적용 scope(Intersection·확장 금지) |
| `max_use_count` | 최대 사용 횟수(도달 시 조기 만료) |
| `auto_expiration_action` | 만료 시 동작(회수·상태 EXPIRED) |
| `notification_policy` | 만료 전/후 알림 |
| `post_expiration_cache_invalidation` | **필수** — 만료 후 권한 캐시 무효화 |
| `audit_ref` | 부여·사용·만료 감사 참조 |

## ③ 열거형

**`temporary_grant_status`**: `PENDING` · `ACTIVE` · `EXPIRING_SOON` · `EXPIRED` · `MAX_USE_REACHED` · `REVOKED_EARLY`

**`auto_expiration_action`**: `AUTO_REVOKE` · `SUSPEND_PENDING_REVIEW`(무기한 연장은 열거형에 부재 — 금지)

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| Temporary grant 실체 | `acl_permission` row(부여 substrate) | EXISTS(Grant substrate) | `TeamPermissions.php:325`, `:152-171` |
| 부여상한(임시 부여도 상속) | `putMemberPermissions`(DELEGATION_EXCEEDED)·`clampActions` | 위임상한 확장점 | `TeamPermissions.php:628-647`, `:396-402` |
| 요청/승인 신원 | `index.php` auth_key 주입 | CANONICAL(PEP) | `index.php:591-593` |
| 부여·만료 감사 | `auth_audit_log` | Evidence PARTIAL | 전수조사 §3(`UserAuth::logAudit`) |
| **valid_from/until·자동만료** | — | — | **ABSENT** (`acl_permission`에 유효기간 컬럼 없음) |
| **max_use_count** | — | — | **ABSENT** |
| **post-expiration cache invalidation** | — | — | **ABSENT** (effective set이 `effectiveForUser` 온디맨드·미캐시라 만료-캐시 개념 자체 부재) |
| **notification policy** | — | — | **ABSENT** |

★현행 `acl_permission` grant에는 **유효기간·사용횟수·자동만료가 전혀 없다** — 모든 부여가 사실상 영구. Temporary Grant는 순신규. effective set이 미캐시(`effectiveForUser :366` 온디맨드)라 현재는 만료-캐시 무효화 이슈가 없지만, version-aware Cache 도입 시 반드시 만료 무효화가 동반되어야 한다.

## ⑤ 설계원칙

- **무기한 금지**: `valid_until` 필수 — 없으면 부여 거부(fail-closed). 임시가 영구가 되는 것을 원천 차단. `auto_expiration_action` 열거형에 "무기한 연장" 없음.
- **Post-expiration Cache Invalidation 필수**: 만료 즉시 권한 캐시 무효화 — 만료 후 캐시 잔존 접근 금지(version-aware Cache 도입 시 강제).
- **Max Use Count**: 도달 시 조기 만료 — 시간·횟수 이중 상한.
- **Golden Rule**: `acl_permission`(`replacePerms :325`) 부여 substrate 재사용 + 유효기간/만료 메타 확장 — 별도 temporary-grant 엔진 신설 금지. 부여상한 `:628-647` 상속.
- **Scope Intersection·Expansion Guard**: 임시 scope는 요청자 본래 scope 교집합 — 확장 금지(`:234` DENY_SCOPE 원칙).
- **Permission ≠ Role ≠ Authority**: 임시 Permission 부여 ≠ 임시 금액 승인 권한 — Authority(P5)는 별도 임시 한도로 검증.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 자동 만료 워커·post-expiration cache invalidation은 선행 version-aware Effective-Set Cache(순신규) + Part 1 Evidence 결합 후 실 배선.
- valid_from/until·max_use_count·auto-expiration·notification·cache invalidation = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.

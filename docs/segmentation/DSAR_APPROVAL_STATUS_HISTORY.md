# DSAR — Approval Status History (§28)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §28 Status History 필드 = 12). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 대조표 (file:line)

**★`status_history` grep 0 — Status History 테이블은 전면 부재.** 현행 상태는 전부 **제자리 덮어쓰기**다.

| 현행 | 상태 갱신 방식 (실측) | 이력 보존 | 분류 |
|---|---|---|---|
| `action_request` | `UPDATE ... SET approvals_json=?, status=?`(`Alerting.php:653`) — **전이 검증 0** | ✘ 이전 상태 소실 | **MIGRATION_REQUIRED** |
| `mapping_change_request` | `pending`→`approved`(`Mapping.php:238-294` · pending 아니면 409)→`applied`(`:296-327` · `status!=='approved'` 게이트 `:309`) | ✘ 상태값만 덮어씀 | **VALIDATED_LEGACY**(게이트만) |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — `UPDATE status` | ✘ | **MIGRATION_REQUIRED** |
| `catalog_writeback_job` | `'pending_approval'`→`'queued'`(`Catalog.php:2341-2364`) | ✘ | **MIGRATION_REQUIRED** |
| `FeedTemplate::transition` | `draft→submitted→approved→published` 순차 강제 · 역행 차단 · `invalid_state` 409(`FeedTemplate.php:248-285`) | ✘ **전이는 막지만 이력은 안 남김** | **CANONICAL_APPROVAL_TRANSITION_GUARD**(전이 강제만 승격) |
| `audit_log` | `id, actor, action, details_json, created_at`(`Db.php:540-546`) · `Mapping::audit`(`Mapping.php:60-63`) | △ **tenant_id 없음 · 해시체인 없음 · immutable 아님** | **LEGACY_ADAPTER**(대체물 아님) |
| **`menu_audit_log`** | `hash_chain CHAR(64)` + `old_value`/`new_value` JSON + `prev` 해시 체인(`AdminMenu.php:123-131,169-210`) | ✔ **tamper-evident** | **★재사용 선례**(승인 도메인 아님) |
| APPROVAL_STATUS_HISTORY | **grep 0** | — | **NOT_APPLICABLE(부재 → 신설)** |

> **스펙 §28 요구 대비 현행 판정**: 스펙은 *"Status 를 직접 덮어쓰지 말고 History Event 를 생성하라"* 를 요구한다.
> **현행은 전 4개 승인 테이블이 100% 직접 덮어쓰기** → **요구 미충족(0/4)**. `FeedTemplate` 조차 전이는 강제하되 이력은 남기지 않는다.
> ⇒ **"누가·언제·무엇에서 무엇으로·왜" 바꿨는지 승인 도메인에서 재현 불가.**

## 1. CANONICAL_APPROVAL_STATUS_HISTORY 필드 (12)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `status_history_id` | PK |
| 2 | `tenant_id` | 격리 필수(`audit_log` 결함 교정) |
| 3 | `subject_type` | `REQUEST` \| `CASE` \| `ITEM` |
| 4 | `subject_id` | FK |
| 5 | `from_status` | **NULL = 최초 생성** |
| 6 | `to_status` | §27 |
| 7 | `transition_reason_code` | §24 재사용 |
| 8 | `actor_id` | **위조불가 서버해석**(`Mapping.php:36-53` 패턴 · `X-User-Email` 헤더 금지 — `Alerting.php:33-36` 재발 방지) |
| 9 | `actor_type` | §20 Actor Type(8) |
| 10 | `decision_id` | FK → §22 (있는 경우) |
| 11 | `hash_chain` | **`menu_audit_log.hash_chain` 선례 확장**(`AdminMenu.php:123-131`) |
| 12 | `occurred_at` | |

## 2. 규칙

- **Append-only**(§4.9) — History 행은 **UPDATE·DELETE 금지**. 상태 변경은 **History INSERT 가 정본**이고, 현재 상태 컬럼은 **파생 캐시**다.
- **기존 `status` 컬럼 보존**(비파괴 · Golden Rule = Extend) — 컬럼 제거 금지. History 를 **추가**할 뿐이다.
- **전이 검증 없는 `UPDATE status` 금지** — `FeedTemplate.php:248-285` 의 `invalid_state` 409 패턴을 **확장**(신설 금지). 허용 전이 정본 = `DSAR_APPROVAL_ALLOWED_TRANSITIONS.md`(§29).
- **해시체인은 신설이 아니라 재사용** — `menu_audit_log` 선례를 승인 도메인으로 확장. 별도 tamper-evident 엔진 신설 금지.
- `audit_log`(`Db.php:540-546`)는 **History 대체물이 아니다**(tenant_id·체인 부재). **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤).
- **코드변경 0**.

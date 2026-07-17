# DSAR — Approval Resource Snapshot (§30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §30 필드 = 21 · Snapshot Type = 8). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 대조표 (file:line)

**★Snapshot 개념 전면 부재(승인 도메인)** — resource snapshot / context snapshot / immutable hash **grep 0**.

| 현행 | 실측 | 분류 |
|---|---|---|
| **`mapping_change_request`** | `raw_value` / `canonical_value` 를 **요청 행에 복사 보관**(`Db.php:623-636`) — 승인 당시 값이 요청 행에 고정됨 | **★`LEGACY_ADAPTER`**(현행 유일한 스냅샷 유사물 · 아래 0-1) |
| `action_request.action_json` | `Db.php:592-600` — **집행 의도(Action)** 블롭. 원본 리소스 상태가 아님 | **NOT_APPLICABLE**(Snapshot 아님) |
| `admin_growth_approval.payload_json` | `AdminGrowth.php:142-149,1292` — 요청 페이로드. 원본 스냅샷 아님 | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2341-2364` — 상태만 보관 | **NOT_APPLICABLE** |
| **`menu_audit_log`** | `old_value` / `new_value` JSON + `hash_chain CHAR(64)` 체인(`AdminMenu.php:123-131,169-210`) — **변경 전/후 전문 + 위변조 탐지** | **★재사용 선례**(승인 도메인 아님 · 해시 = `sha256(payload+prev)`) |
| `audit_log` | `details_json`(`Db.php:540-546`) · `Mapping::audit`(`Mapping.php:60-63`) — **tenant_id 없음 · 해시체인 없음 · immutable 아님** | **LEGACY_ADAPTER**(스냅샷 대체물 아님) |
| **Resource Version** | **개념 부재(grep 0)** — 승인 시점 리소스 버전을 가리킬 수단 없음 | **NOT_APPLICABLE(신설)** |
| APPROVAL_RESOURCE_SNAPSHOT | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |

### 0-1. `mapping_change_request` = `LEGACY_ADAPTER` 인 이유 (한계 명시)

값 복사 보관은 **스냅샷의 의도는 달성하나 계약은 미달**이다: ① `content_hash` 없음 → **위변조·드리프트 탐지 불가**, ② 스냅샷이 **요청 행에 인라인** → Request↔Snapshot 분리(§4.1) 위배, ③ **단일 필드 2개**(raw/canonical)뿐 → 리소스 전문 아님, ④ `snapshot_taken_at` 없음. ⇒ **어댑터로 흡수하되 정본으로 승격 금지.**

> **판정: 4개 승인 경로 중 3개는 승인 후 원본이 바뀌면 "무엇을 승인했는지" 재현 불가.** `mapping_change_request` 만 부분 재현 가능.

## 1. Snapshot Type (8)

| # | 타입 | 의미 |
|---|---|---|
| 1 | `AT_SUBMISSION` | 제출 시점 원본 |
| 2 | `AT_VALIDATION` | 요건 검증 시점 |
| 3 | `AT_DECISION` | **승인/거부 판정 시점**(§4.4 핵심) |
| 4 | `AT_EXECUTION` | 집행 직전(드리프트 재확인) |
| 5 | `AT_RECONCILIATION` | 대사 시점(§43) |
| 6 | `AT_SUPERSESSION` | 대체 직전(§39) |
| 7 | `AT_REOPEN` | 재개 시점(§38) |
| 8 | `DELTA` | 직전 스냅샷 대비 차분(전문 중복 저장 회피) |

## 2. CANONICAL_APPROVAL_RESOURCE_SNAPSHOT 필드 (21)

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `resource_snapshot_id` (PK) | 12 | `amount_at_snapshot` |
| 2 | `tenant_id` (격리 필수) | 13 | `currency_at_snapshot` |
| 3 | `request_id` (FK → §7) | 14 | `scope_at_snapshot` |
| 4 | `case_id` (FK → §12 · nullable) | 15 | `environment` (`Db::env()` `Db.php:46,57`) |
| 5 | `snapshot_type` (위 8종) | 16 | `source_table` |
| 6 | `resource_type` (§9) | 17 | `source_query_hash` |
| 7 | `resource_id` | 18 | `previous_snapshot_id` (체인) |
| 8 | `resource_version` (**신설** — grep 0) | 19 | `hash_chain` (**`AdminMenu.php:123-131` 확장**) |
| 9 | `snapshot_json` (**리소스 전문 고정**) | 20 | `taken_by` |
| 10 | `content_hash` (sha256 · 드리프트 탐지) | 21 | `taken_at` |
| 11 | `critical_field_hash` (§31 부분해시) | | |

## 3. 규칙

- **Immutable · Append-only**(§4.9) — Snapshot 행 **UPDATE·DELETE 금지**. 정정은 **새 스냅샷**으로.
- **`AT_DECISION` 스냅샷 없는 승인은 무효**(§4.4) — "무엇을 승인했는가"가 증명 불가한 승인은 승인이 아니다.
- **해시체인은 신설 아님** — `menu_audit_log.hash_chain`(`AdminMenu.php:123-131`) 선례를 **확장**. 별도 tamper-evident 엔진 신설 금지.
- **`mapping_change_request` 의 raw/canonical 복사 보관은 보존**(비파괴) — 어댑터로 흡수하되 컬럼 제거 금지(Golden Rule = Extend).
- `audit_log`·`action_request.action_json` 을 **스냅샷으로 간주하고 배선 금지**(287차 죽은 스켈레톤).
- `snapshot_json` = **원본 업무 데이터**. 요청 환경/주체 맥락은 `DSAR_APPROVAL_CONTEXT_SNAPSHOT.md`(§32) — **혼동·중복 신설 금지**.
- **코드변경 0**.

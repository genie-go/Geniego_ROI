# DSAR — Approval Resource Snapshot (§30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §30 — 원문 그대로 전사.
> **분모 정합**: Snapshot Type — REQ 8 ↔ **원문 실측 8 개수 일치**(단 **항목명은 전면 상이** — placeholder `AT_*` 계열은 자작이었음 · §1-1).
> 🔴 **분모 불일치**: 필드 — **REQ 집계 21 ↔ 원문 실측 22 — 원문이 정본.** REQ §7 의 `21` 은 정정 대상.

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

## 1. Snapshot Type (8) — 원문 전사

`APPROVAL_RESOURCE_SNAPSHOT`

| # | Snapshot Type | # | Snapshot Type |
|---|---|---|---|
| 1 | `SUBMISSION` | 5 | `EXECUTION` |
| 2 | `CASE_CREATION` | 6 | `POST_EXECUTION` |
| 3 | `PRE_DECISION` | 7 | `REOPEN` |
| 4 | `DECISION` | 8 | `SUPERSESSION` |

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder 는 **개수(8)만 맞고 항목명이 전면 자작**이었다:

| placeholder(자작·폐기) | 원문 §30 | 성격 |
|---|---|---|
| `AT_SUBMISSION` | `SUBMISSION` | 접두 `AT_` 자작 |
| `AT_VALIDATION` | **없음** | **자작**(원문은 `CASE_CREATION`) |
| `AT_DECISION` | `DECISION` | 접두 자작 · **원문은 `PRE_DECISION` 과 `DECISION` 2단 분리** |
| `AT_EXECUTION` | `EXECUTION` | 접두 자작 · **원문은 `POST_EXECUTION` 도 별도 존재** |
| `AT_RECONCILIATION` | **없음** | **자작** |
| `AT_SUPERSESSION` / `AT_REOPEN` | `SUPERSESSION` / `REOPEN` | 접두 자작 |
| `DELTA` | **없음** | **자작**(차분 저장은 원문 요구 아님) |

⇒ **원문이 정본.** 특히 원문의 **`PRE_DECISION`↔`DECISION` 분리**와 **`EXECUTION`↔`POST_EXECUTION` 분리**는 placeholder 에 없던 축이다.

## 2. 스펙 §30 필수 필드 — 원문 전사 (실측 22)

원문 순서 그대로(좌 1~11 · 우 12~22):

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_resource_snapshot_id` | 12 | `tenant_id` |
| 2 | `approval_request_id` | 13 | `legal_entity_id` |
| 3 | `approval_case_id` | 14 | `environment` |
| 4 | `approval_item_id` | 15 | amount |
| 5 | `resource_type` | 16 | currency |
| 6 | `resource_id` | 17 | scope |
| 7 | `resource_version` | 18 | `immutable_hash` |
| 8 | snapshot type | 19 | `captured_at` |
| 9 | snapshot payload reference | 20 | source timestamp |
| 10 | included fields | 21 | `status` |
| 11 | excluded sensitive fields | 22 | `evidence` |

> 🔴 **필드 원문 실측 22 ↔ REQ 집계 21 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**원문 대조로 확정되는 축**(placeholder 에 없던 원문 요구):
- **#10 included fields · #11 excluded sensitive fields** — 스냅샷의 **민감필드 제외 목록을 데이터로 남기라**는 요구. placeholder 의 `snapshot_json` 통짜 저장에는 이 축이 없었다(데이터 헌법 정합).
- **#19 source timestamp ↔ #18 `captured_at` 분리** — 원본 시각과 포착 시각을 구분(드리프트 판정 근거).
- **#17 `immutable_hash`** — placeholder 는 `content_hash`/`critical_field_hash`/`hash_chain` **3종으로 자작 분해**했으나 원문은 **단일 축**이다. 해시체인 재사용(`AdminMenu.php:123-131`)은 **구현 수단**일 뿐 원문 필드 축이 아니다.
- **현행 커버리지 = 22 중 0**(§0 실측 `APPROVAL_RESOURCE_SNAPSHOT` grep 0 · `mapping_change_request` 는 `LEGACY_ADAPTER` 로 **산입 불가** — §0-1 한계 4항 유효).

## 3. 규칙

- **Immutable · Append-only**(§4.9) — Snapshot 행 **UPDATE·DELETE 금지**. 정정은 **새 스냅샷**으로.
- **`DECISION` 스냅샷(원문 Type #4) 없는 승인은 무효**(§4.4) — "무엇을 승인했는가"가 증명 불가한 승인은 승인이 아니다. (289차 표기 `AT_DECISION` 은 자작 · 원문 `DECISION` 으로 정정.)
- **해시체인은 신설 아님** — `menu_audit_log.hash_chain`(`AdminMenu.php:123-131`) 선례를 **확장**. 별도 tamper-evident 엔진 신설 금지.
- **`mapping_change_request` 의 raw/canonical 복사 보관은 보존**(비파괴) — 어댑터로 흡수하되 컬럼 제거 금지(Golden Rule = Extend).
- `audit_log`·`action_request.action_json` 을 **스냅샷으로 간주하고 배선 금지**(287차 죽은 스켈레톤).
- **snapshot payload(원문 #9)** = **원본 업무 데이터**. 요청 환경/주체 맥락은 `DSAR_APPROVAL_CONTEXT_SNAPSHOT.md`(§32) — **혼동·중복 신설 금지**.
- **민감필드 제외는 데이터로 남긴다**(원문 #10/#11) — 통짜 payload 저장으로 갈음 금지(데이터 헌법 · §50 Evidence 저장 금지 항목과 정합).
- **코드변경 0**.

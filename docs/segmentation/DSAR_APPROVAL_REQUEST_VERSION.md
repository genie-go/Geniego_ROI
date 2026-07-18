# DSAR — Approval Request Version (§8)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — **버전 개념 전무**

| 스펙 요구 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| `version` / `version_no` 컬럼 | **부재(grep 0)** — `mapping_change_request`(Db.php:623-636) · `action_request`(Db.php:592-600) 전 컬럼 확인 | **NOT_APPLICABLE(부재 → 신설)** |
| Version Type 열거형 | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| `superseded_by` / `supersedes` | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| `is_current` / `effective_from`·`effective_to` | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| 변경 시 **이력 보존** | ★**부재 — 전면 덮어쓰기**. `UPDATE mapping_change_request SET approvals_json=?, status=?`(Mapping.php:289) · `UPDATE action_request SET approvals_json=?, status=?`(Alerting.php:595). **이전 값 소실 · 복원 불가** | **★MIGRATION_REQUIRED**(§4.4/§4.9 상충) |
| Snapshot(승인 당시 데이터 고정) | **부재(grep 0)** — `resource_snapshot`·`context_snapshot` 없음. 승인 후 원본(`raw_value`/`canonical_value`/`action_json`) 변경돼도 **승인 시점 값 재현 불가** | **NOT_APPLICABLE(신설)** · §4.4 상충 |
| 재승인 트리거(Critical Field 변경) | **부재(grep 0)** — 승인 후 원본 변경 탐지 로직 없음 | **NOT_APPLICABLE(신설)** · §4.5 상충 |
| **참고 — 버전이 존재하는 유일 인접 사례** | `menu_audit_log` **해시체인**(AdminMenu.php:123-131). Approval 도메인 아님 · **패턴 참조 대상** | **KEEP_SEPARATE_WITH_REASON**(도메인 상이) |

**판정**: Approval Request Version 은 **부재가 아니라 "개념 자체가 없음"**. 현행은 Request 1행을 **제자리 갱신**하는 단일 레코드 모델이며, 버전·이력·스냅샷 3축이 모두 grep 0 이다.

### 0-1. 파생 결함 (버전 부재의 실측 귀결)

- **승인 무결성 공백**: `required_approvals`(Mapping.php:288)로 정족수를 세지만, **정족수를 채운 그 시점의 `canonical_value` 가 무엇이었는지 기록이 없다** → 승인 후 값이 바뀌어도 status 는 `approved` 유지.
- **§4.5 재승인 검토 불가**: 원본 변경 탐지의 전제(승인 시점 값)가 없어 **원리적으로 구현 불가** — Snapshot 이 선행 조건.

## 1. 스펙 §8 `APPROVAL_REQUEST_VERSION` 전사 — 필드 **21** · Version Type **10**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §8**

> 🔴 **필드 축 — REQ 집계 19 ↔ 원문 실측 21 — 원문이 정본.**
> REQ `§7` 표의 *"§8 Approval Request Version 필드 = **19**"* 는 **원문 나열과 2건 어긋난다**(원문 나열 실측 = 21).
> ✅ **Version Type 축 — REQ 집계 10 ↔ 원문 실측 10 — 일치.**
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**

**§0 판정 = "Approval Request Version 은 부재가 아니라 개념 자체가 없음"**(버전·이력·스냅샷 3축 전부 grep 0) → 아래 **21개 필드 전부 부재**가 §0 정합 판정이다.

### 1-1. 필수 필드 (원문 21)

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_request_version_id` | **부재** — §0 `version` 컬럼 grep 0(양 테이블 전 컬럼 확인) · **NOT_APPLICABLE(신설)** |
| 2 | `approval_request_id` | **부재(FK)** — §0 Version 테이블 자체 부재. ※참조 대상 `id` 는 존재 |
| 3 | `version_number` | **부재** — §0 `version`/`version_no` grep 0 · **NOT_APPLICABLE(신설)** |
| 4 | `previous_version_id` | **부재** — §0 `version` 축 전무 · **NOT_APPLICABLE(신설)** |
| 5 | `version_type` | **부재** — §0 "Version Type 열거형 **부재(grep 0)**" · **NOT_APPLICABLE(신설)** |
| 6 | `change_summary` | **부재** — §0 변경 시 **전면 덮어쓰기**(이전 값 소실) · **★MIGRATION_REQUIRED** |
| 7 | `changed_fields` | **부재** — §0 동일(덮어쓰기) · **★MIGRATION_REQUIRED** |
| 8 | `amount_before` | **부재** — §0 금액축 자체 부재 · **NOT_APPLICABLE(신설)** |
| 9 | `amount_after` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 10 | `currency_before` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 11 | `currency_after` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 12 | `scope_before` | **부재** — §0 미열거 · **NOT_APPLICABLE(신설)** |
| 13 | `scope_after` | **부재** — §0 미열거 · **NOT_APPLICABLE(신설)** |
| 14 | `resource_version_before` | **부재** — §0 Snapshot grep 0 → **승인 시점 값 재현 불가** · §4.4 상충 |
| 15 | `resource_version_after` | **부재** — §0 동일 · §4.5 상충 |
| 16 | `created_at` | **부재(Version 행)** — ※Request 행에는 `created_at` VARCHAR(32) 존재(Db.php:599,635) |
| 17 | `created_by` | **부재(Version 행)** — ※Request 행에는 `requested_by`(mapping 만) 존재 |
| 18 | `immutable_hash` | **부재** — §0 참조 선례 = `menu_audit_log` **해시체인 쓰기**(AdminMenu.php:123-131 · 🔴 검증형 아님·`verify()` 0 → 무결성은 `SecurityAudit::verify()`) · **KEEP_SEPARATE_WITH_REASON**(도메인 상이 · **쓰기 패턴 참조 대상**) |
| 19 | `requires_reapproval` | **부재** — §0 "재승인 트리거 **부재(grep 0)**" · §4.5 상충 · **NOT_APPLICABLE(신설)** |
| 20 | `status` | **부재(Version 행)** — ※Request 행 `status` 는 존재(§27) |
| 21 | `evidence` | **부재** — §0 미열거(§50 Evidence 축) · **NOT_APPLICABLE(신설)** |

### 1-2. Version Type (원문 10)

**§0 실측: "Version Type 열거형 부재(grep 0)"** → **10종 전부 부재**.

| # | Version Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `INITIAL` | **부재** — §0 Version Type 열거형 grep 0 |
| 2 | `REQUESTER_EDIT` | **부재** — §0 동일 |
| 3 | `SYSTEM_ENRICHMENT` | **부재** — §0 동일 |
| 4 | `POLICY_ENRICHMENT` | **부재** — §0 동일 |
| 5 | `CORRECTION` | **부재** — §0 동일 |
| 6 | `RESUBMISSION` | **부재** — §0 동일 |
| 7 | `REOPEN` | **부재** — §0 동일 |
| 8 | `SUPERSESSION` | **부재** — §0 `superseded_by`/`supersedes` **grep 0** |
| 9 | `MIGRATION` | **부재** — §0 동일 |
| 10 | `EMERGENCY` | **부재** — §0 동일 |

> **전사 집계**: 필드 21 + Version Type 10 = **31 항목 전부 부재**. §0 의 *"개념 자체가 없음"* 판정과 **정합**(모순 0).

## 2. 규칙

- **본 엔티티는 순수 신설**(`NOT_APPLICABLE`) — 확장할 기존 구현이 **없다**. 단 **신설 = 지금 배선이 아니다**: 실 구현은 별도 승인 세션(비파괴).
- **무후퇴**: Version 도입이 현행 단일 레코드 읽기 경로(Mapping.php:289 · Alerting.php:595)를 깨면 안 된다 — **기존 행 = version 1 · is_current** 로 흡수.
- **Snapshot 이 Version 의 선행 조건**(§4.4). Snapshot 없는 Version 은 **번호만 붙은 덮어쓰기**로 동일 결함 반복.
- **`menu_audit_log` 해시체인 패턴 참조**(AdminMenu.php:123-131) — 신규 발명보다 저장소 내 검증된 패턴 재사용.

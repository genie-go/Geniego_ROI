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

## 1. 스펙 §8 필드 19 + Version Type 10 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§8 Approval Request Version 필드 = 19"**, **"§8 Version Type = 10"** 이라는 **개수만** 영속한다. **19개 필드명·10종 Type 명은 저장소에 없다**(REQ 외 grep 0).

**추측 생성 금지** — REQ §16 **"요구 날조 0 · 스펙 원문 항목만 전사(轉寫)"** · REQ §9 **351 사건**. 지어낸 필드 목록으로 설계하면 **역산**(REQ §15). **해제 조건**: 스펙 §8 원문 수령 → 전사표로 교체(§0 은 그대로 유효).

## 2. 규칙

- **본 엔티티는 순수 신설**(`NOT_APPLICABLE`) — 확장할 기존 구현이 **없다**. 단 **신설 = 지금 배선이 아니다**: 실 구현은 별도 승인 세션(비파괴).
- **무후퇴**: Version 도입이 현행 단일 레코드 읽기 경로(Mapping.php:289 · Alerting.php:595)를 깨면 안 된다 — **기존 행 = version 1 · is_current** 로 흡수.
- **Snapshot 이 Version 의 선행 조건**(§4.4). Snapshot 없는 Version 은 **번호만 붙은 덮어쓰기**로 동일 결함 반복.
- **`menu_audit_log` 해시체인 패턴 참조**(AdminMenu.php:123-131) — 신규 발명보다 저장소 내 검증된 패턴 재사용.

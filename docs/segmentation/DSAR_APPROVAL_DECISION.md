# DSAR — Approval Decision (§22·필드 27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| **Decision 엔티티** | **부재**(`approval_decision` grep 0) — 결정은 **행이 아니라 status 컬럼의 상태**로만 존재 | **NOT_APPLICABLE(부재→신설)** |
| 🔴 **Append-only(§4.9)** | **전면 위배** — 현행은 전부 **제자리 UPDATE**: `Mapping.php:288`(`SET approvals_json=?, status=?`) · `Alerting.php:594,653`(`SET ... status=?`) · `AdminGrowth.php:1330`(`SET status=?, decided_by=?`) · `Catalog.php:2352`(`SET status='queued'`) | **★MIGRATION_REQUIRED** |
| 결정 이력 유일 근사치 | `mapping_change_request.approvals_json` = **누적 배열**(`Mapping.php:273-285`) — 추가만 하고 덮지 않음 | **VALIDATED_LEGACY**(Append 선례 · **단 JSON 컬럼 = 행 아님**) |
| Decision 감사 | `audit_log` `Db.php:540-546` = `id, actor, action, details_json, created_at` — **tenant_id 없음 · 해시체인 없음** | **MIGRATION_REQUIRED** |
| 해시체인 보유 유일 사례 | `menu_audit_log.hash_chain` `Handlers/AdminMenu.php:123-131`(+`changed_by_role`·`reason`·`ip_address`·`request_id`) | **CANONICAL 참조 모델**(재사용) |
| Requirement ↔ Decision 분리(§4.3) | **부재** — `required_approvals` 는 `mapping_change_request` 의 **컬럼**(`Mapping.php:287`)이고, `Alerting` 은 **하드코딩 `2`**(`:562`) | **MIGRATION_REQUIRED** |

## 1. Append-only 요구 vs 현행 덮어쓰기 — 정면 대조

> 스펙 §4.9: **Approval Decision 은 Append-only 로 관리한다** · §61: **Decision Append-only**

| 축 | 스펙 요구 | 현행 실측 |
|---|---|---|
| 저장 단위 | Decision **행**(불변) | `status` **컬럼**(가변) |
| 재승인/번복 | **새 행 추가**(이전 행 보존) | **이전 값 소실**(UPDATE 덮어쓰기) |
| "왜 그렇게 결정했나" 재현(§0 Q20) | Decision 행 + Reason + Snapshot | **불가** — 최종 status 만 남음 |
| 결정 시각 | 행별 `decided_at` | `Mapping` = `approvals_json[].ts` 만 · `Catalog::approveQueue` = **시각·행위자 모두 없음** |

**판정**: 현행은 **결정의 결과만 알고 결정의 역사를 모른다**. `approvals_json` 누적(`Mapping.php:285`)이 유일한 Append 선례지만,
JSON 배열은 **행 단위 제약(FK·UNIQUE·감사)이 걸리지 않아** Decision 정본이 될 수 없다 — **승격 대상이 아니라 마이그레이션 출발점**.

**필드 27** — 스펙 §22 **원문 항목명 저장소 미영속**(REQ 는 개수 `27` 만 고정) → **UNVERIFIED**.
항목명 창작 금지(REQ §15 역산). **"27 중 N" 수치 주장 금지** — 확정 가능한 것은 위 대조표의 구조적 불만족뿐.

## 2. 규칙

- **Decision 은 행이다** — `UPDATE ... SET status=?` 를 Decision 기록으로 간주 금지. status 는 Decision 의 **파생 투영**이지 원본이 아니다.
- **`menu_audit_log` 해시체인 모델을 재사용**(`AdminMenu.php:123-131`) — 신규 감사 스키마 창작 금지(Golden Rule = Extend).
- **`audit_log` 에 tenant_id 부재** — Decision 감사를 여기에 얹으면 **테넌트 격리 위반**(데이터 헌법). 확장 후 사용.
- **Requirement(필요성) ↔ Decision(결과) 분리**(§4.3) — `required_approvals` 하드코딩(`Alerting.php:562`)은 **표시≠실제 가짜녹색**.
- **무후퇴**: `approvals_json` 누적 동작은 마이그레이션 전까지 **보존**(삭제·치환 금지).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

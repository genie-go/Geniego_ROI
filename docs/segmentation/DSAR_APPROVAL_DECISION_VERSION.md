# DSAR — Approval Decision Version (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION 필수 필드:
- `version_id` · `definition_id` · `version_number` · `previous_version_id`
- `version_type` · `change_summary`
- policy snapshot 묶음: `action type/actor/assignment/authority/delegation/sequential/validation/commit/idempotency/locking/outbox/snapshot policy snapshot`
- `effective_from/to`
- `created_by` · `reviewed_by` · `approved_by` · `activated_at`
- `immutable_hash` · `status` · `evidence`

## 2. 기존 구현 대조

- **결정 정의 버전(Version) 자산 부재.** 현행 4핸들러는 어떤 정책 스냅샷도 버전화하지 않는다:
  - `active_version`/`version_number`/`previous_version_id` 를 결정 경로에서 참조하는 지점 → **no hits**.
  - `immutable_hash`(정책 스냅샷 무결) → 결정 도메인 부재. 무결 해시 정본은 SecurityAudit::verify(`SecurityAudit.php:56-68`)에만 실재하며 이는 감사 체인용이지 정책 버전 스냅샷이 아니다(audit_log는 장식).
  - `created_by/reviewed_by/approved_by` 3단 서명 → 부재. `AdminGrowth::approvalDecide`는 `decided_by` 단일 필드만 기록(`Handlers/AdminGrowth.php:1330`).
  - policy snapshot 대상인 actor/assignment/authority/delegation/sequential 정책 자체가 선행 ABSENT → 스냅샷할 원본이 없다.
- Optimistic Version(§44) 개념도 §GROUND_TRUTH에서 ABSENT — Expected Version 검증 경로 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §9 Definition(`definition_id` 정박 부재 · BLOCKED_PREREQUISITE) → Version은 Definition에 종속하므로 연쇄 차단. 스냅샷 대상 정책(§3.2~§3.5)도 전부 ABSENT.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_version` — Definition(§9) 하위 불변 버전 레코드. 활성 정책은 항상 하나의 `active_version`을 통해 결정 처리에 주입되고, 결정 Command/Record는 그 시점 version_id를 스냅샷으로 고정(과거 재해석 금지 §60).
- `immutable_hash`: 정책 스냅샷 무결은 SecurityAudit::verify(`SecurityAudit.php:56-68`) 해시 체인 패턴을 확장 적용(장식 audit_log가 아니라 검증 가능한 정본).
- 3단 서명(`created_by/reviewed_by/approved_by`): `Mapping::approve`의 actor 해석(`Handlers/Mapping.php:36-53` api_key/session·미확인 fail-closed null)을 재사용해 위조 불가 actor로 채운다. `Alerting`의 헤더 위조 actor(`Alerting.php:33-35`)는 서명 주체로 절대 불가(BLOCKED_SECURITY).
- Mandatory Control: Version 미활성(`status`≠active) 정책으로는 Commit 금지(Fail-Closed). Commit 직전 Version 일치 재검증(§32).

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

# DSAR — Approval Recovery Database Constraint (Part 3-20 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_DB_CONSTRAINT

§31은 self-healing recovery 데이터가 DB 계층에서 만족해야 하는 **5개 불변 제약**을 규정한다. 자기치유 워크플로우가
"어떤 정상 상태로 복원할 것인가"를 신뢰하려면, 그 근거가 되는 이력·증거·스냅샷이 위·변조 불가능하고 테넌트 간
격리돼야 한다. 원문 5종(§31):

| # | 제약 | 정의 |
|---|------|------|
| C1 | Immutable Recovery History | recovery 실행 이력은 append-only·사후 수정/삭제 불가 |
| C2 | Immutable Evidence | 복원 근거(before/after·승인·집행 로그)는 tamper-evident 저장 |
| C3 | Snapshot Integrity | 정지 시점 권한 상태 스냅샷의 digest 무결성 보증 |
| C4 | Recovery Workflow Integrity | 워크플로우 상태 전이(착수→집행→검증)의 순서·원자성 제약 |
| C5 | Tenant Isolation | 모든 recovery 레코드는 tenant 경계 내에서만 열람·집행 |

recovery 레코드는 상태를 변경하지 않는 불변 원장이며, 집행은 §15 Recovery Workflow의 책임이다.

## 2. Substrate 매핑

| SPEC 제약 | 현존 substrate | 상태 |
|-----------|----------------|------|
| C1 Immutable Recovery History | `recovery_history` 테이블 (없음) | ABSENT — grep 0. 현 DB는 app_setting(`Db.php:308`)·schema_migrations만 |
| C2 Immutable Evidence | SecurityAudit append-only 해시체인(`SecurityAudit.php:14-68`·시드/링크 `SecurityAudit.php:43-53`) | PRESENT(재사용 기반·recovery evidence 타입 미기록) |
| C3 Snapshot Integrity | 해시체인 verify(`SecurityAudit.php:56-68`) | PARTIAL(무결성 원시엔진 실재·recovery snapshot 대상 부재) |
| C4 Recovery Workflow Integrity | `recovery_workflow` 상태기계 (없음) | ABSENT — grep 0 |
| C5 Tenant Isolation | 미들웨어 X-Tenant-Id 강제덮어쓰기·위조차단(`index.php:610`) | PRESENT |

## 3. 설계 계약

- **판정=PARTIAL**: 5제약 중 **Tenant Isolation(C5)·Immutable Evidence(C2)는 실재**하고, Snapshot Integrity(C3)는
  검증 원시엔진만 존재하며, Recovery History(C1)·Workflow Integrity(C4)는 전무하다.
- **Tenant Isolation 무후퇴 최우선(C5)**: 미들웨어가 `X-Tenant-Id`를 강제덮어써 클라이언트 위조를 차단한다
  (`index.php:610`). 신설되는 recovery 전용 테이블도 이 격리 규율을 **그대로 상속**한다 — 완화·예외 절대 금지
  (데이터 헌법상 테넌트 격리 절대).
- **Immutable Evidence는 확장(C2)**: recovery 근거의 tamper-evident 저장은 SecurityAudit append-only 해시체인
  (`SecurityAudit.php:14-68`, 링크 `SecurityAudit.php:43-53`)을 **확장**해 recovery-evidence 레코드 타입으로 도입.
  기존 체인을 개명·재정의하지 않고 신규 타입만 추가한다.
- **Snapshot Integrity는 대상 신설(C3)**: 무결성 검증기(`SecurityAudit.php:56-68` verify)는 재사용하되, 검증할
  **recovery snapshot 자체가 없다** — 스냅샷 원장은 순신설(§18 종속).
- **Recovery History/Workflow Integrity는 순신설(C1·C4)**: `recovery_history`·`recovery_workflow` 테이블은 grep 0
  으로 전무. append-only 이력·상태전이 원자성 제약은 신규 스키마로 도입되며 §32 인덱스·§33 성능에 종속된다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221` — ML drift/모델 스냅샷. 인가 recovery 무결성과 도메인 상이. 흡수 금지.
- `AnomalyDetection.php:49` — 데이터 이상탐지. authz recovery history 아님. 별개 관심사.
- `PgSettlement.php:215` — 재무 정산 스냅샷. recovery evidence 아님. 흡수 금지.

## 5. 판정

**PARTIAL**. Tenant Isolation(C5, `index.php:610`)·Immutable Evidence(C2, SecurityAudit 해시체인
`SecurityAudit.php:14-68`·`:43-53`)는 PRESENT, Snapshot Integrity(C3)는 verify 원시엔진만(`SecurityAudit.php:56-68`)
PARTIAL, Recovery History(C1)·Workflow Integrity(C4)는 ABSENT(순신설). 현 DB substrate는 app_setting(`Db.php:308`)·
schema_migrations뿐 recovery 전용 테이블 grep 0. Tenant 격리 무후퇴 + Evidence 체인 확장 + History/Snapshot/Workflow
순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§18·§32 선행).

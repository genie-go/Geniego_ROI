# DSAR — Snapshot (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §52 SNAPSHOT 필수 필드
snapshot_id · snapshot type · instance_id · (request/case/workflow/chain/sequential version · stage/level/step instance snapshot · cursor snapshot · transition def/instance · triggering event · assignment/authority/delegation/dependency snapshot · guard/precondition result · lock/lease snapshot · fencing token · idempotency snapshot) · effective/captured_at · immutable_hash · status · evidence.

### §52/§53 원칙
직접 수정 금지 · 과거 대체 금지 · Immutable Hash · Replay 기준.

## 2. 기존 구현 대조

- **승인 상태 스냅샷 ABSENT.** 전이 시점의 request/case/version·stage/level/step·cursor·assignment/authority/delegation·guard/precondition result·lock/lease·fencing·idempotency 를 immutable hash 로 봉인하는 스냅샷 레코드는 없다.
- 상태전이 3종은 모두 **현재 행을 in-place UPDATE** 하며, 전이 직전 상태를 별도 불변 레코드로 캡처하지 않는다: catalog_writeback_job 인라인 UPDATE(`Catalog.php:1726`·승인 `:2397`)·admin_growth_approval 단발결정(`AdminGrowth.php:1330`)·mapping_change_request 정족수(`Mapping.php:287`). 과거 상태는 덮어써져 소실된다.
- 인접 substrate: **SecurityAudit::verify(`SecurityAudit.php:56-68`)** 는 감사 무결성 substrate(해시 검증)이나 승인 전이 스냅샷이 아니다. mapping_change_request 의 approvals_json(`Mapping.php:285`)은 승인자 누적 배열이지 전이 시점 전체 상태의 immutable 스냅샷이 아니다.
- **핵심 결여**: §28 Previous Step Validation·§54 Replay 가 요구하는 "Completion Snapshot" 이 없어, `status=COMPLETED` 만으로 완료를 판정할 수밖에 없다(원칙상 불충분).

## 3. 판정

- Verdict: **ABSENT** — 승인 전이 시점 상태 스냅샷 없음. in-place UPDATE 로 과거 상태 소실.
- 선행 의존: 스냅샷 대상인 stage/level/step·cursor·assignment/authority/delegation·transition instance 가 모두 ABSENT(§13~§15·§20·§45) → 봉인할 상태 구조 자체 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **snapshot 테이블(immutable + immutable_hash)**. 모든 활성화·완료·스킵·전이·pause/resume·recovery·cursor 갱신 시점에 관련 상태를 캡처하고, 직접 수정·과거 대체 금지(§52/§53). Replay(§54)·Reconciliation(§57)·Audit Reconstruction 의 단일 기준.
- 재사용 기반: SecurityAudit 해시 무결성 패턴(`SecurityAudit.php:56-68`)을 스냅샷 immutable_hash 검증기의 참조정본으로 재사용. approvals_json(`Mapping.php:285`)은 승인자 누적의 부분 선례이나, 스냅샷은 이를 전이 시점 전체 상태로 일반화한다.
- ★무후퇴 필수: **Completion 은 Event + Snapshot 병행으로만 확정**(§28) — status 컬럼 단독 완료판정 금지. Evidence(§64)에 PII/토큰/자격증명 저장 금지. Mandatory Control(§59 Snapshot 누락·과거 재작성). Fail Closed.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

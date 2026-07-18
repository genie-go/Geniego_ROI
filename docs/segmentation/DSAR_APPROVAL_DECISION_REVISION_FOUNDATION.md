# DSAR — Revision Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### REVISION_FOUNDATION (§38)

Revision Reference 5종 (Decision Record 를 **수정하지 않고** 새 Record 로 표현):

1. `CORRECTION_REFERENCE`
2. `ADMINISTRATIVE_AMENDMENT_REFERENCE`
3. `SUPERSESSION_REFERENCE`
4. `REVERSAL_REFERENCE`
5. `REOPEN_REFERENCE`

★ 핵심 불변식: **기존 Record 를 Update/Delete 하지 않는다.** Revision 은 항상 **새 Decision Record 생성** + `previous/supersedes/superseded by decision record reference`(§35 RECORD) 링크로만 표현한다. 상세 Revision 처리 규칙 = 후속 차수.

## 2. 기존 구현 대조

- **Decision Record 자체가 ABSENT** — 승인 결정 4핸들러는 모두 원본 행을 **in-place UPDATE** 한다:
  - `Mapping::approve`(`Mapping.php:238-293`) — approvals_json 읽고(`:273`) append 후 단일 UPDATE(`:288`).
  - `AdminGrowth::approvalDecide`(`AdminGrowth.php:1313-1344`) — status/decided_by 단일 UPDATE(`:1330`).
  - `Alerting::decideAction`(`Alerting.php:572-599`) — 단일 UPDATE(`:594`).
  - `Catalog::approveQueue`(`Catalog.php:2383-2407`) — bulk UPDATE status='queued'(`:2397`).
- 4핸들러 어디에도 **불변 Record·supersession 링크·correction/reversal reference** 개념이 없다. 상태를 덮어쓰므로 과거 결정은 사라진다 → Revision 을 표현할 **원본 자체가 없다**.
- 감사 계층(`SecurityAudit::verify` `SecurityAudit.php:56-68`)은 무결 검증 정본이나, 이는 **결정 이력의 개정**이 아니라 감사 로그 무결성이다. Revision Foundation 의 대응 자산이 아니다.
- grep 결과: correction/amendment/supersession/reversal/reopen reference 개념 = **no hits**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Approval(ABSENT)·Decision Record(§35 ABSENT)에 전면 종속. 개정 대상인 **불변 Record 가 없으므로** Revision 을 얹을 토대가 없다 → **BLOCKED_PREREQUISITE**.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **선행 필수**: §35 RECORD(불변 Decision Record) 신설 없이 Revision Foundation 은 성립 불가. Record 가 Update/Delete 금지(§35 ★)로 확정된 후에만 개정 5종이 의미를 가진다.
- **순신규 설계**: 5종 Reference 는 각각 **새 Record 생성 + `supersedes`/`superseded_by`/`previous` 링크**로 구현. 원본 무변경(무후퇴).
- **실위험**: 현행 in-place UPDATE(Mapping/AdminGrowth/Alerting/Catalog)를 개정 경로로 오해하면, 승인 이력이 덮어써져 개정 추적 불가. Record 불변화가 선행 Mandatory Control.
- **재사용**: 링크 무결성 검증은 `SecurityAudit::verify` 패턴을 참조하되 별개 엔티티로 확장(감사 로그 ≠ 결정 개정).

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

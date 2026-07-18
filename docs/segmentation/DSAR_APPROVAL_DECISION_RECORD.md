# DSAR — Decision Record (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§35 RECORD** — 확정된 결정의 **불변 원장(immutable ledger) 1행**. ★**Update/Delete 금지.**

필수 필드:
`record_id` · tenant_id · slot id · instance id · command id · definition id · version id · action type · actor subject id · actor identity snapshot reference · role assignment snapshot reference · position incumbency snapshot reference · assignment id · assignment snapshot · claim id · lease id · authority resolution reference · authority snapshot · delegation resolution reference · delegation snapshot · request id · case id · item id · requirement id · work item id · sequential instance id · stage id · level id · step id · resource type · resource id · organization id · legal entity id · amount · currency · risk reference · reason · comment · attachment manifest · signature reference · MFA reference · decision sequence · decision round · effective_at · committed_at · commit hash · previous decision record reference · supersedes decision record reference · superseded by decision record reference · `immutable` · status · evidence.

정정 원칙(§38 REVISION_FOUNDATION): 기존 Record 수정 없이 새 Record 생성(CORRECTION/AMENDMENT/SUPERSESSION/REVERSAL/REOPEN Reference).

## 2. 기존 구현 대조

- **불변 원장 부재 — 핵심 결함.** 모든 결정 확정이 별도 원장 행이 아니라 **기존 행의 in-place UPDATE**:
  - `Mapping::approve`: approvals_json read(`Mapping.php:273`)→append→단일 UPDATE(`Mapping.php:288`). 승인 이력은 하나의 JSON 컬럼에 덮어써짐 — 이전 상태는 소실.
  - `AdminGrowth::approvalDecide`: 단일 UPDATE `status/decided_by`(`AdminGrowth.php:1330`) — 결정 전 값을 덮어씀.
  - `Alerting::decideAction`: 단일 UPDATE(`Alerting.php:594`).
  - `Catalog::approveQueue`: bulk UPDATE(`Catalog.php:2397`), **승인자 미기록**.
- append-only 원장·`immutable` 플래그·commit hash·previous/supersedes/superseded-by 체인·actor/assignment/authority/delegation **snapshot reference** — **grep 없음(no hits)**. 스냅샷의 재료인 Position/Org/Legal Entity/Actor Snapshot 자체가 선행 부재(§3.6 PARTIAL).
- 가장 근접한 상당물: `Mapping`의 approvals_json append(`Mapping.php:285` 인근·:278 dedup)은 append 의도를 보이나 **동일 컬럼 UPDATE**라 행 불변 원장이 아니다.

## 3. 판정

- Verdict: **ABSENT** (in-place UPDATE · 불변 원장 없음 · ★핵심 결함)
- 선행 의존: §3.6 Identity/Security(PARTIAL — snapshot 재료 부재) · §3.1 Approval · §3.5 Sequential — Record가 참조할 Slot·Snapshot·Sequential 축이 선행 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Decision Record는 **append-only 불변 테이블**로 신설. §33 Commit 트랜잭션 5단계에서 1행 INSERT, 이후 어떤 경로로도 UPDATE/DELETE 금지(§60 "Record Update/Delete" = Critical Gap). 정정은 §38에 따라 supersedes/superseded-by 체인의 **새 Record**로만.
- **현행 4핸들러의 in-place UPDATE는 Record 생성으로 대체**하되, 기존 상태 컬럼(운영 조회용)은 Instance 상태(§12·§48-9)로 분리 — 원장(진실)과 투영(조회)의 이원화. `Mapping` 정족수/자기승인 차단(`Mapping.php:287,268`)·`AdminGrowth` audit(`AdminGrowth.php:1342`)은 무후퇴 보존(§70).
- 재사용: 무결 스냅샷 기록의 정본은 SecurityAudit::verify(`SecurityAudit.php:56-68`) — Record의 commit hash·`immutable` 검증 원리로 참조(audit_log는 비무결 장식이므로 원장 대체 불가). Canonical actor = `app_user`(`UserAuth.php:155-157,296`)를 actor subject id의 정본으로.
- **실위험(핵심)**: in-place UPDATE는 (1) 승인 전/후 상태 대조 불가 (2) 위조 actor(`Alerting.php:33-35`)의 변경을 사후 추적 불가 (3) §57 Reconciliation의 비교 기준(Record↔History/Snapshot/Audit) 소멸. 불변 Record는 이 3중 결함의 근본 치료이며 EPIC 06-A-03-02-01의 중심 자산이다.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

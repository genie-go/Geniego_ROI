# DSAR — Action Evidence (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§53 ACTION_EVIDENCE

- **필수 필드**: `evidence id` · `tenant` · `decision instance id` · `decision slot id` · `decision command id` · `decision record id` · `action type` · `action definition id` · `action version id` · `actor` · `assignment/authority/delegation` · `source state` · `target` · `reason` · `comment reference` · `attachment manifest` · `change request` · `resubmission package` · `assignment/claim/lease/sequential effect` · `outcome` · `snapshot` · `reconciliation` · `effective_at` · `recorded_at` · `immutable_hash` · `lineage` · `audit reference`.
- ★ **Comment 원문 / Attachment 내용 전체 중복저장 금지** — Canonical Reference + Hash 만 보관.

## 2. 기존 구현 대조

- 코드 기반 판정 **PARTIAL** — 결정 근거를 붙잡는 substrate(승인 이력·무결성 검증 엔진)는 실재하나, §53가 규정하는 **Action Evidence 정본**(action version·reason·target·effect·outcome·snapshot·reconciliation을 lineage + immutable_hash로 응집)은 부재.
- 실존(evidence substrate):
  - `Mapping.approvals_json`(`Handlers/Mapping.php:209,273,288,526`) — 누가·언제 승인했는지의 Maker-Checker 근거 이력.
  - `SecurityAudit::verify()`(`:56,64`) — hash-chain 무결성 검증 정본. 감사 이벤트의 tamper-evident 검증 substrate로 재사용 가능(단, 현행은 결정-액션 도메인에 미배선).
  - Tenant Guard(`index.php:404-420` · `Alerting.php:580-582`) — evidence의 `tenant` 격리 기반.
- 부재/미구현:
  - `action version`·`reason`·`target`·`change request`·`resubmission package`·`effect`·`outcome`·`snapshot`·`reconciliation` 참조를 하나의 evidence row로 응집 → **no hits**(각 선행 엔티티 부재).
  - `lineage`·`immutable_hash`(evidence 단위)·`recorded_at` vs `effective_at` 분리 → 부재. `approvals_json`은 mutable UPDATE(`Mapping.php:288`)이라 immutable evidence 요건 미충족.
  - **Canonical Reference + Hash 원칙**: 현행 `payload_json`/`approvals_json`은 payload를 인라인 저장(중복저장) — §53 ★ "원문/내용 중복저장 금지, Reference+Hash" 위반 방향. (단 이미지 첨부는 `MediaHost` SHA-256 `MediaHost.php:98-104`로 hash-reference 패턴 부분 실재.)

## 3. 판정

- Verdict: **PARTIAL** (승인 이력·무결성 검증 substrate 실재 · Action Evidence 정본 부재)
- 선행 의존: §53는 `action version`·`reason`·`target`·`outcome`·`snapshot`·`reconciliation`(§9·§35~38·§15·§14·§52·§55) 참조를 요구 — 전부 ABSENT. §3.6 Identity/Security(`SecurityAudit::verify:56,64` · Tenant Guard)만 PRESENT하여 evidence 무결성 substrate로 재사용 가능.
- cover: **substrate 존재**(`SecurityAudit::verify:56,64` · `approvals_json` `Mapping.php:209`) · **응집 Evidence 정본 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): `SecurityAudit::verify()`(`:56,64`)의 hash-chain을 **Action Evidence의 immutable_hash/lineage 엔진으로 승격** — 엔진 신설 금지, 기존 검증 정본 재사용. `approvals_json`(`Mapping.php:209`)은 evidence가 참조하는 canonical source로 유지.
- Mandatory Control(§53 ★): Comment 원문·Attachment 내용을 evidence에 **복제하지 말 것** — `comment reference` + `attachment manifest`(hash)만 저장. 이미지 첨부는 이미 `MediaHost` SHA-256(`MediaHost.php:98-104`) reference 패턴이 있어 확장 대상.
- 불변성: evidence는 append-only + `SecurityAudit` chain에 편입. 현행 `approvals_json` UPDATE(`Mapping.php:288`)와 달리 evidence row는 사후 수정 불가.
- 실위험: `SecurityAudit` hash-chain은 쓰기만으로 tamper-evident가 아님(정본 = `verify()` 실행) — evidence 신뢰의 근거는 chain 존재가 아니라 `verify()` 통과. evidence 조회 API는 반드시 `verify()` 결과를 동반 노출해야 함(장식적 무결성 금지).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

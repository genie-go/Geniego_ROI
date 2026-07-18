# DSAR — Action Snapshot (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§52 ACTION_SNAPSHOT

- **필수 필드**: `snapshot id` · `snapshot type` · `decision command id` · `decision record id` · `action definition id` · `action version id` · `action policy version` · `actor` · `source state` · `target` · `reason definition id` · `reason version` · `comment reference/hash` · `attachment manifest` · `return target` · `change request/items` · `resubmission package` · `assignment/claim/lease/sequential effect` · `outcome mapping` · `conflict result` · `effective_at` · `captured_at` · `immutable_hash` · `status` · `evidence`.
- **TYPE (enum)**: `ACTION_CAPABILITY` / `VALIDATION` / `COMMIT` / `APPROVE` / `REJECT` / `RETURN` / `REQUEST_CHANGES` / `CANCEL` / `WITHDRAW` / `RESUBMIT` / `ACKNOWLEDGE` / `DEFER` / `CONFLICT` / `SIMULATION` / `RECONCILIATION` / `AUDIT_RECONSTRUCTION`.

## 2. 기존 구현 대조

- 코드 기반 판정 **PARTIAL** — "요청 시점 payload"를 붙잡아 두는 필드는 실재하나, 이는 **요청 스냅샷**(제안 원문)이지 §52가 규정하는 **결정 액션 스냅샷**(capability/validation/commit 시점 전체 컨텍스트의 불변 immutable_hash 캡처)이 아님.
- 실존(요청 스냅샷 substrate):
  - `AdminGrowth`: `admin_growth_approval.payload_json`(스키마 `Handlers/AdminGrowth.php:145` · INSERT `:1294` · decode `:1309`) — 승인 요청 대상의 payload를 요청 시점에 저장.
  - `Mapping`: `mapping_change_request.approvals_json`(INSERT `Handlers/Mapping.php:209` · read `:273` · UPDATE `:288` · 응답 `:526`) — Maker-Checker 승인 이력(누가 승인했는지)의 누적 기록.
- 부재/미구현:
  - `snapshot type`(16종)·`immutable_hash`·`captured_at` vs `effective_at` 분리 → **no hits**. `payload_json`/`approvals_json`은 mutable 컬럼(UPDATE 대상: `Mapping.php:288`)이며 해시 봉인 없음.
  - `action definition/version`·`action policy version`·`reason version`·`attachment manifest`·`return target`·`change request`·`resubmission package`·`outcome mapping`·`conflict result` 를 한 스냅샷으로 응집 → 각 선행 엔티티 부재로 성립 불가.
  - `ACTION_CAPABILITY`/`VALIDATION`/`COMMIT`/`SIMULATION`/`RECONCILIATION`/`AUDIT_RECONSTRUCTION` 시점 스냅샷 → 부재. 현행은 요청 payload 1종만.

## 3. 판정

- Verdict: **PARTIAL** (요청 payload 스냅샷 실재 · immutable 결정-액션 스냅샷 부재)
- 선행 의존: §52는 `action version`·`reason version`·`attachment manifest`·`return target`·`change request`·`resubmission package`·`outcome mapping`·`conflict result`를 응집 캡처 — 각각 §9·§37·§42·§20·§23·§30·§14·§50(전부 ABSENT)에 종속. §3.1 Decision Core(불변 Record) 부재가 근본 병목.
- cover: **요청 스냅샷 2종 존재**(`payload_json` `AdminGrowth.php:145,1294` · `approvals_json` `Mapping.php:209`) · **immutable 액션 스냅샷 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): `payload_json`(`AdminGrowth.php:1294`)·`approvals_json`(`Mapping.php:209`)을 **폐기하지 말고**, 신규 `approval_decision_action_snapshot`의 `evidence` reference가 이들을 canonical source로 가리키게 함(§53 ★원문 중복저장 금지와 정합).
- Mandatory Control: 결정 확정 시점(COMMIT)·검증 시점(VALIDATION)·능력 평가 시점(CAPABILITY)에 각각 스냅샷 1건 + `immutable_hash` 봉인. `captured_at`(캡처 시각) ≠ `effective_at`(효력 발생 시각) 분리 필수 — 사후 재구성(AUDIT_RECONSTRUCTION) 무결성 근거.
- 무후퇴/불변성: 현행 `approvals_json`은 UPDATE 대상(`Mapping.php:288`)이라 mutable — 스냅샷 레이어는 append-only + hash-chain으로 별도 관리하고, 봉인 후 수정 금지(§41 ★Committed 수정금지→정정은 새 Record).
- 실위험: SIMULATION 스냅샷(§57)은 실 Record와 물리적으로 분리돼야 함(§57 ★실 Record/Effect 미생성) — snapshot type으로만 구분하고 저장소를 공유하면 시뮬레이션이 감사 이력을 오염시킴.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

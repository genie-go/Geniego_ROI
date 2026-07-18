# DSAR — Action Reconciliation (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§55 ACTION_RECONCILIATION

- **비교 대상(Comparison)**: `Action Command ↔ Record` · `Action Version ↔ Applied Effect` · `Action Type ↔ Outcome` · `Reason Code ↔ Applicability` · `Comment/Attachment Requirement ↔ 실제` · `Attachment Manifest ↔ File Registry` · `Return Action ↔ Target` · `Change Request ↔ Items` · `Resubmit Package ↔ Resolved Items` · `Cancel Scope ↔ Runtime` · `Withdraw Actor ↔ Ownership` · `Assignment/Claim/Lease Effect ↔ State` · `Sequential Effect Event ↔ Record` · `Workflow/ERP/Legacy Outcome ↔ Canonical`.
- **필드**: `reconciliation id` · `decision instance id` · `decision record id` · `action type` · `comparison type` · `source state` · `canonical state` · `difference` · `severity` · `detected_at` · `resolution` · `resolved_by` · `resolved_at` · `status` · `evidence`.

## 2. 기존 구현 대조

- 코드 기반 판정 **ABSENT** — 결정-액션 Command↔Record·Version↔Effect·Type↔Outcome 등을 대조하는 **Action Reconciliation 엔티티는 부재**.
- 오탐 주의(이름 충돌 — 무관):
  - `routes.php:1943-1998`의 `/v{NNN}/recon/reports/{report_id}/approve` 계열은 **재무 정산(settlement) 대사(recon)** 스텁 — 주문↔정산라인·수수료룰·FX 대사이지, 결정-액션 대사가 아님. 명명만 "recon"일 뿐 §55와 무관(코드 기반 판정: 정산 도메인 라우트 등록만).
- 부재/미구현:
  - `Action Command ↔ Record`·`Action Version ↔ Applied Effect`·`Action Type ↔ Outcome` 대조 → **no hits**. 애초에 불변 Command/Record 분리·Action Version·Effect 매핑이 ABSENT(§3.1 Decision Core)이라 대조할 양변이 존재하지 않음.
  - `Workflow/ERP/Legacy Outcome ↔ Canonical` 대조·`comparison type`·`difference`·`canonical state` → 부재. 현행은 status 단일 컬럼 in-place UPDATE(`Alerting.php:594` · `AdminGrowth.php:1330` · `Catalog.php:2383`)라 canonical vs applied 이원 상태가 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §55는 `Action Command`·`Record`·`Version`·`Effect`·`Outcome`·`Attachment Manifest`·`Return Target`·`Change Request`·`Resubmission Package` 의 이원(source vs canonical) 존재를 전제 — 전부 ABSENT. §3.1 Decision Core(불변 Record/Effect 분리) 부재가 근본 병목 → **BLOCKED_PREREQUISITE**.
- cover: **0** (재무 recon 스텁 `routes.php:1943-1998`은 도메인 무관 오탐).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_reconciliation` — §55 14종 comparison + 필드를 데이터로 선언. **재무 recon(`routes.php:1943-1998`)과 명명 충돌 회피** 필수(별도 네임스페이스) — 288차 이후 "segment" 3도메인 명명분리 원칙과 동일하게 "reconciliation"도 정산 vs 결정-액션 분리.
- 선행 필수: 대조는 이원 상태(canonical Record vs applied Effect)를 요구 — Decision Core(불변 Record·Effect 분리)·Action Version(§9)·Outcome Mapping(§14)이 먼저 존재해야 함. 그 전에는 대조 대상이 없어 구현 불가.
- 확장 기반: `Workflow/ERP/Legacy Outcome ↔ Canonical` 축은 기존 정산 recon(`routes.php:1943-1998`)의 대사 패턴(source↔canonical difference 산출)을 **개념적으로 참고**할 수 있으나 코드 재사용은 아님(도메인 상이).
- Mandatory Control: `difference` 발견 시 자동 정정 금지 — `resolution` + `resolved_by`(Manual Review 경유)로 기록. `LEGACY_STATUS_MISMATCH`(§56)는 in-place UPDATE 잔재를 canonical로 흡수하는 마이그레이션 경로로만 사용.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].

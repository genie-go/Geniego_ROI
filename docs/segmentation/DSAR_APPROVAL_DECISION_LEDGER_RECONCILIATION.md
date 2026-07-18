# DSAR — Ledger Reconciliation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§54 `LEDGER_RECONCILIATION`

- **비교 대상(Comparison)**:
  - `Decision Record / Commit / History / Snapshot / Evidence / Audit / Outbox / Sequential Reference ↔ Ledger Entry`
  - `Ledger Entry ↔ Link / Previous Entry / Head`
  - `Ledger Sequence ↔ Entry Count`
  - `Partition Sequence ↔ Partition Head`
  - `Correction / Supersession Record ↔ Entry`
  - `Retention Action ↔ State`
  - `Legal Hold Binding ↔ State`
  - `Application DB ↔ Audit DB`
  - `Canonical Ledger ↔ Legacy / ERP / Workflow History`
- **필드**: `reconciliation id` · `tenant id` · `ledger id` · `partition id` · `comparison type` · `source reference` · `canonical reference` · `source state` · `canonical state` · `difference` · `severity` · `detected_at` · `resolution` · `resolved_by` · `resolved_at` · `status`(§55) · `evidence`.

## 2. 기존 구현 대조

- 코드 기반 판정 **ABSENT** — Committed Decision(Record/Commit/History/Snapshot/Evidence/Audit/Outbox/Sequential Reference)를 Ledger Entry와 대조하고, Entry를 Link/Previous Entry/Head와 대조하는 **Ledger Reconciliation 엔티티는 부재**.
- 근본 병목: 대조는 **이원(source vs canonical)** 상태를 전제하나, 선행 §3.1 Decision Core가 ABSENT(`approval_decision` 0·유일 승인=Mapping approvals_json 배열 append + status **in-place UPDATE** `Mapping.php:285-289,327`·테이블 `Db.php:623,655`)이라 canonical Ledger Entry라는 한 축이 애초에 존재하지 않는다. `Ledger Sequence ↔ Entry Count`·`Partition Sequence ↔ Partition Head` 대조도 Ledger/Partition/Head 엔티티 부재로 **no hits**.
- 오탐 주의(이름 충돌 — 무관):
  - `routes.php:1943-1998`의 `/v{NNN}/recon/reports/{report_id}/approve|lock` 계열은 **재무 정산(settlement) 대사** 스텁 — 주문↔정산라인·수수료룰·FX 대사이지 원장 무결성 대사가 아님. 명명만 "recon"일 뿐 §54와 무관(코드 기반 판정: 정산 도메인 라우트 등록만).
  - `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)는 해시체인 연속성만 재계산(replay 1종)할 뿐, Record↔Entry·Entry↔Head 이원 대조는 아님. gap 무탐지(연속 체인만 검증).
- 부분 대비(대조 대상이 아니라 재사용 substrate): `Application DB ↔ Audit DB` 축의 한쪽 후보는 실재 — `security_audit_log`(`SecurityAudit.php:48-52`) append-only 해시체인이 유일한 실 감사 무결성 자산. 그러나 이는 감사 트레일이지 decision ledger가 아니며, 반대편 canonical Ledger가 없어 **대조 불가**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §54는 9종 비교 전부가 이원(source vs canonical Ledger) 존재를 전제 — canonical 축 전부 ABSENT. §3.1 Decision Core(불변 Record/Commit/History/Snapshot)·§15 Immutable Ledger·§17 Entry·§20 Head·§29 Correction·§32 Supersession·§36 Retention·§37 Legal Hold(전부 ABSENT)에 종속 → **BLOCKED_PREREQUISITE**.
- cover: **0** (재무 recon 스텁 `routes.php:1943-1998`은 도메인 무관 오탐 · SecurityAudit verify는 체인 연속성만).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_ledger_reconciliation` — §54 9종 comparison + 필드를 데이터로 선언. **재무 recon(`routes.php:1943-1998`)과 명명 충돌 회피** 필수(288차 이후 "segment" 3도메인 명명분리 원칙과 동일하게 "reconciliation"도 정산 vs 원장 무결성 분리).
- 선행 필수: 대조는 canonical Ledger(불변 Entry·Head·Sequence)와 source(Decision Record/Outbox/Audit)의 이원을 요구 — Decision Core(§3.1)·Immutable Ledger(§15)·Entry(§17)·Head(§20)가 먼저 존재해야 함. 그 전에는 대조 대상이 없어 구현 불가.
- 확장 substrate: `Application DB ↔ Audit DB` 축은 실재 `SecurityAudit`(security_audit_log) 해시체인을 canonical 감사 소스로 재사용할 수 있음(발명이 아니라 조립). `Outbox ↔ Ledger` 축은 실재 `omni_outbox`(`Omnichannel.php:390-448`) 클레임 패턴을 참조. `Canonical ↔ Legacy History` 축은 in-place UPDATE 잔재(`Mapping.php:288`)를 migration 대상으로 흡수.
- Mandatory Control: `difference` 발견 시 **자동 정정 금지** — `resolution` + `resolved_by`(Manual Review 경유)로만 기록(§54 원칙). §51 Reconstruction의 "Production Ledger 자동수정 금지"와 동일. `MISMATCH` 상태는 §55 enum으로 라우팅.
- 실위험: 대조 로직 없이 status만 노출하면 "장식적 대사"가 됨(289차 `menu_audit_log.hash_chain`·`schema_migrations.checksum` verify/비교 미실행 정정과 동일 함정) — status는 반드시 실 대조 결과로만 채워져야 함.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_RECONCILIATION_STATUS]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

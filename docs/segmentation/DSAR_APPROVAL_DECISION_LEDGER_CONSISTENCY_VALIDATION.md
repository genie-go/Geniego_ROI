# DSAR — Ledger Consistency Validation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_CONSISTENCY_VALIDATION (§50)** — 검증 항목(원문 전사): Ledger Entry 의 Action Type · Actor · Case Version · Assignment · Authority · Delegation · Step · Snapshot · Audit · Outbox · Sequence↔Head · Correction Link↔Record · Supersession Link↔Record · Retention State↔Action · Legal Hold State↔Binding 이 서로 **일치**하는지 확인한다.

**★ 원칙**: 완전성(§49 "있는가")과 구분 — 일관성은 **부속 값이 서로 모순되지 않는가**(참조 무결성·상태 정합)를 본다.

## 2. 기존 구현 대조

- **부분 존재 (PARTIAL).** 값 간 정합 검증의 **단 한 형태(해시 체인 정합)만** 실재하고, §50 이 요구하는 대다수 축(Action Type/Actor/Case Version/Assignment/Authority/Delegation/Retention↔Action/Legal Hold↔Binding)은 대상 엔티티가 ABSENT 라 검증 불가.
- **실재 부분 — `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)**: 각 로우의 저장 hash 가 `sha256(prev|tenant|actor|action|details|created_at)`(`:27`) 재계산 값과 일치하는지 hash_equals 로 확인한다. 이는 "기록된 필드 조합 ↔ 저장 digest" 사이의 **내부 정합 검증 1종**이며, 어느 한 필드(actor/action/details)가 사후 변조되면 hash 불일치로 검출된다. §50 의 "Snapshot/Audit 일치" 축의 부분 커버로 볼 수 있다.
- **부재 부분**:
  - Sequence↔Head 정합 — Ledger Head/CAS(§20) ABSENT.
  - Correction Link↔Record·Supersession Link↔Record — Correction/Supersession(§29/§32) ABSENT.
  - Retention State↔Action·Legal Hold State↔Binding — Retention/Legal Hold Binding(§36/§37) ABSENT.
  - Actor/Case Version/Assignment/Authority/Delegation 정합 — 대응 Runtime 엔티티(§3.3) ABSENT.
- **장식 주의**: `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)은 verify() 가 0(289차 정정)이라 정합 검증 근거로 오인 금지. `schema_migrations.checksum`(`Migrate.php:50,63-64`)도 저장만·비교 미실행.

## 3. 판정

- Verdict: **PARTIAL** (해시-필드 내부 정합만 실재·엔티티 간 상태 정합 축 ABSENT)
- 선행 의존: §50 의 대부분 축은 Ledger Head(§20)·Correction/Supersession(§29/§32)·Retention/Legal Hold(§36/§37)·Runtime(§3.3) 신설을 전제. 이들이 서야 "state↔action", "link↔record" 대조가 성립.
- cover: `SecurityAudit::verify`(`SecurityAudit.php:56-68` + digest `:27`)의 field↔digest 정합 = **내부 일관성 1종 커버**. 엔티티 간·상태 간 정합 = **0**.

## 4. 확장/구현 방향 (설계)

- **CANONICAL 확장 대상 = `SecurityAudit::verify`(`:56-68`)의 digest 정합 패턴**. Entry 의 canonical payload/context digest(§17)를 동일 sha256 재계산 검증으로 확장하되(재사용·KEEP_SEPARATE), 여기에 **엔티티 간 참조 정합**(Correction Link↔Record, Retention State↔Action)을 별도 검사 축으로 추가한다.
- **Mandatory Control**: 불일치 발견 시 값을 조용히 맞추지 않는다 — RECONCILIATION_REQUIRED(§54)/Conflict(§45)로 승격, Entry 는 append-only 유지(정정은 새 Correction Entry §29).
- **장식 배제**: menu_audit_log.hash_chain·schema_migrations.checksum 은 verify/비교가 실행되지 않으므로 일관성 근거로 사용 금지 — 실 검증 정본은 SecurityAudit::verify 하나뿐임을 명시.
- **선행 순서**: state↔action·link↔record 정합은 해당 엔티티(Head/Correction/Retention/Legal Hold) 신설 후 확정.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

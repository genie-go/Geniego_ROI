# DSAR — Ledger Conflict (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§45 LEDGER_CONFLICT

- **TYPE**: DUPLICATE_SEQUENCE / DUPLICATE_ENTRY / DUPLICATE_DECISION_COMMIT_ENTRY · IDEMPOTENCY · HEAD_VERSION / HEAD_SEQUENCE / PARTITION · ORDER · PREVIOUS_ENTRY_CONFLICT · CROSS_TENANT_LINK · MISSING_REQUIRED_REFERENCE · CORRECTION_TARGET_CONFLICT / SUPERSESSION_TARGET_CONFLICT · RETENTION / LEGAL_HOLD / TRANSACTION_BOUNDARY / OUTBOX_BINDING / MIGRATION_CONFLICT · CUSTOM.
- **필드**: conflict id · tenant id · ledger/partition id · affected entry/decision record ids · conflict type · expected/actual state · expected/actual sequence · expected/actual head · severity · detected_at · resolution policy · winning entry reference · resolved_by/at · status · evidence.

## 2. 기존 구현 대조

- 코드 기반 판정: **ABSENT** — 원장 충돌 탐지/유형화/해소 전무.
- 부재:
  - **conflict 레코드·conflict type·expected/actual head·winning entry reference = no hits**. 원장 append 경합을 유형화(§45 TYPE)해 기록·해소하는 구조 없음.
  - **선행 축 전부 부재**로 충돌이 발생·탐지될 지점이 없다: Sequence(§19)·Head Version(§20/§44)·Idempotency(§40)·Outbox Binding(§39)·Transaction Boundary(§38)·Previous Entry Link(§23)·Cross-Tenant Link(§23) 가 ABSENT/PARTIAL.
  - 현행 경합 처리: 재승인 시 `status !== 'pending'` → 409 거부(`Mapping.php` 계열 게이트, EXISTING_IMPLEMENTATION 참조)는 단순 상태 거부일 뿐 §45 충돌 유형/해소정책/winning entry 산출이 아님.
  - SecurityAudit 동시 INSERT 체인 분기(§4 실 위험 5)는 **탐지되지 않는 잠재 충돌** — verify 는 연속 체인만 검증하고 분기/gap 은 무탐지.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §45 는 §19 Sequence·§20 Head·§40 Idempotency·§39 Outbox·§38 Transaction·§23 Link·§46 Gap·§47 Duplicate·§48 Ordering 이 산출하는 위반 신호를 수신·유형화(전부 ABSENT/PARTIAL). BLOCKED_PREREQUISITE.
- cover: **0**(충돌 탐지/유형화/해소 전무 · 상태 409 거부는 §45 아님).

## 4. 확장/구현 방향 (설계)

- 순신규(수집자 패턴): §45 CONFLICT 는 다른 축들의 위반을 수렴하는 **탐지·유형화 레지스트리** — UNIQUE 제약 위반(§40 idempotency·§19 sequence)·CAS mismatch(§44 head version)·fencing 거부(§43)·Outbox 불일치(§39)·Cross-Tenant Link(§23) 를 각각 대응 conflict type 으로 기록.
- 해소정책(Mandatory): expected/actual(state·sequence·head) 를 보존하고 resolution policy 로 winning entry 를 결정 — ★Gap 자동 은폐/Sequence 재번호화 금지(§46), 원본 Entry 수정 금지(§25). Correction/Reconciliation(§54) 경로로만 해소.
- 검증 배선: §54 Reconciliation·§49 Completeness·§48 Ordering 잡이 주기 대조로 잠재 충돌(SecurityAudit 체인 분기 등)을 능동 탐지 → §45 로 라우팅. 현행 verify 의 gap 무탐지 한계를 보강.
- 무후퇴: 기존 status 409 게이트(`Mapping.php` 계열)는 하위 안전망으로 유지(§68 Regression Gate) — Conflict 레이어를 위에 얹되 기존 거부 동작 회귀 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_IDEMPOTENCY]] · [[DSAR_APPROVAL_DECISION_LEDGER_OPTIMISTIC_VERSION]] · [[DSAR_APPROVAL_DECISION_LEDGER_TRANSACTION_BOUNDARY]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

# DSAR — Ledger Simulation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_SIMULATION (§53)** — TYPE(원문 전사):
`DECISION_APPEND` / `CONCURRENT_APPEND` / `DUPLICATE_APPEND` / `HEAD_VERSION_CONFLICT` / `GAP_CREATION` / `CORRECTION_APPEND` / `SUPERSESSION_APPEND` / `RETENTION_ACTION` / `LEGAL_HOLD` / `MIGRATION_APPEND` / `RECONSTRUCTION` / `RECONCILIATION` / `CUSTOM`.

필드: `simulation_id` · tenant id · ledger/partition id · simulation type · current head/sequence · proposed entry/references · proposed correction target/retention action · simulated sequence/head/conflicts/gaps/result · simulation digest foundation · status · evidence.

**★ 절대 원칙 (§53)**: Simulation 은 실 Ledger Entry/Head/Sequence/Checkpoint/Audit 를 **미변경** — 제안된 append/correction/retention 을 가상 실행해 결과(simulated sequence/head/conflicts/gaps)만 산출한다.

## 2. 기존 구현 대조

- **전면 부재 (ABSENT).** §GROUND_TRUTH 개념별 판정에서 Simulation = ABSENT. `simulation_id`·proposed entry·simulated head/conflicts/gaps 를 산출하는 원장 시뮬레이터가 없다.
- **혼동 주의 — Reconciliation/Reconstruction 도 ABSENT**, dry-run 류 프리뷰(예: Alerting `dry_run_diff`)는 단일 액션 미리보기이지 §53 이 요구하는 "전체 append 파이프라인(Sequence 할당→Entry→Link→Head CAS→Idempotency→Outbox §38)을 가상 상태로 통과시켜 simulated head/conflict/gap 을 내는" 원장 시뮬레이션이 아니다.
- **가상 실행 대상 부재**: §53 TYPE 13종(CONCURRENT_APPEND·HEAD_VERSION_CONFLICT·GAP_CREATION·DUPLICATE_APPEND …)이 겨냥하는 시나리오는 모두 실 원장 메커니즘(Head CAS §20·Sequence §19·Idempotency §40·Gap §46·Conflict §45) 위에서만 정의된다. 이 메커니즘들이 ABSENT 이므로 시뮬레이션이 태울 파이프라인 자체가 없다.
- 승인 결정 in-place UPDATE(`Mapping.php:288`)라 "append 를 가상 실행"할 append 경로가 존재하지 않는다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §53 은 실 append 경로(§38 Transaction Boundary)·Head CAS(§20)·Sequence(§19)·Idempotency(§40)·Gap/Conflict(§45/§46)를 **부작용 없이 가상 실행**한다. 이 실경로들이 ABSENT 이므로 시뮬레이터가 복제·우회할 대상이 없다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티** — 실존 대응 자산 없음. dry-run/preview 류를 Simulation 으로 재해석 금지(단일 액션 미리보기 ≠ 전 append 파이프라인 가상 실행).
- **재사용 원칙**: Simulation 은 실 append 파이프라인(§38)·Head CAS(§20)·Sequence 할당(§19) 로직을 **동일 코드로** 태우되, 최종 write(Entry/Head/Sequence/Checkpoint/Audit)만 차단해야 한다 — 별도 시뮬레이션 로직 복제 금지(이중화 = drift 원천).
- **Mandatory Control — §53 절대 원칙**: Simulation 은 실 Ledger 상태를 한 바이트도 바꾸지 않는다. simulated head/conflicts/gaps 는 산출물이지 커밋이 아니다. 시뮬레이션이 실 Entry/Head 를 남기면 그 순간 오염.
- **정직판정**: Simulation 은 코어의 부가 진단 도구(예: 사전 충돌/결번 예측)로 후순위. Ledger append 메커니즘 신설 후에야 성립.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

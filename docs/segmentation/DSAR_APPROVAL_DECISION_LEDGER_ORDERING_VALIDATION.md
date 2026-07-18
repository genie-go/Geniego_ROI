# DSAR — Ledger Ordering Validation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_ORDERING_VALIDATION (§48)** — 검증 항목(원문 전사): Sequence 단조 · Recorded Time 역전 탐지 · Commit Time ↔ Order 일치 · Previous Entry Reference 일치 · Head 가 마지막 Entry · Checkpoint 연속 · Correction/Supersession/Retention/Legal Hold Release Order.

**★ 절대 원칙 (§48)**: **Event Effective Time(과거 발생 가능) ≠ Recorded Order.** Timestamp 만으로 Entry 를 재배열 금지 — 순서의 정본은 Sequence 이지 시간이 아니다.

## 2. 기존 구현 대조

- **부분 존재 (PARTIAL).** 순서 검증 능력이 **단 한 축(previous-link 연속성)만** 실재하고, 나머지 축(단조 sequence·recorded time 역전·head=last·checkpoint 연속)은 부재다.
- **실재 부분 — `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)**: prev_hash 를 되짚어 각 로우가 직전 로우의 hash 를 정확히 참조하는지 hash_equals + prev_hash 이중검증한다. 이는 §48 의 "Previous Entry Reference 일치"에 해당하는 **순서 연속성 검증 1종**이다. GENESIS(`:39`)에서 시작해 체인을 따라가므로 삽입/재배열로 체인이 끊기면 검출된다.
- **부재 부분**:
  - **논리 sequence 단조 검증 없음** — id AUTOINCREMENT(`:35-41` `ORDER BY id DESC`)만 있고 tenant/partition scope 단조 sequence 가 없어 "단조 증가" 판정 축이 없다.
  - **Recorded Time 역전 탐지 없음** — created_at(`:24` gmdate)는 저장하나 역전 검사 로직이 없다. 역으로 §48 이 금지하는 "timestamp 기반 재배열"의 위험만 열려 있다.
  - **Head=마지막 Entry 검증 없음** — Ledger Head(§20)·CAS 자체가 ABSENT. `lastHash`(`:35-41`)는 `ORDER BY id DESC` 조회일 뿐 fencing/version 검증이 없어 동시 INSERT 시 체인 분기 이론창.
  - **Checkpoint 연속 검증 없음** — Checkpoint(§21) ABSENT.

## 3. 판정

- Verdict: **PARTIAL** (Previous Entry 연속성만 실재·나머지 축 ABSENT)
- 선행 의존: 단조 sequence 검증·head=last 검증은 Ledger Sequence(§19)·Head(§20) 신설을 전제한다. Recorded Time 역전 탐지는 Entry(§17)의 committed_at/recorded_at 분리를 전제한다.
- cover: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 prev_hash 연속성 검증 = **Previous Entry Reference Order 1종 커버**. 단조 sequence/recorded time 역전/head=last/checkpoint 연속 = **0**.

## 4. 확장/구현 방향 (설계)

- **CANONICAL 확장 대상 = `SecurityAudit::verify`(`:56-68`)**. prev_hash 연속성 검증 로직을 재사용·확장해, 서버 생성 단조 sequence(§19) 검사와 recorded_at 역전 탐지를 **추가 축으로** 얹는다(기존 검증 대체 아님·KEEP_SEPARATE·확장).
- **Mandatory Control — §48**: recorded_at 역전이나 순서 이상을 발견해도 **timestamp 로 재정렬 금지.** 순서 정본은 sequence. 시간 역전은 ORDER_CONFLICT(§45)/Reconciliation(§54)으로 승격하되 Entry 는 append-only 유지.
- **Event Effective Time 분리**: Entry 는 event_effective_at(과거 가능)·committed_at·recorded_at 3축을 분리 저장(§17)해, effective time 이 과거인 정상 backdated entry 를 "역전 오류"로 오판하지 않게 한다.
- **Head=Last 검증 신설**: Ledger Head(§20) CAS·fencing 신설 후 "head.current_entry_id 가 실제 최신 sequence Entry 와 일치"를 §48 검사에 포함. 현행 `lastHash` `ORDER BY id DESC`(`:35-41`)는 CAS 가 없어 그대로 두면 검증 근거가 될 수 없다.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

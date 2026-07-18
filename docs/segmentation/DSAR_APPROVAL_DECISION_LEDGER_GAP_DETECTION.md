# DSAR — Ledger Gap Detection (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_GAP_DETECTION (§46)** — TYPE(원문 전사):
`MISSING_LEDGER_SEQUENCE` / `MISSING_PARTITION_SEQUENCE` / `MISSING_DECISION_COMMIT_ENTRY` / `MISSING_HISTORY_ENTRY` / `MISSING_SNAPSHOT_ENTRY` / `MISSING_EVIDENCE_ENTRY` / `MISSING_AUDIT_ENTRY` / `MISSING_OUTBOX_ENTRY` / `MISSING_SEQUENTIAL_REFERENCE_ENTRY` / `MISSING_PREVIOUS_LINK` / `MISSING_HEAD_UPDATE` / `MISSING_CHECKPOINT_RANGE` / `CUSTOM`.

필드: `gap_id` · tenant id · ledger/partition id · gap type · expected sequence · next observed sequence · affected decision id · affected time range · detected_at · severity · automatic recovery allowed · recovery reference · status · evidence.

**★ 절대 원칙 (§46)**: Gap 발견 시 Sequence **재번호화 금지** — 발견된 결번은 은폐하지 않고 Conflict/Reconciliation 으로 승격한다(§19 "Gap 자동은폐 금지").

## 2. 기존 구현 대조

- **전면 부재 (ABSENT).** §GROUND_TRUTH 개념별 판정에서 Gap Detection = ABSENT. `gap_id`·gap type·expected/next observed sequence 를 갖는 결번 탐지 경로는 존재하지 않는다.
- **유일 인접 자산의 한계 — `SecurityAudit::verify()`는 gap 을 못 본다.** `SecurityAudit.php:56-68` 의 verify 는 hash_equals + prev_hash 이중검증으로 **연속 체인만** 확인한다. 논리 sequence 가 없고(id AUTOINCREMENT 만·`:35-41` `ORDER BY id DESC`), 따라서 "N번과 N+2번은 있는데 N+1번이 없다"는 결번을 판별할 축 자체가 없다. 체인이 이어져 있으면 통과하므로 **삭제로 생긴 구멍은 무탐지**다.
- **실 위험 상충**: `media_gc_cron.php:35,43` 이 append-only 감사로그를 90일 후 물리 DELETE 한다 — 이는 정확히 Gap Detection 이 잡아야 할 "결번을 만드는 행위"인데, 만드는 쪽만 있고 잡는 쪽이 없다.
- 승인 결정은 in-place UPDATE(`Mapping.php:288`)라 애초에 순서 있는 Entry 스트림이 없어 gap 개념이 성립하지 않는다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §46 은 Ledger Sequence(§19)·Head(§20)·Entry(§17) 스트림 위에서 "있어야 할 sequence 가 없음"을 판별한다. 이 스트림들이 ABSENT(decision_ledger 0·논리 seq 0)이므로 검사 대상이 없다. Decision Core(§3.1)·Ledger Sequence 신설 이후 성립.
- cover: **0** (`SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 연속 체인 검증이지 결번 탐지 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 판별 엔진** — 실존 대응 자산 없음. verify 의 연속성 검증을 Gap Detection 으로 재해석 금지(연속 체인 통과 ≠ 결번 부재).
- **선결 조건**: 서버 생성 단조 Ledger Sequence(§19)가 먼저 서야 gap 이 정의된다. Sequence 신설 시 SecurityAudit 의 prev_hash 체인 패턴(CANONICAL·`SecurityAudit.php:27,39`)을 확장해 논리 sequence + head 를 얹는다.
- **Mandatory Control — §46/§19**: gap 을 발견해도 **절대 재번호화하지 않는다.** GAP_DETECTED → Conflict(§45)/Reconciliation(§54) 로만 승급. severity·automatic recovery allowed 플래그로 자동복구 가능 여부를 명시하되, 자동복구가 sequence 를 밀어 채우는 방식이면 그 자체가 무결성 파괴다.
- **실 위험 정합**: `media_gc_cron` 물리삭제(`:35,43`)를 Ledger 대상에서 제외하거나 Legal Hold(§37) 예외를 걸어야 gap 유발원이 사라진다(§66 Regression 예외=개선).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

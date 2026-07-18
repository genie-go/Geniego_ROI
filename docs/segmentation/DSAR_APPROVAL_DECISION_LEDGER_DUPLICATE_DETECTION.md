# DSAR — Ledger Duplicate Detection (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_DUPLICATE_DETECTION (§47)** — 탐지 대상(원문 전사): 동일 Ledger/Partition Sequence 복수 · 동일 Decision Commit 복수 Entry · 동일 Decision Record 복수 Canonical Entry · 동일 Source Event 복수 · 동일 Idempotency Key 다른 Entry · Correction Target 중복 · Supersession 중복 · Outbox 복수 · Retry/Migration Backfill/Recovery 로 인한 중복.

**★ 원칙**: 중복은 조용히 병합하지 않는다 — Conflict(§45 DUPLICATE_SEQUENCE/ENTRY/DECISION_COMMIT_ENTRY)로 승격하고 Canonical Entry 하나만 winning 으로 남긴다(§16 "동일 Entry 두 Partition Canonical 중복 금지·SoT Entry 하나").

## 2. 기존 구현 대조

- **전면 부재 (ABSENT).** §GROUND_TRUTH 개념별 판정에서 Duplicate Detection = ABSENT. Ledger sequence/commit/record 중복을 판별하는 경로가 없다.
- **인접 primitive 는 있으나 Ledger 용이 아니다**:
  - **Inbox dedup(PRESENT·재사용 substrate)** — `Paddle.php:108,146,343-368` paddle_events UNIQUE 제약이 외부 webhook 중복 유입을 막는다. 그러나 이는 특정 채널 이벤트 dedup 이지, Ledger Entry/Commit/Sequence 중복 탐지가 아니다.
  - **Outbox 리스(PRESENT·재사용)** — `Omnichannel.php:390-448`(리스 `:395`)+SKIP LOCKED(`:405,429-441`)가 작업 이중처리를 줄이나, 이는 작업큐 클레임이지 Ledger 중복 판별이 아니다.
- **Idempotency Key 인프라 부재** — §47 의 "동일 Idempotency Key 다른 Entry" 판별에 필요한 원장 idempotency 저장소(§40)가 ABSENT. 따라서 retry/backfill 중복을 key 기준으로 구분할 수 없다.
- 승인 결정 in-place UPDATE(`Mapping.php:288`)라 "동일 Decision Record 복수 Canonical Entry" 개념이 성립할 원장 자체가 없다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §47 은 Ledger Sequence(§19)·Entry(§17)·Idempotency(§40)·Outbox Binding(§39) 위에서 중복을 판별한다. 이들이 ABSENT 이므로 중복시킬 대상도, 판별할 키도 없다.
- cover: **0** (paddle_events UNIQUE(`Paddle.php:108`)·omni_outbox 리스(`Omnichannel.php:395`)는 채널/작업 dedup substrate 이지 Ledger Duplicate Detection 커버 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 판별 엔진** — 단, **DB UNIQUE 제약을 1차 방어선으로 재사용**한다: §27 이 요구하는 Unique Sequence/Decision Commit Entry/Decision Slot Commit 제약을 paddle_events UNIQUE 패턴(`Paddle.php:108`)과 동형으로 얹어, DB 레벨에서 동일 sequence/commit 이중 INSERT 를 물리 차단한다.
- **Idempotency 선행 필수**: retry/backfill 중복은 §40 Idempotency Key(동일 key+request=기존 Entry 반환·동일 key 다른 request=Conflict+차단+Critical Audit)로 흡수한다 — 이 저장소가 먼저 서야 §47 이 성립.
- **Mandatory Control — §47/§16**: 중복 발견 시 조용한 병합/삭제 금지. DUPLICATE_DETECTED → Conflict(§45)·winning entry reference 로 SoT 하나만 지정, 나머지는 Void Reference(§34 DUPLICATE_COMMIT)로 새 Entry 기록(원본 삭제 금지).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

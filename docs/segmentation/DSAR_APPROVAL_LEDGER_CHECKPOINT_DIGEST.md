# DSAR — Ledger Checkpoint Digest (06-A-03-02-03-02 · §37)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§37 Checkpoint Digest**(`APPROVAL_LEDGER_CHECKPOINT_DIGEST`) — Sequence 범위를 대표하는 Digest. 필수 Canonical 입력:
- `tenant` · `ledger` · `partition`
- `first included sequence` / `last included sequence`(범위)
- `entry count`(범위 내 Entry 수)
- `ordered entry digest collection`(순서 보존 Entry Digest 모음)
- `previous checkpoint digest`(직전 Checkpoint 연결)
- `checkpoint policy version`
- `generated_at`(Trusted Time·UTC)

원칙 계약(§37·§42 파생): ★**대규모 범위는 Merkle Tree 또는 Rolling Digest(Versioned)를 사용하고, 단순 문자열 Concatenation 금지.** Checkpoint는 범위 대표성을 증명해야 하며(§42 Checkpoint Verification: Range 시작/종료·Entry Count·모든 Entry Digest·Range Chain·Previous Checkpoint·누락/중복 Entry·Overlap/Gap), previous checkpoint digest로 Checkpoint 간 체인을 형성한다. Digest Purpose=`CHECKPOINT`(§23).

## 2. 기존 구현 대조

- **Checkpoint Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — `ledger_checkpoint` CREATE/ensureTables 0히트. Sequence 범위를 대표하는 Checkpoint 레코드·digest 없음.
- **범위 대표 digest primitive 부재**: 실존 `SecurityAudit`(GROUND_TRUTH #7)는 **entry 단위** prev_hash 체인·행별 verify(`SecurityAudit.php:56-68`)만 제공 — 범위를 Merkle/Rolling으로 요약하는 Checkpoint 계층은 없음. `schema_migrations.checksum`(`Migrate.php:50`)은 저장만·비교 미실행(GROUND_TRUTH #16 장식).
- **Canonicalization·ordered collection 규약 부재**(GROUND_TRUTH §4): §21 Collection Ordering(ordered list 순서 보존) 미확립 → ordered entry digest collection의 결정적 직렬화 불가.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Ledger Checkpoint)와 그 대상인 Entry 시퀀스가 선행 §3.1 부재로 ABSENT → Checkpoint가 요약할 범위 자체가 없음. entry 단위 verify substrate(SecurityAudit)만 PRESENT, 범위 대표성 미달(§41/§42).
- cover: **0** (Checkpoint Digest Envelope·Merkle/Rolling·ordered entry digest collection·previous checkpoint chain 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Checkpoint Field Set + Envelope(purpose=`CHECKPOINT`). first/last sequence·entry count·ordered entry digest collection·previous checkpoint digest·policy version을 Canonical Projection.
- **★Merkle/Rolling(Versioned)**: 대규모 범위는 단순 concat 금지 — Merkle Tree Root 또는 Versioned Rolling Digest로 산출. Formula Version을 §10 CHECKPOINT_FORMULA_CHANGE로 관리.
- **Checkpoint 간 체인**: previous checkpoint digest로 Checkpoint를 연결, §42 Checkpoint Verification으로 Range Chain·누락/중복·Overlap/Gap 탐지. entry 단위는 `SecurityAudit.php:56-68` verify 패턴 확장.
- **선행 필수**: §3.1 Ledger Checkpoint Aggregate + Entry Sequence 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_CHECKPOINT]] · [[DSAR_APPROVAL_LEDGER_SEAL_DIGEST_FOUNDATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

# DSAR — Decision Outbox Digest (06-A-03-02-03-02 · §32)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§32 Outbox Digest** — Outbox Event Aggregate의 독립 Digest. 필수 Canonical 입력:
- `event type`
- `aggregate id`
- `event version`
- `payload digest`(payload 원문이 아닌 그 digest)
- `partition key`
- `correlation` · `causation`
- `created_at`(Trusted Time·UTC)

원칙 계약(§24·§51 파생): Outbox Digest는 event 메타 + **payload digest**(원문 미포함)를 Canonical 결합한다. Commit-time Verification(§51)에서 Outbox Binding Digest가 결정 Commit과 동일 트랜잭션 내에서 검증되어야 하며, 실패 시 전체 Transaction Rollback. Digest Purpose=`OUTBOX`(§23).

## 2. 기존 구현 대조

- **Decision Outbox Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.2 Decision Foundation ABSENT — `decision_outbox` 테이블/클래스 0히트. Outbox Digest가 고정할 결정 도메인 outbox 이벤트 없음.
- **Outbox 트랜잭션 substrate는 인접 실재하나 결정 도메인 밖**: GROUND_TRUTH는 결정 Outbox를 위한 SHA-256 digest primitive(`Crypto.php:81`)만 재사용 대상으로 등재. (일반 Outbox/SKIP LOCKED 패턴은 결정 Ledger용으로는 미배선 — 선행 §3.1/§3.2 ABSENT.)
- **payload digest 규약 미확립**: Canonical JSON/Decimal/Unicode Normalization ABSENT(GROUND_TRUTH §4) → outbox payload를 결정적으로 digest할 Canonical Projection 계층 부재. 현행 `json_encode`류는 §5.3/§5.4 위반.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Decision Outbox)가 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation 부재로 ABSENT → digest 대상·Commit 트랜잭션 경계 모두 미존재. SHA-256 primitive만 PRESENT.
- cover: **0** (Outbox Digest Envelope·payload digest·partition key Canonical 규약·Commit-time Binding 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Outbox Field Set(§14 Aggregate Type=OUTBOX) + Envelope(purpose=`OUTBOX`). event type·aggregate id·event version·payload digest·partition key·correlation·causation를 Canonical Projection.
- **payload는 digest만**: outbox payload 원문을 Outbox Digest에 직접 포함 금지 — §24 분리·§5.7 민감정보 비노출. payload digest = §15 Canonical Projection 위 SHA-256(`Crypto.php:81`).
- **Commit-time 결합**: §51에 따라 Outbox Binding Digest를 결정 Commit과 동일 트랜잭션에서 검증, 실패 시 Rollback. 선행 §3.2 Commit 골격 필수.
- **선행 필수**: §3.1 Ledger·§3.2 Decision/Outbox Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_OUTBOX]] · [[DSAR_APPROVAL_DECISION_LEDGER_OUTBOX_BINDING]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

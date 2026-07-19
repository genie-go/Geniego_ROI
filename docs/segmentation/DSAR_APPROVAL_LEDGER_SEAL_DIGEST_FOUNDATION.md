# DSAR — Ledger Seal Digest Foundation (06-A-03-02-03-02 · §37/§6)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§37/§6 Ledger Seal Digest Foundation** — Checkpoint 위에 얹는 주기적 **Seal**의 digest 기반. Digest Purpose=`SEAL_FOUNDATION`(§23 Envelope). Registry(§7)는 `seal(foundation) support`를 데이터로 선언한다.

원칙 계약(§5.2·§6·§37 파생): ★**이번 단계는 Seal의 digest foundation만 구축하고, Signature/PKI 서명은 후속 EPIC이다**(§5.2 Digest ≠ Digital Signature). Seal은 Checkpoint(§37)가 형성한 범위 대표 digest 위에서, 특정 시점까지의 원장 상태를 하나의 봉인 digest로 고정하는 상위 계층이다. 서명·타임스탬프 권위(TSA)·PKI는 §84 명령에 따라 후속 단계로 분리하며, 이번 회차는 Seal이 결합할 digest 구조(Checkpoint chain 위 seal digest)만 정의한다.

## 2. 기존 구현 대조

- **Seal Aggregate·Seal Digest = ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — seal support·seal digest 0히트. 주기적 봉인 계층 없음.
- **Seal이 얹을 Checkpoint도 ABSENT**: `ledger_checkpoint` 0히트(GROUND_TRUTH §1) → Seal foundation의 기반인 Checkpoint 자체가 부재. 실존 `SecurityAudit`(GROUND_TRUTH #7)은 entry 단위 체인만 제공하고 범위 Checkpoint·Seal 계층 없음.
- **Signature/PKI substrate**: `Crypto.php:98-99` HMAC-SHA256(purpose-bound 토큰)·`NaverSms.php:94` HMAC(벤더 서명)은 digest/MAC이며 §5.2 의미의 Digital Signature/PKI가 아님 — Seal 서명은 후속 EPIC 대상이므로 이번 판정 범위 밖.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: Seal foundation의 기반인 Checkpoint(§37)와 그 아래 Entry Sequence가 선행 §3.1 부재로 ABSENT → Seal이 봉인할 대상 없음. 서명·PKI는 명시적으로 후속 EPIC(§5.2·§84) — 이번은 digest foundation만.
- cover: **0** (Seal Digest Foundation Envelope·Checkpoint 위 seal digest 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Seal Foundation Envelope(purpose=`SEAL_FOUNDATION`). Checkpoint chain(§37) 위에서 주기적 Seal digest를 산출하는 구조만 정의 — previous checkpoint digest 집합 + seal 시점·정책 버전.
- **★서명 분리**: 이번 단계는 **digest foundation만**. Digital Signature/PKI/TSA는 후속 EPIC(§5.2·§84 "Digital Signature/PKI는 후속"). HMAC substrate(`Crypto.php:98-99`)를 Seal 서명으로 조기 전용 금지.
- **Golden Rule=Extend**: Seal digest 산출은 `SecurityAudit.php:56-68` verify + Checkpoint(§37) Merkle/Rolling 위에 조립. 신규 해시 엔진 신설 금지.
- **선행 필수**: §3.1 Ledger + Checkpoint Aggregate 실구현이 선행. 그 위에 Seal foundation, 그 다음 후속 EPIC에서 Signature — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_CHECKPOINT_DIGEST]] · [[DSAR_APPROVAL_DECISION_LEDGER_SEAL_FOUNDATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

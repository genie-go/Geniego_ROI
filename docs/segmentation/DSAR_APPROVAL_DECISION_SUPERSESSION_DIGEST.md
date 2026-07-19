# DSAR — Decision Supersession Digest (06-A-03-02-03-02 · §35)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§35 Supersession Digest** — 결정 대체(supersession)의 Digest. 필수 Canonical 입력:
- `superseded decision/entry id + digest`(대체당한 결정/Entry와 그 digest)
- `superseding decision/entry id`(대체하는 결정/Entry)
- `reason`
- `policy version`
- `authorized actor`
- `effective_at` / `recorded_at`(Trusted Time·UTC)

원칙 계약(§35·§43·§44 파생): Supersession은 이전 결정을 **삭제하지 않고** 새 결정이 대체함을 append-only로 봉인한다. superseded/superseding 양측 entry id+digest를 결합하여 대체 계보를 증명. §43 Reference Verification에서 Supersession ↔ Target Entry 검증, §44 `SUPERSESSION_TARGET_CHANGED`가 tamper 유형. Digest Purpose=`SUPERSESSION`(§23).

## 2. 기존 구현 대조

- **Supersession Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — `ledger_supersession` CREATE/ensureTables 0히트. 대체 관계를 superseded+superseding digest로 봉인하는 레코드 없음.
- **실 승인 경로는 상태 덮어쓰기**: 결정 재승인/철회가 단일 UPDATE로 status를 뒤집을 뿐, 이전 결정을 보존한 채 대체를 증명하는 Supersession digest 부재. `journey_decision_log` in-place UPDATE(GROUND_TRUTH §3·`JourneyBuilder.php:1192`)도 append-only 아님.
- **digest primitive만 PRESENT**: `Crypto.php:81` SHA-256·`SecurityAudit.php:56-68` verify. Canonical Projection ABSENT(GROUND_TRUTH §4).

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Ledger Supersession)가 선행 §3.1 부재로 ABSENT → 대체 양측 entry·digest 참조 대상 없음.
- cover: **0** (Supersession Digest Envelope·superseded/superseding 결합·policy version 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Supersession Field Set(§14 Aggregate Type=SUPERSESSION) + Envelope(purpose=`SUPERSESSION`). superseded/superseding entry id+digest·reason·policy version·authorized actor를 Canonical Projection.
- **비파괴 대체**: 이전 결정 in-place 수정·삭제 금지 — 새 Supersession 레코드 추가로 대체 봉인. `SecurityAudit.php:56-68` verify 패턴 확장, preimage는 §13 Canonical JSON 선적용.
- **선행 필수**: §3.1 Ledger Supersession Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_SUPERSESSION]] · [[DSAR_APPROVAL_DECISION_CORRECTION_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

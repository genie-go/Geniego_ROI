# DSAR — Decision Correction Digest (06-A-03-02-03-02 · §34)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§34 Correction Digest** — Correction 행위(원장 정정)의 Digest. 필수 Canonical 입력:
- `target entry id + digest`(정정 대상 Entry와 그 digest)
- `correction type`
- `corrected field paths`
- `previous value digest` / `corrected value digest`(값 원문이 아닌 digest)
- `reason`
- `requested actor` / `authorized actor`
- `approval ref`
- `effective_at` / `recorded_at`(Trusted Time·UTC)

원칙 계약(§34·§43·§44 파생): Correction은 **append-only** — 대상 Entry를 in-place 수정하지 않고, target entry id+digest를 참조하는 새 Correction 레코드를 추가하며 그 Digest가 정정 계보를 봉인한다. §43 Reference Verification에서 Correction ↔ Target Entry 참조 무결 검증, §44 `CORRECTION_TARGET_CHANGED`가 tamper 유형. Digest Purpose=`CORRECTION`(§23).

## 2. 기존 구현 대조

- **Correction Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — `ledger_correction` CREATE/ensureTables 0히트. 정정을 append-only로 봉인하는 Correction 레코드·digest 없음.
- **★장식 오인 금지 — in-place UPDATE는 Correction이 아니다.** GROUND_TRUTH §3: `journey_decision_log`(`JourneyBuilder.php:1192`)는 in-place UPDATE·append-only 아님 → 정정 계보 봉인 불가(가짜녹색). 결정 도메인의 실 승인 정정도 단일 UPDATE로 상태를 덮을 뿐 previous/corrected value digest를 남기지 않음.
- **digest primitive만 PRESENT**: `Crypto.php:81` SHA-256·`SecurityAudit.php:56-68` verify 패턴. Canonical Projection 계층 ABSENT(GROUND_TRUTH §4).

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Ledger Correction)가 선행 §3.1 부재로 ABSENT → Correction Digest가 참조할 target entry·정정 레코드 없음. in-place UPDATE(journey_decision_log)는 append-only 정정 아님(장식).
- cover: **0** (Correction Digest Envelope·field path·previous/corrected value digest 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Correction Field Set(§14 Aggregate Type=CORRECTION) + Envelope(purpose=`CORRECTION`). target entry id+digest·corrected field paths·previous/corrected value digest·requested/authorized actor·approval ref를 Canonical Projection.
- **값은 digest만**: previous/corrected value 원문 대신 §15 Canonical Projection 위 value digest만 결합(§5.7 민감정보 비노출).
- **append-only 강제**: in-place UPDATE(journey_decision_log 패턴) 재사용 금지 — Correction은 새 레코드 추가 + §26 Entry Digest로 체인 연결. `SecurityAudit.php:56-68` verify 패턴 확장.
- **선행 필수**: §3.1 Ledger Correction Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_CORRECTION]] · [[DSAR_APPROVAL_DECISION_SUPERSESSION_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

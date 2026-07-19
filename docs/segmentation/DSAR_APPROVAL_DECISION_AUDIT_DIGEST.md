# DSAR — Decision Audit Digest (06-A-03-02-03-02 · §32)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§32 Audit Digest** — Audit Event Aggregate의 독립 Digest. 필수 Canonical 입력:
- `event type`
- `actor` · `target`
- `action`
- `correlation`(상관 ID) · `causation`(원인 ID)
- `occurred_at` / `recorded_at`(Trusted Time·UTC·precision 고정, §19)

원칙 계약(§5.12·§43 파생): Audit Event Digest는 Audit Aggregate의 Canonical Payload만 대상으로 하며, Tamper Detection 결과 자체도 Immutable로 기록되어야 한다(§5.12). Audit Digest는 §43 Reference Verification에서 Ledger Entry ↔ Audit Event 참조 무결을 검증하는 대상이다. Digest Purpose=`AUDIT`(§23).

## 2. 기존 구현 대조

- **Decision Audit Event Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.2 Decision Foundation ABSENT — decision audit event 테이블/클래스 0히트. 결정 도메인 감사 이벤트를 digest로 고정할 원본 없음.
- **★관심사 분리 — SecurityAudit는 감사 트레일이지 Entry가 아니다.** `SecurityAudit`(GROUND_TRUTH #2·#7)는 유일 실 append-only 해시체인(SHA-256 `SecurityAudit.php:27`·재계산 verify `SecurityAudit.php:56-68`·GENESIS `SecurityAudit.php:39-40`·`hash_equals` `SecurityAudit.php:63-64`·배선 `AdminGrowth.php:1429`)이다. 이는 Audit **패턴**의 CANONICAL 참조로 재사용하되, 결정 Ledger Entry Digest(§26)와는 **층위가 다르다**(감사트레일 ≠ entry). 즉 Audit Digest는 SecurityAudit 패턴을 참조하나 Entry Digest를 대체·혼용하지 않는다.
- **그러나 SecurityAudit조차 Canonicalization 부재**(GROUND_TRUTH §0.2·§5.1): preimage=raw `|`-concat + `json_encode(details,UNESCAPED_UNICODE)`(ksort/NFC/Decimal/Timestamp-precision 정규화 없음) → §5.3/§5.4 위반. Audit Digest 이식 시 Canonical Projection 보강 필수.
- **fail-open 위험**: `SecurityAudit.php:32` catch no-op(체인 silent reset)·verify에 tenant 술어 없음(GROUND_TRUTH §5.2·§5.4).

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Decision Audit Event)가 선행 §3.2 부재로 ABSENT. SecurityAudit 감사 체인 패턴만 PRESENT(참조용·KEEP_SEPARATE, 감사트레일 ≠ entry).
- cover: **0** (결정 도메인 Audit Digest Envelope·Field Set·correlation/causation Canonical 규약 전무. SecurityAudit는 감사 패턴 참조이지 Audit Digest 구현 아님).

## 4. 확장·구현 방향 (설계)

- **순신규** Audit Field Set(§14 Aggregate Type=AUDIT) + Envelope(purpose=`AUDIT`). event type·actor·target·action·correlation·causation·occurred/recorded_at를 §22 Stable Identifier로 참조.
- **Golden Rule=Extend·관심사 분리**: `SecurityAudit.php:56-68` 재계산-verify + `SecurityAudit.php:39-40` Versioned Genesis 패턴을 CANONICAL로 재사용하되, Audit Digest는 감사 트레일 계층으로 유지하고 Ledger Entry Digest(§26)와 혼용 금지. preimage는 §13 Canonical JSON 선적용.
- **개선(무후퇴 예외)**: 이식 시 `SecurityAudit.php:32` fail-open을 fail-closed로, verify에 `WHERE tenant_id=?` 술어 추가(§5.13 Tenant Binding).
- **선행 필수**: §3.2 Decision Audit Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_AUDIT_FOUNDATION]] · [[reference_menu_audit_log_not_tamper_evident]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

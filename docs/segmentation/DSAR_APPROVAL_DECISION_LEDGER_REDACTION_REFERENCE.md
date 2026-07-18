# DSAR — Ledger Redaction Reference (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_REDACTION_REFERENCE(§35)** 필수 필드:
- target entry · target field references · redaction reason · legal basis · requested by · authorized by · redaction method reference · retained digest foundation · redacted payload location reference · effective time · audit event.
- ★핵심: **Sequence 유지**(§28 논리삭제 — Entry ID/Sequence/Entry Type/Reference/Recorded Time/무결성 Metadata 보존) · 실 Crypto Redaction Proof는 **후속**. Redaction은 Payload의 특정 Field만 REDACTED_REFERENCE 처리하되 무결성 뼈대는 남긴다.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Redaction Reference Entry | **ABSENT** | decision_ledger·redaction Entry 0 |
| Field 단위 REDACTED_REFERENCE + Sequence 유지 | **ABSENT** | Ledger Entry/Sequence 자체 부재 — 보존할 Sequence 뼈대 없음 |
| retained digest foundation | **ABSENT(substrate만)** | SHA-256 3개소(MediaHost `:93`·Migrate `:50`·SecurityAudit `:27`)는 실재하나 redaction 후 잔존 digest 산출에 미배선 |
| **DSAR ANONYMIZE(PII 전용) 참조** | **구분 대상** | DSAR/Compliance의 PII 익명화(`Compliance.php:162` SecurityAudit 배선 맥락)는 **개인정보 원본 익명화**이지 **Ledger Entry Field Redaction Reference가 아님** — 목적·대상·불변성 규약 상이. 혼동 금지 |
| redacted payload location reference | **ABSENT** | MediaHost CAS(`:88-90,93-96,100-102,211`)가 payload 격리저장 substrate이나 redaction 재배치에 미배선 |

## 3. 판정
- **Verdict**: **ABSENT** (Ledger Entry Field Redaction 기준). DSAR PII ANONYMIZE는 별개 개념 — Ledger Redaction Reference로 오인·재사용 금지.
- **선행 의존**: §3.1 Decision Core + Immutable Ledger Entry(Sequence 포함) 부재 → **BLOCKED_PREREQUISITE**.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: 불변 Ledger Entry + Sequence 인프라 신설 후에만 Field 단위 Redaction Reference 성립.
- **재사용 substrate**: MediaHost CAS Evidence Store(`:88-90,93-96,100-102,211`)로 redacted payload 격리 위치 참조 · SHA-256(`:93`)로 retained digest · SecurityAudit(`:48-52`) audit event 연동.
- **DSAR PII 경로와 경계**: DSAR ANONYMIZE(Compliance PII)는 유지하되 Ledger Redaction Reference는 별도 신규 — 두 경로가 동일 Entry를 이중으로 건드리지 않도록 SoT 분리(중복 인텔리전스 금지 원칙).
- **순신규**: target field references · legal basis · redaction method reference · REDACTS_REFERENCE Link(§23) · §28 REDACTED_REFERENCE 상태(Sequence/Entry Type/Recorded Time/무결성 Metadata 보존). 실 Crypto Redaction Proof는 후속.
- **무후퇴/실위험**: Redaction은 **Sequence·무결성 Metadata 삭제 금지**(§35). Legal Hold(§37) 중에는 Redaction 차단. `media_gc_cron.php:35,43` 물리삭제와 충돌 방지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_LEGAL_HOLD_BINDING]] · [[DSAR_APPROVAL_DECISION_LEDGER_RETENTION_BINDING]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

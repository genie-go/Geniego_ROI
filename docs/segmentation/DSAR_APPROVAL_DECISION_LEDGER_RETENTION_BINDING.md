# DSAR — Ledger Retention Binding (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_RETENTION_BINDING(§36)** 필수 필드:
- retention action id · tenant id · ledger id · target entry id · retention policy id · retention class · retention start · retention end · legal basis · payload retention state · metadata retention state · legal hold check · action type · authorized by · executed_at · retained digest foundation · tombstone reference · status · evidence.
- **ACTION_TYPE**: RETAIN · ARCHIVE · RESTRICT_ACCESS · REMOVE_NONESSENTIAL_PAYLOAD · REDACT_REFERENCE · EXTEND_RETENTION · LEGAL_HOLD_OVERRIDE · NO_ACTION · CUSTOM.
- ★핵심: **Sequence / 필수 무결성 Metadata 삭제 금지** · 모든 Retention Action은 **Legal Hold Check 선행**.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Retention Binding Entry / 정책 바인딩 | **ABSENT** | retention action id·retention policy 바인딩 Entry 0 |
| **물리 삭제 크론(상충)** | **PRESENT(역행)** | `media_gc_cron.php:35,43` = append-only 감사로그를 **90일 후 물리 DELETE** — 불변성·Retention Metadata 보존 원칙과 정면 상충·Legal Hold 예외 없음 |
| Retention 정책 신뢰상태 | **PARTIAL(미검증)** | `DataPlatform.php:300` retention 관련 **verified:false** — 정책이 신뢰검증 통과 못한 상태 |
| Legal Hold Check 선행 | **ABSENT** | legal_hold 0(§37) — Retention Action이 참조할 Hold 상태 없음 |
| retained digest / tombstone | **ABSENT(substrate만)** | SHA-256(MediaHost `:93`·SecurityAudit `:27`)·MediaHost CAS(`:88-90,100-102`) 실재하나 tombstone/retained digest 미배선 |
| Sequence 보존 대상 | **ABSENT** | Ledger Sequence 자체 부재 |

## 3. 판정
- **Verdict**: **PARTIAL** — Retention **집행 메커니즘은 실재하나(물리 삭제 크론) 방향이 역행**이고, 정책은 미검증(verified:false). 불변성 보존형 Retention Binding은 부재.
- **선행 의존**: Immutable Ledger Entry/Sequence + Legal Hold(§37) 부재 → 완전 구현은 **BLOCKED_PREREQUISITE**. 단 실 위험(물리삭제)은 즉시 존재.
- **cover**: media_gc 물리삭제(`media_gc_cron.php:35,43`)·DataPlatform(`DataPlatform.php:300` verified:false) — 존재하나 **개선 대상**(불변성 상충).

## 4. 확장/구현 방향 (설계)
- **선행 필수**: Immutable Ledger Entry/Sequence + Legal Hold Binding(§37) 신설. Retention Action은 **Legal Hold Check 통과 후에만** 집행.
- **재사용 substrate**: MediaHost CAS(`:88-90,93-96,100-102,211`)로 payload archive/tombstone 참조 · SHA-256(`:93`)로 retained digest · SecurityAudit(`:48-52`) audit event.
- **★실 위험 최우선 시정**: `media_gc_cron.php:35,43`의 **감사로그 90일 물리 DELETE는 Retention Binding으로 대체**되어야 함 — 물리삭제 대신 ARCHIVE/REMOVE_NONESSENTIAL_PAYLOAD + Sequence·무결성 Metadata 보존, Legal Hold 예외 강제. 이는 무후퇴 예외(=개선). Ledger Row는 Retention 대상에서 **물리삭제 제외**.
- **순신규**: ACTION_TYPE 9종 · retention class · payload/metadata retention state 분리 · tombstone reference · verified:true 신뢰검증 통과 정책만 집행.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_LEGAL_HOLD_BINDING]] · [[DSAR_APPROVAL_DECISION_LEDGER_REDACTION_REFERENCE]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

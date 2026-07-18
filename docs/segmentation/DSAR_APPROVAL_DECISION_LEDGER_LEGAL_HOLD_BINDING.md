# DSAR — Ledger Legal Hold Binding (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_LEGAL_HOLD_BINDING(§37)** 필수 필드:
- binding id · tenant id · ledger id · partition id · target entry id · approval case id · resource id · legal hold id · hold reason · hold authority · hold start · hold end · release reference · retention override · deletion prohibited · access restriction · status · evidence.
- ★핵심: **Hold 중** Payload 삭제 · Redaction · Archive Purge · Partition Drop · Ledger Truncate · Migration Source 제거 · Evidence 제거 **전면 차단**. Legal Hold는 Retention/Redaction보다 우선.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Legal Hold Binding 테이블/Entry | **ABSENT** | `legal_hold` 0 — 개념·테이블 전무 |
| Hold 중 삭제/Redaction/Purge 차단 | **ABSENT** | Hold 상태 자체가 없어 차단 게이트 부재. 오히려 `media_gc_cron.php:35,43`이 **Legal Hold 예외 없이** 감사로그 90일 물리 DELETE |
| Hold 대상 불변 Entry/Partition | **ABSENT** | Immutable Ledger Entry/Partition 부재 |
| retention override / deletion prohibited | **ABSENT** | override·금지 플래그 0 |
| release reference | **ABSENT** | 해제 참조 개념 없음 |
| DB 레벨 삭제 방지 | **ABSENT** | Trigger/RLS/Permission 전무 — Application Role UPDATE/DELETE 가능 |

## 3. 판정
- **Verdict**: **ABSENT** (`legal_hold` 0).
- **선행 의존**: Immutable Ledger Entry/Partition + Retention Binding(§36) 부재 → **BLOCKED_PREREQUISITE**. 나아가 §3.1 Decision Core ABSENT로 Hold 대상 불변 Record 자체 부재.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: Immutable Ledger Entry/Partition/Sequence + Retention Binding(§36) 신설 후 Legal Hold가 이들 위에 override 계층으로 성립.
- **재사용 substrate**: SecurityAudit(`:48-52`) audit event로 Hold 설정/해제 기록 · 트랜잭션 경계(`Omnichannel.php:404-415`)로 Binding 원자 적용 · 서버UTC(`Db.php:438`·`SecurityAudit.php:24`)로 hold start/end.
- **★실 위험 최우선 시정**: `media_gc_cron.php:35,43` 물리 DELETE는 **Legal Hold Check를 반드시 선행**해야 함 — Hold 중 Entry는 물리삭제·Redaction·Archive Purge·Partition Drop **전면 차단**. 현재 예외가 전무하므로 Hold 도입 시 이 크론이 최우선 게이트 대상.
- **순신규**: legal hold id · hold reason/authority · retention override · deletion prohibited · access restriction · release reference · Retention/Redaction 대비 **우선순위 강제**(Legal Hold > Retention > Redaction). DB 레벨 삭제 방지(Trigger/RLS/Permission) 병행 도입.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_RETENTION_BINDING]] · [[DSAR_APPROVAL_DECISION_LEDGER_REDACTION_REFERENCE]] · [[DSAR_APPROVAL_DECISION_LEDGER_VOID_REFERENCE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

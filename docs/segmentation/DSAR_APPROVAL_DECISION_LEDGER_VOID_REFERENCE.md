# DSAR — Ledger Void Reference (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_VOID_REFERENCE(§34)**:
- **Void Reason**: DUPLICATE_COMMIT · INVALID_ACTOR · INVALID_AUTHORITY · INVALID_DELEGATION · SYSTEM_DEFECT · MIGRATION_ERROR · LEGAL_INVALIDITY · FRAUD_CONFIRMED_REFERENCE · ADMINISTRATIVE_ERROR · CUSTOM.
- ★핵심: **원본 삭제 금지** · 권한 + **별도 승인 Reference** 필수. Void는 "이 Entry는 성립하지 않는다"를 새 Entry(VOIDS_REFERENCE Link, §23)로 선언하되 원본은 VOIDED_REFERENCE 상태로 논리 보존(§28).

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Void Reference Entry / Reason enum | **ABSENT** | decision_ledger·void Entry 0·10종 Reason 없음 |
| 원본 보존 + Void 선언 | **ABSENT** | 무효 처리 시 `Mapping.php:285-289,327` status in-place UPDATE — VOIDED_REFERENCE 보존 없이 덮어쓰기 |
| Void 대상 불변 Entry | **ABSENT** | §3.1 Decision Core ABSENT(테이블 `Db.php:623,655`) |
| DUPLICATE_COMMIT 탐지 근거 | **PARTIAL** | 중복 방지 substrate=paddle_events UNIQUE(`Paddle.php:108,146,343-368`)로 Inbox dedup만·Decision Commit 중복탐지 미배선 |
| 권한 + 별도 승인 Reference | **ABSENT** | Void 승인 게이트 0 |
| VOIDS_REFERENCE Link(§23) | **ABSENT** | 역참조 Link 타입 없음 |

## 3. 판정
- **Verdict**: **ABSENT**.
- **선행 의존**: §3.1 Decision Core + Immutable Ledger Entry + Link 부재 → **BLOCKED_PREREQUISITE**.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: 불변 Decision Record + Ledger Entry + Link 신설. `Mapping.php:288` in-place UPDATE 종료가 전제.
- **재사용 substrate**: paddle_events UNIQUE(`Paddle.php:108,146,343-368`) 패턴을 Decision Commit 중복탐지(DUPLICATE_COMMIT Void 근거)로 확장 · SecurityAudit prev_hash Link(`:27,39`) 확장 · 트랜잭션 경계(`Omnichannel.php:404-415`) 원자 Append.
- **순신규**: Void Reason enum 10종 · VOIDS_REFERENCE Link · 권한+별도 승인 Reference 게이트 · §28 VOIDED_REFERENCE 상태 보존.
- **무후퇴/실위험**: Void는 **원본 삭제가 아님**(§56 Critical — 원본 삭제·Status 덮어쓰기 금지). `media_gc_cron.php:35,43` 물리삭제가 voided 원본을 90일 후 소거하면 무효 근거 소실 → 물리삭제 예외. FRAUD/LEGAL_INVALIDITY Void는 Legal Hold(§37) 연동 필요.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_REVERSAL_REFERENCE]] · [[DSAR_APPROVAL_DECISION_LEDGER_LEGAL_HOLD_BINDING]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

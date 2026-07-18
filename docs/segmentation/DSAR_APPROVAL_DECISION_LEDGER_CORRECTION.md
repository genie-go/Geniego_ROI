# DSAR — Ledger Correction (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_CORRECTION(§29)** 필수 필드:
- correction id · tenant id · target ledger entry id · target decision record id · correction type · reason code · explanation · corrected field references · previous value digest foundation · corrected value digest foundation · requested by · authorized by · approval reference · effective_at · recorded_at · correction ledger entry id · status · evidence.
- **TYPE**: DATA_ENTRY · METADATA · ACTOR_REFERENCE · REASON_REFERENCE · COMMENT_CLASSIFICATION · ATTACHMENT_REFERENCE · TIMESTAMP_METADATA_CORRECTION · MIGRATION_CORRECTION · ADMINISTRATIVE_AMENDMENT · CUSTOM.
- **원칙(§30)**: 원본 Entry/Record 수정 금지 · 새 Entry로만 기록 · 사유 필수 · 대상 Field 명시 · 이전/새 Digest 필수 · 권한 Actor 필수 · 고위험은 별도 승인 · Correction Chain 유지 · Correction의 Correction도 새 Entry · Circular Link 차단 · Cross-Tenant 차단.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Correction Entry 테이블/타입 | **ABSENT** | decision_ledger·correction Entry 0. 정정 개념 자체가 코드에 없음 |
| 원본 불변 + 새 Entry 정정 | **ABSENT(역행)** | 유일 승인 정정 경로=Mapping approvals_json 배열 append + status **in-place UPDATE**(`Mapping.php:285-289,327`)·과거 값 소실 → "이전 값 digest" 보존 대상조차 없음 |
| Correction 대상 불변 Record | **ABSENT** | §3.1 Decision Core ABSENT(`approval_decision` 0·테이블 `Db.php:623,655`) — 정정할 불변 Decision Record 로우 부재 |
| Previous/Corrected value digest | **ABSENT** | SHA-256 substrate는 실재(MediaHost `:93`·Migrate `:50`·SecurityAudit `:27`)하나 값 digest 정정 산출에 미배선 |
| Correction Chain / Circular 차단 | **ABSENT** | Ledger Link(prev)는 SecurityAudit prev_hash(`:27,39`)에만 존재하나 감사 트레일이지 정정 체인 아님 |
| 권한 Actor / 별도 승인 | **ABSENT** | 정정 자체가 없어 승인 게이트 대상 없음 |

## 3. 판정
- **Verdict**: **ABSENT** (역행 신호 동반 — 정정이 새 Entry가 아니라 in-place 덮어쓰기).
- **선행 의존**: §3.1 Decision Core / §3.3 Runtime **전부 ABSENT** → 정정할 불변 Decision Record가 없어 Correction Entry는 **BLOCKED_PREREQUISITE**.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: Decision Core(불변 Decision Record/Commit) + Immutable Ledger Entry 신설 후에만 Correction Entry가 성립. 현재 `Mapping.php:288`의 in-place UPDATE를 append-only Entry로 전환하는 것이 전제.
- **재사용 substrate**: SecurityAudit append-only+verify 패턴(`SecurityAudit.php:48-52,56-68`·CANONICAL·KEEP_SEPARATE 확장) · SHA-256 3개소로 previous/corrected value digest 산출 · 트랜잭션 경계(`Omnichannel.php:404-415`)로 「원본 Entry 불변 + Correction Entry Append + Head 갱신」 원자화.
- **순신규**: Correction Entry 타입 10종 · Correction Chain · Circular Link 차단 · Cross-Tenant 차단 · 고위험 정정 별도 승인 게이트.
- **무후퇴/실위험**: 정정은 **절대 원본 UPDATE/DELETE 금지**(§30). DB 레벨 불변강제(Trigger/RLS/Permission) 전무이므로 Application Role UPDATE 봉쇄 병행. `media_gc_cron.php:35,43` 물리 DELETE가 Correction Chain 소급 파괴 창 — 정정 대상 Entry는 물리삭제 예외 처리 필수.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

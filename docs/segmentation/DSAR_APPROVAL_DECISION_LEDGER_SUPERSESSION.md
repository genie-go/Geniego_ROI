# DSAR — Ledger Supersession (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_SUPERSESSION(§32)** 필수 필드:
- superseded decision record · superseding decision record · superseded ledger entry · superseding ledger entry · reason · policy version · authorized actor · effective time · recorded time · downstream impact reference.
- ★핵심: **원본 삭제 금지 · Status 덮어쓰기 금지** — 대체는 새 Decision Record + Supersession Entry로만 표현, 원본은 SUPERSEDED_REFERENCE 상태로 논리 보존(§28 LOGICAL_DELETION_GOVERNANCE).
- Mandatory Reference(§18): supersession target · new decision record · reason · actor · policy version — 누락 시 Append 차단.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Supersession Entry 타입 | **ABSENT** | decision_ledger·supersession Entry 0 |
| 원본 보존 + 대체 Entry | **ABSENT(역행)** | 재승인/변경 시 `Mapping.php:285-289,327`에서 status **in-place UPDATE**·approvals_json 배열 덮어쓰기 → 이전 결정 소실. 원본 SUPERSEDED_REFERENCE 보존 경로 없음 |
| Superseded/Superseding Record | **ABSENT** | §3.1 Decision Core ABSENT(`approval_decision` 0·테이블 `Db.php:623,655`) — 대체 대상/신규 불변 Record 부재 |
| downstream impact reference | **ABSENT** | 영향 전파 참조 개념 없음 |
| Mandatory Reference 강제 | **ABSENT** | Reference Matrix(§18) 부재·Append 차단 게이트 없음 |
| 논리삭제 거버넌스(§28) | **ABSENT** | SUPERSEDED_REFERENCE 등 상태 보존 규약 0 |

## 3. 판정
- **Verdict**: **ABSENT** (역행 신호 — 대체가 in-place 덮어쓰기).
- **선행 의존**: §3.1 Decision Core + Immutable Ledger Entry + Reference Matrix 부재 → **BLOCKED_PREREQUISITE**.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: 불변 Decision Record + Ledger Entry 신설, 그리고 `Mapping.php:288` in-place UPDATE를 「원본 보존 + Superseding Record + Supersession Entry Append」로 전환.
- **재사용 substrate**: SecurityAudit append-only+verify(`SecurityAudit.php:48-52,56-68`) · 트랜잭션 경계(`Omnichannel.php:404-415`)로 「Superseding Record 삽입 + Supersession Entry Append + 원본 SUPERSEDED_REFERENCE 표시 + Head 갱신」 원자화 · Fencing/CAS는 순신규.
- **순신규**: Supersession Entry 타입 · Mandatory Reference(§18) 5종 검증(누락 시 Append 차단) · downstream impact reference · §28 논리삭제 상태 보존.
- **무후퇴/실위험**: 원본 **삭제·Status 덮어쓰기 절대 금지**. DB 불변강제 전무 + `media_gc_cron.php:35,43` 물리삭제가 superseded 원본까지 90일 후 소거할 위험 → superseded Entry는 물리삭제 예외.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_AMENDMENT]] · [[DSAR_APPROVAL_DECISION_LEDGER_REVERSAL_REFERENCE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

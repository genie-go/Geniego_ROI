# DSAR — Ledger Amendment (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_AMENDMENT(§31)**: 비핵심 **보충정보 추가** 전용 — 설명 · 증빙 Reference · 분류 보완 · 외부 Reference · Legal Note · Audit Annotation을 **새 Entry**로 부가.
- ★핵심 제약: **Action / Actor / Amount / Currency / Authority / Outcome 변경 금지** → 이런 변경은 반드시 Supersession(§32) 또는 Reversal(§33)로만.
- 원본 Entry/Record는 불변 유지, Amendment Entry는 Append-only Contract(§24 `appendAmendment`)로만 기록.

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Amendment Entry 타입 | **ABSENT** | decision_ledger·amendment Entry 0 |
| 보충정보 append(원본 불변) | **ABSENT** | 유일 승인 경로 `Mapping.php:285-289,327`=배열 append + status in-place UPDATE. 보충정보를 원본 옆 별도 불변 Entry로 부가하는 경로 없음 |
| Amendment 대상 불변 Record | **ABSENT** | §3.1 Decision Core ABSENT(테이블 `Db.php:623,655`) — 부가 대상 불변 Record 부재 |
| 핵심필드 변경 차단(→Supersession) | **ABSENT** | Amendment/Supersession 구분 자체 없음. 현재는 무구분 in-place 덮어쓰기라 핵심필드(Actor/Outcome)도 그대로 UPDATE 됨(`Mapping.php:288`) |
| append-only 관례 substrate | **PARTIAL** | pm_audit_log(`PM/Shared.php:129-148`)·audit_log(`Db.php:434-440,540-546`)=append-only 관례이나 해시/verify 없음·부가 Annotation 개념 아님(§61 CONSOLIDATION) |

## 3. 판정
- **Verdict**: **ABSENT**.
- **선행 의존**: §3.1 Decision Core + Immutable Ledger Entry 부재 → 부가할 원본 Entry가 없어 **BLOCKED_PREREQUISITE**.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: Decision Core + Immutable Ledger Entry 신설 후 Amendment는 「원본 불변 + Amendment Entry Append」로 성립.
- **재사용 substrate**: SecurityAudit append-only 패턴(`SecurityAudit.php:48-52`) · MediaHost CAS Evidence Store(`:88-90,93-96,100-102,211`)로 증빙 Reference/첨부의 내용주소 고정 · SHA-256(`:93`)로 Annotation digest.
- **순신규**: Amendment Entry 타입 · **핵심필드(Action/Actor/Amount/Currency/Authority/Outcome) 변경 시도 → Amendment 거부 + Supersession/Reversal 라우팅** 게이트가 핵심 안전장치.
- **무후퇴/실위험**: Amendment는 보충만, 핵심 변경은 반드시 Supersession/Reversal로. 현행 in-place UPDATE가 이 경계를 지우고 있으므로 append-only 전환이 전제. `media_gc_cron.php:35,43` 물리삭제는 Amendment Chain 대상 제외.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_SUPERSESSION]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

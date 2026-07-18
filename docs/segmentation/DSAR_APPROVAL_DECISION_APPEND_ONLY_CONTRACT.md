# DSAR — Append-Only Contract (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**APPEND_ONLY_CONTRACT(§24)**

허용(append/read/verify 전용):
- appendEntry · appendCorrection · appendAmendment · appendSupersession
- appendReversalReference · appendVoidReference · appendRedactionReference
- appendRetentionAction · appendLegalHoldAction
- readEntry · readStream · readHead · verifySequence · reconstruct · reconcile

금지(변형·삭제):
- updateEntry · deleteEntry · saveOrUpdate · upsertEntry · replaceEntry · patchEntry
- bulkUpdateEntry · truncateLedger · resequenceLedger · resetHeadWithoutRecovery · overwritePayload

## 2. 기존 구현 대조

- **부분 실재(PARTIAL) — 관례적 append-only, DB 강제 없음.**
- **실 append-only 준수 자산**: `SecurityAudit.php`(security_audit_log `:48-52`)는 **INSERT/SELECT만**(UPDATE/DELETE 코드 0 · `:8`) → 허용 메서드(append*·read*·verify)에 부합하는 유일 실 사례. verify(`:56-68`)=verifySequence 대응.
- **관례적(강제 아님)**: `audit_log`(`Db.php:434-440,540-546`) · `pm_audit_log`(`PM/Shared.php:129-148`) = append-only **관례**일 뿐 해시/verify/DB 제약 없음 → 금지 메서드(update/delete)를 코드가 물리적으로 막지 않음.
- **금지 위반 실존**: 승인 결정은 in-place UPDATE(`Mapping.php:285-289,327`) · `journey_decision_log` in-place UPDATE(`JourneyBuilder.php:60,74,1192`) → §24 관점에선 upsert/overwritePayload 에 해당하는 반(反)append-only 패턴이 운영 중.
- **DB 강제 전무**: §GROUND_TRUTH "SecurityAudit/pm_audit_log 관례적·**DB강제 없음**" · DB 불변강제(Trigger/RLS/Permission) 전무 → Application Role 이 UPDATE/DELETE 가능.

## 3. 판정
- Verdict: **PARTIAL** (SecurityAudit `:8,:48-52,:56-68` 이 append/read/verify 계약을 코드로 준수 · audit_log/pm_audit_log 는 관례만 · DB 강제 없음 · Mapping/journey 는 금지 패턴 실사용)
- 선행 의존: 범용 Ledger append* 표면은 §3.1 Decision Core ABSENT 로 기록 대상 부재 → **BLOCKED_PREREQUISITE**
- cover: **관례+SecurityAudit 코드 계약** — `SecurityAudit.php:8,48-52,56-68` (DB 강제=0)

## 4. 확장/구현 방향 (설계)

- **재사용·CANONICAL**: SecurityAudit INSERT/SELECT-only + verify 패턴(`:8,:48-52,:56-68`)을 Append-Only Repository 계약의 정본으로 승격·확장.
- **CONSOLIDATION**: `audit_log`(`Db.php:434-440`)·`pm_audit_log`(`PM/Shared.php:129-148`)의 관례적 append-only 를 명시 계약(금지 메서드 미노출 Repository)으로 통합 — 관례를 코드/DB 강제로 승격.
- **순신규 계약 표면**: append*(Entry/Correction/Amendment/Supersession/Reversal/Void/Redaction/RetentionAction/LegalHoldAction) + read*(Entry/Stream/Head) + verifySequence/reconstruct/reconcile 만 노출. **update/delete/upsert/replace/patch/bulkUpdate/truncate/resequence/resetHead/overwrite 메서드 자체를 만들지 않음**(REPOSITORY_IMMUTABILITY_GUARD §26 연계).
- **다계층 강제**: 계약(§24) → Domain Guard(§25) → Repository Guard(§26) → Database Guard(§27, Trigger/RLS/Permission) 4계층. 애플리케이션 관례 단독은 불충분(현 상태의 근본 결함).
- **무후퇴/실위험**: 금지 메서드 도입 없이 확장. `media_gc_cron.php:35,43` 물리 DELETE 는 append-only 계약과 정면 상충 → 계약 도입 시 Retention/Legal Hold appendRetentionAction 경로로만 논리 삭제(§28), 물리 DELETE 는 Legal Hold 예외 게이트.
- **선행 요건**: 범용 append* 는 Decision Core(불변 Record) 신설 후 유효(BLOCKED_PREREQUISITE).

관련: [[DSAR_APPROVAL_DECISION_REPOSITORY_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_DATABASE_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

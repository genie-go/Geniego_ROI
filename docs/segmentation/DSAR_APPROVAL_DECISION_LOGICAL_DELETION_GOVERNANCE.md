# DSAR — Logical Deletion Governance (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LOGICAL_DELETION_GOVERNANCE(§28)**

논리 삭제 상태(물리 삭제 대체):
- HIDDEN_FROM_STANDARD_VIEW · ACCESS_RESTRICTED · REDACTED_REFERENCE
- RETENTION_PAYLOAD_REMOVED · LEGAL_HOLD · ARCHIVED
- SUPERSEDED · VOIDED_REFERENCE · REVERSED_REFERENCE

삭제해도 **반드시 유지되는 요소**:
- Entry ID · Ledger Sequence · Partition Sequence · Entry Type
- Reference · Recorded Time · Integrity Metadata Foundation
- Retention Action · Legal Basis · Audit

## 2. 기존 구현 대조

- **논리 삭제 거버넌스 부재(ABSENT).** §GROUND_TRUTH 개념별 판정: Logical Deletion/Retention/Legal Hold 계열 ABSENT(Legal Hold Binding "legal_hold 0").
- **오히려 물리 삭제가 실존**: ★`media_gc_cron.php:35,43` = append-only 감사로그 90일 **물리 DELETE**(Legal Hold 예외 없음) → §28 이 금지하는 "필수 무결성 Metadata·Sequence 삭제"가 실제로 발생. Entry ID/Sequence/Recorded Time 유지 없이 로우 자체를 소거.
- **Retention/Legal Hold binding 부재**: retention class·retention state·legal hold status 필드가 원장/감사 테이블에 없음(§GROUND_TRUTH Retention/Legal Hold ABSENT). `DataPlatform` 계열엔 verified:false 상태만.
- **SUPERSEDED/VOIDED/REVERSED 참조 부재**: 승인 결정은 supersession 참조 대신 in-place UPDATE(`Mapping.php:285-289,327`)로 과거 상태를 덮어써 소실 → 논리 삭제 상태 전이 자체가 없음.
- 선행 §3.1 Decision Core **ABSENT**(`approval_decision` 0) → 논리 삭제를 적용할 불변 Ledger Entry 대상 부재.

## 3. 판정
- Verdict: **ABSENT** (논리 삭제 거버넌스 전무 · 물리 DELETE 실존으로 원칙 정면 위반 · 선행 부재 → **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Decision Core / IMMUTABLE_LEDGER(§15) / LEDGER_ENTRY(§17) / Retention(§36) / Legal Hold(§37) ABSENT
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **원칙 전환(물리→논리)**: 삭제는 항상 상태 전이(HIDDEN/ACCESS_RESTRICTED/REDACTED_REFERENCE/RETENTION_PAYLOAD_REMOVED/LEGAL_HOLD/ARCHIVED/SUPERSEDED/VOIDED/REVERSED)로만. Payload 만 제거하더라도 Entry ID·Ledger/Partition Sequence·Entry Type·Reference·Recorded Time·Integrity Metadata·Retention Action·Legal Basis·Audit 는 **불변 유지**(단조 Sequence 보존 → Gap 탐지 유효).
- **★즉시 실위험 대응(별도 승인세션)**: `media_gc_cron.php:35,43` 물리 DELETE 를 논리 삭제(RETENTION_PAYLOAD_REMOVED/ARCHIVED)로 대체 — 로우/Sequence/Metadata 유지, payload 만 제거하고 retained digest 보존. Legal Hold 상태면 삭제 자체 차단.
- **재사용 substrate**: appendRetentionAction/appendLegalHoldAction(§24) 경로로 상태 전이를 append-only 기록 · SecurityAudit 감사(`:27,48-52`)로 삭제 결정 불변 기록 · SHA-256(`:27`) → retained/tombstone digest · 서버UTC(`Db.php:438`).
- **다계층 강제 연계**: 논리 삭제는 Database Guard(§27 Permission — 물리 DELETE 불가)·Repository Guard(§26 delete 미노출)와 결합해야 강제됨 — 애플리케이션 관례 단독 불충분(현 media_gc 가 그 반례).
- **무후퇴**: 기존 append 는 무회귀. 물리삭제 제거는 무후퇴 예외(개선). 실 전환은 Retention(§36)·Legal Hold(§37)·Redaction(§35) 신설과 함께 별도 승인세션.

관련: [[DSAR_APPROVAL_DECISION_DATABASE_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_APPEND_ONLY_CONTRACT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

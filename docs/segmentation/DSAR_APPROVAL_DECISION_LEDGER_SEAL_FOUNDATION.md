# DSAR — Ledger Seal Foundation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_SEAL_FOUNDATION(§22)** Seal 유형:
- PERIODIC
- CASE_CLOSURE
- WORKFLOW_COMPLETION
- LEGAL_HOLD
- RETENTION
- MIGRATION
- MANUAL_VERIFICATION_SEAL
- CUSTOM

범위 한정: **★이번 회차 = Metadata/관계(Seal 종류·대상 구간·정책 버전·생성 시각·검증 상태)만 정의** · **실 Digital Signature(암호 서명)=후속**. Seal 은 봉인 시점의 무결성 상태를 확정하는 메타데이터이며, 이번엔 서명 알고리즘/키관리(HSM/KMS)를 구현하지 않는다.

## 2. 기존 구현 대조

- **Seal Foundation 부재.** §GROUND_TRUTH 개념별 판정: Checkpoint/Seal 계열 전부 **ABSENT**.
- 봉인의 재료가 될 실 자산: `SecurityAudit.php`(security_audit_log `:48-52`) hash=sha256(prev|tenant|actor|action|details|created_at)(`:27`) · GENESIS(`:39`) · verify(`:56-68`). 그러나 이는 **연속 체인 검증**일 뿐 특정 시점을 "봉인"하는 Seal 로우/서명이 없다.
- Digital Signature 인프라 부재: SHA-256 3개소(MediaHost `:93` · Migrate `:50` · SecurityAudit `:27`)는 **해시**일 뿐 비대칭 서명(개인키 서명·공개키 검증)이 아니다 → 실 Seal 서명은 후속 정당.
- `schema_migrations.checksum`(`Migrate.php:50,63-64`) = 저장만·비교 미실행 → Seal 오인 금지.
- 선행 §3.1 Decision Core **ABSENT**(`approval_decision` 0) · Checkpoint(§21) ABSENT → 봉인할 구간(Checkpoint/Case Closure/Workflow Completion 경계)이 존재하지 않는다.

## 3. 판정
- Verdict: **ABSENT** (서명=후속 · 선행 부재 → **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Decision Core ABSENT · LEDGER_CHECKPOINT(§21) ABSENT · Approval Runtime(§3.3, sequential_instance 0) ABSENT → CASE_CLOSURE/WORKFLOW_COMPLETION Seal 트리거 부재
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **재사용 substrate**: SHA-256(SecurityAudit `:27`·MediaHost `:93`·Migrate `:50`) → seal digest foundation · 서버UTC(`Db.php:438`) → seal 생성 시각 · SecurityAudit prev_hash 체인 패턴(`:27,39,64`) → Seal 간 previous-seal 연결.
- **이번 회차 산출물(Metadata only)**: seal id·seal type(위 8종)·대상 ledger/partition·first/last included sequence 참조·checkpoint 참조·seal policy version·generated_at/by·verification status·evidence. **관계와 상태만** 정의하고 실 서명 필드는 "seal digest foundation"(해시 자리표시)까지만.
- **후속(별도 세션)**: 실 Digital Signature — 비대칭 키(KMS/HSM) 서명·공개키 검증·키 회전·서명 검증 체인. 이번 설계는 그 확장점(seal signature reference 슬롯)만 남긴다.
- **무후퇴**: Seal 은 Entry/Checkpoint 를 수정·삭제하지 않는 추가 봉인 계층. LEGAL_HOLD/RETENTION Seal 은 `media_gc_cron.php:35,43` 물리삭제와 상충 → Seal 존재 시 해당 구간 물리 DELETE 차단 게이트 필요.
- **선행 요건**: Decision Core + IMMUTABLE_LEDGER + LEDGER_CHECKPOINT 신설 선행. 미충족 시 BLOCKED_PREREQUISITE.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_CHECKPOINT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

# DSAR — Database Immutability Guard (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세. **★실 위험 문서.**

## 1. 원문 전사 (Canonical Contract)

**DATABASE_IMMUTABILITY_GUARD(§27)**:
- Ledger / Link / Record / History / Snapshot / Evidence / Audit 대상 **UPDATE·DELETE 금지**
- Application Role = INSERT·SELECT만
- Migration Role 분리
- Privileged Mutation Audit
- Update·Delete Attempt Alert
- Direct SQL Mutation Detection
- Unique Sequence / Decision Commit Entry / Decision Slot Commit / Tenant FK Constraint

강제 방식: Permission / Trigger / Rule / SP-only Insert / RLS / Append-only Extension / Temporal 보조. **★Trigger 단독 금지**(권한·제약 등 다계층 병행).

## 2. 기존 구현 대조

- **DB 레벨 불변강제 전무(ABSENT) — ★실 위험.** §GROUND_TRUTH ★실 위험: "DB 불변강제(**Trigger/RLS/Permission) 전무** — Application Role UPDATE/DELETE 가능".
- **Application/Migration Role 미분리**: `Db.php`(PDO 싱글턴, `.env` 직접 파싱)는 단일 DB 계정으로 접속 → 운영 코드와 마이그레이션이 동일 권한, INSERT/SELECT 로 제한된 append-only 롤이 없음.
- **UPDATE/DELETE 실존**: 승인 in-place UPDATE(`Mapping.php:285-289,327`) · `journey_decision_log` UPDATE(`JourneyBuilder.php:1192`) · ★**append-only 감사로그 90일 물리 DELETE**(`media_gc_cron.php:35,43`) — DB 가 이를 전혀 차단하지 않음.
- **Trigger/RLS/Temporal 부재**: no hits. SecurityAudit(`:8` INSERT/SELECT만)는 애플리케이션 관례일 뿐 DB 가 UPDATE/DELETE 를 물리 차단하지 않음 → root/운영롤 SQL 로 감사체인 재작성 가능(tamper 창).
- **Unique/FK 제약**: Ledger sequence unique·decision commit entry unique·tenant FK 제약 부재(§GROUND_TRUTH Optimistic Version/Gap Detection ABSENT · Ledger 테이블 자체 부재).

## 3. 판정
- Verdict: **ABSENT** (★실 위험 — Trigger/RLS/Permission 전무 · Application Role 이 UPDATE/DELETE 가능)
- 선행 의존: 원장 테이블 자체가 §3.1 Decision Core ABSENT 로 부재 → 보호 대상 테이블 신설이 선행(**BLOCKED_PREREQUISITE**)이나, **감사로그 물리삭제/단일롤 위험은 현재 실존하는 즉시 위험**
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **★다계층 강제(Trigger 단독 금지)**: ① Permission — Application Role 을 원장/감사 테이블에 대해 INSERT·SELECT만 GRANT, UPDATE/DELETE REVOKE · ② Migration Role 분리(스키마 변경 전용 계정) · ③ Trigger/Rule — UPDATE·DELETE 시도를 예외 발생+감사 · ④ RLS/Tenant FK — Cross-Tenant 접근·Cross-Tenant Link 차단 · ⑤ Unique 제약 — ledger sequence·decision commit entry·decision slot commit 유일성.
- **★즉시 실위험 대응(별도 승인세션)**: `media_gc_cron.php:35,43` 감사로그 90일 물리 DELETE 는 append-only·불변성과 정면 상충 — Legal Hold/Retention 예외 없이 무결성 창을 연다. DB Permission 으로 감사 테이블 DELETE 를 애초에 불가능하게 하고, 보존은 논리 삭제(§28)/Archive 로 전환.
- **재사용 substrate**: SecurityAudit INSERT/SELECT-only 관례(`:8`)를 DB 권한으로 승격 · Privileged Mutation 은 SecurityAudit(`:27,48-52`) 로 불변 감사 · 서버UTC(`Db.php:438`).
- **MySQL/SQLite 이중 백엔드 주의**: `Db.php`가 MySQL↔SQLite 폴백을 하므로(자가치유 CREATE IF NOT EXISTS) RLS/Trigger 지원 차이 — MySQL Permission/Trigger 정본, SQLite 폴백은 애플리케이션 가드(§25/§26)로 보강.
- **무후퇴**: 기존 정상 append(SecurityAudit·audit_log·pm_audit_log)는 INSERT 권한 유지로 무회귀. 물리 DELETE 제거는 무후퇴 예외(개선).

관련: [[DSAR_APPROVAL_DECISION_DOMAIN_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_REPOSITORY_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_LOGICAL_DELETION_GOVERNANCE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

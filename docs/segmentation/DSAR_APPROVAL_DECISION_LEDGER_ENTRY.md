# DSAR — Ledger Entry (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§17 LEDGER_ENTRY 필수 필드 (원문 전사):
- `entry_id` · `tenant_id` · `decision ledger/partition id`
- `ledger sequence` · `partition sequence`
- `entry type/subtype` · `integrity version id`
- `decision instance/slot/command/validation result/commit/record/history id`
- `decision action type` · `action version id` · `actor subject id`
- `approval case/version/work item/assignment/authority resolution/delegation resolution/sequential instance/stage/level/step id`
- `snapshot/evidence/audit event/outbox event id`
- `previous ledger entry id/sequence`
- `correction/supersession/reversal target entry id`
- `source system/event id/sequence reference`
- `event effective_at` · `committed_at` · `recorded_at`
- `payload schema version` · `canonical payload reference`
- `canonical payload/context/entry/previous entry digest foundation`
- `immutable flag` · `retention/legal hold state` · `ledger entry status` · `evidence`

(ENTRY_TYPE enum = [[DSAR_APPROVAL_DECISION_LEDGER_ENTRY_TYPE]] 위임.)

## 2. 기존 구현 대조

- **Ledger Entry 부재.** entry 로우가 참조해야 할 `decision record/commit/instance/slot id`의 원천 = §3.1 Decision Core가 ABSENT(`approval_decision` 0). 유일 승인 기록은 in-place UPDATE(`Mapping.php:285-289,327`·테이블 `Db.php:623,655`)라 불변 Decision Record 로우 자체가 없다 → **Entry가 참조할 대상 부재**.
- 가장 근접한 append 로우 = `SecurityAudit.php` security_audit_log(`:48-52`)의 감사 레코드지만, §17 필수 계보(`decision record id`·`ledger sequence`·`partition sequence`·`previous ledger entry id`·`entry type`·`canonical payload digest`)를 갖지 않는다. prev_hash 체인(`:27,39`)만 있고 논리 `ledger sequence`는 없다(id AUTOINCREMENT 물리키만).
- `entry type/subtype`·`integrity version id`·`correction/supersession/reversal target entry id`·`immutable flag`·`retention/legal hold state` → **no hits**.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (Decision Record 부재 → Entry가 기록할 대상 없음)
- 선행 의존: §17 Entry는 §3.1 Decision Core의 불변 `decision record/commit/instance` 를 필수 참조 — Core ABSENT. 상위 §15 Ledger·§16 Partition·§13 Integrity State 모두 ABSENT.
- cover: **0** (ledger entry 0 · 참조 대상 decision record 0)

## 4. 확장/구현 방향 (설계)

- 순신규 `ledger_entry` — §17 전 필드 + `immutable flag`. **Entry 신설의 전제는 Decision Core(불변 Decision Record) 선행 신설** — Record 없이 Entry만 만들면 참조 무결성이 공백. 따라서 본 엔티티는 BLOCKED, Core 신설 후 조립.
- 재사용 substrate: `canonical payload/context/entry/previous entry digest foundation` = SHA-256(MediaHost `:93`·Migrate `:50`·SecurityAudit `:27`) 재사용. `previous ledger entry` 링크 = SecurityAudit prev_hash 체인 패턴(`:27,39,64`) 확장. `committed_at`/`recorded_at`/`event effective_at` = 서버UTC(`Db.php:438`·`SecurityAudit.php:24`). Entry 적재 원자성 = 트랜잭션 PDO(`Omnichannel.php:404-415`) + §38 Transaction Boundary.
- `immutable flag`·append-only는 DB 레벨(Trigger/RLS/Permission)로 강제 — 현재 전무(관례만). Application Role UPDATE/DELETE 차단 필요.
- ★`ledger sequence`(논리 단조)는 물리 id AUTOINCREMENT와 분리(§19) — SecurityAudit도 논리 seq 부재이므로 순신규.
- ★실위험: `media_gc_cron.php:35,43` 물리 DELETE가 Entry에 닿지 않도록 Retention/Legal Hold state 예외를 설계 선반영.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_ENTRY_TYPE]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

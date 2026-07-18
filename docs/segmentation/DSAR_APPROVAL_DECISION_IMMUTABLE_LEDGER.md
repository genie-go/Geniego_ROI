# DSAR — Immutable Ledger (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§15 IMMUTABLE_LEDGER 필수 필드 (원문 전사):
- `ledger_id` · `tenant_id` · `ledger_code` · `name`
- `ledger type` · `integrity definition/version/profile id`
- `partition/sequence strategy`
- `current head reference` · `latest checkpoint reference`
- `total entry count` · `first/last entry time`
- `current ledger version` · `retention class` · `legal hold status`
- `status` · `evidence`

§15 TYPE enum: `TENANT_DECISION_LEDGER` / `CASE_DECISION_LEDGER` / `DECISION_INSTANCE_LEDGER` / `DECISION_SLOT_LEDGER` / `RESOURCE_DECISION_LEDGER` / `CONTROL_LEDGER` / `CUSTOM`.

## 2. 기존 구현 대조

- **범용 Immutable Decision Ledger 부재.** `decision_ledger` 계열 테이블 0. 승인 결정=in-place UPDATE(`Mapping.php:285-289,327`·테이블 `Db.php:623,655`)라 원장이 기록할 불변 대상 자체가 없다.
- ★유일 실 append-only 해시체인 = `SecurityAudit.php`(security_audit_log `:48-52`): INSERT/SELECT만(UPDATE/DELETE 코드 0·`:8`)·`hash=sha256(prev|tenant|actor|action|details|created_at)`(`:27`)·GENESIS(`:39`)·prev_hash 체인·**verify(`:56-68`)가 hash_equals+prev_hash 이중검증**·배선(`UserAuth.php:4046`·`Compliance.php:162`). — 그러나 이것은 **보안 감사 트레일**이지 Decision Ledger가 아니다: `ledger type`/`partition·sequence strategy`/`head reference`/`checkpoint reference`/`ledger version`/`retention class`/`legal hold status` 필드 전무.
- ★장식(원장 오인 금지): `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)=verify() 0(289차 정정) · `schema_migrations.checksum`(`Migrate.php:50,63-64`)=저장만·비교 미실행 · `journey_decision_log`(`JourneyBuilder.php:60,74,1192`)=in-place UPDATE(append-only 아님).
- `audit_log`(`Db.php:434-440,540-546`)·`pm_audit_log`(`PM/Shared.php:129-148`)=append-only 관례일 뿐 해시체인/verify/head/sequence 없음.

## 3. 판정

- Verdict: **ABSENT** (Ledger 엔티티 부재). SecurityAudit = **KEEP_SEPARATE**(감사 트레일 정본·decision ledger 아님·CANONICAL 패턴만 재사용).
- 선행 의존: §15 Ledger는 §9 INTEGRITY_DEFINITION·§10 VERSION·§11 PROFILE 참조 대상이며 §3.1 Decision Core 위에 적재됨 — 모두 ABSENT. 기록 대상(불변 Decision Record) 부재로 원장 공회전.
- cover: **0** (decision_ledger 테이블 0). SecurityAudit는 별도 감사자산으로 존치 — 원장 cover로 계상 금지.

## 4. 확장/구현 방향 (설계)

- 순신규 `decision_ledger`(§15 7-TYPE) — head reference·checkpoint reference·sequence strategy·retention class·legal hold status를 데이터로 선언. **SecurityAudit를 흡수/재정의하지 않는다**(KEEP_SEPARATE): 감사 트레일은 그대로 두고, Decision Ledger는 별도 SoT로 신설.
- 재사용 substrate(발명 아닌 조립): SecurityAudit append-only+verify 패턴(확장) · SHA-256 3개소(MediaHost `:93`·Migrate `:50`·SecurityAudit `:27`) · 트랜잭션 PDO(`Omnichannel.php:404-415`) · Outbox omni_outbox(`Omnichannel.php:390-448`) · SKIP LOCKED(`:405,429-441`) · 서버UTC(`Db.php:438`) · MediaHost CAS Evidence Store(`:88-90,93-96,100-102,211`).
- `current head reference`는 §20 LEDGER_HEAD(CAS)로, `sequence strategy`는 §19 LEDGER_SEQUENCE(단조)로 위임 — 둘 다 SecurityAudit에 부재(lastHash `:35-41` ORDER BY id DESC·CAS 없음)이므로 순신규.
- 선행 조립: Decision Core(§3.1) 신설 → INTEGRITY_DEFINITION/VERSION/PROFILE → 본 Ledger. Core ABSENT 상태에서 원장만 신설 = 공회전 → 별도 승인세션(RP-002).
- ★실위험: `media_gc_cron.php:35,43`이 append-only 로그를 90일 물리 DELETE — 신설 Ledger에 동일 cron이 닿으면 불변성 파괴. Retention/Legal Hold 예외를 원장 설계에 선반영.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

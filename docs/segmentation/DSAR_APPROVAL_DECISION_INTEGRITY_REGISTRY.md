# DSAR — Decision Integrity Registry (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 INTEGRITY_REGISTRY 필수 필드 (원문 전사):
- `registry_id` · `tenant_id` · `registry_code` · `name`
- `registry_type` · `authoritative_source` · `ledger mode`
- `partition/sequence strategy`
- `append-only required` · `update prevention required` · `delete prevention required`
- `checkpoint support` · `seal support` · `retention binding support` · `legal hold support`
- `reconstruction support` · `simulation support` · `reconciliation support`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

TYPE enum: `PLATFORM` / `TENANT` / `APPROVAL_DOMAIN` / `FINANCIAL_CONTROL` / `REBATE` / `CLAIM` / `SETTLEMENT` / `PAYMENT` / `CONTRACT` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `CUSTOM`.
LEDGER_MODE enum: `STRICT_APPEND_ONLY` / `EVENT_STREAM` / `DECISION_STREAM` / `TENANT_LEDGER` / `CASE_LEDGER` / `HYBRID` / `CUSTOM`.

의미: Integrity Registry는 테넌트·도메인 단위로 어떤 무결성 원장(Ledger)이 존재하며 그 ledger mode·append-only/update-prevention/delete-prevention 강제·checkpoint/seal/retention/legal-hold/reconstruction/simulation/reconciliation 지원 여부를 **데이터로 선언**하는 최상위 등록소다. Definition(§9)·Version(§10)·Policy(§8)·Profile(§11)의 상위 루트이자 실 Immutable Ledger(§15)의 소속 컨테이너다.

## 2. 기존 구현 대조

- **무결성 원장 등록소(정본 데이터 선언)는 부재** — `registry_id`/`registry_code`/`ledger mode`/`append-only required`/`active_version`을 데이터로 선언하는 구조체 전무. 무결성은 등록소로 열거·조회되지 않는다.
- 실존하는 유사 자산(코드 기반 판정, 등록소 아님):
  - `SecurityAudit` security_audit_log(`SecurityAudit.php:48-52`) — 유일한 실 append-only 해시체인이나, 이는 단일 감사트레일이지 테넌트·도메인별 ledger mode를 선언하는 registry가 아니다. INSERT/SELECT만(`SecurityAudit.php:8`)·prev_hash 체인(`SecurityAudit.php:27`)·GENESIS(`SecurityAudit.php:39`)·verify(`SecurityAudit.php:56-68`)·배선(`UserAuth.php:4046`·`Compliance.php:162`).
  - `schema_migrations`(`Migrate.php:38,50`) — 스키마 마이그레이션 등록소일 뿐 무결성 원장 registry 아님.
- `registry_type`/`ledger mode`/`partition/sequence strategy`/`authoritative_source`/`checkpoint·seal·retention binding·legal hold·reconstruction·simulation·reconciliation support`를 데이터로 선언하는 등록소 → **no hits**.
- `append-only required`/`update prevention required`/`delete prevention required`(강제 플래그) → **no hits**. DB 불변강제(Trigger/RLS/Permission) 전무. 오히려 `media_gc_cron.php:35,43`은 append-only 감사로그를 90일 물리 DELETE(불변성 상충·Legal Hold 예외 없음).
- `active_version`/`valid_from`/`valid_to`(등록소 버전·유효기간) → **no hits**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Registry는 무결성 6군의 상위 루트 — 선행 §3.1 Decision Core ABSENT·§3.3 Runtime ABSENT에 종속되어 하위 Definition(§9)·Version(§10)·Policy(§8)·Profile(§11)·실 Ledger(§15) 전체가 연쇄 부재. Platform §3.4(트랜잭션·Outbox·SHA-256·SKIP LOCKED)만 재사용 substrate로 PRESENT.
- cover: **0** (무결성 원장 등록소 데이터 선언 전무. SecurityAudit는 단일 감사트레일 패턴으로 KEEP_SEPARATE, registry 대체 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `decision_integrity_registry` 등록소 — 테넌트·도메인 단위로 `registry_type`(13종)·`ledger mode`(7종)와 append-only/update-prevention/delete-prevention 강제 플래그·checkpoint/seal/retention/legal-hold/reconstruction/simulation/reconciliation 지원을 데이터로 선언. Golden Rule=Extend: `SecurityAudit`(`SecurityAudit.php:48-68`)의 append-only 해시체인+verify를 CANONICAL 패턴으로 재사용하되, registry는 그 상위에서 다수 ledger를 표준화(KEEP_SEPARATE — 감사트레일≠decision ledger).
- 재사용 substrate(Platform §3.4): 트랜잭션 PDO(`Omnichannel.php:404-415`·`Migrate.php:54-60`)·Outbox(`Omnichannel.php:390-448`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)·SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)·서버UTC(`Db.php:438`·`SecurityAudit.php:24`).
- Mandatory Control: `append-only required`·`update/delete prevention required`를 registry에서 선언하고 §27 Database Immutability Guard(Permission/Trigger/RLS/SP-only Insert)로 실집행 — 현재 플래그도 강제도 전무.
- 실위험(무후퇴 예외=개선): `media_gc_cron.php:35,43`의 감사로그 90일 물리 DELETE는 append-only 원장 대상에서 제외하도록 registry `delete prevention required` + Legal Hold(§37)로 차단. 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)은 verify() 0(289차 정정)이므로 registry의 실 무결성 근거로 계상 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

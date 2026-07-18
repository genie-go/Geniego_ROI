# DSAR — Decision Integrity Definition (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 INTEGRITY_DEFINITION 필수 필드 (원문 전사):
- `definition_id` · `registry id` · `code` · `name`
- `approval domain`
- `applicable decision definitions` · `applicable action definitions`
- `ledger granularity`
- `partition strategy` · `sequence strategy`
- `required ledger entry types` · `mandatory reference types`
- `correction binding` · `retention binding` · `legal hold binding`
- `current version` · `owner` · `valid_from` / `valid_to`
- `status` · `evidence`

GRANULARITY enum: `PER_TENANT` / `PER_APPROVAL_CASE` / `PER_DECISION_INSTANCE` / `PER_DECISION_SLOT` / `PER_RESOURCE` / `HYBRID`.

의미: Integrity Definition은 Registry(§7) 아래에서 특정 승인도메인의 원장 세부 규격(granularity·partition/sequence strategy·required entry types·mandatory reference types·correction/retention/legal-hold binding)을 **데이터로 정의**한다. 상위는 Registry, 하위는 Version(§10)·실 Ledger(§15)·Reference Matrix(§18)다.

## 2. 기존 구현 대조

- **무결성 원장 정의 구조체는 부재** — `definition_id`/`registry id`/`ledger granularity`/`required ledger entry types`/`mandatory reference types`를 데이터로 선언하는 구조체 전무.
- 선행 의존 대상 부재: `applicable decision definitions`·`applicable action definitions`는 §3.1 Decision Core ABSENT(`approval_decision` 0·`Mapping.php:285-289,327` approvals_json in-place UPDATE·`Db.php:623,655` 테이블) 및 §3.2 Actions ABSENT에 종속 → 정의가 참조할 Decision/Action 정의 자체가 없음.
- `ledger granularity`(PER_TENANT/CASE/INSTANCE/SLOT/RESOURCE/HYBRID) → **no hits**. 현행 유일 append-only(`SecurityAudit.php:48-52`)는 tenant 단위 단일 감사트레일로, granularity 선택·partition 전략을 데이터로 정의하지 않는다.
- `partition strategy`·`sequence strategy` → **ABSENT**(논리 sequence/partition 부재. SecurityAudit는 id DESC 물리 정렬 `SecurityAudit.php:35-41`).
- `required ledger entry types`·`mandatory reference types` → **ABSENT**(Entry Type 분류·필수 Reference Matrix 미달).
- `correction binding`·`retention binding`·`legal hold binding` → **ABSENT**(정정=in-place UPDATE·retention=물리삭제 `media_gc_cron.php:35,43`·legal hold 전무).

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: `applicable decision/action definitions`가 §3.1 Decision Core·§3.2 Actions ABSENT에 직접 종속 — 정의가 결합할 대상이 없어 실질 정의 불가. 상위 Registry(§7)도 ABSENT.
- cover: **0** (원장 정의 데이터 선언 전무 · 결합 대상 Decision/Action 정의 부재).

## 4. 확장/구현 방향 (설계)

- 선행 신설 필수: §3.1 Decision Core(`approval_decision` 정본)·§3.2 Action Definition을 먼저 신설한 뒤 본 Definition이 `applicable decision/action definitions`로 결합. 선행 부재 상태의 정의 신설은 허공 참조.
- 순신규 `decision_integrity_definition` — Registry 아래 도메인별 `ledger granularity`(6종)·`partition/sequence strategy`·`required entry types`(§17 ENTRY_TYPE)·`mandatory reference types`(§18 Reference Matrix)를 데이터로 정의.
- 재사용 substrate: SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)·트랜잭션(`Omnichannel.php:404-415`)을 `sequence strategy`·`transaction binding`의 substrate로 참조.
- Mandatory Control: `required ledger entry types`·`mandatory reference types`를 §18 Reference Matrix와 연동해 Append 시 필수 Reference 누락을 차단 — 현재 어떤 원장도 필수 Reference를 강제하지 않는다.
- 실위험: `correction/retention/legal hold binding` 부재로 정정이 `Mapping.php:285-289,327` in-place UPDATE로 과거를 소실. Definition이 correction binding을 강제해 정정을 새 Entry(§29)로 유도해야 무후퇴.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

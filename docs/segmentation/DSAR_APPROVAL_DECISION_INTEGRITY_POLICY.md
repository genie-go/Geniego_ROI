# DSAR — Decision Integrity Policy (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 INTEGRITY_POLICY 필수 필드 (원문 전사):
- `policy_id` · `tenant_id` · `code` · `name`
- `ledger required`
- `append-only policy` · `sequence policy` · `partition policy` · `ledger head policy` · `checkpoint policy`
- `correction policy` · `amendment policy` · `supersession policy` · `reversal reference policy` · `void reference policy` · `redaction reference policy`
- `retention policy` · `legal hold policy`
- `transaction policy` · `idempotency policy` · `concurrency policy` · `lock policy` · `fencing policy`
- `gap policy` · `duplicate policy`
- `reconstruction policy` · `reconciliation policy` · `alert policy`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

의미: Integrity Policy는 Registry(§7) 아래에서 각 무결성 규칙(append-only·sequence·head·checkpoint·correction·retention·legal hold·transaction·idempotency·concurrency·lock·fencing·gap·duplicate·reconstruction·reconciliation·alert)을 **정책 데이터로 선언**하고 Version(§10)으로 스냅샷된다. 실 Ledger(§15)·Head(§20)·Lock(§41)·Idempotency(§40)의 강제 근거다.

## 2. 기존 구현 대조

- **무결성 정책 등록소는 부재** — `policy_id`/`code`/각 `*_policy` 플래그/`active_version`을 데이터로 선언하는 구조체 전무.
- 개념별 능력 판정(§GROUND_TRUTH):
  - `append-only policy` → **PARTIAL**: `SecurityAudit`(`SecurityAudit.php:8,48-52`) INSERT/SELECT 관례로만 실재(정책 강제 아님)·`audit_log`(`Db.php:434-440,540-546`)·`pm_audit_log`(`PM/Shared.php:129-148`)는 append-only 관례이나 해시/verify 없음.
  - `sequence policy`·`ledger head policy`·`checkpoint policy` → **ABSENT**(논리 seq/Head-CAS/checkpoint 미달 — SecurityAudit도 lastHash가 `SecurityAudit.php:35-41` ORDER BY id DESC로 CAS 없음).
  - `correction/amendment/supersession/reversal/void/redaction reference policy` → **ABSENT**(승인 정정은 in-place UPDATE `Mapping.php:285-289,327`로 과거 소실).
  - `retention policy`·`legal hold policy` → **ABSENT/PARTIAL**(retention 유사=`media_gc_cron.php:35,43` 물리삭제뿐·Legal Hold 예외 없음).
  - `transaction policy` → **재사용 substrate**: 트랜잭션 PDO(`Omnichannel.php:404-415`·`Migrate.php:54-60`) 실재하나 원장 트랜잭션 경계 정책은 부재.
  - `idempotency policy`·`concurrency policy`·`lock policy`·`fencing policy` → **PARTIAL**: Inbox dedup UNIQUE(`Paddle.php:108,146,343-368`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)는 재사용 substrate이나 원장 Idempotency/Fencing/named lock(GET_LOCK)=ABSENT.
  - `gap policy`·`duplicate policy`·`reconstruction policy`·`reconciliation policy`·`alert policy` → **ABSENT**.

## 3. 판정

- Verdict: **ABSENT** (일부 규칙은 재사용 substrate/관례로 PARTIAL이나 정책 등록소 자체는 부재)
- 선행 의존: Registry(§7) ABSENT에 종속. §3.1 Decision Core·§3.3 Runtime ABSENT로 정책이 강제할 대상(원장) 자체가 없음.
- cover: **0** (정책 데이터 선언 전무. append-only/idempotency/lock은 substrate 관례로만 PARTIAL 존재, 정책화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `decision_integrity_policy` — Registry 아래 각 `*_policy` 플래그를 데이터로 선언하고 Version(§10)으로 스냅샷. Golden Rule=Extend: `SecurityAudit` append-only+verify(`SecurityAudit.php:56-68`)를 `append-only policy`의 CANONICAL 실증으로, Inbox UNIQUE(`Paddle.php:108`)·SKIP LOCKED(`Omnichannel.php:405`)를 `idempotency/lock policy`의 재사용 substrate로 승격.
- Mandatory Control: `append-only policy`+`update prevention`을 §26/§27 Immutability Guard(Repository Insert-only·DB Permission/RLS)로 실집행 — 현재 `Mapping.php:285-289,327` in-place UPDATE는 정책 위반의 대표 사례.
- 다계층 불변강제: 정책이 애플리케이션 관례(SecurityAudit) → Repository Guard(§26) → Database Permission/Trigger(§27) 3계층을 요구하도록 선언. Trigger 단독 금지(§27).
- 실위험: `media_gc_cron.php:35,43` 물리삭제는 `retention policy`+`legal hold policy` 하에 append-only 원장에서 예외 처리(무후퇴 예외=개선). 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 비교 미실행이므로 정책 근거 아님.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

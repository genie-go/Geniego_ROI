# DSAR — Decision Integrity Profile (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 INTEGRITY_PROFILE 필수 필드 (원문 전사):
- `profile id` · `tenant id` · `code` · `name`
- `required entry types`
- `checkpoint frequency` · `verification frequency reference`
- `retention class` · `legal hold policy`
- `correction approval level`
- `administrative override prohibition` · `manual database change prohibition`
- `reconciliation frequency` · `alert severity`
- `owner` · `status` · `evidence`

TYPE enum: `STANDARD` / `FINANCIAL_HIGH` / `LEGAL_HIGH` / `COMPLIANCE_HIGH` / `SECURITY_HIGH` / `PAYMENT_CRITICAL` / `SETTLEMENT_CRITICAL` / `CONTRACT_CRITICAL` / `REGULATED` / `CUSTOM`.

의미: Integrity Profile은 원장에 적용되는 보증 수준(entry type 요구·checkpoint/verification/reconciliation 주기·retention class·legal hold·correction 승인 레벨·administrative override 금지·manual DB change 금지·alert severity)을 프리셋 데이터로 선언한다. FINANCIAL/LEGAL/PAYMENT 등 고위험 프로파일일수록 verify 빈도·override 금지가 강화된다.

## 2. 기존 구현 대조

- **무결성 프로파일 구조체는 부재** — `profile id`/`code`/TYPE(STANDARD/FINANCIAL_HIGH/…)/각 보증 파라미터를 데이터로 선언하는 구조체 전무.
- 개념별 능력 판정:
  - `verification frequency reference` → **PARTIAL**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`) hash_equals+prev_hash 이중검증이 실재하나, 호출은 배선 2개소(`UserAuth.php:4046`·`Compliance.php:162`)뿐이고 주기적 verify 스케줄·빈도 프로파일은 부재.
  - `checkpoint frequency`·`reconciliation frequency` → **ABSENT**(checkpoint/reconciliation 개념 자체 부재).
  - `retention class`·`legal hold policy` → **ABSENT**(retention 유사=`media_gc_cron.php:35,43` 물리삭제·Legal Hold 예외 없음).
  - `correction approval level` → **ABSENT**(정정=in-place UPDATE `Mapping.php:285-289,327`·승인 레벨 없음).
  - `administrative override prohibition`·`manual database change prohibition` → **ABSENT**: 오히려 DB 불변강제(Trigger/RLS/Permission) 전무로 manual DB change가 무제한. `media_gc_cron.php:35,43` 물리 DELETE가 그 실증.
  - `alert severity` → **ABSENT**(무결성 위반 alert 프로파일 부재).
  - TYPE enum(FINANCIAL_HIGH 등) → **no hits**.

## 3. 판정

- Verdict: **ABSENT** (verify 능력만 PARTIAL substrate로 존재)
- 선행 의존: Registry(§7)·Definition(§9) ABSENT/BLOCKED에 종속. 프로파일이 적용될 원장·정의 부재.
- cover: **0** (프로파일 데이터 선언 전무. `SecurityAudit::verify`는 재사용 substrate로만 PARTIAL 존재, 프로파일화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `decision_integrity_profile` — TYPE 10종 프리셋(STANDARD…REGULATED)별로 `verification frequency`·`checkpoint frequency`·`retention class`·`correction approval level`·`administrative override prohibition`·`manual database change prohibition`·`alert severity`를 선언.
- Golden Rule=Extend: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)를 `verification frequency reference`의 CANONICAL 실증으로 승격하고, 프로파일이 주기적 verify 스케줄을 강제(현재는 배선 2개소 임시호출뿐).
- 다계층 불변강제: `manual database change prohibition`·`administrative override prohibition`을 §27 Database Immutability Guard(Application Role INSERT/SELECT만·Migration Role 분리·Privileged Mutation Audit)로 실집행 — 현행 무제한 manual DB change를 프로파일 레벨로 차단.
- 실위험(무후퇴 예외=개선): `media_gc_cron.php:35,43`의 물리 DELETE는 FINANCIAL/LEGAL/PAYMENT 고위험 프로파일에서 `retention class`+`legal hold policy`로 금지. 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`) verify() 0·`schema_migrations.checksum`(`Migrate.php:50,63-64`) 비교 미실행은 프로파일 보증 근거로 계상 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

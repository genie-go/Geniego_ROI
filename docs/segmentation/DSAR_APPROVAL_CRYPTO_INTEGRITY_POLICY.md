# DSAR — Cryptographic Integrity Policy (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 CRYPTO_INTEGRITY_POLICY 필수 필드 (원문 전사):
- `policy id` · `tenant` · `code` · `name`
- `minimum algorithm strength`
- `allowed algorithm ids` · `prohibited algorithm ids`
- `digest length` · `output encoding`
- `canonicalization policy id`
- `genesis binding` · `chain binding` · `sequence binding` · `tenant binding` · `partition binding` · `reference binding`
- `checkpoint` · `verification frequency`
- `commit-time required` · `read-time` · `periodic`
- `tamper response` · `rotation` · `migration`
- `owner` · `version` · `valid` · `status` · `evidence`

의미: Cryptographic Integrity Policy는 Registry(§7) 아래에서 각 무결성 규칙(**최소 알고리즘 강도·허용/차단 알고리즘·digest 길이·출력 인코딩·canonicalization 정책·genesis/chain/sequence/tenant/partition/reference binding·checkpoint·verification 주기·commit-time 필수 여부·read-time·periodic·tamper 대응·rotation·migration**)을 정책 데이터로 선언하고 Version(§10)으로 스냅샷된다. §28 Hash Chain(Previous+Sequence+Tenant+Entry Type+Integrity Version 결합)·§39 Entry Verification 순서·§46 Tamper Response의 강제 근거다. §5.13(고객설정으로 비활성 불가) 항목—Canonical Serialization·Strong Algorithm·Previous Digest Binding·Sequence/Tenant Binding·Weak Algorithm Rejection—을 정책이 강행 선언한다.

## 2. 기존 구현 대조

- **무결성 정책 등록소는 부재** — `policy id`/각 binding 플래그/`minimum algorithm strength`/`allowed·prohibited algorithm ids`/`tamper response`/`version`을 데이터로 선언하는 구조체 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `minimum algorithm strength`·`allowed/prohibited algorithm ids` → **ABSENT**: 알고리즘은 코드에 `'sha256'` 리터럴 하드코딩(§5.5·§5.6 위반). 허용/차단 목록을 데이터로 선언하는 정책 0. 단 실사용은 전부 SHA-256 이상—약한 알고리즘 무결성 사용 0(중대 긍정, §2·§5).
  - `genesis binding` → **PARTIAL**: `SecurityAudit`의 `lastHash()`가 오류시 `'GENESIS'` 반환(`SecurityAudit.php:39-40`)으로 genesis 마커 관례는 실재하나, §5.10 **Versioned Genesis Marker**(tenant·ledger·partition·integrity version 포함)가 아닌 단순 상수 문자열이라 §27 위반 창.
  - `chain binding` → **PARTIAL**: preimage에 `prev_hash` 포함(`SecurityAudit.php:27`)·verify에서 `prev_hash===$prev` 확인(`SecurityAudit.php:56-68`)으로 Previous Digest binding 실재. 그러나 §28의 Sequence·Entry Type·Integrity Version 결합은 부재.
  - `sequence binding`·`partition binding` → **ABSENT**: 논리 sequence·partition 개념 부재(`SecurityAudit`는 `id DESC` 물리순서에 의존, `SecurityAudit.php:39-40`).
  - `tenant binding` → **ABSENT(위험)**: `SecurityAudit` preimage에 tenant는 포함하나 verify()에 tenant 술어 없음—전역 단일 체인(§5.13 Tenant Binding·§71 GROUND_TRUTH 실위험 4).
  - `reference binding` → **ABSENT**: Display Name 배제·Stable Identifier 참조 정책 0.
  - `canonicalization policy id` → **ABSENT**: canonical serializer 부재. preimage=raw `|`-concat + `json_encode(details, UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)은 canonicalization 아님(§5.3/§5.4 위반).
  - `commit-time required`·`read-time`·`periodic` verification → **PARTIAL**: verify() 능력(`SecurityAudit.php:56-68`)은 실재하나 호출은 배선 1개소(`AdminGrowth.php:1429`)뿐·주기/commit-time/read-time 정책 부재.
  - `tamper response` → **ABSENT(fail-open 위험)**: 실패 `catch` no-op(`SecurityAudit.php:32`)으로 체인 silent reset. §5.11(실패 무시 금지)·§46 Tamper Response 미달.
  - `rotation`·`migration` → **ABSENT**.

## 3. 판정

- Verdict: **ABSENT** (일부 binding은 SecurityAudit 관례로 PARTIAL이나 정책 등록소 자체는 부재)
- 선행 의존: Registry(§7) ABSENT에 종속. §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용)로 정책이 강제할 대상(원장 Entry) 자체가 없음 → **BLOCKED_PREREQUISITE**.
- cover: **0** (정책 데이터 선언 전무. chain/genesis binding은 SecurityAudit substrate 관례로만 PARTIAL, 정책화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_crypto_integrity_policy` — Registry 아래 각 규칙을 데이터로 선언하고 Version(§10)으로 스냅샷. Golden Rule=Extend: `SecurityAudit` preimage의 `prev_hash` binding(`SecurityAudit.php:27`)·verify의 이중검증(`SecurityAudit.php:56-68`)을 `chain binding`의 CANONICAL 실증으로 승격.
- Mandatory Control: `minimum algorithm strength`·`allowed/prohibited algorithm ids`를 정책에서 선언하고 §12 Hash Algorithm Registry를 참조 — 현행 `'sha256'` 하드코딩(`SecurityAudit.php:27`)을 정책 참조로 이관(§5.5).
- **★핵심 실결함 반영**: `canonicalization policy id`를 필수화하여 §13 Canonicalization Policy를 참조 — 현행 raw `|`-concat + `json_encode(UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)는 §5.3/§5.4 위반이므로, 실 체인 재사용 전 Canonical Projection 보강이 정책 강제(무후퇴 예외=개선).
- **★fail-open 봉쇄**: `tamper response`를 §46(Critical Entry Mismatch→Commit 차단·Chain Break→Append 차단)로 선언 — 현행 `catch` no-op(`SecurityAudit.php:32`)·GENESIS-on-error(`SecurityAudit.php:39-40`) silent reset을 §5.11 위반으로 금지.
- **★tenant binding 강행**: verify()에 `WHERE tenant_id=?` 술어를 정책 강제(§5.13) — 현행 전역 단일 체인을 멀티테넌트 격리로 승격.
- **★중대 긍정 명시**: `prohibited algorithm ids`에 MD5/SHA-1/CRC/hashCode/Murmur/xxHash를 등재하되, 현행 Tamper/Chain 경로 사용 = 0이므로 이는 **회귀 방지 게이트**이지 마이그레이션 대상이 아니다(공포=부재).
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`) 비교 미실행·`menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0은 정책 근거 아님.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_REGISTRY]] · [[DSAR_APPROVAL_CANONICALIZATION_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

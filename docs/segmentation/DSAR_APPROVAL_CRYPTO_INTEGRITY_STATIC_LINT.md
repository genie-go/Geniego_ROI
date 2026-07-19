# DSAR — Cryptographic Integrity: Static Lint (§62)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Static Lint는 무결성 Governance 부재 전제 위 신규 차단 규칙. 현행 실 위반은 마이그레이션 후 게이트로 승격.

## 1. 원문 전사 (Canonical Contract)

§62 Static Lint(차단) 원문 전사: MD5/SHA-1 Import · CRC Security Use · hashCode Integrity Use · Raw String Concatenation Digest · Algorithm Literal 하드코딩 · Canonicalization 없는 Digest · Floating Point Monetary Digest · Local Time Timestamp Digest · Default Charset · Platform-dependent Encoding · Unordered Map/Set 직접 Serialization · Display Name Digest Reference · Previous Digest 없는 Entry · Sequence/Tenant/Digest Version 없는 Entry · Stored Digest Setter · Digest Update Repository · Verification Result Update · Weak Algorithm Feature Flag · Sensitive Payload Logging · Digest Full Value 로그 · Constant-time 비교 미사용 · 중복 Hash Utility · 중복 Canonicalization.

의미: Static Lint는 CI/코드리뷰 단계에서 위 안티패턴을 **정적 차단**한다. 각 규칙은 "현행 실 위반(마이그레이션 대상) / 예방(현행 위반 없음) / 부재 개념 예방" 셋 중 하나로 분류되어야 하며, 오탐(현행에 없는데 P0로 계상) 금지.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §62 규칙 | 현행 위반 여부 | 근거(GROUND_TRUTH) |
|---|---|---|
| MD5/SHA-1 Import (무결성) | **위반 0(예방)** | 무결성 경로에 MD5/SHA-1 전무. sha1은 가명화(`CRM.php:589-930`) — 무결성 아님(예외 allowlist) |
| CRC Security Use | **위반 0(예방)** | CRC 무결성 사용 전무 |
| hashCode Integrity Use | **위반 0(예방)** | runtime object hash 무결성 사용 전무 |
| Raw String Concatenation Digest | **★실 위반** | `SecurityAudit.php:27` raw `|`-concat preimage |
| Algorithm Literal 하드코딩 | **★실 위반(4개소)** | `'sha256'` — `SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50` |
| Canonicalization 없는 Digest | **★실 위반** | `SecurityAudit.php:27` `json_encode(details,UNESCAPED_UNICODE)`(ksort/NFC 없음) |
| Floating Point Monetary Digest | **위반 0(예방)** | Monetary digest 경로 자체 부재 |
| Local Time Timestamp Digest | **혼재** | 실 체인 UTC(`SecurityAudit.php:24`); 장식 `menu_audit_log`는 local-tz(`AdminMenu.php:195`) — 장식은 무결성 계상 제외 |
| Default Charset | **잠재** | `json_encode` 기본 인코딩 의존(명시적 UTF-8/charset 정책 부재) |
| Platform-dependent Encoding | **잠재** | Output Encoding(hex/base64) 정책 미명문(현행 hex 관례) |
| Unordered Map/Set 직접 Serialization | **★실 위반** | `SecurityAudit.php:27` `json_encode` 맵 순서 의존(Canonical Comparator 없음) |
| Display Name Digest Reference | **위반 0(예방)** | 실 체인 preimage에 display name 미포함(actor/action 코드값) |
| Previous Digest 없는 Entry | **부분 양호** | 실 체인은 prev 포함(`SecurityAudit.php:27`); 그러나 장식 `journey_decision_log` in-place UPDATE(`JourneyBuilder.php:1192`)는 prev 없음 |
| Sequence/Tenant/Digest Version 없는 Entry | **★실 위반** | Tenant/Digest Version 컬럼 부재(`SecurityAudit.php:51` DDL), Sequence 암묵(id) |
| Stored Digest Setter | **위반 0(예방)** | Digest setter/update 경로 부재(INSERT/SELECT만·`SecurityAudit.php:8`) |
| Digest Update Repository | **위반 0(예방)** | Digest UPDATE 리포지토리 부재 |
| Verification Result Update | **위반 0(예방)** | Verification Result 저장소 자체 부재(신규 시 immutable) |
| Weak Algorithm Feature Flag | **위반 0(예방)** | Weak Algorithm feature flag 부재 |
| Sensitive Payload Logging | **잠재** | Canonical Payload/원문 로깅 방지 lint 부재 |
| Digest Full Value 로그 | **잠재** | Digest 전체값 로깅 방지 lint 부재 |
| Constant-time 비교 미사용 | **부분 양호** | 실 verify는 `hash_equals`(`SecurityAudit.php:63-64`); 신규 경로 확대 필요 |
| 중복 Hash Utility | **분산** | `Crypto.php:81,98-99`·`SecurityAudit.php:27`·`MediaHost.php:93`·`Db.php:272,998` — 관심사 상이(무결성 정본 1개로 통합, 나머지 KEEP_SEPARATE) |
| 중복 Canonicalization | **위반 0(부재)** | canonical serializer 0(신규 단일 정본) |

## 3. 판정

- **Verdict: 무결성 Governance 부재 전제 위 신규 Static Lint 규칙 설계.** 규칙은 세 부류.
  - **현행 실 위반(마이그레이션 대상 → 게이트 승격)**: Raw String Concatenation Digest·Algorithm Literal 하드코딩(4)·Canonicalization 없는 Digest·Unordered Map/Set Serialization·Sequence/Tenant/Digest Version 없는 Entry. 전부 정본=`SecurityAudit.php:27,51`.
  - **예방(현행 위반 0)**: MD5/SHA-1 Import·CRC Security·hashCode Integrity·Floating Point Monetary·Display Name Reference·Stored Digest Setter·Digest Update Repository·Verification Result Update·Weak Algorithm Feature Flag. ★이들은 현행에 없으므로 **회귀 방지 예방 규칙**이지 교정 대상 아님(정직 기술).
  - **잠재/부분(강화)**: Default Charset·Platform-dependent Encoding·Sensitive Payload/Digest Full Value Logging·Constant-time 비교(실 경로 양호·확대).
- cover: **0** (Static Lint 규칙셋·enforcement CI 전무). 실 `hash_equals` 사용만 부분 부합.
- 선행: 실 코드 lint 적용은 canonicalization 신규 후 — BLOCKED_PREREQUISITE. 이번 차수=규칙 명세.

## 4. 확장·구현 방향 (설계)

- **차단 규칙 카탈로그(신규)**: 위 24종을 CI 정적 규칙으로 정의. 무결성 경로(Digest/Chain/Verify) AST에서만 발화하도록 스코프 한정 — 비보안 md5/sha1(캐시/버킷/dedup)·벤더강제(OAuth1.0a/TOTP/CRAM-MD5)·PII 가명화(`CRM.php:589-930`·`Dsar.php:24-29`·`AdAdapters.php:1785`·`Reviews.php:522`·`Attribution.php:115`)는 **allowlist 예외**로 오탐 차단.
- **마이그레이션 대상 승격**: 실 위반 5종은 canonicalization/Registry 신규 구현 완료 후 `SecurityAudit.php:27,51` 교정과 동시에 lint를 fail 게이트로 승격(무후퇴 예외=개선).
- **Algorithm Literal 검출**: `'sha256'`/`'md5'`/`'sha1'` 리터럴이 Digest/Chain/Verify 컨텍스트에서 직접 등장하면 차단 → Hash Algorithm Registry(§12) 참조 강제. 4개소(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`) 중 무결성 정본은 `SecurityAudit.php:27`(우선), `Crypto.php`/`MediaHost`는 관심사 분리(키재료/파일CAS)로 별도 정책 예외.
- **중복 방지**: "중복 Hash Utility/Canonicalization" lint는 무결성 정본 외 신규 Digest/Canonical 유틸 도입을 차단(실존 확장 강제).
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

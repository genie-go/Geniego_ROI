# DSAR — Cryptographic Integrity: Critical Gap Policy (§61)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: "해시체인 존재 ≠ tamper-evident" · "Canonicalization 없는 SHA-256도 §5.3/§5.4 위반".

## 1. 원문 전사 (Canonical Contract)

§61 Critical Gap 후보(원문 전사): Canonicalization 없이 Hash · Field 문자열 단순연결 · MD5/SHA-1/CRC/hashCode/DB convenience hash · Algorithm 하드코딩 · Algorithm/Canonicalization/Field Set Version 미저장 · Digest Input Field 불명확 · Monetary Float · Local TZ Timestamp · Unicode Normalization 없음 · Collection 비결정적 · Display Name Reference · Previous Digest/Sequence/Tenant 미포함 · Genesis 규칙 없음 · Stored Digest 덮어쓰기 · 과거 Rehash 후 원본삭제 · Head Digest 없음 · Checkpoint/Commit-time Verification 없음 · Verification 실패 무시 · Tamper Incident 미생성 · Weak Algorithm 고객설정 허용 · Legacy Hash Canonical 신뢰 · Verification Result 수정가능 · Sensitive Payload Log · Timing-unsafe 비교 · Cross-Tenant Chain · Algorithm Downgrade · Dual-Digest 없이 교체 · Migration Rehash 미검증.

의미: Critical Gap Policy는 위 후보 각각이 "실제 현행 위반인가 / 부재(개념 자체 없음)인가 / 해당없음(정직 기술)인가"를 GROUND_TRUTH에 대조해 판정하고, 무결성 Governance 부재 전제 위에서 각 Gap을 닫을 설계 방향을 선언한다. 무결성 근거 계상 규율: 장식(verify 0)은 무결성 자산으로 계상하지 않는다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §61 후보 | 현행 판정 | 근거(GROUND_TRUTH) |
|---|---|---|
| Canonicalization 없이 Hash | **실 위반** | `SecurityAudit.php:27` preimage = raw `|`-concat + `json_encode(details,UNESCAPED_UNICODE)`(ksort/NFC/Decimal/Timestamp-precision 정규화 없음) → §5.3 위반 |
| Field 문자열 단순연결 | **실 위반** | `SecurityAudit.php:27` raw `|`-concat(필드경계/Type 보존 Envelope 아님) → §5.4 위반 |
| MD5/SHA-1/CRC/hashCode/DB convenience hash (무결성 사용) | **해당없음(정직 기술)** | Tamper/Chain 경로에 MD5/SHA-1/CRC **전무**. sha1은 비무결성 가명화(`CRM.php:589-930`), 기타 md5/sha1은 ID/캐시/버킷 또는 벤더강제(OAuth1.0a/TOTP/CRAM-MD5). **무결성 Weak Algorithm 사용 = 0** |
| Algorithm 하드코딩 | **실 위반** | `'sha256'` 리터럴 산재 — `SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`. Algorithm/Policy Registry 부재 |
| Algorithm/Canonicalization/Field Set Version 미저장 | **부재(개념 없음)** | Version 저장 구조 전무. `SecurityAudit.php:51` DDL에 algorithm/canonicalization version 컬럼 없음 |
| Digest Input Field 불명확 | **실 위반** | `SecurityAudit.php:27` 입력이 raw concat이라 Field Set/경계 불명확 |
| Monetary Float | **부재(개념 없음)** | Monetary canonical(minor unit·precision version) 유틸 부재(Decimal Utility ABSENT) |
| Local TZ Timestamp | **혼재** | 실 체인은 서버 UTC 재계산 가능(`SecurityAudit.php:24,31`); 그러나 장식 `menu_audit_log`는 local-tz(`AdminMenu.php:195` `'ts'=>date('c')`) |
| Unicode Normalization 없음 | **실 위반** | NFC/NFKC normalizer 부재. `UNESCAPED_UNICODE` json은 정규화 아님 |
| Collection 비결정적 | **실 위반** | `json_encode` 맵 순서 의존(ksort/Canonical Comparator 부재) |
| Display Name Reference | **부재(개념 없음)** | Stable Identifier vs Display Name 구분 정책 부재(신규) |
| Previous Digest/Sequence/Tenant 미포함 | **부분** | Previous=포함(`SecurityAudit.php:27` prev)·Sequence=암묵(id DESC)·**Tenant=verify 술어 없음**(전역 단일 체인) |
| Genesis 규칙 없음 | **부분(약함)** | 단순 상수 `'GENESIS'`(`SecurityAudit.php:39-40`)만·Versioned Genesis Marker 아님(§5.10/§27 미달) |
| Stored Digest 덮어쓰기 | **부재(리스크 창)** | Setter는 없으나 `catch` no-op fail-open(`SecurityAudit.php:32`)·GENESIS on error(`:40`)로 체인 silent reset 창 |
| 과거 Rehash 후 원본삭제 | **부재(개념 없음)** | Rotation/Migration Foundation 부재(신규) |
| Head Digest 없음 | **실 위반** | Head-CAS/Head Digest 부재(`SecurityAudit.php:39` DESC 조회만) → §30/§41 미달 |
| Checkpoint/Commit-time Verification 없음 | **실 위반** | Checkpoint 부재·Commit-time 재검증 부재. verify는 on-demand 배선만(`AdminGrowth.php:1429`) |
| Verification 실패 무시 | **리스크 창** | `SecurityAudit.php:32` catch no-op(fail-open) → §5.11 위배 창 |
| Tamper Incident 미생성 | **부재(개념 없음)** | Tamper Incident/Evidence/Alert SoT 전무(신규) |
| Weak Algorithm 고객설정 허용 | **해당없음** | Weak Algorithm feature flag 없음(고객설정으로 약화 경로 부재) |
| Legacy Hash Canonical 신뢰 | **해당없음(현행 안전)** | Legacy Hash를 Canonical Digest Field에 복사하는 경로 없음. sha1 가명화는 무결성 필드 아님 |
| Verification Result 수정가능 | **부재(개념 없음)** | Verification Result 저장소 자체 부재(신규 시 immutable 강제) |
| Sensitive Payload Log | **리스크** | Canonical Payload/원문 로깅 방지 정책 부재(신규 명문화 필요) |
| Timing-unsafe 비교 | **부분(양호)** | 실 verify는 `hash_equals`(`SecurityAudit.php:63-64`) — constant-time. 신규 전 경로에 확대 필요 |
| Cross-Tenant Chain | **실 위반 창** | verify에 tenant 술어 없음(전역 단일 체인) → 멀티테넌트 이식 시 Cross-Tenant 혼입 창 |
| Algorithm Downgrade | **부재(개념 없음)** | Downgrade 차단 게이트 부재(신규) |
| Dual-Digest 없이 교체 | **부재(개념 없음)** | Dual-Digest Transition Foundation 부재(신규) |
| Migration Rehash 미검증 | **부재(개념 없음)** | Semantic Equivalence 검증 부재(신규) |

## 3. 판정

- **Verdict: 무결성 Governance 부재 전제 위 설계.** Critical Gap은 세 부류로 분류된다.
  1. **실 위반(현행 코드에 존재)**: ①Canonicalization 없이 Hash ②Field 문자열 단순연결 ③Algorithm 하드코딩(4개소) ④Digest Input Field 불명확 ⑤Unicode Normalization 없음 ⑥Collection 비결정적 ⑦Head Digest 없음 ⑧Checkpoint/Commit-time Verification 없음 ⑨Tenant 미포함(verify) ⑩fail-open(Verification 실패 무시 창). 정본 대상=`SecurityAudit.php:27,32,39-40`.
  2. **부재(개념 자체 없음 → 순신규)**: Version 미저장·Monetary/Decimal·Display Name Reference·Rotation/Dual-Digest/Migration·Tamper Incident·Verification Result 저장소·Downgrade 차단.
  3. **★해당없음(정직 기술)**: **Weak Algorithm(MD5/SHA-1/CRC) 무결성 사용 = 0.** §61의 "MD5/SHA-1/CRC hashCode DB convenience hash" 무결성 사용, "Weak Algorithm 고객설정 허용", "Legacy Hash Canonical 신뢰"는 현행에 **해당없음**. 이를 P0 Critical Gap으로 계상하면 오탐 — sha1(`CRM.php:589-930`)·md5는 비보안/가명화/벤더강제로 무결성 경로 밖.
- cover: **0** (무결성 Registry/Policy/Version/Canonicalization/Field Set/Tamper/Verification Result 전부 부재. 실 체인 `SecurityAudit`은 확장 대상이나 Gap을 닫지 못함).
- 선행 의존: 실 Ledger Entry·Snapshot·Evidence·Audit·Outbox 부재(§3.1/§3.2 ABSENT) → Gap 실수정은 **BLOCKED_PREREQUISITE**. 이번 차수=설계.

## 4. 확장·구현 방향 (설계)

- **실 위반 Gap 폐쇄(무후퇴 예외=개선)**: `SecurityAudit.php:27` raw concat + `UNESCAPED_UNICODE`를 §13~§22 Canonical Projection(ksort·NFC·Decimal·Timestamp precision·Collection ordering·Reference)로 대체. 산재 `'sha256'` 리터럴 4개소(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`)를 Hash Algorithm Registry(§12)+Policy(§8)로 이관. fail-open(`:32`)·GENESIS-on-error(`:40`)를 §5.11 fail-closed + §27 Versioned Genesis로 격상. Head Digest(§30)·Commit-time Verification(§51)·Tenant 술어(§5.13) 추가.
- **순신규 Gap 충족**: Version 3종(Algorithm/Canonicalization/Field Set) Entry 고정(§5.8)·Monetary/Decimal 정책(§17/§18)·Rotation/Dual-Digest/Migration Foundation(§57~§59)·Tamper Incident SoT(§45)·Verification Result immutable(§50).
- **정직 기술 유지**: Weak Algorithm 무결성 사용 0을 문서에 명시 — 신규 시 §5.6 Weak Algorithm Rejection·§12 차단 목록으로 **예방**(현행 위반 교정 아님). Legacy Hash는 §60에서 LEGACY_WEAK_HASH/비무결성으로 분류·보존(Canonical 승격 금지).
- **무후퇴 보장**: 실 체인 verify 배선(`AdminGrowth.php:1429`)·`Crypto.php`·`MediaHost` 기능 불변(→[[DSAR_APPROVAL_CRYPTO_INTEGRITY_FUNCTION_REGRESSION_GATE]]).
- **실 구현은 선행 Ledger 신설 후 별도 승인세션**(Golden Rule=Extend·verify·배포승인).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_STATIC_LINT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_RUNTIME_GUARDS]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

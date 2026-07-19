# DSAR — Cryptographic Integrity: Function Regression Gate (§72 Regression)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: 무결성 신설·canonicalization 강화가 **기존 실 배선(SecurityAudit::verify·Crypto·MediaHost·Decision 소비)을 후퇴시키지 않음**을 게이트로 고정.

## 1. 원문 전사 (Canonical Contract)

§72 Regression(원문 전사): 기존 Decision Processing / Actions / Ledger / Assignment / Authority / Delegation / Sequential / Rebate / Claim / Settlement / Payment / ERP / Workflow / Audit / Reporting.

의미: Cryptographic Integrity 도입은 **무후퇴 필수**다. 실존하는 무결성 관련 배선(감사 해시체인·verify·AES/HMAC·파일 CAS)과 그 소비처의 기능·응답·계약이 신설 이후에도 동일하게 동작해야 한다. Canonicalization 보강은 무후퇴 예외(개선)이나, 소비 계약(반환 형태·배선)은 보존한다.

## 2. 기존 구현 대조 (GROUND_TRUTH) — 무회귀 보장 대상

| 실 자산 | 현행 동작 | 근거(GROUND_TRUTH) | 회귀 게이트 |
|---|---|---|---|
| **SecurityAudit::verify** | 행별 재계산·`hash_equals`+`prev_hash===$prev`·`{ok,checked,broken_at}` 반환 | `SecurityAudit.php:56-68`(핵심 `:63-64`) | verify 반환 계약(ok/checked/broken_at) 보존 — canonicalization 보강 시에도 소비측 boolean 소비 불변 |
| SecurityAudit append-only write | SHA-256 prev_hash 체인·`created_at` 재계산가능 저장 | `SecurityAudit.php:27,31,51` | 신규 감사 이벤트 계속 append·기존 행 재계산 가능성 유지(Digest Version Entry 고정) |
| SecurityAudit::verify 배선(admin) | `SecurityAudit::verify($pdo)` 호출·`integrity` 노출 | `AdminGrowth.php:1429` | admin 무결성 조회 응답·배선 불변 |
| lastHash / Genesis | `ORDER BY id DESC`·오류시 `'GENESIS'` | `SecurityAudit.php:39-40` | Genesis 격상(§27) 시에도 첫 Entry 생성 흐름 회귀 없음 |
| Crypto AES 키유도 | `sha256($raw,true)` 32B | `Crypto.php:81` | AES 암복호 동작 불변(무결성 정본에 병합 금지·KEEP_SEPARATE) |
| Crypto purpose-bound 토큰 | subkey + HMAC-SHA256·동일 클래스 verify | `Crypto.php:98-99` | 토큰 생성/검증 동작 불변 |
| MediaHost 내용주소 CAS | SHA-256 digest·바이트검증·원자쓰기 | `MediaHost.php:93`(`:88-90`·`:100-102`) | 파일 저장/조회·digest 계산 불변(Attachment는 참조만) |
| NaverSms 서명 | HMAC-SHA256(벤더) | `NaverSms.php:94` | SENS 벤더 서명 불변(외부 어댑터) |
| PII 가명화 | SHA-256/SHA-1 정규화 | `AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115`·`CRM.php:589-930` | 가명화 동작 불변(무결성 아님·Canonical 승격 금지) |
| dedup/apikey/password 해시 | SHA-256/bcrypt | `Db.php:272,998,1006,1219-1220` | dedup/인증 동작 불변(KEEP_SEPARATE) |
| Decision 소비 흐름 | Decision Ledger 실체 부재(설계전용) | §3.1/§3.2 ABSENT | 신설 시 기존 Decisioning(`Decisioning.php:36-60` ad-insights ingest·무관) 불간섭 |

## 3. 판정

- **Verdict: 무회귀 보장 대상 명확 · 대부분 KEEP_SEPARATE.** 무결성 정본은 `SecurityAudit` 패턴 1개로 통합하되, `Crypto`(키재료/토큰)·`MediaHost`(파일 CAS)·PII 가명화·dedup/apikey/password는 **관심사 분리로 병합 금지** — 이들을 무결성 엔진에 흡수하면 오히려 회귀. 회귀 게이트의 핵심은 (a)`SecurityAudit::verify` 반환 계약 보존 (b)admin 배선(`AdminGrowth.php:1429`) 불변 (c)canonicalization 보강이 과거 Entry 검증 가능성을 깨지 않음.
- **★무후퇴 예외(개선)의 경계**: `SecurityAudit.php:27` preimage를 Canonical Projection으로 전환·fail-open(`:32,:39-40`) fail-closed화는 **보안 개선**이므로 후퇴 아님. 단 Digest Version을 Entry에 고정(§5.8)해 과거 Entry는 source version으로 검증 — verify 소비측 계약은 불변.
- cover: **부분** — 회귀 대상 실 자산은 SecurityAudit/Crypto/MediaHost/NaverSms/PII/dedup로 실재. Decision Processing/Assignment/Authority/Delegation/Sequential/Rebate/Claim/Settlement/Payment/ERP/Workflow 계열은 대상 Ledger 부재(설계전용)라 회귀 대상 미형성.
- 선행: Decision/Ledger 실체 부재 → 해당 도메인 회귀 게이트는 선행 신설 후 형성(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **회귀 게이트 정의(신규)**: 무결성 구현 전/후 다음 불변식 검증 —
  1. `SecurityAudit::verify`(`:56-68`) 반환 `{ok, checked, broken_at}` 형태·의미 동일, admin 소비(`AdminGrowth.php:1429`) 응답 동일.
  2. 신규 감사 이벤트 append·기존 체인 verify PASS 유지(canonicalization 전환 시 Digest Version 분기로 과거 Entry 검증 가능).
  3. `Crypto`(`:81,98-99`) 암복호/토큰·`MediaHost`(`:88-102`) 파일 CAS·`NaverSms`(`:94`) 서명 동작·바이트 동일.
  4. PII 가명화(`CRM.php:589-930` 등) identity_id 안정성·dedup/apikey/password(`Db.php:272,998,1006,1219-1220`) 동작 불변.
- **KEEP_SEPARATE 강제**: 무결성 정본에 키재료/PII/dedup/인증 해시 병합 금지(§67 중복감사 결론). Static Lint "중복 Hash Utility"는 이 경계를 보호.
- **회귀 검증 방식**: 레포 test suite 부재이므로(CLAUDE.md) 무결성 테스트(→[[DSAR_APPROVAL_CRYPTO_INTEGRITY_TEST_STRATEGY]]) Regression 스위트로 상기 불변식을 잠그고, 배포 전 수동/E2E 검증 병행(레포 관례).
- **선행 도메인 회귀**: Decision/Ledger/Assignment/Authority/Delegation/Sequential/Settlement/Payment/ERP/Workflow는 선행 실구현 후 각 도메인 회귀 게이트 형성 — 이번 차수는 실 자산(SecurityAudit/Crypto/MediaHost) 보존 게이트만 확정.
- **실 구현·회귀 검증은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_TEST_STRATEGY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_MIGRATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

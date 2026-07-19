# DSAR — Cryptographic Integrity: Test Strategy (§72)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: 레포에 구성된 test suite 없음(CLAUDE.md) — 테스트 전략은 신규 설계. Regression은 별도 문서.

## 1. 원문 전사 (Canonical Contract)

§72 Testing(원문 전사): Unit(Algorithm Registry/Policy·Canonical JSON·Null/Empty/Integer/Decimal/Monetary/Timestamp/Unicode/Encoding/Collection Ordering/Reference Projection·Payload/Context/Entry/Genesis/Previous/Head/Link/Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Checkpoint Digest) · Cross-language(동일 Canonical Payload→동일 Digest) · Property(Deterministic·Same→Same·Different Bound→Different·Sequence/Previous/Tenant/Entry Type 변경→변화·Immutable·Version Binding) · Integration(Commit/Append/Head/Snapshot/Evidence/Audit/Outbox/Attachment Digest·Checkpoint·Correction/Supersession Chain·Retention·Legal Hold·Verification Job·Tamper Incident·Rotation·Migration) · Tamper(각 필드/삭제/삽입/순서/Head/Checkpoint/Target/Algorithm/Canonicalization/Tenant 변경) · Security(MD5/SHA-1/Downgrade/Default Charset/Locale Decimal/Float Amount/Local TS/Invalid Unicode/Malformed/Oversized/Sensitive Log/Cross-Tenant Reuse/Client Injection/Result Mutation/Timing-unsafe/Truncation) · Concurrency(동시 Digest·동시 Append·Head↔Verify·Checkpoint↔Append·Rotation 중 Append·Dual-Digest 중 Verify·Migration↔Verify·Incident 중 중복 Verify) · Regression(기존 Decision Processing/Actions/Ledger/Assignment/Authority/Delegation/Sequential/Rebate/Claim/Settlement/Payment/ERP/Workflow/Audit/Reporting).

의미: 무결성 엔진은 결정성·불변성·변조탐지가 핵심이므로 Property/Tamper/Cross-language 테스트가 필수다. Security 테스트는 약한 알고리즘·Cross-Tenant·Result Mutation·Timing-unsafe를 능동적으로 공격 재현한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §72 테스트군 | 현행 커버 | 근거(GROUND_TRUTH) / 비고 |
|---|---|---|
| Unit(Canonical JSON/Null/Decimal/Monetary/Timestamp/Unicode/Collection Projection) | **0** | canonical projection 파이프라인 부재 → 검증 대상 없음 |
| Unit(Payload/Context/Entry/Genesis/Previous/Head/Checkpoint Digest) | **0** | 구성된 test suite 없음(CLAUDE.md "no PHPUnit"). 실 로직은 `SecurityAudit.php:27,56-68`에 있으나 테스트 없음 |
| Cross-language(동일 Payload→동일 Digest) | **N/A** | 단일 PHP 구현·canonical 표준 부재 |
| Property(Deterministic·Same→Same·Different→Different·Tenant/Previous 변경→변화·Immutable) | **0** | 속성 테스트 부재. 실 체인은 property 만족하나 미검증 |
| Integration(Commit/Append/Head/Checkpoint/Verification Job/Tamper/Rotation) | **0** | 대상 Ledger·Verification Job·Tamper 부재 |
| Tamper(필드/삭제/삽입/순서/Head/Checkpoint/Tenant 변경) | **0** | verify 로직(`SecurityAudit.php:56-68`)은 tamper 검출 가능하나 tamper 시나리오 테스트 부재 |
| Security(MD5/SHA-1/Downgrade/Cross-Tenant/Result Mutation/Timing-unsafe) | **0** | 보안 회귀 테스트 부재. `hash_equals`(`:63-64`) 사용은 timing-safe이나 테스트로 고정 안 됨 |
| Concurrency(동시 Append·Head↔Verify) | **0** | Head-CAS 부재(`SecurityAudit.php:39` DESC)·동시성 테스트 부재 |
| Regression(기존 Decision/Ledger/...) | **별도** | →[[DSAR_APPROVAL_CRYPTO_INTEGRITY_FUNCTION_REGRESSION_GATE]] |

## 3. 판정

- **Verdict: 테스트 전략 전량 신규.** 레포에 구성된 test suite가 없다(CLAUDE.md: "no npm test, no PHPUnit"). 실 verify(`SecurityAudit.php:56-68`)와 `hash_equals`(`:63-64`)는 결정성·timing-safe 속성을 만족하지만 **테스트로 고정되지 않아** 회귀 방어 없음.
- **★정직 기술**: Security 테스트의 "MD5/SHA-1/Downgrade 사용 차단"은 현행에 무결성 Weak Algorithm 사용이 0이므로 **회귀 방지(예방) 테스트** — 현행 결함 재현 아님. Cross-Tenant Reuse·Result Mutation 테스트는 리스크 창(tenant 술어 없음·fail-open) 검증에 유효.
- cover: **0** — 무결성 전용 테스트 전무. 실 로직은 존재하나 unverified(§66 태그 UNVERIFIED에 준함).
- 선행: 대상 Ledger/Verification/Tamper 부재 → Integration/Concurrency 테스트는 결합 대상 없음(BLOCKED_PREREQUISITE). Unit(Canonical Projection)은 canonical serializer 신설 시 즉시 착수 가능.

## 4. 확장·구현 방향 (설계)

- **Unit(신규)**: Algorithm Registry/Policy·Canonical JSON(ksort·NFC·Null/Empty 구분·Integer/Decimal/Monetary scale·Timestamp UTC/precision·Unicode·Encoding·Collection Ordering·Reference) 각 정규화 규칙별 골든 벡터. Digest 계층(Payload/Context/Entry/Genesis/Previous/Head/Link/Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Checkpoint)별 재계산 일치.
- **Cross-language**: 동일 Canonical Payload → 동일 Digest 골든 벡터를 언어중립 fixture로 고정(향후 이식 대비). 현행 단일 PHP지만 Canonical 표준(§13) 준수 증명.
- **Property**: Deterministic·Same→Same·Different Bound→Different·Sequence/Previous/**Tenant**/Entry Type 변경→Digest 변화·Immutable·Version Binding. 실 체인 속성(`SecurityAudit.php:27` preimage 구성)을 property로 고정.
- **Tamper**: 각 필드/삭제/삽입/순서/Head/Checkpoint/Target/Algorithm/Canonicalization/**Tenant** 변경 → verify가 정확한 tamper type·broken_at 반환. 실 verify(`:56-68`) 확장 대상 시나리오.
- **Security(공격 재현)**: Weak Algorithm 거부·Downgrade 차단·Default Charset·Locale Decimal·Float Amount·Local TS·Invalid Unicode·Oversized·Sensitive Log 누출·**Cross-Tenant Reuse**·Client Injection·**Result Mutation**·**Timing-unsafe**(hash_equals 우회 시도)·Truncation. fail-open(`SecurityAudit.php:32`)·tenant 술어 부재 리스크를 회귀 테스트로 잠금.
- **Concurrency**: 동시 Append·Head↔Verify·Checkpoint↔Append·Rotation/Dual-Digest/Migration 중 Verify·Incident 중 중복 Verify. Head-CAS 신설(§30) 검증.
- **CI 편입**: 레포에 test runner 부재이므로 무결성 테스트 도입 시 CI(`deploy.yml` 관례)에 게이트 추가 설계(별도 인프라 결정).
- **실 구현·테스트 작성은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

# DSAR — Cryptographic Integrity: Migration & Rotation Matrix (§73/§80)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: 기존 Digest 덮어쓰기 금지 · Legacy Hash Canonical 승격 금지 · **선행 Ledger 신설 후 별도 세션**.

## 1. 원문 전사 (Canonical Contract)

### §73 실행 절차 17단계 (원문 전사)

①기존 전수조사 ②Algorithm Governance ③Canonicalization ④Field Set ⑤Canonical Projection ⑥Digest Envelope ⑦Aggregate Digest ⑧Entry/Chain Digest ⑨Head/Checkpoint Digest ⑩Commit-time Verification ⑪Read/Periodic Verification ⑫Tamper Detection ⑬Tamper Incident ⑭Rotation Foundation ⑮Legacy Hash Migration ⑯Static Lint/Runtime Guard ⑰Existing Implementation 통합 + 문서/ADR/History.

### §80 Rotation Matrix (원문 헤더 보존 · §57 Mode)

Transition Mode: NEW_ENTRIES_ONLY / DUAL_DIGEST / FULL_REHASH_REFERENCE / CHECKPOINT_ANCHOR / MIGRATION_BY_PARTITION / CUSTOM. Rotation Plan 필드: plan id · tenant · source/target algorithm id · source/target integrity version · affected ledger types · affected sequence range · transition mode · dual-digest start/end · new write policy · historical migration policy · rollback/verification policy · approved by · status · evidence. **기존 Digest 덮어쓰기 금지.**

의미: Migration은 무결성 자산을 신설하고, Algorithm/Canonicalization/Digest Version 전환은 기존 digest를 보존한 채 Dual-Digest/Checkpoint Anchor로 무중단 이행한다. Legacy Hash는 canonical로 복사하지 않고 별도 Source Metadata로 보존한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §73/§80 단계·항목 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| ①기존 전수조사 | **완료(ⓑ)** | GROUND_TRUTH 문서 = 이 조사 결과 |
| ②Algorithm Governance | **부재** | `'sha256'` 하드코딩 4개소(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`) |
| ③~⑥ Canonicalization/Field Set/Projection/Envelope | **부재** | canonical serializer·Field Set·Envelope 0 |
| ⑦~⑨ Aggregate/Entry/Chain/Head/Checkpoint Digest | **부분** | Entry/Chain digest 실재(`SecurityAudit.php:27`)·Head/Checkpoint 부재 |
| ⑩~⑪ Commit/Read/Periodic Verification | **부분** | on-demand verify만(`AdminGrowth.php:1429`) |
| ⑫~⑬ Tamper Detection/Incident | **부분/부재** | 검출 로직(`:56-68`)·Incident SoT 부재 |
| ⑭ Rotation Foundation | **부재** | Rotation Plan/Dual-Digest 0 |
| ⑮ Legacy Hash Migration | **부재(현행 안전)** | Legacy→Canonical 복사 경로 없음. sha1 가명화(`CRM.php:589-930`)는 무결성 아님 |
| ⑯ Static Lint/Runtime Guard | **부재** | 별도 문서 |
| ⑰ Existing 통합 | **설계** | SecurityAudit 패턴 확장(CANONICAL) |
| §80 기존 Digest 덮어쓰기 금지 | **현행 준수** | Digest UPDATE/setter 부재(INSERT/SELECT만·`SecurityAudit.php:8`) |
| 마이그레이션 인프라 | **주의(제약)** | `backend/migrations/`는 세션 172에서 정지·이후 self-healing `ensureTables`(CLAUDE.md). `Migrate.php:38,50,54-60,63-64` schema_migrations는 checksum 저장만(비교 0)=장식 |
| append-only 원장 물리삭제 상충 | **★실 위험** | `media_gc_cron.php:35,43` 감사로그 90일 물리 DELETE — Ledger delete-prevention/Legal Hold와 상충 |

## 3. 판정

- **Verdict: Migration/Rotation Foundation 전량 신규 · 선행 Ledger 신설 후 별도 세션(RP-002).** §73 17단계 중 ①만 완료(ⓑ 조사). ⑦~⑫는 SecurityAudit 패턴으로 부분 실재하나, Head/Checkpoint/Tamper Incident/Rotation은 신규. 실 마이그레이션은 대상 Ledger Entry/Snapshot/Evidence/Audit/Outbox가 없어 **BLOCKED_PREREQUISITE**.
- **★정직 기술**: "Legacy Hash Migration"·"기존 Digest 덮어쓰기 금지"는 현행 위반 경로가 없다 — Legacy→Canonical 복사·Digest UPDATE 부재. 신규 시 **유지할 안전 속성**(§60·§80). Weak Algorithm rehash 대상 0.
- **마이그레이션 인프라 제약**: `backend/migrations/`는 세션 172 정지·이후 self-healing `ensureTables` 관례. 신규 Ledger/무결성 테이블도 이 관례를 따르되(원격 서버에서만 migrate) `schema_migrations.checksum`은 장식(비교 0)이므로 무결성 근거 계상 금지.
- **★실 위험(무후퇴 예외=개선)**: `media_gc_cron.php:35,43`의 감사로그 90일 물리 DELETE는 append-only 무결성 원장을 훼손 → Migration 단계에서 delete-prevention + Legal Hold 대상으로 편입(원장 대상 제외).
- cover: **부분** — ①조사·⑦~⑫ 부분 로직. Rotation/Dual-Digest/Migration Foundation·17단계 절차 0.

## 4. 확장·구현 방향 (설계)

- **17단계 순서 준수**: Algorithm Governance(②) → Canonicalization(③) → Field Set(④) → Projection(⑤) → Envelope(⑥) 기반을 먼저 세운 뒤 Digest 계층(⑦~⑨) → Verification(⑩~⑪) → Tamper(⑫~⑬) → Rotation/Legacy(⑭~⑮) → Lint/Guard(⑯) → 통합(⑰). 각 단계 evidence + ADR/PM History.
- **Rotation Matrix(§80 신규)**: Transition Mode 6종(NEW_ENTRIES_ONLY·DUAL_DIGEST·FULL_REHASH_REFERENCE·CHECKPOINT_ANCHOR·MIGRATION_BY_PARTITION·CUSTOM). Rotation Plan에 source/target algorithm·integrity version·affected ledger types/sequence range·dual-digest start/end·new write/historical migration/rollback/verification policy·approved by. **기존 Digest 덮어쓰기 금지** — 과거 primary digest 보존, secondary digest 병기(§58).
- **Canonicalization 변경 이행**: 단순 rehash 아닌 Semantic Equivalence 검증(§59) — `SecurityAudit.php:27` raw preimage를 Canonical Projection으로 전환할 때 과거 Entry는 source version으로 검증 가능하도록 Digest Version을 Entry에 고정(§5.8).
- **Legacy Hash Import(§60)**: sha1 가명화(`CRM.php:589-930`)·비보안 md5는 LEGACY_WEAK_HASH/비무결성으로 Source Metadata 분류만 — Canonical Digest Field 복사 금지(현행 안전 속성 유지).
- **마이그레이션 절차**: self-healing `ensureTables` 관례로 신규 테이블 생성, 원격 서버에서만 실행(로컬은 dev DB 대상·CLAUDE.md). `media_gc_cron.php:35,43` 물리삭제를 원장 대상에서 제외하는 delete-prevention 반영.
- **무후퇴 보장**: `SecurityAudit`·`Crypto`·`MediaHost`·`Migrate` 기존 동작 불변(→[[DSAR_APPROVAL_CRYPTO_INTEGRITY_FUNCTION_REGRESSION_GATE]]).
- **★실 구현·마이그레이션은 선행 Ledger 신설 완료 후 별도 승인세션(RP-002)** — Golden Rule=Extend·verify·배포승인.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_TEST_STRATEGY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

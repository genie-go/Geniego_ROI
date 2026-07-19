# DSAR — Ledger Verification Reconciliation (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§56 Reconciliation (`APPROVAL_CRYPTO_INTEGRITY_RECONCILIATION`, 원문 전사):
- `Stored vs Recomputed` (Payload / Context / Entry Digest)
- `Previous Digest vs Previous Entry`
- `Head vs Current`
- `Checkpoint vs Range`
- `Snapshot / Evidence / Audit / Outbox / Attachment / Correction / Supersession / Retention / Legal Hold Digest vs Record`
- `DB Source vs Replica`
- `Primary vs Audit Store`
- `Canonical Ledger vs Legacy Hash / ERP Checksum / Workflow History Digest`

의미: Reconciliation은 서로 **독립적으로 계산·저장된 두 무결성 표현이 일치하는지를 대사(對査)**하는 계층이다. ①저장 Digest vs 재계산 Digest, ②Entry의 Previous Digest vs 실제 이전 Entry의 Digest, ③Head Digest vs 현재 마지막 Entry, ④Checkpoint Digest vs 그 구간 재계산, ⑤각 부속 레코드(Snapshot/Evidence/Audit/Outbox/…) Digest vs 원본 레코드, ⑥DB 원본 vs 복제본, ⑦Primary Store vs Audit Store, 그리고 ⑧**Canonical Ledger vs Legacy Hash·ERP Checksum·Workflow History Digest**(이종 시스템 간 교차 대사)를 포함한다. 단일 소스 신뢰 금지 원칙(다소스 교차)의 무결성판이다.

## 2. 기존 구현 대조

- **Reconciliation 대사 계층은 부재** — 두 독립 표현을 비교해 불일치를 집계하는 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `Stored vs Recomputed`(Entry Digest) → **PARTIAL(단일 스토어 내)**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)가 저장 hash를 재계산해 `hash_equals` 비교(`SecurityAudit.php:63-64`) — Stored vs Recomputed의 실 substrate다. 그러나 단일 테이블 내부 자기대사이지, 다중 스토어·이종 시스템 대사가 아니다.
  - `Previous Digest vs Previous Entry` → **PARTIAL**: verify가 `prev_hash===$prev`를 체인 순회로 확인(`SecurityAudit.php:56-68`) — Previous 링크 대사 실재.
  - `Head vs Current` → **ABSENT**: Head Digest 부재. `lastHash()`(`SecurityAudit.php:39-40`)는 물리 조회일 뿐 Head 대사 아님.
  - `Checkpoint vs Range` → **ABSENT**: Checkpoint Digest 부재.
  - `Snapshot/Evidence/Audit/Outbox/… Digest vs Record` → **ABSENT**: 각 부속 Digest 개념·테이블 부재.
  - `DB Source vs Replica`·`Primary vs Audit Store` → **ABSENT**: 이중 스토어 대사 결선 0.
  - `Canonical Ledger vs Legacy Hash/ERP Checksum` → **ABSENT(단 대상 실재)**: 대사 로직은 없으나 대사 상대편은 실재 — `schema_migrations.checksum`(`Migrate.php:50,63-64`, NON_CRYPTOGRAPHIC 계열 저장만)·`CRM.php:589-930`(SHA-1 가명 identity_id, LEGACY_WEAK_HASH). 이들은 Canonical로 승격이 아니라 **대사 상대편(Legacy metadata)**으로만 취급.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (Stored vs Recomputed·Previous 대사는 단일 체인 내 PARTIAL, 다중 스토어·이종·부속 레코드 대사는 전무).
- 선행 의존: §3.1 Immutable Ledger(Head·Checkpoint·부속 Digest)·§3.2 Decision Foundation·§60 Legacy Import ABSENT에 종속 → 대사할 두 번째 표현(Head/Checkpoint/Snapshot/Replica/Legacy 분류본)이 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (대사 계층 전무. verify의 Stored vs Recomputed는 단일 테이블 자기검증).

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_CRYPTO_INTEGRITY_RECONCILIATION` — 8종 대사(Stored vs Recomputed·Previous vs Previous Entry·Head vs Current·Checkpoint vs Range·부속 Digest vs Record·DB vs Replica·Primary vs Audit Store·Canonical vs Legacy/ERP)를 실행하고 불일치를 집계·Incident(§45) 연계.
- Golden Rule=Extend: `SecurityAudit::verify`의 재계산+`hash_equals`(`SecurityAudit.php:56-68`, 핵심 `:63-64`) 대사 로직을 Stored vs Recomputed·Previous vs Previous Entry 대사의 CANONICAL 실증으로 승격.
- **★Legacy는 대사 상대편으로만**: `schema_migrations.checksum`(`Migrate.php:50,63-64`)·`CRM.php:589-930`(SHA-1)·벤더 md5/sha1은 Canonical Ledger로 복사·승격 금지(§60·§5.6) — Reconciliation의 Legacy/ERP checksum 대사 대상으로만 참조하고 별도 Source Metadata로 보존.
- **★Canonicalization 선결**: Stored vs Recomputed 대사가 유의미하려면 저장 시·재계산 시 동일 Canonical Projection이어야 함 — 현행 raw `|`-concat + `json_encode(UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)의 비정규화는 §5.3 위반이므로 대사 전 보강 필수.
- 재사용 substrate: 서버UTC(`SecurityAudit.php:24`)로 대사 시각 기록·`created_at` 재계산 저장(`SecurityAudit.php:31`)으로 재계산 결정성.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0·`journey_decision_log`(`JourneyBuilder.php:1192`) in-place UPDATE는 대사 근거 아님.

관련: [[DSAR_APPROVAL_LEDGER_VERIFICATION_SNAPSHOT]] · [[DSAR_APPROVAL_LEGACY_HASH_IMPORT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

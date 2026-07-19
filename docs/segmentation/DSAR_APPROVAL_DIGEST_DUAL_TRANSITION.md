# DSAR — Dual-Digest Transition Foundation (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§58 Dual-Digest Transition Foundation (원문 전사):
- `primary digest` · `secondary digest`
- `primary algorithm version` · `secondary algorithm version`
- `transition plan ref`
- `generated_at`
- `both verification result`
- `cutover status`
- **과거 Primary Digest 유지.**

의미: Dual-Digest Transition은 Algorithm Rotation(§57)의 실 집행 메커니즘으로, 전환 기간 동안 **각 Entry에 두 개의 Digest(기존 primary + 신규 secondary)를 병행 계산·저장**한다. 각 알고리즘 버전을 명시하고, 두 Digest 모두 검증(both verification result)이 통과해야 하며, cutover status로 전환 진행도를 추적한다. 핵심 계약은 **과거 Primary Digest를 유지**(교체·삭제 금지)하는 것 — 신규 알고리즘은 secondary로 추가될 뿐, 검증된 과거 무결성 근거를 없애지 않는다. Cutover 완료 후에도 과거 Entry의 primary는 그 알고리즘 버전으로 영구 고정된다(§5.8).

## 2. 기존 구현 대조

- **Dual-Digest 병행 계산·저장은 부재** — 한 Entry에 primary+secondary 두 Digest를 함께 두는 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `primary/secondary digest` → **ABSENT**: 모든 실 Digest는 단일 알고리즘 단일 값. `SecurityAudit`는 SHA-256 단일 hash 컬럼(`SecurityAudit.php:27,51`)만 보유·이중 Digest 슬롯 없음.
  - `primary/secondary algorithm version` → **ABSENT**: algorithm version 저장 개념 부재(하드코딩 `'sha256'`).
  - `both verification result` → **ABSENT**: 두 Digest 동시 검증 로직 0. verify(`SecurityAudit.php:56-68`)는 단일 알고리즘 재계산.
  - `transition plan ref`·`cutover status` → **ABSENT**: Rotation Plan(§57)·cutover 추적 부재.
  - **과거 Primary 유지** → **N/A(전환 자체가 없음)**: append-only(`SecurityAudit.php:8`)로 과거 Digest는 물리적으로 유지되나, 이는 전환 개념의 결과가 아니라 append-only의 부수효과.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (단일 Digest 구조로 이중 병행 슬롯·both-verify·cutover 전무).
- 선행 의존: §57 Rotation Plan·§12 Algorithm Registry(algorithm version 데이터화)·§3.1 Immutable Ledger ABSENT에 종속 → 병행할 두 알고리즘·전환 계획·Entry 슬롯이 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (이중 Digest·both verification·cutover status 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 Dual-Digest 슬롯 — Entry Digest 레코드에 primary/secondary digest + 각 algorithm version + transition plan ref + both verification result + cutover status를 추가. 전환 기간 신규 Entry는 두 Digest 병행 계산, 검증은 both-verify.
- Golden Rule=Extend: `SecurityAudit`의 단일 hash 컬럼(`SecurityAudit.php:27,51`)을 이중 Digest 슬롯으로 확장하되, **기존 primary 컬럼은 보존**(과거 Primary 유지·§58). verify(`SecurityAudit.php:56-68`)를 두 알고리즘 재계산 both-verify로 확장.
- **★과거 Primary 불변 보장**: cutover 완료 후에도 과거 Entry의 primary는 그 알고리즘 버전으로 고정 — Stored Digest Setter 금지(§5.8·§62). append-only(`SecurityAudit.php:8`)의 우연적 유지를 정식 불변식으로.
- **★both verification의 fail 정책**: 두 Digest 중 하나라도 실패 시 §46 Tamper Response(Manual Review/Commit 차단) — 현행 `catch` no-op(`SecurityAudit.php:32`) fail-open 금지.
- 재사용 substrate: SHA-256/HMAC(`Crypto.php:81,98-99`)·서버UTC(`SecurityAudit.php:24`)로 generated_at 기록. 신규 secondary는 SHA-256/384/512·SHA3 중 §12 등재분만.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`)의 단일 SHA-256은 dual-digest 근거 아님.

관련: [[DSAR_APPROVAL_DIGEST_ALGORITHM_ROTATION]] · [[DSAR_APPROVAL_DIGEST_VERSION_MIGRATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

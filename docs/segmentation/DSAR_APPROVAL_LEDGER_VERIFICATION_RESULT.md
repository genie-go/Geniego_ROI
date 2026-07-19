# DSAR — Ledger Verification Result (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§50 **Verification Result** (원문 전사) — Verification Run(§49) 내 **개별 검증 단위(Entry/Range/Head/Checkpoint …)의 판정 결과**. Result 12종:

- `VERIFIED`
- `VERIFIED_WITH_WARNINGS`
- `FAILED`
- `TAMPER_DETECTED`
- `CHAIN_BROKEN`
- `HEAD_MISMATCH`
- `CHECKPOINT_MISMATCH`
- `INCOMPLETE`
- `ALGORITHM_UNSUPPORTED`
- `CANONICALIZATION_UNSUPPORTED`
- `SOURCE_UNAVAILABLE`
- `MANUAL_REVIEW_REQUIRED`

필수 필드: `result id` · `run id` · `ledger entry id` · `sequence` · `verification type`(§38) · `expected digest` · `actual digest` · `algorithm` · `integrity version` · `canonicalization version` · `payload result` · `context result` · `reference result` · `previous digest result` · `chain result` · `head result` · `checkpoint result` · `result`(위 12종) · `failure code`(§64) · `verified_at` · `result digest`(결과 자체 무결성) · `status` · `evidence`.

의미: Result는 §39 Entry Verification 순서 ⑦–⑬의 **단계별 판정(payload/context/reference/previous/chain/head/checkpoint result)**을 각각 봉인하고, 이를 12종 종합 결과로 요약한다. `result digest`로 결과 자체를 봉인하여 §5.12(검증 결과도 Immutable)·§44 `VERIFICATION_RESULT_TAMPER_REFERENCE`(결과 변조) 방어를 구현한다. §68 API 제약: **Digest/Verification Result 직접 수정 API 금지.**

## 2. 기존 구현 대조

- **★현행 유일 실 검증기가 반환하는 형상 = `{ok, checked, broken_at}`** (`SecurityAudit.php:56-68`, 핵심 `:63-64`) — 이것이 §50이 확장·대체하려는 정확한 대상이다:
  - `ok`(boolean) → 12종 중 사실상 `VERIFIED` / (파손 시)`CHAIN_BROKEN` 두 상태로만 붕괴. `hash_equals`+`prev_hash===$prev` 이중검증(`:63-64`)은 실질 `chain result`·`previous digest result`에 해당.
  - `checked` → 검사 건수(§49 Run 소관).
  - `broken_at` → 최초 파손 sequence.
- **그러나 §50 Result로서는 대부분 부재**:
  - `payload/context/reference/head/checkpoint result`로 **분해 불가** — payload/context/head/checkpoint Digest 자체가 없음(§26/§25/§30/§37 부재, GROUND_TRUTH 2절).
  - `TAMPER_DETECTED`/`HEAD_MISMATCH`/`CHECKPOINT_MISMATCH`/`INCOMPLETE`/`ALGORITHM_UNSUPPORTED`/`CANONICALIZATION_UNSUPPORTED`/`SOURCE_UNAVAILABLE`/`MANUAL_REVIEW_REQUIRED` 구분 없음(ok=false 단일).
  - `expected/actual digest`·`algorithm`·`integrity version`·`canonicalization version` 미기록(하드코딩 `'sha256'`·버전 레지스트리 부재, GROUND_TRUTH 4절).
  - `result digest`(결과 자체 봉인) 전무 → 결과 변조 방어 없음.
  - 결과를 **저장하지 않음**(휘발성 반환).
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`, verify 0)·`schema_migrations.checksum`(`Migrate.php:50,63-64`, 비교 미실행)은 Result 산출 불가.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (현행 `{ok,checked,broken_at}` 실재 — 확장 대상)
- cover: **0** (12종 Result 체계로서는 부재) — `SecurityAudit::verify`의 반환 형상은 §50이 **명시적으로 확장하는 CANONICAL_VERIFICATION_ENGINE seed**(GROUND_TRUTH 2절 #7). 2종 붕괴 상태를 12종·단계별 result로 확장.
- 선행 의존: §49 Run(상위)·§26/§30/§37 Digest 계층(단계별 result 대상)·§10 Version(algorithm/canonicalization version 기록) 종속.

## 4. 확장/구현 방향 (설계)

- **★현행 `{ok, checked, broken_at}` → §50 12종 Result로 직접 확장** — `ok:true`=`VERIFIED`, `ok:false`+prev불일치=`CHAIN_BROKEN`/`PREVIOUS_DIGEST_MISMATCH`, 재계산 digest 불일치=`TAMPER_DETECTED`. 단계별 result(payload/context/reference/previous/chain/head/checkpoint)를 §39 순서 ⑦–⑬ 각 단계 산출값으로 채운다.
- **Extend(발명 아닌 조립)**: `hash_equals`(`SecurityAudit.php:63-64`)는 이미 **constant-time 비교**(§62 Timing-unsafe 방어) — 그대로 재사용. `broken_at`→Result.`sequence`. `expected/actual digest`는 재계산값 vs 저장값으로 명시 기록(현행은 boolean으로만 붕괴).
- **결과 자체 봉인**: `result digest`(§5.12·§44 VERIFICATION_RESULT_TAMPER_REFERENCE 방어)는 `Crypto.php:81,98-99` SHA-256/HMAC 재사용. §68 "Result 직접 수정 API 금지"를 인바리언트로 고정 — Result 원장은 append-only(SecurityAudit 패턴 `:48-68`).
- **버전 기록 강제**: `algorithm`·`integrity version`·`canonicalization version` 필드는 §10 Version Registry 선행 필요 — 현행 하드코딩 `'sha256'`(GROUND_TRUTH 4절)을 레지스트리 참조로 승격.
- **`SOURCE_UNAVAILABLE`/`INCOMPLETE` 정직화**: 현행 `SecurityAudit.php:32` fail-open은 소스 조회 실패를 삼킴 → §50에서 `SOURCE_UNAVAILABLE`/`INCOMPLETE`로 명시(정상 `VERIFIED`처럼 반환 금지, §52 위배 방어).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_JOB]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RUN]] · [[DSAR_APPROVAL_LEDGER_TAMPER_DETECTION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

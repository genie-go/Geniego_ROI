# DSAR — Ledger Verification Run (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§49 **Verification Run** (원문 전사) — Verification Job(§48)의 **1회 실행 인스턴스**를 봉인하는 레코드. 필수 필드:

- `run id` · `job id` · `tenant` · `ledger` · `partition` · `scope`(§38)
- `requested by`
- `started_at` · `completed_at`
- `first sequence` · `last sequence`
- `expected entry count` · `verified entry count`
- `passed count` · `failed count` · `warning count` · `skipped count`
- `first mismatch sequence` · `last mismatch sequence`
- `result status`(§50 집계)
- `run digest`(Run 자체 무결성)
- `status` · `evidence`

의미: Run은 "이번 검증이 실제로 무엇을 몇 건 검사해 몇 건 통과/실패/경고/스킵했고, 최초·최종 불일치가 어느 sequence인가"를 정량 봉인한다. `expected entry count` vs `verified entry count` 차이는 MISSING/SKIPPED를 드러내고, `first/last mismatch sequence`는 §45 Incident의 affected 범위 근거가 된다. Run 자체도 `run digest`로 봉인되어 검증 이력이 사후 변조되지 않는다(§5.12).

## 2. 기존 구현 대조

- **Verification Run 레코드 부재** — passed/failed/warning/skipped count·first/last mismatch sequence·run digest를 봉인하는 구조체 전무.
- **현행 유일 유사물 = 휘발성 반환값** — `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 실행 결과로 `{ok, checked, broken_at}`만 반환한다:
  - `checked` → `verified entry count`의 **원형(seed)**.
  - `broken_at` → `first mismatch sequence`의 **원형**.
  - **그러나** passed/failed/warning/skipped **분해 없음**(ok=false면 최초 파손에서 중단·이후 미분류), `expected entry count`·`last mismatch sequence`·`started/completed_at`·`requested by`·`run digest` 전무.
  - 결과를 **어디에도 저장하지 않음** → Run으로 봉인되지 않고 호출 즉시 소멸(`AdminGrowth.php:1429`는 노출만).
- **선행 대상 부재** — scope·partition·sequence 범위는 §3.1 Ledger Sequence/Partition ABSENT(GROUND_TRUTH 1절)라 대부분 무대상.
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`, verify 0)는 Run을 생성할 검증기 자체가 없음. `journey_decision_log`(`JourneyBuilder.php:1192`)는 in-place UPDATE라 Run 봉인 부적격.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** — Run 봉인 레코드 전무. `SecurityAudit::verify`의 `{checked, broken_at}`은 Run 필드의 **부분 seed**일 뿐 정량 봉인 레코드가 아니며 저장조차 안 됨.
- 선행 의존: §48 Job(상위)·§50 Result(집계원)·§3.1 Ledger Sequence/Partition 종속. 순신규 봉인 레코드.

## 4. 확장/구현 방향 (설계)

- **순신규 `approval_ledger_verification_run`** — Job 1회 실행마다 생성·봉인. `SecurityAudit::verify`를 **정밀화**하여 최초 파손에서 중단하지 말고 passed/failed/warning/skipped를 **전수 집계**(현행은 ok/broken_at 이분법). `first/last mismatch sequence` 모두 산출.
- **Extend**: `checked`→`verified entry count`, `broken_at`→`first mismatch sequence`로 직접 승격. `expected entry count`는 §40 Range Verification의 Sequence 연속성 대조로 산출(선행 Ledger 종속).
- **Run 자체 봉인**: `run digest`는 `Crypto.php:81,98-99` SHA-256/HMAC 재사용, `started/completed_at`은 `SecurityAudit.php:24` 서버 UTC. Run 원장은 SecurityAudit append-only 패턴(`SecurityAudit.php:48-68`)으로 tamper-evident화(§5.12).
- **실위험 반영**: verify() **tenant 술어 부재**(GROUND_TRUTH 5절 #4) → Run의 `tenant`/`partition` 필드로 격리. `SecurityAudit.php:32` fail-open → Run은 실패도 `failed count`로 정직 집계(삼키지 않음).
- **Result 연결**: Run은 개별 §50 Result의 집계 상위 — Run.result_status는 하위 Result 중 최악(TAMPER_DETECTED > FAILED > WARNINGS > VERIFIED)으로 산정.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_JOB]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RESULT]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

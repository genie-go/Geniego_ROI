# DSAR — Ledger Completeness Verification (06-A-03-02-03-02 · §40/§42)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★★현행 verify **gap 무탐지** — 이 문서의 핵심 결함. Completeness는 §40 Range·§42 Checkpoint의 온전성 축. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

Completeness Verification은 §40 Range Verification·§42 Checkpoint Verification에 분산 정의된다. 원문 전사(발췌):

- §40: `Sequence 연속성` · `Entry Count` · `Previous Digest Chain`.
- §42: `Entry Count` · `누락/중복 Entry` · `Range Overlap/Gap`.
- §44 Tamper Detection 유형: `MISSING_ENTRY` · `INSERTED_ENTRY` · `DUPLICATE_ENTRY` · `SEQUENCE_CHANGED` · `ENTRY_ORDER_CHANGED`.

의미: Completeness Verification은 "체인이 이어져 있는가"를 넘어 "빠진·끼어든·겹친 Entry가 없는가"를 검증한다. 순차 해시 체인은 **삭제 후 재봉인**(연속처럼 보이나 Entry가 사라짐)·**삽입**·**중복**·**순서변경**을 체인 절단만으로는 탐지하지 못하므로, Expected vs Actual Count 대조와 Sequence 연속성(gap 없음)·중복 없음·인접 구간 Overlap/Gap 검출이 필요하다(§45 Tamper Classification의 `DELETION/INSERTION`·`ORDER_MANIPULATION`). §5.11: Verification 실패를 Warning으로 무시 금지 — 누락/중복은 Critical Incident 후보.

## 2. 기존 구현 대조

- **★★현행 verify gap 무탐지 = ABSENT** — GROUND_TRUTH §5: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 **연속 체인만** 검증한다. `prev_hash === $prev`(`SecurityAudit.php:64`)로 인접 두 행의 연결 절단점(`broken_at`)만 보고할 뿐, ①삭제로 인한 **누락**(사라진 Entry) ②삽입으로 인한 잉여 ③**중복** ④순서변경을 원천적으로 탐지하지 못한다. Expected vs Actual Count 대조·논리 Sequence 연속성 검사 로직 전무 → **no hits**.
  - 근거: Sequence가 물리 `id`(`SecurityAudit.php:39` `ORDER BY id DESC`)에 의존 — auto-increment는 삭제된 행의 번호를 재사용하지 않으므로 "id가 연속이 아니어도" verify는 남은 행들끼리 prev 체인만 맞으면 `ok=true`를 반환한다(삭제 은닉 창).
- **부재 항목(전항)**:
  - **Expected vs Actual Entry Count** — 기대 Count 산출·대조 부재.
  - **Sequence 연속성(gap 검출)·중복 검출** — 논리 Sequence 개념 부재로 gap/중복 판정 불가.
  - **Range Overlap/Gap** — Checkpoint 개념 부재(§42), 인접 구간 비교 대상 없음.
  - **MISSING/INSERTED/DUPLICATE_ENTRY·SEQUENCE_CHANGED·ORDER_CHANGED** — §44 Tamper 유형 중 이 5종을 판정하는 로직 전무.
- **실위험 = `media_gc_cron.php:35,43`** — GROUND_TRUTH: append-only 감사로그를 90일 **물리 DELETE**(Legal Hold 예외 없음). 이는 Completeness를 정면으로 파괴하며, 현행 verify가 gap을 못 잡으므로 삭제가 **탐지 없이** 성립한다(누락 은닉의 실제 경로).
- **확장 델타(GROUND_TRUTH §5)**: ③**gap 무탐지**가 이 문서의 정체성. §40 Sequence 연속성·Entry Count·§42 누락/중복·Overlap/Gap 전부 미달.
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger ABSENT. 논리 Sequence·Partition·Checkpoint·Expected Count 산출 근거(Ledger Head Max Sequence) 전무.
- 장식 오인 금지: `menu_audit_log`(`AdminMenu.php:169-212`) verify() 0·`schema_migrations.checksum`(`Migrate.php:50,63-64`) 비교 미실행·`journey_decision_log`(`JourneyBuilder.php:1192`) in-place UPDATE — Completeness 근거 아님.

## 3. 판정

- Verdict: **ABSENT** — Completeness(누락/중복/삽입/순서변경 탐지)는 현행 verify의 **최대 사각지대**. 순차 체인 절단점(`broken_at` `SecurityAudit.php:64`)만 보고하고 삭제·삽입·중복을 탐지하지 못하며, `media_gc_cron.php:35,43`의 물리 DELETE가 이 사각을 통해 무탐지로 성립한다. Expected vs Actual Count·논리 Sequence 연속성 구조 전무. 선행 Ledger Sequence/Checkpoint 실체 없이는 적용 불가 → **BLOCKED_PREREQUISITE**.
- 선행 의존: §3.1 Immutable Ledger(Sequence·Head Max·Checkpoint·Legal Hold) ABSENT·§3.2 Decision Foundation ABSENT. §3.3 Platform Security(SHA-256 `SecurityAudit.php:27`)만 substrate PRESENT.
- cover: **0** (gap/중복/Overlap 탐지 전무. SecurityAudit 연속 체인 검증은 Completeness를 커버하지 못함 — KEEP_SEPARATE).

## 4. 확장/구현 방향 (설계)

- **확장 델타 반영(gap 탐지 신설이 유일 핵심 목적)**:
  1. **논리 Sequence + Expected vs Actual Count**(§40) — 물리 `id`(`SecurityAudit.php:39`) 의존을 tenant·partition별 단조 Ledger Sequence로 대체. `expected = last_sequence - first_sequence + 1` vs `actual_count(distinct sequence)` 대조로 **누락**(actual < expected)·**중복**(distinct < total)을 검출.
  2. **Sequence 연속성 스캔**(§40·§44 `MISSING/SEQUENCE_CHANGED`) — 구간 내 Sequence 집합의 gap(빠진 번호)·중복을 스캔. 순서변경은 Sequence↔물리순서 대조로 검출(§44 `ENTRY_ORDER_CHANGED`).
  3. **Range Overlap/Gap**(§42) — 인접 Checkpoint의 `[first,last]` 비교로 구간 간 겹침·틈 검출([[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]]).
  4. **Tamper 승격**(§45·§5.11) — 누락/중복/삽입/순서변경 검출 시 Warning으로 무시 금지 → §45 Tamper Incident(`DELETION`/`INSERTION`/`ORDER_MANIPULATION`) 생성.
- **실위험 직접 차단** — `media_gc_cron.php:35,43`의 감사로그 90일 물리 DELETE를 검증 대상 원장에서 제외(`delete prevention required`+Legal Hold §36). 무후퇴 예외=개선. Completeness 검증은 이 물리삭제가 남긴 gap을 사후 탐지하는 안전망이기도 하다.
- **재사용 substrate(§3.3)**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 순차 스캔·`hash_equals`(`SecurityAudit.php:64`)를 Count/연속성 스캔과 병행하도록 확장. 각 Entry Digest 재계산은 이미 `SecurityAudit.php:63`.
- **구현 순서**: 선행 Immutable Ledger의 논리 Sequence·Head Max·Checkpoint·Legal Hold 실구현 → Expected Count 산출 근거 확보 → gap/중복/Overlap 스캔 조립 → Tamper Incident 연동. 이번 차수=설계(코드 0). 실 구현=별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_RANGE_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHAIN_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

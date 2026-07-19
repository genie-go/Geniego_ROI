# DSAR — Ledger Checkpoint Verification (06-A-03-02-03-02 · §42)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 현행 Checkpoint 개념 부재 — gap/중복/Overlap 무탐지. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

§42 Checkpoint Verification (원문 전사):

`Range 시작/종료` · `Entry Count` · `모든 Entry Digest` · `Range Chain` · `Previous Checkpoint` · `Checkpoint Digest` · `Policy Version` · `누락/중복 Entry` · `Range Overlap/Gap`.

의미: Checkpoint Verification은 Checkpoint가 대표하는 Sequence 구간이 정확하고 온전한지 검증한다. Checkpoint가 선언한 Range 시작/종료 Sequence, 그 구간의 Entry Count, 구간 내 **모든 Entry Digest**, Previous Digest로 이어진 Range Chain, Previous Checkpoint 연결, Checkpoint Digest 자체의 재계산, Checkpoint Policy Version을 검사하고, 특히 **누락/중복 Entry**와 인접 Checkpoint 간 **Range Overlap/Gap**을 검출한다. §37 정의상 Checkpoint Digest는 `tenant·ledger·partition·first/last included sequence·entry count·ordered entry digest collection·previous checkpoint digest·checkpoint policy version·generated_at`로 구성되며, 대규모는 Merkle Tree/Rolling Digest(Versioned)를 쓰고 **단순 문자열 Concatenation 금지**(§37). Checkpoint는 §40 Range·§71 성능(Checkpoint 기반 Range·Incremental)의 앵커다.

## 2. 기존 구현 대조

- **★현행 Checkpoint 개념 부재 = ABSENT** — GROUND_TRUTH §5-3: `SecurityAudit`은 Checkpoint 개념 부재(§42 Checkpoint Verification 미달). Checkpoint Digest·Range 대표·Previous Checkpoint를 담은 구조체 전무 → **no hits**.
- **부재 항목(전항)**:
  - **Range 시작/종료·Entry Count·모든 Entry Digest** — Checkpoint가 대표할 구간 정의 자체가 없음. `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 전체를 순차로 훑을 뿐 구간 대표 요약(Checkpoint) 미생성.
  - **Range Chain·Previous Checkpoint·Checkpoint Digest·Policy Version** — Checkpoint 레코드 부재로 재계산·대조 대상 없음.
  - **★누락/중복 Entry·Range Overlap/Gap** — GROUND_TRUTH §5: 현행 verify **gap 무탐지**(연속 체인 절단점 `broken_at`만 보고, `SecurityAudit.php:64`). 삭제로 인한 누락·삽입으로 인한 중복·인접 구간 Overlap/Gap을 검출하는 로직 전무(§45 Completeness 미달).
- **혼동 금지(장식) — `schema_migrations.checksum`** — `Migrate.php:50,63-64`의 checksum은 **저장만·비교 미실행**이며 마이그레이션 파일 단위이지 Ledger 구간 Checkpoint가 아니다(GROUND_TRUTH #16 "장식"). Checkpoint Verification 근거로 계상 금지.
- **확장 델타(GROUND_TRUTH §5)**: ③**gap 무탐지**(§42 누락/중복·Overlap/Gap 미달)가 이 문서의 핵심 결함. 추가로 ①Canonicalization 없이 재계산(§5.3) ②tenant 술어 없음 ④Checkpoint 개념 부재.
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger ABSENT. `ledger_checkpoint`·논리 Sequence·Partition 테이블 전무.
- 장식 오인 금지: `menu_audit_log`(`AdminMenu.php:169-212`) verify() 0·`journey_decision_log`(`JourneyBuilder.php:1192`) in-place UPDATE.

## 3. 판정

- Verdict: **ABSENT** — Checkpoint Digest 계층 전무. `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행의 장식이며 Ledger Checkpoint 아님. 현행 verify는 gap/중복/Overlap을 원천적으로 탐지하지 못한다(연속 체인 절단점만). 선행 Ledger Checkpoint 실체 없이는 적용 불가 → **BLOCKED_PREREQUISITE**.
- 선행 의존: §3.1 Immutable Ledger(Checkpoint·Sequence·Partition) ABSENT·§3.2 Decision Foundation ABSENT. §3.3 Platform Security(SHA-256 `SecurityAudit.php:27`)만 substrate PRESENT.
- cover: **0** (Checkpoint 구조·gap/중복/Overlap 탐지 전무. schema_migrations.checksum은 장식으로 계상 금지).

## 4. 확장/구현 방향 (설계)

- **순신규(Checkpoint 계층 신설)**: §37 `APPROVAL_LEDGER_CHECKPOINT_DIGEST`(tenant·ledger·partition·first/last included sequence·entry count·ordered entry digest collection·previous checkpoint digest·checkpoint policy version·generated_at) 신설. 대규모는 Merkle Tree/Rolling Digest(Versioned)·단순 문자열 Concatenation 금지(§37).
- **확장 델타 반영(gap 탐지 신설이 핵심 교정)**:
  1. **누락/중복 Entry·Range Overlap/Gap**(§42·§45) — 현행 gap 무탐지의 직접 교정. Checkpoint의 `entry count` vs `last-first+1` 대조로 누락·중복을 검출하고, 인접 Checkpoint의 `[first,last]` 구간 비교로 Overlap/Gap을 검출([[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]]).
  2. **Checkpoint Digest 재계산**(§5.3 Canonicalization) — ordered entry digest collection을 raw concat(§37 금지·`SecurityAudit.php:27` 패턴 답습 금지)이 아니라 Canonical 직렬화(Merkle/Rolling)로 재계산·`hash_equals` 비교(`SecurityAudit.php:64` 패턴 재사용, Constant-time).
  3. **Tenant/Partition Binding**(§5.13) — Checkpoint를 `tenant_id`·`partition`별로 분리(현행 전역 단일 체인).
  4. **Previous Checkpoint 연결** — Checkpoint 간 체인으로 Checkpoint 자체 위·변조 방지.
- **재사용 substrate(§3.3)**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 "모든 Entry Digest" 순차 재계산 로직을 구간 한정 형태로 재사용(각 Entry Digest 재계산은 이미 `SecurityAudit.php:63`). `hash_equals`(`SecurityAudit.php:64`)·SHA-256(`SecurityAudit.php:27`)·서버UTC(`SecurityAudit.php:24`).
- **성능(§71)**: Checkpoint 기반 Range Verification으로 Full vs Incremental 분리 — 매 검증 전수 대신 마지막 Checkpoint 이후만 검증. Checkpoint는 §40 Range의 앵커.
- **구현 순서**: 선행 Immutable Ledger의 Checkpoint·Sequence·Partition 실구현 → Checkpoint Digest 재계산기 조립 → §42 9항 검증. 이번 차수=설계(코드 0). 실 구현=별도 승인세션.
- `media_gc_cron.php:35,43`(감사로그 90일 물리 DELETE)은 Checkpoint의 Entry Count·Range를 파괴하는 실위험 — 검증 대상 원장은 물리삭제 제외(무후퇴 예외=개선).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_RANGE_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_HEAD_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

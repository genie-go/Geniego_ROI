# DSAR — Ledger Range Verification (06-A-03-02-03-02 · §40)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 실존 `SecurityAudit::verify` 순차검증을 Sequence 구간 검증으로 **확장**. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

§40 Range Verification (원문 전사):

`시작/종료 Sequence 존재` · `Sequence 연속성` · `Entry Count` · `각 Entry Digest` · `Previous Digest Chain` · `Entry Type Policy` · `Mandatory Reference` · `마지막 Entry↔Range Head` · `Checkpoint Digest 일치`.

의미: Range Verification은 임의의 Sequence 구간(start~end)이 온전한지 검증한다. 구간 양 끝 Sequence의 존재를 확인하고, 그 사이 Sequence가 **연속**(gap·중복 없음)인지, Entry Count가 기대치와 일치하는지, 각 Entry가 자기 Digest에 부합하는지(§39), Previous Digest가 이전 Entry로 정확히 연결되는지(§5.9), Entry Type이 정책에 부합하는지, 필수 Reference(§43)가 존재하는지, 구간의 **마지막 Entry가 Range Head를 정확히 지시**하는지(§41), 그리고 이 구간을 대표하는 Checkpoint Digest(§42)와 재계산이 일치하는지를 검사한다. Range Verification은 §38 `SEQUENCE_RANGE`·`PARTITION`·`CHECKPOINT_RANGE` Scope의 실행 본체다.

## 2. 기존 구현 대조

- **부분 근사 = `SecurityAudit::verify`(`SecurityAudit.php:56-68`)** — 전체 로그를 순차로 훑으며 각 행 Digest 재계산(`SecurityAudit.php:63`)·Previous Digest Chain(`prev_hash === $prev` `SecurityAudit.php:64`)을 검증한다. 이는 §40의 "각 Entry Digest"·"Previous Digest Chain" 두 항목을 FULL_LEDGER 전체 범위로만 수행하는 형태다.
- **부재 항목**:
  - **시작/종료 Sequence·구간 인자** — verify는 범위 인자(start/end)를 받지 않음. 임의 구간 검증 불가 → **no hits**.
  - **Sequence 연속성·Entry Count** — 현행은 절단점 `broken_at`만 보고. Sequence는 `id DESC`(`SecurityAudit.php:39`) 물리 auto-increment에 의존할 뿐 논리 Sequence·연속성·기대 Count 검증 없음 → gap/삭제/삽입 무탐지(§42/§45 Completeness 미달).
  - **Entry Type Policy·Mandatory Reference** — Entry Type별 정책·필수 Reference 존재 검증 부재.
  - **마지막 Entry↔Range Head·Checkpoint Digest 일치** — Head Digest·Checkpoint Digest 개념 자체가 부재(`SecurityAudit.php:39` `ORDER BY id DESC`는 마지막 행 조회일 뿐 Head Digest 재계산·검증 아님).
- **확장 델타(GROUND_TRUTH §5)**: ①Canonicalization 없이 재계산(§5.3 위반, `SecurityAudit.php:27`) ②tenant 술어 없음(전역 단일 체인) ③**gap 무탐지**(연속 체인만·§40 Sequence 연속성·Entry Count 미달) ④Head-CAS/Checkpoint 부재(마지막 Entry↔Range Head·Checkpoint Digest 일치 불가).
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger ABSENT. `ledger_entry.ledger_sequence`·Partition·`ledger_checkpoint`·`ledger_head` 테이블 전무 → Range·연속성·Count·Head/Checkpoint 대조 대상 자체가 없다.
- 장식 오인 금지: `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행 → Range 검증 근거 아님. `menu_audit_log`(`AdminMenu.php:169-212`) verify() 0.

## 3. 판정

- Verdict: **ABSENT (검증기 순차 패턴은 확장 가능·Range 개념 자체는 부재)** — "각 Entry Digest"·"Previous Digest Chain"은 `SecurityAudit.php:63-64`에 실재하나 FULL_LEDGER 전체 모드로만. §40의 정체성인 임의 구간(시작/종료 Sequence)·Sequence 연속성·Entry Count·Head/Checkpoint 대조는 전부 부재. 선행 Ledger Sequence/Head/Checkpoint 실체 없이는 적용 불가 → **BLOCKED_PREREQUISITE**.
- 선행 의존: §3.1 Immutable Ledger(Sequence·Partition·Head·Checkpoint) ABSENT·§3.2 Decision Foundation ABSENT. §3.3 Platform Security(SHA-256 `SecurityAudit.php:27`)만 substrate PRESENT.
- cover: **0** (범위 검증 구조 전무. SecurityAudit 순차 전수는 KEEP_SEPARATE — Range Verification 대체 아님).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 순차 재계산+prev_hash 검증을 범위 인자를 받는 형태로 일반화 — `verifyRange(start_sequence, end_sequence, partition, tenant)`. 각 Entry Digest·Previous Digest Chain은 이미 실재(`SecurityAudit.php:63-64`)하므로 구간 술어만 추가.
- **확장 델타 반영(신규 필수 보강)**:
  1. **Sequence 연속성·Entry Count**(§40·§45) — 물리 `id`(`SecurityAudit.php:39`) 의존을 논리 Ledger Sequence로 대체하고, `expected_count = end - start + 1` vs `actual_count`를 대조해 gap/삭제/삽입/중복을 검출([[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]]). 현행 gap 무탐지의 직접 교정.
  2. **Canonicalization 선행**(§5.3) — 각 Entry Digest 재계산을 raw concat(`SecurityAudit.php:27`)이 아니라 Canonical Projection으로(무후퇴 예외=개선).
  3. **Tenant/Partition Binding**(§5.13) — 구간을 `WHERE tenant_id=? AND partition=?`로 제한(현행 전역 단일 체인).
  4. **마지막 Entry↔Range Head·Checkpoint 일치** — 선행 Head Digest([[DSAR_APPROVAL_LEDGER_HEAD_VERIFICATION]])·Checkpoint Digest([[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]]) 실체 신설 후 구간 끝단과 대조. Checkpoint 기반 Range는 §71 성능(Full vs Incremental 분리)의 핵심.
- **구현 순서**: 선행 Immutable Ledger의 Sequence·Partition·Head·Checkpoint 실구현 → 구간 인자화 → 연속성/Count/Reference/Head/Checkpoint 검사 조립. 이번 차수=설계(코드 0). 실 구현=별도 승인세션.
- `media_gc_cron.php:35,43`(감사로그 90일 물리 DELETE)은 Range의 Entry Count·연속성을 파괴하는 실위험 — Range 검증 대상 원장은 `delete prevention required`+Legal Hold로 물리삭제 제외(무후퇴 예외=개선).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_ENTRY_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_HEAD_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

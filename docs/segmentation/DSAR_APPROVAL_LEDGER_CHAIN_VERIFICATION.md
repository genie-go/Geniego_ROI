# DSAR — Ledger Chain Verification (06-A-03-02-03-02 · §38)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 이 문서는 실존 `SecurityAudit::verify`(CANONICAL_VERIFICATION_ENGINE)를 **확장**하는 최상위 Verification Scope 정의다. file:line 인용은 GROUND_TRUTH([[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§38 Chain Verification Scope (원문 전사) — 검증 대상 범위 14종:

`SINGLE_ENTRY` · `ENTRY_WITH_PREVIOUS` · `SEQUENCE_RANGE` · `PARTITION` · `CHECKPOINT_RANGE` · `APPROVAL_CASE` · `DECISION_INSTANCE` · `DECISION_SLOT` · `FULL_LEDGER` · `CORRECTION_CHAIN` · `SUPERSESSION_CHAIN` · `RETENTION_CHAIN` · `LEGAL_HOLD_CHAIN` · `CUSTOM`.

의미: Chain Verification Scope는 "무엇을 검증하는가"의 경계를 데이터로 선언한다. 단일 Entry의 자기 무결성(SINGLE_ENTRY), 직전 Entry와의 연결(ENTRY_WITH_PREVIOUS), 임의 Sequence 구간(SEQUENCE_RANGE), Partition 단위(PARTITION), Checkpoint가 대표하는 구간(CHECKPOINT_RANGE), 비즈니스 축(APPROVAL_CASE·DECISION_INSTANCE·DECISION_SLOT), 전체 원장(FULL_LEDGER), Correction/Supersession/Retention/Legal Hold 체인까지가 각각 독립 검증 단위다. 각 Scope는 §39(Entry 순서)·§40(Range)·§41(Head)·§42(Checkpoint)·§43(Reference) 검증 절차를 조합한다. 관련 원칙: §5.9(Hash Chain은 이전 Entry 포함)·§5.13(Entry/Head Verification은 고객설정으로 비활성 불가).

## 2. 기존 구현 대조

- **실 Chain Verification 엔진 = `SecurityAudit::verify`(`SecurityAudit.php:56-68`)** — 유일한 실 검증기. 행별로 preimage를 **재계산**하고(`SecurityAudit.php:63`) `hash_equals`로 저장 해시와 비교하며 동시에 `prev_hash === $prev`를 확인(`SecurityAudit.php:64`), `{ok, checked, broken_at}`를 반환한다. 실 배선은 `AdminGrowth.php:1429`(`integrity` 노출). 이는 §38의 `FULL_LEDGER` Scope 하나에 근사하는 순차 전수 검증 패턴이다.
- **그러나 Scope 개념 자체가 부재** — `SecurityAudit::verify`는 인자로 범위(start/end sequence·partition·case·checkpoint)를 받지 않는다. `SINGLE_ENTRY`·`ENTRY_WITH_PREVIOUS`·`SEQUENCE_RANGE`·`PARTITION`·`CHECKPOINT_RANGE`·`APPROVAL_CASE`·`DECISION_INSTANCE`·`DECISION_SLOT`·`CORRECTION/SUPERSESSION/RETENTION/LEGAL_HOLD_CHAIN` 14종을 선택·조합하는 구조 → **no hits**. 전체 로그를 처음부터 끝까지 한 번에 훑는 단일 모드만 존재.
- **확장 델타(GROUND_TRUTH §5)** — 현행 verify는 ①Canonicalization 없이 재계산(preimage=raw `|`-concat + `json_encode(...,UNESCAPED_UNICODE)`, `SecurityAudit.php:27`·§5.3 위반) ②tenant 술어 없음(전역 단일 체인, `SecurityAudit.php:59` 계열·WHERE tenant_id 부재) ③gap 무탐지(연속 체인 절단점 `broken_at`만 보고, 삭제·삽입·중복 Entry 미탐지·§42/§45 Completeness 미달) ④Head-CAS/Checkpoint 개념 부재(`SecurityAudit.php:39` `ORDER BY id DESC` 조회일 뿐 Head Digest·Checkpoint Range 없음).
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용·코드/테이블 0). `ledger_entry`·`ledger_head`·`ledger_checkpoint`·Partition·Correction/Supersession/Retention/Legal Hold 테이블이 없어 `PARTITION`·`CHECKPOINT_RANGE`·`APPROVAL_CASE`·각 CHAIN Scope가 지시할 대상 자체가 없다.
- 장식 오인 금지: `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`)은 verify() 0(레포 어디에도 재계산기 없음)·`schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행 → Chain Verification 근거로 계상 금지.

## 3. 판정

- Verdict: **검증기 패턴 PRESENT·확장 / 실 Ledger Entry·Head·Checkpoint 부재로 적용 BLOCKED_PREREQUISITE** — `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 재계산+`hash_equals`+prev_hash 이중검증(`SecurityAudit.php:63-64`)을 실제 수행하는 CANONICAL_VERIFICATION_ENGINE이므로 Chain Verification의 핵심 패턴은 실재·확장 대상이다. 그러나 Scope 14종을 선택·조합하려면 선행 Immutable Ledger(Entry/Sequence/Partition/Head/Checkpoint/Correction/Supersession)가 데이터로 존재해야 하는데 전무 → 적용 BLOCKED_PREREQUISITE.
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT. §3.3 Platform Security Foundation(SHA-256 `SecurityAudit.php:27`·서버UTC `SecurityAudit.php:24`)만 재사용 substrate로 PRESENT.
- cover: **0** (실 검증기는 FULL_LEDGER 단일 모드에 근사하나 14 Scope 선택·tenant/partition/checkpoint 인지 부재. SecurityAudit는 단일 감사트레일 순차검증 패턴으로 KEEP_SEPARATE — Chain Verification Scope 정의 대체 아님).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 행별 재계산+`hash_equals`+prev_hash 이중검증을 CANONICAL_VERIFICATION_ENGINE으로 삼아, 인자로 Scope(범위)를 받는 형태로 일반화. `verify(scope, start, end, partition, ...)` → `{ok, checked, broken_at, scope, mismatch_summary}`. 순차 전수(FULL_LEDGER)는 이미 실재하므로 SINGLE_ENTRY/ENTRY_WITH_PREVIOUS/SEQUENCE_RANGE는 술어 추가만으로 도출.
- **확장 델타 반영(설계 필수 보강)**:
  1. **Canonicalization 선행**(§5.3) — 재계산 preimage를 raw concat(`SecurityAudit.php:27`)이 아니라 §13~§22 Canonical Projection 결과로 대체. 무후퇴 예외=개선(이식·재사용 전 Canonical Envelope 보강 필수).
  2. **Tenant Binding**(§5.13·§39⑬) — verify에 `WHERE tenant_id=?` 술어 추가(현행 전역 단일 체인 `SecurityAudit.php:59` 계열). Cross-Tenant Chain을 Scope 경계에서 차단.
  3. **Completeness/Gap 탐지**(§42/§45) — 연속 체인 `broken_at`만이 아니라 Sequence 연속성·Entry Count·삭제/삽입/중복을 Scope별로 검출([[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]]).
  4. **Head/Checkpoint Scope** — `CHECKPOINT_RANGE`·Head 지시는 선행 Head Digest([[DSAR_APPROVAL_LEDGER_HEAD_VERIFICATION]])·Checkpoint Digest([[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]]) 실체 신설 후 결합.
- **구현 순서**: 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation 실구현 → Entry/Head/Checkpoint/Partition 테이블 확보 → Scope 14종 라우팅을 verify 확장으로 조립. 이번 차수=설계 명세(코드 0). 실 구현=별도 승인세션(RP-002).
- `menu_audit_log`(`AdminMenu.php:169-212`)·`schema_migrations.checksum`(`Migrate.php:50,63-64`)·`journey_decision_log`(`JourneyBuilder.php:1192`, in-place UPDATE)은 Chain Verification 대상 원장으로 계상 금지(검증불가 장식).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_ENTRY_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_RANGE_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_HEAD_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_COMPLETENESS_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

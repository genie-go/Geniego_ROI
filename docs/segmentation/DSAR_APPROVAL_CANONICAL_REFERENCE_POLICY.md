# DSAR — Canonical Reference Policy (06-A-03-02-03-02 · §22)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§22 Reference Policy(원문 전사):
- 참조는 **Stable Identifier**만 canonical 입력: `tenant_id` · `decision_record_id` · `decision_slot_id` · `actor_subject_id` · `assignment_id` · `authority/delegation_resolution_id` · `step_instance_id` · `ledger_entry_id` · `ledger_sequence` · `version_id`
- **금지**: Display Name · Email · UI Label · Localized Name · Mutable External Description · 현재 조직/직책명
- 필요 시 **Snapshot Identifier + Snapshot Digest** 포함(가변 참조를 시점 고정)

의미: Digest 입력의 참조 필드는 시간에 따라 변하는 표시값(이름·이메일·직책·현지화 라벨)이 아니라 **불변 안정 식별자**여야 한다. 표시명을 해시에 넣으면 표시명 변경만으로 Digest가 바뀌어 무결성 검증이 깨지거나, 반대로 식별자 변조가 표시명 뒤에 숨는다. 가변 대상은 시점 스냅샷의 식별자+Digest로 고정한다.

## 2. 기존 구현 대조

- **canonical Reference Policy는 부재.** Stable Identifier만 canonical 입력으로 강제하고 Display Name/Email/UI Label을 배제하는 규칙 전무(no hits).
- 실 해시체인 `SecurityAudit.php:27` preimage는 `tenant·actor·action`을 포함하나, 이들이 **Stable Identifier인지 표시값인지 규율되지 않는다** — 스키마상 무엇이 들어오든 concat될 뿐 "Display Name 금지·Stable Identifier 필수" 계약이 없다. GROUND_TRUTH는 이 필드들의 표시명 참조 여부를 **명시하지 않으므로**, 현행이 Display Name을 쓰는지 여부는 **단정 보류**(판정 규율).
- §22가 열거한 도메인 식별자(`decision_record_id`·`decision_slot_id`·`assignment_id`·`authority/delegation_resolution_id`·`step_instance_id`·`ledger_entry_id`·`ledger_sequence`·`version_id`)의 **원천 Aggregate 자체가 부재** — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT.
- Snapshot Identifier+Snapshot Digest(가변참조 시점고정) → no hits.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation **ABSENT** → 참조할 Stable Identifier(decision/slot/assignment/authority/step/ledger)의 원천 부재로 **BLOCKED_PREREQUISITE**. §14 Field Set·§13 Canonicalization Policy에도 연쇄.
- cover: **0** (Stable Identifier 강제·Display Name 배제 규칙 전무. `SecurityAudit` 참조 필드는 표시명 여부 미확인 — GROUND_TRUTH 부재로 단정 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 Reference Policy 데이터 선언(§22): Field Set(§14)의 `reference-only fields`를 Stable Identifier(10종 열거)로만 한정하고, Display Name·Email·UI Label·Localized Name·직책명은 **canonical 입력에서 배제**. 표시가 필요한 값은 §20 Unicode Policy Canonical Code 또는 Snapshot Digest로 대체.
- Snapshot 참조: 가변 대상(actor 조직/직책 등)은 `Snapshot Identifier + Snapshot Digest`로 시점 고정 — §25 Context Digest(actor identity snapshot ref)·§32 Snapshot Digest와 결합.
- 차단 집행: §62 Static Lint(Display Name Digest Reference 차단)·§63 Runtime Guard. `SecurityAudit` 이관 시 actor/tenant 필드가 Stable Identifier(subject_id·tenant_id)인지 검증 후 canonical 입력으로 승격(표시명이면 식별자로 교체 — 개선).
- 다음 EPIC 연계: §22 식별자 다수(actor_subject_id·authority/delegation_resolution_id)는 후속 06-A-03-02-03-03(Actor Identity Assurance)의 입력 — 그 단계에서 Stable Identifier 정본 확정.

관련: [[DSAR_APPROVAL_CANONICAL_FIELD_SET]] · [[DSAR_APPROVAL_CANONICAL_COLLECTION_ORDERING]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

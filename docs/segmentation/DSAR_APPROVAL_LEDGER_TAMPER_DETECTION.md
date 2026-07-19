# DSAR — Ledger Tamper Detection (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§44 **Tamper Detection 유형** (원문 전사) — Verification(§38–§43)이 Stored Digest와 Recomputed Digest의 불일치를 발견했을 때, 그 불일치를 **무엇이 변조되었는가**로 분류하는 탐지 유형 집합:

- `PAYLOAD_DIGEST_MISMATCH` — Canonical Business Payload 변조
- `CONTEXT_DIGEST_MISMATCH` — Context(§25) 변조
- `REFERENCE_DIGEST_MISMATCH` — Reference(§22) 변조
- `ENTRY_DIGEST_MISMATCH` — Entry Digest(§26) 자체 불일치
- `PREVIOUS_DIGEST_MISMATCH` — 이전 Entry Digest 링크 변조
- `CHAIN_BREAK` — Hash Chain 단절
- `MISSING_ENTRY` — Entry 삭제
- `INSERTED_ENTRY` — Entry 삽입
- `DUPLICATE_ENTRY` — Entry 중복
- `SEQUENCE_CHANGED` — Ledger Sequence 변경
- `ENTRY_ORDER_CHANGED` — Entry 순서 변경
- `HEAD_DIGEST_MISMATCH` · `HEAD_SEQUENCE_MISMATCH` — Ledger Head(§30) 위조
- `CHECKPOINT_DIGEST_MISMATCH` · `CHECKPOINT_RANGE_MISMATCH` — Checkpoint(§37) 범위 변조
- `LINK_MISMATCH` · `SNAPSHOT_MISMATCH` · `EVIDENCE_MISMATCH` · `AUDIT_MISMATCH` · `OUTBOX_MISMATCH` · `ATTACHMENT_MANIFEST_MISMATCH` — 부속 Digest(§31–§33) 변조
- `CORRECTION_TARGET_CHANGED` · `SUPERSESSION_TARGET_CHANGED` — Correction/Supersession(§34–§35) 대상 변조
- `RETENTION_ACTION_CHANGED` · `LEGAL_HOLD_CHANGED` — Retention/Legal Hold(§36) 변조
- `ALGORITHM_DOWNGRADE` — 강한 Algorithm→약한 Algorithm 하향
- `CANONICALIZATION_VERSION_MISMATCH` · `FIELD_SET_VERSION_MISMATCH` — 정규화/필드셋 버전 불일치
- `CROSS_TENANT_CHAIN` — 테넌트 경계 침범 체인
- `UNKNOWN_ALGORITHM` — 미등록 Algorithm
- `LEGACY_HASH_UNTRUSTED` — Legacy Hash를 Canonical로 오신뢰
- `VERIFICATION_RESULT_TAMPER_REFERENCE` — 검증 결과 자체 변조
- `CUSTOM`

의미: Tamper Detection은 **탐지(“다르다”)를 유형화(“무엇이 어떻게 다른가”)로 승격**하는 계층이다. §39 Entry Verification 순서의 ⑫(Stored Digest 비교)·⑬(Sequence/Tenant/Partition Binding)에서 발생한 불일치는 원인별로 위 유형에 매핑되어, §45 Classification(Severity/Category)·§45 Incident·§46 Response로 흘러간다.

## 2. 기존 구현 대조

- **Tamper 유형 분류 체계 부재** — 30여 종의 탐지 유형을 데이터로 선언·판별하는 구조체 전무. 불일치를 “PAYLOAD/CHAIN/HEAD/…” 어느 유형으로도 분류하지 않는다.
- **현행 유일 유사물** = `SecurityAudit::verify`(`SecurityAudit.php:56-68`, 핵심 `:63-64`): 행별 재계산 후 `hash_equals`+`prev_hash===$prev` 이중검증으로 **최초 파손 위치**만 `{ok, checked, broken_at}`로 반환한다(`AdminGrowth.php:1429`에서 소비). 이는 `CHAIN_BREAK`/`ENTRY_DIGEST_MISMATCH` **개념의 씨앗**이지만, "체인이 어디서 끊겼다"는 단일 boolean+위치일 뿐 **PAYLOAD vs CONTEXT vs PREVIOUS vs HEAD vs CHECKPOINT를 구분하지 않는다**(payload/context/head/checkpoint 자체가 없으므로 판별 불가). MISSING/INSERTED/DUPLICATE/SEQUENCE_CHANGED/CROSS_TENANT_CHAIN/ALGORITHM_DOWNGRADE 유형은 전무.
- **탐지 대상 자체가 없음** — §26 Entry Digest·§28 Chain·§30 Head·§37 Checkpoint·§32 Snapshot/Evidence/Audit/Outbox Digest가 부재(GROUND_TRUTH 2절)하여, 이 유형들의 대부분은 결합할 대상이 없다.
- **장식 오인 금지** — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`)은 verify()가 **0**(레포 어디에도 재계산기 없음)·preimage `ts`(`:195` local-tz)가 `created_at`에 미저장(`:199-203`)되어 재계산 불가 → 어떤 Tamper 유형도 탐지 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]). `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** — Tamper 유형 분류 체계 전무. `SecurityAudit::verify`(`:56-68`)의 `broken_at`은 `CHAIN_BREAK` 탐지의 **원형(seed)**으로 KEEP_SEPARATE 재사용하되, 30여 종 유형 분류를 대체하지 못한다(단일 위치≠유형 분류).
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(GROUND_TRUTH 1절) → Entry/Head/Checkpoint/Snapshot/Evidence/Audit/Outbox 대상 부재로 대부분 유형이 공회전. 순신규 유형 다수(Incident/Response로 이어지는 상위 계층 포함).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: `SecurityAudit::verify`의 `{ok, checked, broken_at}`를 **Tamper 유형 판별기의 저수준 프리미티브**로 재사용. `broken_at`이 곧 최초 mismatch sequence이며, 여기에 "재계산한 Payload/Context/Previous/Entry Digest 중 어느 것이 어긋났는가"를 §39 순서 ⑦–⑫의 단계별 비교 결과로 부착하여 유형(PAYLOAD/CONTEXT/PREVIOUS/ENTRY_DIGEST_MISMATCH)으로 승격한다.
- **순신규 탐지 유형군**: MISSING/INSERTED/DUPLICATE_ENTRY·SEQUENCE_CHANGED·ENTRY_ORDER_CHANGED는 §40 Range Verification의 Sequence 연속성·Entry Count 대조로만 판별 가능 → 선행 Ledger Sequence(§3.1) 실구현 종속. HEAD/CHECKPOINT_MISMATCH는 §41/§42, CROSS_TENANT_CHAIN은 §5.13 Tenant Binding에 종속.
- **실위험(무후퇴 예외=개선)**: 현행 `SecurityAudit.php:32`의 `catch` no-op fail-open은 체인 silent reset → 탐지 자체가 무력화되는 창(§5.11 위배). 이식·재사용 전, verify 실패를 **탐지 이벤트로 승격**(fail-closed)하도록 보강 필수. 또한 `:39` GENESIS-on-error도 조용한 체인분기 원인.
- **탐지≠분류≠대응 분리**: 이 유형(§44)은 순수 판별만. Severity/Category는 §45([[DSAR_APPROVAL_LEDGER_TAMPER_CLASSIFICATION]]), 사건 기록은 §45 Incident([[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]]), 차단/대응은 §46([[DSAR_APPROVAL_LEDGER_TAMPER_RESPONSE_POLICY]])로 위임.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_CLASSIFICATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[DSAR_APPROVAL_LEDGER_TAMPER_RESPONSE_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]] · [[reference_menu_audit_log_not_tamper_evident]].

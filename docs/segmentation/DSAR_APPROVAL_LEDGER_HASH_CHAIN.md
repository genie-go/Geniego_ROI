# DSAR — Ledger Hash Chain (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.
> ★ 실존 substrate `SecurityAudit` prev_hash 체인을 CANONICAL 패턴으로 확장하는 핵심 노드.

## 1. 원문 전사 (Canonical Contract)

§28 Hash Chain — Chain Digest 입력(원문 전사):
- `Previous Entry Digest`
- `Payload Digest` + `Context Digest` + `Reference Digest`
- `Sequence`
- `Entry Type`
- `Integrity Version`
- `Ledger Identity` + `Partition Identity`

규율(원문 전사): **Byte Layout·Canonical Envelope Schema를 문서화·Versioning.** (§5.9: Current Payload+Current Context+Previous Entry+Ledger Identity+Partition Identity+Sequence+Entry Type+Digest Version.)

의미: Hash Chain은 각 Entry의 Chain Digest에 **직전 Entry의 digest를 포함**시켜 삽입·삭제·순서변경·previous 변경을 전파 탐지 가능하게 만드는 연결이다. §24가 payload에서 배제한 sequence/previous를 바로 이 Chain 계층에서 결합한다. Byte Layout을 버전화·문서화해야 언어/환경 무관 동일 Chain Digest를 재현할 수 있다.

## 2. 기존 구현 대조

- **★유일 실 prev_hash 체인 = `SecurityAudit`.** preimage에 직전 해시 포함: `prev_hash | tenant | actor | action | json_encode(details,UNESCAPED_UNICODE) | now` SHA-256(`SecurityAudit.php:27`), 최신 해시 조회 `lastHash()`(`SecurityAudit.php:39-40`), DDL `prev_hash` 컬럼(`SecurityAudit.php:51`), 재계산 검증 `verify()`(`SecurityAudit.php:56-68`, 핵심 `:63-64`: `prev_hash===$prev` 연결성 확인). → §28 "Previous Entry Digest 포함"·전파 탐지의 실 패턴 PRESENT.
- **그러나 §28 필수 다수 미충족**:
  - **Byte Layout 미문서화·미버전화**: raw `|`-concat(`SecurityAudit.php:27`)는 canonical envelope schema가 아니라 임의 문자열 연결 → §5.4 위반, §28 "Canonical Envelope Schema Versioning" 미충족.
  - **Canonicalization 부재**: `json_encode(UNESCAPED_UNICODE)`(ksort/NFC/Decimal/Timestamp-precision 없음) → 언어·환경 무관 동일 Chain Digest 보장 불가(§5.3).
  - **payload/context/reference 분리 부재**: 3자를 previous·timestamp와 한 해시에 혼합(§24 위반) → chain digest가 어느 계층 변조인지 구별 못함.
  - **논리 Sequence·Entry Type·Integrity Version·Partition Identity 부재**: id AUTOINCREMENT 물리키만, 전역 단일 체인(partition 개념 0).
- ★위험(GROUND_TRUTH §5): fail-open catch(`SecurityAudit.php:32`) + 오류 시 `'GENESIS'` fallback(`SecurityAudit.php:39-40`) → 체인 silent reset 창.

## 3. 판정

- Verdict: **패턴 PRESENT·확장** (SecurityAudit prev_hash 체인 `:27,39-40,51,56-68` = CANONICAL Hash Chain 패턴) **/ 적용대상 BLOCKED_PREREQUISITE** (연결할 Ledger Entry 부재)
- 선행 의존: §28은 Entry Digest(§26)·Payload/Context/Reference Digest·Sequence(§19)·Partition Identity(§16)를 결합 — Ledger/Entry/Partition 전부 ABSENT.
- cover: **부분(패턴)** — prev_hash 체인+재계산 verify 실재. Canonical Envelope·Byte Layout Versioning·payload/context 분리·sequence 결합은 0.

## 4. 확장/구현 방향 (설계) — ★SecurityAudit prev_hash 체인 확장

- 순신규 `approval_ledger_chain_digest` — §28 입력을 **Canonical Envelope**로 결합. **Golden Rule=Extend**: `SecurityAudit`(`:27,39-40,56-68`)의 prev_hash 체인 + `verify()` 재계산·연결성(`prev_hash===$prev` `:63-64`)을 CANONICAL 패턴으로 재사용.
- ★확장 시 보강 델타:
  1. **Byte Layout Versioning**: `SecurityAudit.php:27`의 raw `|`-concat을 **버전화된 Canonical Envelope Schema**(필드경계·타입 보존, §5.4)로 교체·문서화 → 언어/환경 무관 재현.
  2. **Canonicalization**: `json_encode(UNESCAPED_UNICODE)`를 Canonical Projection(ksort/NFC/Decimal/Timestamp-precision, §13~§22)으로 교체 → §5.3 충족.
  3. **계층 분리 결합**: Payload Digest(§24)·Context Digest(§25)·Reference Digest를 **각각 산출 후** Chain Digest에서 previous entry digest·sequence·entry type·integrity version·ledger/partition identity와 결합 → 변조 계층 구별 탐지(§44).
  4. **논리 Sequence·Partition Identity 도입**: 물리 id와 분리된 논리 단조 sequence·partition identity 포함 → 삽입/삭제/순서변경 탐지의 기준.
  5. **fail-open 차단**: catch no-op(`SecurityAudit.php:32`) 제거 → chain break는 예외 전파·Partition Append 차단(§46 기본).
- 재사용 substrate: SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`)·verify 재계산 루프(`:56-68`)·재계산 시각 저장(`:31`)·서버 UTC(`Db.php:438`·`:24`).
- 장식 오인 금지: `menu_audit_log.hash_chain`(verify() 0·preimage `ts` 소실)·`journey_decision_log`(in-place UPDATE)는 실 chain 근거 아님.
- 선행 조립: Decision Core → Ledger/Partition/Entry → Payload/Context/Entry Digest → 본 Chain → Head(§30)/Checkpoint(§37). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_LEDGER_PARTITION_HASH_CHAIN]] · [[DSAR_APPROVAL_LEDGER_HEAD_DIGEST]] · [[DSAR_APPROVAL_LEDGER_GENESIS_DIGEST]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

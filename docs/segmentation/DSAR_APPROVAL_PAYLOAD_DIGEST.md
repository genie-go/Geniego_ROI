# DSAR — Payload Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.

## 1. 원문 전사 (Canonical Contract)

§24 Payload Digest (원문 전사):
- Payload Digest는 **Canonical Business Payload만**을 대상으로 산출한다.
- `Sequence` / `Previous Digest`를 **직접 혼합 금지** — 이들은 Entry Digest(§26)·Chain(§28)에서 결합한다.
- 선행 canonicalization: §13~§22(Canonical JSON·Null·Number·Monetary·Timestamp·Unicode·Encoding·Collection Ordering·Reference)을 통과한 Canonical Payload Projection(§15)만 입력.

의미: Payload Digest는 "이 결정 레코드의 **업무 내용물** 자체"의 무결성 지문이다. 순서(sequence)나 이전 체인값(previous)은 배치·연결의 문제이므로 payload 지문에 섞으면 안 되고, Entry/Chain 상위 계층에서 payload digest를 **입력으로** 결합한다. 이 분리가 있어야 payload 변조와 순서 변조를 서로 다른 tamper 유형(§44 PAYLOAD_MISMATCH vs SEQUENCE_CHANGED)으로 구별 탐지할 수 있다.

## 2. 기존 구현 대조

- **Payload-only Canonical Digest 부재이며, 유일 실 체인은 §24를 정면 위반한다.** `SecurityAudit.php:27` preimage는 `prev_hash | tenant | actor | action | json_encode(details, UNESCAPED_UNICODE) | now`를 **하나의 SHA-256**으로 연결한다 — 즉 payload(details)·context(tenant/actor)·previous(prev_hash)·timestamp(now)를 **단일 해시에 직접 혼합**한다. §24가 금지한 "Sequence/Previous 직접 혼합"의 전형이며, payload만의 독립 digest는 존재하지 않는다.
- 입력 payload가 canonicalization을 거치지 않음: `json_encode(...,UNESCAPED_UNICODE)`는 ksort/NFC/Decimal/Timestamp-precision 정규화가 없어 Canonical Projection이 아니다(GROUND_TRUTH §2 row2·§5.1) → §5.3/§5.4 위반. 따라서 언어·환경 무관 동일 digest 보장 불가.
- `MediaHost.php:93`의 내용주소 digest는 **바이트 payload**(파일)에 대한 SHA-256으로 canonical business payload와는 층위가 다르나, 바이트 무결성 지문으로는 유효(§33 Attachment 재사용 후보).
- Business Decimal/Monetary canonical 부재(GROUND_TRUTH §4 Decimal Utility ABSENT) → amount를 포함한 payload는 §18 Monetary Policy 미충족.

## 3. 판정

- Verdict: **패턴 PRESENT(위반형)** — SHA-256 지문 산출능력은 실재하나 payload 격리·canonicalization 부재로 §24 미충족. payload-only canonical digest는 **ABSENT**, 적용 대상은 **BLOCKED_PREREQUISITE**(Canonical Payload가 될 불변 Decision Record·§3.2 부재).
- 선행 의존: §15 Canonical Payload Projection·§13~§22 Canonicalization·§14 Field Set 전부 ABSENT. Canonical business payload가 될 Decision Record(§3.2)도 ABSENT.
- cover: **0** (payload-only canonical digest 0. SecurityAudit 혼합 preimage는 §24 위반이므로 계상 불가).

## 4. 확장/구현 방향 (설계)

- 순신규 Payload Digest 산출: Canonical Payload Projection(§15) → SHA-256(재사용 `SecurityAudit.php:27`·`MediaHost.php:93`의 해시 primitive만 취하고 preimage 구성은 교체) → Digest Envelope(§23·purpose=`PAYLOAD`)에 봉인.
- ★핵심 교정 델타: `SecurityAudit.php:27`의 `prev | tenant | actor | action | json | now` **단일 혼합 preimage를 해체** — payload(details)만 canonical projection 후 payload digest 산출, context는 Context Digest(§25), previous·sequence는 Entry/Chain(§26/§28)으로 분리. §5.4(문자열 임의연결 금지)·§24(직접혼합 금지) 동시 충족.
- 재사용 substrate: 해시 primitive·서버 UTC(`Db.php:438`·`SecurityAudit.php:24`)·재계산 가능 시각 저장(`SecurityAudit.php:31`). canonicalization(ksort/NFC/Decimal/Timestamp) 유틸은 순신규(GROUND_TRUTH §4 ABSENT).
- ★Monetary 포함 payload는 §18(minor unit·currency precision version) 선정규화 후 digest — 현행 Decimal Utility 부재로 float 직접해시 위험(§62 Static Lint 차단 대상) 선차단.
- 장식 오인 금지: `journey_decision_log`(`JourneyBuilder.php:1192`)는 in-place UPDATE라 payload 불변 지문 대상 아님.
- 선행 조립: Canonicalization Policy/Field Set/Projection → 본 Payload Digest → Context/Entry/Chain. 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_CONTEXT_DIGEST]] · [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_DIGEST_ENVELOPE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

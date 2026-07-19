# DSAR — Canonical Payload Projection (06-A-03-02-03-02 · §15)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§15 `CANONICAL_PAYLOAD_PROJECTION` 필수 필드(원문 전사):
- `projection id` · `source aggregate type` · `source aggregate id` · `source aggregate version`
- `field set id` · `canonicalization policy id` · `canonical schema version`
- `projected field count` · `excluded field count`
- `canonical payload` · `byte length` · `encoding` · `generated_at`
- `implementation version` · `status` · `evidence`

원문 제약: **"Production Log에 Canonical Payload 전체 기록 금지."** Projection은 Field Set(§14)을 입력받아 §13 Canonicalization Policy(Null/Number/Monetary/Timestamp/Unicode/Encoding/Collection/Reference)를 적용해 **결정적(deterministic) canonical payload**를 산출하며, 동일 입력→환경/언어 무관 동일 byte 시퀀스를 보장한다.

의미: Projection은 Digest의 실 입력 바이트를 만드는 단계다. `byte length`·`encoding`·`implementation version`을 기록해 재계산·교차언어 재현성을 담보하고, §39 ⑥(Canonical Projection 재생성)에서 검증 시 재실행 대상이 된다.

## 2. 기존 구현 대조

- **결정적 canonical payload projection은 부재.** Field Set→Canonicalization Policy 적용→byte length/encoding/implementation version 기록의 재현 가능 산출 파이프라인 전무(no hits).
- 실 해시체인 `SecurityAudit.php:27`이 유일한 "payload→해시입력" 경로이나 이는 **canonicalization이 아니다**: `json_encode($details, JSON_UNESCAPED_UNICODE)`는 (a) 맵 키 순서 미정규화(ksort 없음), (b) 이스케이프/공백 미정규화, (c) NFC Unicode 미적용, (d) Decimal/숫자 표기 미정규화, (e) Timestamp precision 미고정 → 동일 의미 payload가 상이 byte를 낼 수 있어 §5.3 위반. `byte length`·`implementation version` 기록 없음(재계산 계약 부재).
- `canonical schema version`/`projected/excluded field count`/`generated_at`(projection 메타) → no hits.
- 재사용 substrate로서 서버 UTC(`SecurityAudit.php:24`·`Db.php:438`)와 SHA-256(`Crypto.php:81`·`MediaHost.php:93`)은 실재하나, 이는 Projection이 아니라 그 하위 primitive다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §14 Field Set·§13 Canonicalization Policy **ABSENT** → 입력 계약이 없어 Projection 산출 불가 → **BLOCKED_PREREQUISITE**. 다시 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(source aggregate 부재)에 연쇄.
- cover: **0** (`json_encode(...,UNESCAPED_UNICODE)`는 canonicalization 아님 — projection 대체로 계상 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 단일 정본 `ApprovalCanonicalPayloadProjection` — Field Set(§14) + Canonicalization Policy(§13~§22)를 입력받아 **하나의 결정적 serializer**로 canonical payload를 산출하고 `byte length`·`encoding`·`canonical schema version`·`implementation version`을 기록. 레포에 canonical JSON serializer가 부재하므로 신규 단일 유틸(중복 금지 — §67 대상).
- Golden Rule=Extend: `SecurityAudit.php:27`의 `json_encode(...,UNESCAPED_UNICODE)`를 **이 Projection 호출로 교체(무후퇴 예외=개선)** — 기존 감사 preimage를 canonical projection 위에 재정의하되 verify(`SecurityAudit.php:56-68`)가 재계산 가능하도록 preimage 저장 관례(`SecurityAudit.php:31` created_at 저장) 유지.
- **로그 규율(원문 강제)**: `canonical payload` 전체는 Production Log·Error·Trace에 남기지 않고(§5.7) `byte length`+digest만 노출. Evidence Store가 필요하면 MediaHost 내용주소(`MediaHost.php:88-102`) 참조 digest만 보관.
- 결정성 검증: §72 Cross-language 테스트(동일 canonical payload→동일 digest) 대상 — implementation version 변경 시 §59 Semantic Equivalence 검증 없이 조용한 rehash 금지.

관련: [[DSAR_APPROVAL_CANONICAL_FIELD_SET]] · [[DSAR_APPROVAL_CANONICAL_ENCODING_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

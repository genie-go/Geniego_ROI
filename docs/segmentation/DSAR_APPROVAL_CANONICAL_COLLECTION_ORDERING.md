# DSAR — Canonical Collection Ordering (06-A-03-02-03-02 · §21)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§21 Collection Ordering(원문 전사) — 컬렉션 종류별 canonical 정렬 규칙 구분:
- `Ordered List`: **순서 보존**(입력 순서가 의미 — 재정렬 금지)
- `Unordered Set`: **Canonical Comparator로 정렬**(입력 순서 무의미 — 결정적 정렬)
- `Map`: **Canonical Key로 정렬**(키 순서 정규화)
- `Multiset`: 중복 허용 + canonical 정렬
- `Event Sequence`: **Business Sequence 보존**(발생 순서가 의미)

의미: 같은 원소 집합이 배열 순서 차이로 다른 byte를 내지 않도록, "순서가 의미 있는 컬렉션"(Ordered List·Event Sequence)은 보존하고 "순서가 무의미한 컬렉션"(Set·Map)은 canonical 정렬로 결정화한다. 이 구분 없이 전부 정렬하면 순서 의미가 파괴되고, 전부 원본 유지하면 Set/Map이 비결정적이 되어 §5.3 위반.

## 2. 기존 구현 대조

- **collection ordering 정책은 부재.** Ordered/Unordered/Map/Multiset/Event Sequence를 구분해 canonical 직렬화하는 규칙 전무(no hits).
- `SecurityAudit.php:27`의 `json_encode($details, JSON_UNESCAPED_UNICODE)`는 **PHP 배열 삽입 순서를 그대로** 출력 — Map(연관배열)의 키를 canonical 정렬(ksort)하지 않으므로 동일 의미 details가 키 삽입 순서 차이로 다른 Digest를 낼 수 있다. GROUND_TRUTH §2: "ksort 없음". Set/List 구분도 없음(모두 PHP array).
- Canonical Comparator·Canonical Key 정렬·Event Sequence 보존 규칙 → no hits.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §13 Canonicalization Policy·§15 Payload Projection **ABSENT** → 컬렉션 종류 판별·정렬을 집행할 serializer 부재로 **BLOCKED_PREREQUISITE**. 컬렉션 종류를 선언할 Field Set(§14) type map도 ABSENT.
- cover: **0** (PHP 삽입순서 출력은 canonical ordering 아님 — 정책 대체 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 Collection Ordering 데이터 선언(§21): Field Set(§14) `type map`에서 각 컬렉션 필드를 `ordered_list`/`unordered_set`/`map`/`multiset`/`event_sequence`로 태그하고, Projection serializer가 태그별로 (a) List/Event Sequence는 순서 보존, (b) Set/Map은 Canonical Comparator/Key 정렬 적용.
- Map 키 정렬: `SecurityAudit`의 `details`를 Projection 이관 시 **ksort 상당의 Canonical Key 정렬**을 적용(무후퇴 예외=개선) — 현행 비결정 키순서를 결정화. §62 Static Lint(Unordered Map/Set 직접 Serialization 차단)로 우회 방지.
- Event Sequence: 선행 §3.1 Ledger의 Entry 순서·§26 sequence는 business sequence로 보존(재정렬 금지) — Hash Chain(§28)의 sequence binding과 일관.
- 검증: §72 property 테스트 — Set 원소 순서 변경→동일 Digest, List 순서 변경→다른 Digest.

관련: [[DSAR_APPROVAL_CANONICAL_FIELD_SET]] · [[DSAR_APPROVAL_CANONICAL_REFERENCE_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

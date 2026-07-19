# DSAR — Canonical Number Policy (06-A-03-02-03-02 · §17)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§17 Number Policy(원문 전사):
- 선행 zero 제거(`007`→`7`) · 부호 `+` 제거 · **negative zero 정규화**(`-0`→`0`) · **exponent 표기 고정**(과학적 표기 정규화)
- **Float 직접 사용 금지** · Business Decimal은 **Decimal Type**으로 처리 · **NaN/Infinity 금지**
- Locale/Thousands separator 금지(`1,000`→`1000`)
- `1` / `1.0` / `1.00` **동일성은 도메인별로 명시**(암묵 병합 금지)

의미: 동일 수치가 표기 차이(선행0·부호·지수·스케일·구분자)로 다른 byte를 내지 않도록 canonical 수치 표현을 고정하고, 부동소수점의 비결정성(반올림·이진 표현)을 무결성 입력에서 배제한다. `1` vs `1.0`의 동일성 판단을 도메인(수량 vs 통화 등)별로 선언해 은밀한 값 재해석을 차단한다.

## 2. 기존 구현 대조

- **canonical 수치 정규화 정책은 부재.** 선행0/부호/negative zero/exponent/scale 정규화 규칙 전무(no hits).
- `SecurityAudit.php:27` preimage의 숫자는 `json_encode`가 PHP 내부 float/int 표현대로 출력 — PHP의 float→string은 `serialize_precision`/로케일에 따라 달라질 수 있고 exponent·trailing digit이 비결정적. Business Decimal을 Decimal Type으로 다루는 정규화 부재.
- **Decimal Utility 부재**(GROUND_TRUTH §4: Monetary canonical·precision version 0). Float 금지·`1`vs`1.0` 도메인 선언·NaN/Infinity 차단 가드 → no hits.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §13 Canonicalization Policy·§15 Payload Projection **ABSENT** + Platform Decimal Utility **ABSENT** → 수치 정규화를 집행할 Decimal Type/serializer 부재로 **BLOCKED_PREREQUISITE**.
- cover: **0** (PHP `json_encode` float 거동은 canonical 아님 — §17 위반 창).

## 4. 확장/구현 방향 (설계)

- 순신규 **단일 정본 Decimal 정규화 유틸**(레포에 부재) + Canonicalization Policy 하위 Number Policy 데이터 선언: 선행0 제거·`+`제거·negative zero→`0`·exponent 고정·thousands separator 금지·**Float 직접 사용 금지**(§62 Static Lint: Floating Point Digest 차단). Business Decimal은 문자열 Decimal로만 canonical 입력.
- `1`/`1.0`/`1.00` 동일성: 도메인별 명시 — 수량(Integer 도메인)은 `1`≡`1.0`, 통화·비율(Decimal 도메인)은 scale 보존(§18 Monetary Policy로 위임). Field Set(§14) `type map`에 도메인 태그.
- NaN/Infinity: §63 Runtime Guard `CANONICAL_DECIMAL_INVALID`로 차단(§64 Error Contract).
- Golden Rule=Extend: 신규 Decimal 유틸은 §18 Monetary Policy·§17을 **하나의 유틸로 공유**(중복 Decimal 정규화 §67 금지). `SecurityAudit` 등 기존 숫자 필드는 Projection 이관 시 이 유틸 경유.

관련: [[DSAR_APPROVAL_CANONICAL_MONETARY_POLICY]] · [[DSAR_APPROVAL_CANONICAL_NULL_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

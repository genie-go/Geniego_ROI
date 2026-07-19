# DSAR — Canonical Unicode Policy (06-A-03-02-03-02 · §20)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§20 Unicode Policy(원문 전사):
- **UTF-8** 고정 · **Normalization Form 명시**(NFC/NFD/NFKC 중 택1) · **Invalid Code Point 차단**
- Control char 정책 · Line ending 정규화 · **Zero-width** 문자 정책 · **Homoglyph** 참조 · Leading/Trailing/Internal whitespace 정책
- **Reason Code · Identifier · Enum은 Canonical Code 우선**(자유 텍스트 아닌 코드)

의미: 같은 문자열이 유니코드 표현 차이(결합형 vs 분해형·zero-width 삽입·homoglyph·공백 변형)로 다른 byte를 내지 않도록 정규화 형식을 고정하고, invalid/제어/zero-width 문자를 차단해 변조 은폐(눈에 안 보이는 문자 삽입)를 막는다. 사유·식별자·enum은 자유 텍스트 대신 canonical code를 써 언어·표기 흔들림을 제거한다.

## 2. 기존 구현 대조

- **Unicode Normalization Utility 부재**(GROUND_TRUTH §4: NFC/NFKC normalizer 0). canonical Unicode 정책 전무(no hits).
- `SecurityAudit.php:27`은 `json_encode($details, JSON_UNESCAPED_UNICODE)` — UTF-8 raw 바이트를 그대로 출력할 뿐 **normalization form을 적용하지 않는다**. 결합형/분해형 한글·zero-width·homoglyph가 동일 의미인데 다른 byte→다른 Digest를 낼 수 있어 §5.3·§20 위반 창.
- Invalid Code Point 차단·zero-width/homoglyph/whitespace 정규화·Reason Code Canonical 강제 → no hits. PII 가명화 경로(`AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115`)가 "normalize 후 SHA-256"를 하나, 이는 이메일/식별자 소문자화 수준의 국지 정규화이지 canonical Unicode normalization form 적용이 아님(KEEP_SEPARATE).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Platform Unicode Normalization Utility **ABSENT** + §13 Canonicalization Policy·§15 Projection **ABSENT** → normalization form을 집행할 유틸/serializer 부재로 **BLOCKED_PREREQUISITE**.
- cover: **0** (`JSON_UNESCAPED_UNICODE`는 raw byte 출력일 뿐 normalization 아님 — 정책 대체 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 **단일 정본 Unicode Normalization 유틸**(레포 부재) + Canonicalization Policy 하위 Unicode Policy 데이터 선언: UTF-8 고정·Normalization Form(권장 NFC) 명시·Invalid Code Point 차단·zero-width 제거/차단·homoglyph 참조 테이블·whitespace(leading/trailing/internal) 정책. Projection serializer가 모든 문자열 필드에 일괄 적용.
- Reason Code/Identifier/Enum: 자유 텍스트 대신 **Canonical Code**를 Field Set(§14) type map에서 강제 — 승인 사유는 코드+선택적 원문(원문은 sensitive/reference로 별도 처리).
- 차단 집행: §62 Static Lint(Default Charset·Platform-dependent Encoding 차단은 §13 Encoding Policy와 결합), §63 Runtime Guard(`CANONICAL_UNICODE_INVALID`). zero-width/homoglyph 삽입 변조는 §44 Tamper(PAYLOAD_MISMATCH)로 탐지.
- Golden Rule=Extend: PII 가명화의 국지 normalize(`Dsar.php:24-29` 등)는 canonical Unicode 유틸을 재사용하도록 통합 후보(중복 정규화 §67 금지)이나 무결성 정본은 신규 유틸.

관련: [[DSAR_APPROVAL_CANONICAL_ENCODING_POLICY]] · [[DSAR_APPROVAL_CANONICAL_TIMESTAMP_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

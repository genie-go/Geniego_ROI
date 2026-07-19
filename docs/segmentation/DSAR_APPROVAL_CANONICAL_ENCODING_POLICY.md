# DSAR — Canonical Encoding Policy (06-A-03-02-03-02 · §13 encoding)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§13 Canonicalization Policy 중 encoding 항(원문 전사):
- Binary Encoding 정책: **Base64 / Hex** 중 canonical 표현 고정
- **Default Charset 금지**(플랫폼 기본 문자집합 의존 금지) · **Platform-dependent Encoding 금지**
- Digest Output Encoding을 Registry·Policy·Version으로 관리(§5.5·§10 output encoding·§13)

의미: Digest의 바이트 입력·출력 인코딩을 명시 고정해, 같은 데이터가 실행 환경(OS·JVM/PHP locale)에 따라 다른 바이트로 해석되어 다른 Digest를 내는 것을 차단한다. 바이너리 값은 Base64 또는 Hex 중 하나로 canonical 표현하고, Digest 출력 인코딩(hex 등)도 버전으로 고정한다.

## 2. 기존 구현 대조

- **부분 substrate 실재(Hex 출력 일관)**: 실 해시체인이 SHA-256 **hex** 출력으로 일관 — `SecurityAudit.php:27`(preimage→hex digest)·`MediaHost.php:93`(내용주소 hex digest)·`Migrate.php:50`(checksum hex). 이는 §13 "Digest Output Encoding 고정"의 **부분 선례**(hex 관례 일관·재사용 substrate).
- **그러나 canonical Encoding Policy로는 부재**: (a) hex를 Registry/Policy/Version 데이터로 **선언·관리**하지 않고 코드에 하드코딩(§5.5 위반), (b) **입력** 바이트 인코딩 정책(Base64 vs Hex·Default Charset 금지) 부재 — `json_encode`가 플랫폼 UTF-8 처리에 의존, (c) Base64 사용처(있다면)와 Hex 사용처를 canonical하게 구분하는 규칙 없음(§67 Hex/Base64 혼용 감사 대상).
- Default Charset 금지·Platform-dependent Encoding 금지 가드 → no hits.

## 3. 판정

- Verdict: **ABSENT** (SHA-256 hex 출력 일관은 재사용 substrate·PRESENT이나, canonical Encoding *Policy*는 부재)
- 선행 의존: §13 Canonicalization Policy·§7~§10 Registry/Policy/Version **ABSENT** → 인코딩을 데이터로 선언·버전관리할 상위 구조 부재로 **BLOCKED_PREREQUISITE**.
- cover: **0** (하드코딩 hex 관례는 정책 선언 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 Encoding Policy 데이터 선언 + **현행 SHA-256 hex 출력 관례를 정본 default로 채택·명문화**: Digest Output Encoding=hex를 §10 Version output encoding으로 고정하고, 바이너리 값 입력은 Base64/Hex 중 하나(권장 hex 일관)로 canonical 표현. 기존 `SecurityAudit`/`MediaHost`/`Migrate` hex 관례를 무후퇴로 재사용.
- Default/Platform charset 배제: 모든 문자열은 §20 Unicode Policy(UTF-8·NFC)를 거친 뒤 인코딩 — Default Charset 의존은 §62 Static Lint(Default Charset·Platform-dependent Encoding 차단)·§63 Runtime Guard로 배제.
- 혼용 통합: Hex/Base64 혼용은 §67 중복감사 대상 — 무결성 경로는 hex 단일화, Base64는 외부 프로토콜 경계에서만(경계 명시). Digest 전체 값 로그 금지(§62 Digest Full Value 로그 차단)와 결합.
- Registry 관리: output encoding을 §7 Registry·§10 Version 필드로 승격(하드코딩 `'sha256'`/hex 제거는 알고리즘 Registry DSAR와 연동).

관련: [[DSAR_APPROVAL_CANONICAL_UNICODE_POLICY]] · [[DSAR_APPROVAL_CANONICAL_PAYLOAD_PROJECTION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

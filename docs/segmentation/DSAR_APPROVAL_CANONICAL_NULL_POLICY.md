# DSAR — Canonical Null Policy (06-A-03-02-03-02 · §16)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§16 Null Policy(원문 전사): 아래 7상태를 **각각 구별**한다.
- `Field Absent`(필드 자체 부재) · `Explicit Null`(값이 명시적 null) · `Empty String`("") · `Empty Array`([]) · `Empty Object`({}) · `Zero`(0) · `False`(불리언 false)

원문 금지: **Empty→Null 자동변환 금지 · Empty Collection→Missing 처리 금지.** 즉 `""`≠`null`≠`부재`≠`0`≠`false`≠`[]`≠`{}` 로 각기 다른 canonical 표현을 가져 서로 다른 Digest를 산출해야 한다(값 병합으로 인한 무결성 착시·변조 은폐 방지).

의미: Null Policy는 "값 없음"의 7가지 의미를 canonical payload에서 손실 없이 보존해, 예컨대 승인 사유가 명시적으로 비워진 것(`""`)과 애초에 필드가 없던 것(부재)이 동일 Digest로 붕괴되어 변조가 은폐되는 것을 차단한다.

## 2. 기존 구현 대조

- **7상태 구별 canonical null 정책은 부재.** 값 없음 상태를 명시 구분해 직렬화하는 규칙 전무(no hits).
- `SecurityAudit.php:27`의 `json_encode($details, JSON_UNESCAPED_UNICODE)`는 PHP 기본 인코딩에 의존 — PHP 배열의 `null`/`""`/미설정 키/`0`/`false`/`[]`/`{}` 구별이 **입력 배열 구성 시점의 우연**에 좌우되고 canonical 규칙으로 고정되지 않는다. 특히 PHP는 연관배열/순차배열을 `{}`/`[]`로 상황에 따라 인코딩해 Empty Array↔Empty Object 경계가 불안정하다 → §16 위반 창.
- Empty→Null·Empty Collection→Missing 자동변환을 **금지하는** 가드 → no hits.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §13 Canonicalization Policy·§15 Payload Projection **ABSENT** → null 상태 구별을 집행할 serializer 부재로 **BLOCKED_PREREQUISITE**.
- cover: **0** (PHP `json_encode` 기본거동은 7상태 구별을 보장하지 않음 — 정책 대체 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 Canonicalization Policy(§13)의 하위 규칙으로 Null Policy를 **데이터 선언**: `field_absent`/`explicit_null`/`empty_string`/`empty_array`/`empty_object`/`zero`/`false` 각각의 canonical 토큰을 고정하고, Projection serializer가 입력 타입을 무손실 매핑. Empty→Null·Empty Collection→Missing 변환 경로를 §63 Runtime Guard로 차단.
- Field Set(§14)의 `conditional field paths`·`required field paths`와 결합 — 필수 필드의 `부재`는 Projection 실패(§64 `CANONICAL_PROJECTION_FAILED`)로 처리하되, 선택 필드의 `부재`와 `explicit null`은 서로 다른 canonical 표현 유지.
- Golden Rule=Extend: `SecurityAudit` preimage를 Projection으로 이관(무후퇴 예외=개선) 시, PHP 배열의 우연적 null 거동을 Null Policy로 고정해 verify 재현성 확보.
- 테스트(§72 Unit): 7상태 각각이 서로 다른 Digest를 내는지, Empty↔Null 붕괴가 없는지 property 검증.

관련: [[DSAR_APPROVAL_CANONICAL_NUMBER_POLICY]] · [[DSAR_APPROVAL_CANONICAL_PAYLOAD_PROJECTION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

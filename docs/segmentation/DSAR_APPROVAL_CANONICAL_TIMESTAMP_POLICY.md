# DSAR — Canonical Timestamp Policy (06-A-03-02-03-02 · §19)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§19 Timestamp Policy(원문 전사):
- **UTC 변환** · Offset 처리 · **Precision 고정**(ms/µs/ns 중 택1 고정) · Leap second 처리
- **Trusted Server Time** · Client/Server 시각 분리 · **ISO-8601** · Trailing zero 규칙 · TZ name 제외 · Ambiguous local 금지
- 시각 종류 구분: `event_effective_at` · `committed_at` · `recorded_at` · `verified_at`

의미: 시각은 canonical payload에서 표기 차이(TZ·offset·precision·trailing zero)로 다른 byte를 내면 안 되며, 반드시 UTC·고정 precision·ISO-8601로 정규화한다. 또한 "언제 효력·언제 커밋·언제 기록·언제 검증"의 4시각을 의미적으로 분리해 하나의 `created_at`으로 붕괴시키지 않는다. Client 제공 시각을 신뢰하지 않고 Trusted Server Time을 사용한다.

## 2. 기존 구현 대조

- **부분 substrate 실재**: 서버 UTC 관례가 편재 — `SecurityAudit.php:24`가 `gmdate('Y-m-d H:i:s')`로 서버 UTC 시각을 생성하고 `Db.php:438` 계열도 동일. 이는 §19의 "UTC·Trusted Server Time" 원칙의 **부분 선례**(재사용 substrate·Trusted Time PRESENT).
- **그러나 canonical Timestamp Policy로는 부재**: `gmdate('Y-m-d H:i:s')`는 (a) precision 고정 규칙이 아니라 초 단위 관례일 뿐, (b) ISO-8601(`T`·`Z`) 형식이 아니며, (c) `event_effective_at`/`committed_at`/`recorded_at`/`verified_at` 4시각 구분이 없다. `SecurityAudit.php:27` preimage의 `now`는 단일 시각으로만 결합.
- **반례(local-tz 오염 선례)**: `menu_audit_log`의 preimage는 `'ts'=>date('c')`(`AdminMenu.php:195`)로 **local timezone** ISO 시각을 쓰며(장식·verify 0), UTC 정규화 부재를 드러낸다. Precision 고정·Leap second·Ambiguous local 금지 규칙 → no hits.

## 3. 판정

- Verdict: **ABSENT** (Trusted Time substrate는 PRESENT이나 canonical Timestamp *Policy*는 부재)
- 선행 의존: §13 Canonicalization Policy·§15 Payload Projection **ABSENT** → precision/ISO-8601/4시각 구분을 집행할 serializer 부재로 **BLOCKED_PREREQUISITE**. 4시각을 담을 §3.2 Decision Foundation·§3.1 Ledger Entry(effective/committed/recorded time §26) ABSENT.
- cover: **0** (서버 UTC `gmdate` 관례는 canonical policy 아님 — 정책 대체 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 Timestamp Policy 데이터 선언 + **현행 `gmdate` 서버 UTC 관례를 정본으로 흡수·표준화**: 모든 무결성 시각을 UTC·고정 precision·ISO-8601(`YYYY-MM-DDThh:mm:ss[.fff]Z`)로 정규화하고 trailing zero·TZ name 규칙 고정. Trusted Server Time 소스는 기존 `gmdate`(`SecurityAudit.php:24`·`Db.php:438`) 계열을 단일 시각원으로 재사용(무후퇴).
- 4시각 분리: `event_effective_at`/`committed_at`/`recorded_at`/`verified_at`를 Field Set(§14)·Entry Digest(§26)·Verification Result(§50 verified_at)에서 각기 다른 canonical 필드로 보존 — `SecurityAudit`의 단일 `now`를 4시각 모델로 확장(개선).
- local-tz 오염 차단: `menu_audit_log`의 `date('c')`(`AdminMenu.php:195`)식 local ISO는 §62 Static Lint(Local Time Timestamp Digest 차단)·§63 Runtime Guard(`CANONICAL_TIMESTAMP_INVALID`)로 배제. Client 제공 시각은 canonical 입력에서 분리(Trusted Server Time만).
- 재계산 규율: preimage 시각을 저장해 재계산 가능하게 하는 `SecurityAudit.php:31`(created_at 저장) 패턴을 ISO-8601·precision 고정본으로 이관.

관련: [[DSAR_APPROVAL_CANONICAL_MONETARY_POLICY]] · [[DSAR_APPROVAL_CANONICAL_UNICODE_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

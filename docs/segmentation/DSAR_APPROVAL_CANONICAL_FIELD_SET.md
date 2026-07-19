# DSAR — Canonical Field Set (06-A-03-02-03-02 · §14)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§14 `CANONICAL_FIELD_SET` 필수 필드(원문 전사):
- `field set id` · `integrity version id` · `aggregate type` · `code`
- `included field paths` · `excluded field paths` · `conditional field paths`
- `required field paths` · `field aliases` · `type map` · `ordering`
- `sensitive fields` · `reference-only fields` · `large object exclusion`
- `schema version` · `valid_from`/`valid_to` · `status` · `evidence`

Aggregate Type enum(§14 원문): `DECISION_COMMAND` / `VALIDATION` / `COMMIT` / `RECORD` / `HISTORY` / `ACTION` / `SNAPSHOT` / `EVIDENCE` / `AUDIT` / `OUTBOX` / `ATTACHMENT_MANIFEST` / `LEDGER_ENTRY` / `LINK` / `HEAD` / `CHECKPOINT` / `CORRECTION` / `SUPERSESSION` / `RETENTION_ACTION` / `LEGAL_HOLD` / `CUSTOM`(총 20종).

의미: Field Set은 어떤 Aggregate Type의 어떤 필드 경로가 Digest 입력에 **포함/제외/조건부/필수**로 들어가는지, 어떤 필드가 **sensitive**(원문 비노출)·**reference-only**(값이 아닌 Stable Identifier만)인지, 대형 객체를 어떻게 제외하는지를 **버전 고정 데이터로 선언**한다. §15 Payload Projection의 입력 계약이자, §5.3(Canonicalization)의 "무엇을 해시하는가" 결정 축이다. Digest 재계산·검증(§39 ④ Field Set Version 확인)이 이 버전에 의존한다.

## 2. 기존 구현 대조

- **Aggregate Type별 Digest 포함/제외 필드를 데이터로 선언하는 Field Set은 부재.** included/excluded/conditional/required/sensitive/reference-only field path를 버전과 함께 선언하는 구조체 전무(no hits).
- 실존하는 유일 실 해시체인 `SecurityAudit`의 preimage(`SecurityAudit.php:27`)는 `prev·tenant·actor·action·json_encode(details,UNESCAPED_UNICODE)·now`를 **raw `|`-concat**한다 → 필드 집합이 코드에 하드코딩되어 있고, "어떤 필드가 왜 포함/제외되는가"를 선언·버전관리하지 않는다. `details`는 통째 JSON 인코딩되어 field path 단위 included/excluded/sensitive 구분이 없다(§5.4 문자열 임의연결 위반).
- 20종 Aggregate Type(DECISION_COMMAND/RECORD/SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/LEDGER_ENTRY/...)에 대응하는 소스 Aggregate 자체가 부재 — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용)이므로 Field Set이 참조할 대상 필드 트리가 존재하지 않는다.
- `sensitive fields` 개념의 부분 선례: PII 가명화(`AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115`)는 특정 필드를 정규화 후 SHA-256로 대체하나, 이는 Field Set 선언이 아니라 개별 호출부 하드코딩이며 무결성용이 아니다(KEEP_SEPARATE).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation **ABSENT(설계전용·cover0)** → Field Set이 선언할 20종 Aggregate 필드 트리 부재로 **BLOCKED_PREREQUISITE**. §13 Canonicalization Policy·§15 Payload Projection의 상위 입력이므로 그 둘과 연쇄.
- cover: **0** (Digest 필드 포함/제외/버전 선언 전무. SecurityAudit preimage는 하드코딩 concat으로 Field Set 대체 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_canonical_field_set` — `aggregate type`(20종)·`code`·`integrity version id`별로 included/excluded/conditional/required field path와 `type map`·`ordering`·`sensitive fields`·`reference-only fields`·`large object exclusion`을 **데이터로 선언**하고 `schema version`으로 버전 고정. §39 ④에서 검증 시 이 버전을 조회.
- Golden Rule=Extend: `SecurityAudit.php:27`의 하드코딩 preimage 필드목록을 Field Set 선언으로 **승격(외부화)** — 무후퇴 예외(개선)로 Canonical Projection(§15) 입력이 되도록 재구성하되 기존 감사트레일 동작은 보존(KEEP_SEPARATE — 감사트레일 Field Set 하나가 20종 전체 아님).
- `sensitive fields`/`reference-only fields`는 §22 Reference Policy·§20 Unicode Policy와 결합 — 원문 대신 Stable Identifier·Canonical Code만 Digest 입력에 포함(원문은 §5.7에 따라 로그·Digest Input에서 배제). PII 가명화 선례(`Dsar.php:24-29` 등)는 sensitive field 처리의 재사용 substrate로 참조하되 Field Set 정본 아님.
- `large object exclusion`은 §33 Attachment Manifest Digest·MediaHost 내용주소(`MediaHost.php:88-102`)와 결합 — 대형 바이너리는 값이 아닌 content digest 참조만 Field Set에 포함.

관련: [[DSAR_APPROVAL_CANONICAL_PAYLOAD_PROJECTION]] · [[DSAR_APPROVAL_CANONICAL_REFERENCE_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

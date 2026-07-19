# DSAR — Decision Snapshot Digest (06-A-03-02-03-02 · §32)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§32 Snapshot Digest** — Snapshot Aggregate의 독립 Digest. 필수 Canonical 입력:
- `snapshot type`
- `source decision`(결정 인스턴스/레코드 참조)
- `actor snapshot` · `assignment snapshot` · `authority snapshot` · `delegation snapshot` · `sequential snapshot` · `resource snapshot`
- `validation result` · `commit result`
- `captured_at`(Trusted Time·UTC·precision 고정)

원칙 계약(§5·§23·§24 파생): Snapshot Digest는 **Snapshot Aggregate의 Canonical Business Payload만** 대상으로 하며, Sequence·Previous Digest·Ledger Identity는 직접 혼합하지 않는다(그 결합은 §26 Entry Digest·§28 Hash Chain에서 수행). Digest Purpose=`SNAPSHOT`(§23 Envelope). Reference는 §22 Stable Identifier(actor_subject_id·assignment_id·authority/delegation_resolution_id·step_instance_id·version_id)로만 표현하고 Display Name·현재 직책명 금지. 필요 시 Snapshot Identifier + Snapshot Digest를 참조로 포함(§22).

## 2. 기존 구현 대조

- **Snapshot Aggregate 자체가 ABSENT.** GROUND_TRUTH §1(선행조건 재검증)에서 §3.2 Decision Foundation은 ABSENT(설계전용): `decision_snapshot`·`DecisionRecord`/`DecisionCommand`/`DecisionCommit` 클래스·테이블 0히트. 즉 Digest가 고정할 **원본 Snapshot이 존재하지 않는다** → Snapshot Digest의 입력 대상이 없다.
- **재사용 substrate(digest 산출 primitive)는 실재**: SHA-256 해시 유틸(`Crypto.php:81`)·append-only 해시 패턴(`SecurityAudit.php:27`·재계산 verify `SecurityAudit.php:56-68`). 그러나 이는 digest **알고리즘**일 뿐, Snapshot을 Canonical Projection하는 계층은 부재.
- **Canonical JSON / Decimal / Unicode Normalization = ABSENT**(GROUND_TRUTH §4): ksort/NFC/RFC8785 canonical serializer 0, `json_encode(...,UNESCAPED_UNICODE)`는 canonicalization 아님. 따라서 실존 SecurityAudit 체인조차 §5.3/§5.4 위반이며, Snapshot Digest를 그대로 얹으면 동일 결함 상속.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Decision Snapshot)가 선행 §3.2 Decision Foundation 부재로 ABSENT → digest가 결합할 불변 대상 없음(GROUND_TRUTH §0.5·§6). digest 알고리즘 substrate(SHA-256)만 PRESENT.
- cover: **0** (Snapshot Digest 엔티티·Canonical Projection·Envelope 전무. SecurityAudit는 감사 체인 패턴으로 KEEP_SEPARATE, Snapshot Digest 대체 아님).

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_DIGEST_ENVELOPE`(purpose=`SNAPSHOT`) + Snapshot Field Set(§14 Aggregate Type=SNAPSHOT). 입력=§32 열거 필드의 Canonical Projection(§15). Sequence/Previous Digest 미포함(§24 분리 원칙).
- **Golden Rule=Extend**: digest 산출은 `Crypto.php:81` SHA-256·`SecurityAudit.php:56-68` 재계산-verify 패턴을 일반화 재사용(신규 해시 엔진 난립 금지). 단 preimage는 raw concat이 아닌 §13 Canonical JSON + §16~§21 정규화를 **선(先)적용**해야 §5.3/§5.4 충족.
- **선행 필수**: §3.2 Decision Foundation(Snapshot Aggregate) 실구현이 선행 조건. 그 전까지 Snapshot Digest는 결합 대상 없이 공회전 — 별도 승인세션(RP-002).
- **무후퇴**: 신설 Digest는 Snapshot 생성 경로에 side-effect로 부가하며, 검증 실패(§50)를 Warning으로 무시 금지(§5.11).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_SNAPSHOT_FOUNDATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

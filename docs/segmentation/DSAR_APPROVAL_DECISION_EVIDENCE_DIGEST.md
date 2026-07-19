# DSAR — Decision Evidence Digest (06-A-03-02-03-02 · §32)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§32 Evidence Digest** — Evidence Aggregate의 독립 Digest. 필수 Canonical 입력:
- `metadata`(evidence 종류·출처 분류)
- `canonical refs`(참조 대상 Stable Identifier·§22)
- `lineage`(수집·파생 계보)
- `recorded_at`(Trusted Time·UTC)
- `sensitive payload ref digest`(민감 원문은 **참조 digest만**·원문 직접 미포함)

원칙 계약(§5.7·§15·§47 파생): **Raw Sensitive Data를 Digest Input Log/Debug/Error/Trace에 노출 금지**(§5.7). Evidence의 민감 payload는 Canonical Payload 전체를 저장·기록하지 않고, 별도 저장소의 참조 + 그 참조의 digest만 Evidence Digest에 포함한다. Digest Purpose=`EVIDENCE`(§23). Reference는 Display Name/Email 금지·Stable Identifier만(§22).

## 2. 기존 구현 대조

- **Evidence Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.2 Decision Foundation ABSENT — `decision_evidence` 테이블·클래스 0히트. Evidence Digest가 고정할 원본 Evidence 레코드 없음.
- **Evidence Store substrate는 PRESENT**: `MediaHost`(GROUND_TRUTH #12·§4)가 내용주소 CAS(`MediaHost.php:88-102`·sha256 `MediaHost.php:93`)로 파일 Evidence의 내용 digest를 이미 산출 — 민감 원문 미포함 참조-digest 모델과 정렬. `SecurityAudit`(§4)는 감사 이벤트 프레임워크로 PARTIAL/PRESENT.
- **Canonical/Decimal/Unicode Normalization = ABSENT**(GROUND_TRUTH §4) → Evidence metadata·lineage의 결정적 직렬화 계층 부재.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Decision Evidence)가 선행 §3.2 부재로 ABSENT → digest 대상 없음. digest 산출 substrate(MediaHost 내용주소·SHA-256)만 PRESENT.
- cover: **0** (Evidence Digest Envelope·Field Set·sensitive payload ref digest 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Evidence Field Set(§14 Aggregate Type=EVIDENCE) + Envelope(purpose=`EVIDENCE`). 민감 payload는 §5.7 준수 — 원문 대신 저장소 참조 + `sensitive payload ref digest`만.
- **Golden Rule=Extend**: 파일형 Evidence의 content digest는 `MediaHost.php:88-102`(내용주소 CAS) 재사용, metadata/lineage digest는 `Crypto.php:81` SHA-256을 Canonical Projection(§15) 위에서 산출. 신규 파일해시 엔진 신설 금지.
- **선행 필수**: §3.2 Evidence Aggregate 실구현. 그 전까지 공회전 — 별도 승인세션(RP-002).
- **무후퇴·비노출**: Production Log에 Canonical Payload 전체 기록 금지(§15). 검증 결과는 Immutable(§5.12).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_EVIDENCE_FOUNDATION]] · [[DSAR_APPROVAL_DECISION_ATTACHMENT_MANIFEST_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

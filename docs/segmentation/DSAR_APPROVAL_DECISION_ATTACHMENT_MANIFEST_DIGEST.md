# DSAR — Decision Attachment Manifest Digest (06-A-03-02-03-02 · §33)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§33 Attachment Manifest Digest** — 첨부의 **Manifest**(원문이 아닌 메타·digest 목록)의 Digest. 필수 Canonical 입력:
- `file registry id`
- `content digest`(파일 내용 digest)
- `size` · `MIME`
- `classification`(민감도 분류)
- `malware/DLP result ref`
- `encryption state`
- `retention class`
- `legal hold state`
- `manifest sequence`

원칙 계약(§33·§71): **원문 전체 직접포함 금지** — Manifest는 파일 content digest·크기·MIME·분류·검증결과 참조만 담고, 대형 Attachment는 Manifest/Reference Digest로만 결합한다(§71 Streaming/Manifest Digest). Digest Purpose=`ATTACHMENT_MANIFEST`(§23).

## 2. 기존 구현 대조

- **★예외 substrate — file content digest 소스 PRESENT.** `MediaHost`가 내용주소 CAS로 파일 content digest를 이미 산출: sha256 `MediaHost.php:93`·업로드 바이트 무결 검증 `MediaHost.php:88-90`·원자 쓰기 `MediaHost.php:100-102`(전체 `MediaHost.php:88-102`). GROUND_TRUTH #12 태그=**VALIDATED_FILE_HASH_SOURCE**(Evidence Store·§33 Attachment 재사용). 즉 §33의 `content digest` 소스는 **발명 아닌 확장**.
- **그러나 Manifest Aggregate·Manifest Digest 규약은 ABSENT.** MediaHost는 개별 파일의 내용 digest만 산출할 뿐, `classification`·`malware/DLP result ref`·`encryption state`·`retention class`·`legal hold state`·`manifest sequence`를 묶어 결정에 결합하는 Manifest 계층은 부재. 선행 §3.2 Attachment Manifest Aggregate ABSENT.
- **Canonicalization 부재**(GROUND_TRUTH §4): Manifest 메타(MIME·classification 등)의 결정적 직렬화 계층 없음.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: file content digest 소스(MediaHost 내용주소 CAS)는 PRESENT(확장 substrate)이나, 이를 결합할 Attachment Manifest Aggregate가 선행 §3.2 부재로 ABSENT → Manifest Digest 대상 없음.
- cover: **0** (Manifest Digest Envelope·Field Set·malware/DLP/retention/legal-hold 결합 규약 전무. MediaHost는 content digest 소스로만 재사용, Manifest Digest 대체 아님).

## 4. 확장·구현 방향 (설계)

- **content digest는 MediaHost 확장·재생성 금지**: `MediaHost.php:88-102`(sha256 `:93`·바이트검증 `:88-90`·원자쓰기 `:100-102`)를 `content digest` 소스로 직접 재사용. **원문은 Manifest에 미포함** — content digest·size·MIME·classification·참조만.
- **순신규** Manifest Field Set(§14 Aggregate Type=ATTACHMENT_MANIFEST) + Envelope(purpose=`ATTACHMENT_MANIFEST`). classification·malware/DLP result ref·encryption state·retention class·legal hold state·manifest sequence를 Canonical Projection(§15) 후 SHA-256 결합.
- **대형 파일**: §71에 따라 Reference/Manifest Digest만 결합, 파일 바이트를 Digest Input에 직접 스트리밍 금지.
- **선행 필수**: §3.2 Attachment Manifest Aggregate 실구현. content digest substrate는 이미 준비됨 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_ATTACHMENT_MANIFEST]] · [[DSAR_APPROVAL_DECISION_EVIDENCE_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

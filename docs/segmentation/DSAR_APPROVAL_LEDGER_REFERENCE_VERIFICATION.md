# DSAR — Ledger Reference Verification (06-A-03-02-03-02 · §43)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ Entry↔외부 Record/Snapshot/Evidence/Audit/Outbox Digest 대조 — 참조 무결성. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

§43 Reference Verification (원문 전사):

`Ledger Entry↔Decision Record/Commit/History/Snapshot/Evidence/Audit/Outbox/Sequential Reference` · `Correction/Supersession/Retention/Legal Hold↔Target Entry` · `Ledger Link↔Source/Target Digest`.

의미: Reference Verification은 Ledger Entry가 가리키는 **외부 대상의 Digest가 Entry에 봉인된 Reference Digest와 일치**하는지 검증한다. Entry↔Decision Record·Commit·History·Snapshot·Evidence·Audit·Outbox·Sequential Reference의 각 참조가 그 대상 레코드의 실제 Digest와 부합하는지, Correction/Supersession/Retention/Legal Hold가 지시하는 Target Entry가 위·변조되지 않았는지(§34~§36 Target 변경 탐지), Ledger Link가 담은 Source/Target Entry Digest가 실제 양단 Entry Digest와 일치하는지(§31, Cross-Tenant Link 차단)를 검사한다. §26 Entry Digest는 `reference digest`를 포함하며, §22 Reference Policy는 Display Name·Email·Localized Name 대신 Stable Identifier+Snapshot Digest만 참조하도록 강제한다.

## 2. 기존 구현 대조

- **부분 substrate = 내용주소 CAS(`MediaHost.php:93`)** — 파일 내용을 SHA-256 digest로 주소화(`MediaHost.php:88-90` 바이트검증·`:100-102` 원자쓰기)한다. 이는 §33 Attachment Manifest·§43 Evidence Reference의 **VALIDATED_FILE_HASH_SOURCE**(Evidence Store)로 재사용 가능한 유일 실 참조 digest source다. 그러나 이는 파일↔digest 대응일 뿐, Ledger Entry가 그 digest를 Reference로 봉인·재대조하는 구조는 아니다.
- **부재 항목(전항)**:
  - **Entry↔Record/Commit/History/Snapshot/Evidence/Audit/Outbox Reference 대조** — Ledger Entry에 각 대상의 Reference Digest를 봉인하고 검증 시 대상 레코드를 재조회해 Digest 재계산·대조하는 구조 전무. `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 원장 행 자체의 preimage만 재계산하며 외부 참조 대상을 재조회하지 않음 → **no hits**.
  - **Correction/Supersession/Retention/Legal Hold↔Target Entry** — 선행 §3.1 Immutable Ledger의 Correction/Supersession/Retention/Legal Hold 테이블 부재로 Target 대조 대상 없음(§34~§36 Target 변경 탐지 불가).
  - **Ledger Link↔Source/Target Digest** — §31 Link Digest 개념 부재. Cross-Tenant Link 차단 로직 없음(현행 verify에 tenant 술어 없음, 전역 단일 체인).
- **확장 델타(GROUND_TRUTH §5)**: ②**tenant 술어 없음**(§43 Cross-Tenant Link 차단 미달) 특히 관련. 추가로 ①Canonicalization 없이 재계산(§5.3) ③gap 무탐지 ④Head-CAS/Checkpoint 부재.
- **결합 대상 부재** — 선행 §3.2 Decision Foundation ABSENT: `DecisionRecord`/`DecisionCommit`/`decision_snapshot`/`decision_evidence`/`decision_outbox` 클래스·테이블 0히트(GROUND_TRUTH §1). Reference가 가리킬 대상 aggregate 자체가 전무.
- 재사용 substrate 확인(§3.3): Evidence Store=`MediaHost`(내용주소 `MediaHost.php:88-102`)·Security Event=`SecurityAudit`(감사 이벤트 Digest 원천 `SecurityAudit.php:27`). Snapshot/Evidence Reference Digest는 이 둘을 조립.
- 장식 오인 금지: `menu_audit_log`(`AdminMenu.php:169-212`) verify() 0은 Audit Reference 대상 아님. PII 가명화 SHA-256(`AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115`)·SHA-1 identity(`CRM.php:589-930`)는 KEEP_SEPARATE(가명화·비무결성) — Reference Digest로 계상 금지.

## 3. 판정

- Verdict: **ABSENT (Evidence/Attachment Reference substrate만 PARTIAL)** — Entry↔외부 대상 Reference Digest 봉인·재대조 구조 전무. 유일 실 참조 substrate는 내용주소 CAS(`MediaHost.php:93`)로 Evidence/Attachment Reference에 재사용 가능하나, Record/Commit/History/Snapshot/Audit/Outbox·Correction/Supersession/Retention/Legal Hold·Link Reference는 선행 Decision Foundation·Immutable Ledger 부재로 대조 대상 자체가 없다 → **BLOCKED_PREREQUISITE**.
- 선행 의존: §3.1 Immutable Ledger(Correction/Supersession/Retention/Legal Hold/Link) ABSENT·§3.2 Decision Foundation(Record/Snapshot/Evidence/Audit/Outbox) ABSENT. §3.3 Platform Security(내용주소 CAS `MediaHost.php:88-102`·Security Event `SecurityAudit.php:27`)만 substrate PRESENT.
- cover: **0** (Reference Digest 봉인·재대조 전무. MediaHost 내용주소는 VALIDATED_FILE_HASH_SOURCE로 KEEP_SEPARATE 재사용 — Reference Verification 대체 아님).

## 4. 확장/구현 방향 (설계)

- **재사용(발명 아닌 조립)**: §33 Attachment·§43 Evidence Reference는 내용주소 CAS(`MediaHost.php:88-102`)의 SHA-256 digest를 Entry Reference Digest로 봉인·재대조(VALIDATED_FILE_HASH_SOURCE). Audit Reference는 `SecurityAudit`(`SecurityAudit.php:27`) 감사 이벤트 Digest를 재사용.
- **순신규(Reference 대조 신설)**:
  1. **Entry↔대상 Reference Digest** — §26 Entry Digest에 각 참조(Record/Commit/History/Snapshot/Evidence/Audit/Outbox/Sequential) Reference Digest를 포함하고, 검증 시 대상 레코드 재조회→Canonical Projection(§5.3)→Digest 재계산→`hash_equals` 대조(`SecurityAudit.php:64` 패턴 재사용, Constant-time).
  2. **Correction/Supersession/Retention/Legal Hold↔Target**(§34~§36) — 선행 Immutable Ledger 신설 후 Target Entry Digest 변경 탐지.
  3. **Ledger Link↔Source/Target Digest·Cross-Tenant Link 차단**(§31·§5.13) — 현행 tenant 술어 없음(전역 단일 체인)의 직접 교정. Link 양단이 다른 tenant면 Digest 이전 차단.
- **§22 Reference Policy 강제** — Display Name·Email·UI Label·Localized Name·현재 조직/직책명 대신 Stable Identifier(tenant_id·decision_record_id·actor_subject_id·ledger_entry_id·version_id 등)+Snapshot Digest만 Reference. 현행 SHA-1 identity(`CRM.php:589-930`)·PII 가명화(`Dsar.php:24-29` 등)는 가명화 용도로 KEEP_SEPARATE, Reference Digest로 전용 금지.
- **구현 순서**: 선행 Decision Foundation(Record/Snapshot/Evidence/Audit/Outbox)·Immutable Ledger(Correction/Supersession/Link) 실구현 → Reference Digest 봉인 배선 → §43 대조 조립. 이번 차수=설계(코드 0). 실 구현=별도 승인세션.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_ENTRY_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHAIN_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

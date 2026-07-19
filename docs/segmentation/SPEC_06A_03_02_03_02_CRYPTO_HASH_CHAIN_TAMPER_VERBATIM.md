# SPEC (VERBATIM) — Cryptographic Hash Chain & Tamper Detection Governance

> EPIC **06-A-03-02-03-02** · 사용자 제공 원문 스펙 선(先)영속화(ⓐ) · 289차 후속 회차.
> 이 문서는 **원문 계약의 정본 보존본**이다. 하위 per-entity DSAR(ⓒ)·ADR(ⓓ)이 이 문서를 근거로 인용한다.
> 처리 파이프라인: ⓐ SPEC 선영속 → ⓑ 능력기반 전수조사(GROUND_TRUTH) → ⓒ per-entity DSAR 전사 → ⓓ ADR + PM/Repeat/Agent History.
> 선행 블록: [`SPEC_06A_03_02_03_01_DECISION_INTEGRITY_LEDGER_VERBATIM`](SPEC_06A_03_02_03_01_DECISION_INTEGRITY_LEDGER_VERBATIM.md) · [`ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER`](../architecture/ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER.md).

---

## §0 작업 목적

앞 단계(Decision Integrity Core·Immutable Decision Ledger·Partition·Entry·Sequence·Head·Checkpoint·Seal·Link·Correction·Supersession·Retention·Legal Hold·Idempotency·Lock·Lease·Fencing·Gap/Duplicate Detection·Reconstruction·Reconciliation Foundation) 위에 Enterprise급 **Cryptographic Hash Chain & Tamper Detection Governance**를 구축한다.

핵심 목적: Immutable Ledger의 각 Entry·Link·Head·Checkpoint·Snapshot·Evidence·Audit·Outbox를 **Cryptographic Digest + Chain Relationship**으로 결합하여, Payload/Record/History/Snapshot/Evidence/Audit/Outbox 변조, Entry 삭제·삽입·순서변경, Previous Link 변경, Sequence 변경, Head 위조, Checkpoint 범위 변경, Correction/Supersession Target 변경, Cross-Tenant Chain, Algorithm Downgrade, Key Version 혼선, Canonicalization/Encoding/Null/숫자/Timestamp/필드순서/대소문자/Unicode/부동소수점/Monetary/Attachment Manifest 불일치, Replay/Migration Silent Mutation, DBA 직접변경, App Bug History Rewrite, Partial Chain, 미검증 Ledger 사용을 **탐지**하는 Integrity Verification 체계를 구축한다.

완료 시 답할 수 있어야 하는 질문(발췌): Canonical Payload가 무엇인가·어떤 필드가 Digest에 포함/제외되었고 이유·Algorithm과 Version·환경/언어 무관 동일 Digest·Decimal 문자열차이 무관·Timestamp TZ/Precision 표준화·Unicode 정규화·Collection 결정성·Previous Digest 포함·삽입/삭제/순서변경·Head 일치·Checkpoint 대표성·Record↔Entry Digest 일치·Correction/Supersession/Legal Hold/Retention 변조·Sequence 범위 온전성·전체 Chain 온전성·Tamper 계층·Tamper 시 차단·Algorithm 전환 중 이중검증·Legacy Hash 구분·Verification 결과 자체 무결성.

## §1 구현 범위 (87항)

Cryptographic Integrity Registry·Policy·Definition·Version·Profile / Hash Algorithm Registry / Digest Algorithm Policy / Canonical Serialization Policy / Canonical Field Set / Canonical Payload Projection / Canonical Null·Number·Monetary·Timestamp·Unicode·Encoding·Collection Ordering·Reference Policy / Digest Envelope / Payload·Context·Entry·Previous Entry·Chain·Ledger Head·Link·Snapshot·Evidence·Audit·Outbox·Attachment Manifest·Correction·Supersession·Retention Action·Legal Hold·Checkpoint·Checkpoint Range Digest / Ledger Seal Digest Foundation / Hash Chain / Partition Hash Chain / Case·Decision Hash Chain Reference / Chain·Entry·Range·Head·Checkpoint·Reference·Completeness Verification / Tamper Detection·Classification·Incident·Evidence·Alert·Response Policy / Verification Job / Continuous·On-demand·Commit-time·Read-time·Periodic·Historical Verification / Verification Snapshot·Evidence·Audit·Reconciliation / Algorithm Rotation Foundation / Digest Version Migration Foundation / Dual-Digest Transition Foundation / Legacy Hash Import / Static Lint / Runtime Guard / Error·Warning Contract / API / Index / Cache / Performance / Testing / Migration / Existing Implementation Audit / Duplicate Implementation Audit / Documentation / ADR / PM·Repeat·Agent History.

## §2 실행 역할

Enterprise Cryptographic Integrity Architect · Hash Chain Architect · Canonical Serialization Architect · Tamper Detection Architect · Ledger Verification 책임자 · Digest Versioning · Algorithm Governance · Canonical Data Projection · Monetary/Timestamp/Unicode Canonicalization · Ledger Head/Checkpoint Verification · Integrity Incident · Verification Operations · Algorithm Rotation Foundation · Legacy Hash Migration · Multi-tenant Cryptographic Isolation · Evidence·Audit·Lineage · Existing Implementation Consolidation · Regression Protection · ADR·PM·Agent History 책임자.

## §3 선행조건

- **§3.1 Immutable Ledger Foundation**: Approval Decision Ledger·Partition·Entry·Sequence·Head·Checkpoint·Link·Correction·Supersession·Retention Action·Legal Hold Binding·Idempotency·Lock·Lease·Fencing Token·Gap·Conflict·Reconstruction·Reconciliation.
- **§3.2 Decision Foundation**: Decision Command·Validation Result·Commit·Record·History·Snapshot·Evidence·Audit Event·Outbox·Action Snapshot·Attachment Manifest·Sequential Completion Reference.
- **§3.3 Platform Security Foundation(재사용 확인)**: Cryptographic Library·Hash Utility·Canonical JSON Library·Decimal Utility·Trusted Time·Charset Policy·Unicode Normalization Utility·KMS/HSM Reference·Key Version Registry·Security Event Framework·Incident Management·Alerting·Observability·Batch Scheduler·Distributed Worker·Database Audit·Evidence Store.

## §4 기존 Hash·Digest·Tamper 구현 전수 조사 (검색 키워드)

Hash·SHA·SHA-256/384/512·MD5·SHA-1·HMAC·Digest·Checksum·CRC·Fingerprint·Content/Payload/Record/Row/Event/Audit/Snapshot/Evidence/Attachment/File Hash·Previous/Chain Hash·Hash Chain·Merkle Root/Tree·Checkpoint/Seal Hash·Canonical/Stable/Deterministic JSON·JSON/Property Sort·Canonical Serialization·JCS·RFC 8785·Unicode Normalize·NFC/NFD/NFKC·UTF-8·Charset·Decimal Normalize·BigDecimal·Floating Point·Currency Precision·Timestamp Normalize·UTC·Timezone·ms/µs/ns·Null Normalization·Empty String·Collection/Map/Set Sort·Binary Encoding·Base64·Hex·Hash/Algorithm/Key/Digest Version·Legacy Checksum·Signature·Tamper·Integrity Check·Verification·Verify Hash·Hash Mismatch·Corruption·Database Modification·Direct SQL·Trigger·CDC·Binlog·WAL·Reconciliation·Security/Integrity Incident·Checkpoint/Batch/Scheduled Verification·Production Incident·Existing Test·Migration/Git/Repeat Problem History. **MD5·SHA-1·단순 CRC를 Security Integrity Proof로 사용하는 구현 = Critical Gap 후보.**

## §5 핵심 원칙

- **§5.1** Digest(단방향 무결성) ≠ Encryption(가역 기밀성). 암호화 존재로 Digest 생략 금지.
- **§5.2** Digest ≠ Digital Signature. 이번 단계는 Digest·Hash Chain만, Signature/PKI는 후속.
- **§5.3** Canonicalization 없이 Hash 금지(필드순서·whitespace·null·빈문자열·숫자·Decimal Scale·TS TZ/Precision·Unicode·Collection순서·Boolean·Reference·Binary Encoding 차이 제거 후 해시).
- **§5.4** `field1+field2+field3` 원문 문자열 임의 연결 금지. 필드경계·Type 보존 Canonical Envelope 사용.
- **§5.5** Algorithm/Version/Output Encoding/Canonicalization Version을 Registry·Policy로 관리(하드코딩 금지).
- **§5.6** 약한 Algorithm 차단: MD5·SHA-1·CRC32·Adler32·Java hashCode·DB non-crypto hash·Runtime object hash·Truncated Digest. Legacy Hash는 Source Metadata로만 보존.
- **§5.7** Raw Sensitive Data를 Digest Input Log/Debug/Error/Trace에 노출 금지.
- **§5.8** Digest Version은 Entry에 고정. 과거 Entry를 현재 Algorithm으로 조용히 재계산·덮어쓰기 금지.
- **§5.9** Hash Chain은 이전 Entry 포함: Current Payload Digest+Current Context Digest+Previous Entry Digest+Ledger Identity+Partition Identity+Ledger Sequence+Entry Type+Digest Version.
- **§5.10** 첫 Entry는 명시적 **Versioned Genesis Marker**(Null·빈문자열·임의값 금지).
- **§5.11** Verification 실패를 Warning으로 무시 금지 — Critical Ledger/Payment/Settlement/Contract/Legal/Compliance Digest 불일치=Critical Incident.
- **§5.12** Tamper Detection 결과도 Immutable 기록(누가·언제·무엇·불일치를 Snapshot/Evidence/Audit).
- **§5.13** 고객설정으로 비활성 불가: Canonical Serialization·Strong Algorithm·Previous Digest Binding·Sequence Binding·Tenant Binding·Entry/Head Verification·Critical Tamper Alert·Verification Audit·Algorithm Version Recording·Weak Algorithm Rejection.

## §6 Canonical Entity (기존 동등 부재 시 최소 신설)

`APPROVAL_CRYPTO_INTEGRITY_REGISTRY`·`_POLICY`·`_DEFINITION`·`_VERSION` / `APPROVAL_CRYPTO_PROFILE` / `APPROVAL_HASH_ALGORITHM_REGISTRY` / `APPROVAL_CANONICALIZATION_POLICY` / `APPROVAL_CANONICAL_FIELD_SET` / `APPROVAL_CANONICAL_PAYLOAD_PROJECTION` / `APPROVAL_DIGEST_ENVELOPE` / `APPROVAL_LEDGER_ENTRY_DIGEST`·`_CHAIN_DIGEST`·`_HEAD_DIGEST`·`_LINK_DIGEST`·`_CHECKPOINT_DIGEST` / `APPROVAL_LEDGER_VERIFICATION_JOB`·`_RUN`·`_RESULT`·`_SNAPSHOT` / `APPROVAL_LEDGER_TAMPER_INCIDENT`·`_EVIDENCE`·`_ALERT` / `APPROVAL_DIGEST_ROTATION_PLAN`·`_MIGRATION` / `APPROVAL_CRYPTO_INTEGRITY_RECONCILIATION`·`_AUDIT_EVENT`.

## §7–§12 Registry·Policy·Definition·Version·Profile·Algorithm Registry (필수필드 요약)

- **§7 REGISTRY**: registry id·tenant·code·name·type·authoritative source·supported/default algorithms·canonicalization standards·output encodings·chain/checkpoint/seal(foundation)/dual-digest/legacy/verification support·owner·active_version·valid_from/to·status·evidence. TYPE: PLATFORM/TENANT/DECISION_LEDGER/FINANCIAL_CONTROL/LEGAL/COMPLIANCE/SECURITY/CUSTOM.
- **§8 POLICY**: minimum algorithm strength·allowed/prohibited algorithm ids·digest length·output encoding·canonicalization policy id·genesis·chain/sequence/tenant/partition/reference binding·checkpoint·verification frequency·commit-time required·read-time·periodic·tamper response·rotation·migration·owner·version·valid·status·evidence.
- **§9 DEFINITION**: definition id·registry id·code·name·applicable ledger/entry types·algorithm/canonicalization/verification policy·payload/context/reference/chain/checkpoint field set·current version·owner·status·evidence.
- **§10 VERSION**: version id·definition id·number·previous·version type·algorithm id/version·digest output length·output encoding·canonicalization version·field set versions·genesis/chain/checkpoint formula version·effective_from/to·created/reviewed/approved by·activated_at·version integrity digest·status·evidence. TYPE: INITIAL/ALGORITHM_CHANGE/CANONICALIZATION_CHANGE/FIELD_SET_CHANGE/CHAIN_FORMULA_CHANGE/CHECKPOINT_FORMULA_CHANGE/OUTPUT_ENCODING_CHANGE/SECURITY_HARDENING/CORRECTION/MIGRATION.
- **§11 PROFILE**: profile id·code·name·minimum digest bit length·allowed algorithms·checkpoint frequency·commit/read/periodic verification·full chain interval·tamper severity mapping·write/read block policy·incident escalation·status·evidence. TYPE: STANDARD/FINANCIAL_HIGH/PAYMENT_CRITICAL/SETTLEMENT_CRITICAL/LEGAL_HIGH/COMPLIANCE_HIGH/SECURITY_HIGH/REGULATED/CUSTOM.
- **§12 HASH_ALGORITHM_REGISTRY**: algorithm id·code·family·name·standard reference·digest bit length·collision/preimage resistance classification·implementation provider·provider version·FIPS status·approved/prohibited use cases·introduced/deprecated/sunset_at·status·evidence. 초기 권장 Canonical: SHA-256/384/512·SHA3-256/384/512. 차단: MD5·SHA-1·CRC·hashCode·MurmurHash·xxHash·CityHash·DB convenience hash·Runtime object identity hash.

## §13–§22 Canonicalization

- **§13 CANONICALIZATION_POLICY**: serialization format(CANONICAL_JSON/CBOR ref/BINARY ref/CUSTOM — 초기 CANONICAL_JSON 우선)·property ordering·null·empty·string·unicode·encoding·boolean·integer·decimal·monetary·timestamp·date·timezone·collection·map·binary·reference·excluded field·schema version policy·max payload size.
- **§14 CANONICAL_FIELD_SET**: field set id·integrity version id·aggregate type·code·included/excluded/conditional/required field paths·aliases·type map·ordering·sensitive/reference-only fields·large object exclusion·schema version·valid·status·evidence. Aggregate Type: DECISION_COMMAND/VALIDATION/COMMIT/RECORD/HISTORY/ACTION/SNAPSHOT/EVIDENCE/AUDIT/OUTBOX·ATTACHMENT_MANIFEST·LEDGER_ENTRY/LINK/HEAD/CHECKPOINT·CORRECTION·SUPERSESSION·RETENTION_ACTION·LEGAL_HOLD·CUSTOM.
- **§15 CANONICAL_PAYLOAD_PROJECTION**: projection id·source aggregate type/id/version·field set id·canonicalization policy id·canonical schema version·projected/excluded field count·canonical payload·byte length·encoding·generated_at·implementation version·status·evidence. **Production Log에 Canonical Payload 전체 기록 금지.**
- **§16 Null Policy**: Field Absent/Explicit Null/Empty String/Empty Array/Empty Object/Zero/False 구분. Empty→Null 자동변환 금지·Empty Collection→Missing 처리 금지.
- **§17 Number Policy**: 선행 zero 제거·`+`제거·negative zero 정규화·exponent 표기 고정·Float 직접사용 금지·Business Decimal은 Decimal Type·NaN/Infinity 금지·Locale/Thousands separator 금지. `1`/`1.0`/`1.00` 동일성 도메인별 명시.
- **§18 Monetary Policy**: amount minor unit 또는 normalized decimal·currency code·currency precision version·rounding mode·source amount representation·monetary policy version. Binary Float·Locale-formatted·Currency 없는 Amount·Scale 임의제거·과거 Amount 재해석·반올림후 원본유실 금지.
- **§19 Timestamp Policy**: UTC 변환·Offset 처리·Precision 고정·Leap second·Trusted Server Time·Client/Server 분리·ISO-8601·Trailing zero·TZ name 제외·Ambiguous local 금지. 구분: event_effective_at·committed_at·recorded_at·verified_at.
- **§20 Unicode Policy**: UTF-8·Normalization Form 명시·Invalid Code Point 차단·Control char·Line ending·Zero-width·Homoglyph ref·Leading/Trailing/Internal whitespace 정책. Reason Code/Identifier/Enum은 Canonical Code 우선.
- **§21 Collection Ordering**: Ordered List(순서보존)·Unordered Set(Canonical Comparator 정렬)·Map(Canonical Key 정렬)·Multiset·Event Sequence(Business Sequence 보존).
- **§22 Reference Policy**: Stable Identifier(tenant_id·decision_record_id·decision_slot_id·actor_subject_id·assignment_id·authority/delegation_resolution_id·step_instance_id·ledger_entry_id·ledger_sequence·version_id). Display Name·Email·UI Label·Localized Name·Mutable External Description·현재 조직/직책명 금지. 필요 시 Snapshot Identifier+Snapshot Digest 포함.

## §23–§37 Digest 계층

- **§23 DIGEST_ENVELOPE**: envelope id·tenant·aggregate type/id/version·integrity definition/version id·algorithm id/version·canonicalization policy id/version·field set id/version·schema version·output encoding·digest purpose·generated_at·generated_by implementation·status·evidence. Purpose: PAYLOAD/CONTEXT/LEDGER_ENTRY/CHAIN/LEDGER_HEAD/LEDGER_LINK/SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/ATTACHMENT_MANIFEST/CORRECTION/SUPERSESSION/RETENTION_ACTION/LEGAL_HOLD/CHECKPOINT/SEAL_FOUNDATION/VERIFICATION_RESULT/CUSTOM.
- **§24 Payload Digest**: Canonical Business Payload만. Sequence/Previous Digest 직접 혼합 금지(Entry/Chain에서 결합).
- **§25 Context Digest**: tenant·decision definition/action version·approval case version·work item·assignment·authority/delegation resolution·sequential step·actor identity snapshot ref·legal entity·organization·resource·amount·currency·effective/commit time.
- **§26 Entry Digest**(`APPROVAL_LEDGER_ENTRY_DIGEST`): digest formula version·tenant·ledger·partition·ledger/partition sequence·entry type/subtype·integrity version·payload/context/reference digest·previous entry digest·effective/committed/recorded time·genesis marker(해당 시). 필드: entry digest id·ledger entry id·integrity version·algorithm·canonicalization version·payload/context/reference/previous entry digest·computed entry digest·output encoding·generated_at·verification status·status·evidence.
- **§27 Genesis Digest**: Versioned Genesis Marker(tenant·ledger·partition·integrity version·genesis marker code·partition start metadata·ledger creation time·ledger type). 동일 상수 문자열 단순 Genesis 금지.
- **§28 Hash Chain**: Previous Entry Digest+Payload+Context+Reference Digest+Sequence+Entry Type+Integrity Version+Ledger/Partition Identity. Byte Layout·Canonical Envelope Schema 문서화·Versioning.
- **§29 Partition Hash Chain**: Partition별 독립 Chain(Genesis·Head·Sequence·Cross-partition Reference·Closure Checkpoint·New Partition Opening Reference). 전환 시 이전 Partition Final Checkpoint/Head Digest를 새 Genesis Reference에 포함.
- **§30 Ledger Head Digest**: tenant·ledger·partition·current entry/sequence·current entry digest·previous head digest·head version·fencing token ref·updated_at. Head Digest ≠ Entry Digest.
- **§31 Ledger Link Digest**: source/target entry id+digest·link type·direction·tenant·link policy version·created_at. Cross-Tenant Link는 Digest 이전 차단.
- **§32 Snapshot/Evidence/Audit/Outbox Digest**: 각 독립 Digest(Snapshot: type·source decision·actor/assignment/authority/delegation/sequential/resource snapshot·validation/commit result·captured_at / Evidence: metadata·canonical refs·lineage·recorded_at·sensitive payload ref digest / Audit: event type·actor·target·action·correlation·causation·occurred/recorded_at / Outbox: event type·aggregate id·event version·payload digest·partition key·correlation·causation·created_at).
- **§33 Attachment Manifest Digest**: file registry id·content digest·size·MIME·classification·malware/DLP result ref·encryption state·retention class·legal hold state·manifest sequence. 원문 전체 직접포함 금지.
- **§34 Correction Digest**: target entry id+digest·correction type·corrected field paths·previous/corrected value digest·reason·requested/authorized actor·approval ref·effective/recorded time.
- **§35 Supersession Digest**: superseded decision/entry id+digest·superseding decision/entry id·reason·policy version·authorized actor·effective/recorded time.
- **§36 Retention/Legal Hold Digest**: Retention(target entry id+digest·retention policy·action type·legal basis·authorized actor·executed time·retained metadata set·tombstone ref) / Legal Hold(target entry·hold id·reason·authority·start/end·deletion prohibited·retention override·release ref).
- **§37 Checkpoint Digest**(`APPROVAL_LEDGER_CHECKPOINT_DIGEST`): tenant·ledger·partition·first/last included sequence·entry count·ordered entry digest collection·previous checkpoint digest·checkpoint policy version·generated_at. 대규모=Merkle Tree/Rolling Digest(Versioned)·단순 문자열 Concatenation 금지.

## §38–§43 Verification Scope·순서

- **§38 Chain Verification Scope**: SINGLE_ENTRY·ENTRY_WITH_PREVIOUS·SEQUENCE_RANGE·PARTITION·CHECKPOINT_RANGE·APPROVAL_CASE·DECISION_INSTANCE·DECISION_SLOT·FULL_LEDGER·CORRECTION_CHAIN·SUPERSESSION_CHAIN·RETENTION_CHAIN·LEGAL_HOLD_CHAIN·CUSTOM.
- **§39 Entry Verification 순서**: ①Integrity Version 존재 ②Algorithm 허용 ③Canonicalization Version ④Field Set Version ⑤Source Aggregate 조회 ⑥Canonical Projection 재생성 ⑦Payload Digest 재계산 ⑧Context Digest 재계산 ⑨Reference Digest 재계산 ⑩Previous Entry Digest 확인 ⑪Entry Digest 재계산 ⑫Stored Digest 비교 ⑬Sequence/Tenant/Partition Binding ⑭Result 기록.
- **§40 Range Verification**: 시작/종료 Sequence 존재·Sequence 연속성·Entry Count·각 Entry Digest·Previous Digest Chain·Entry Type Policy·Mandatory Reference·마지막 Entry↔Range Head·Checkpoint Digest 일치.
- **§41 Head Verification**: Head가 마지막 Entry 지시·Head Sequence=Max·Head Entry Digest·Head Digest 재계산·Head Version 단조증가·Previous Head Reference·Partition/Ledger Head 관계·Fencing Token 이상無.
- **§42 Checkpoint Verification**: Range 시작/종료·Entry Count·모든 Entry Digest·Range Chain·Previous Checkpoint·Checkpoint Digest·Policy Version·누락/중복 Entry·Range Overlap/Gap.
- **§43 Reference Verification**: Ledger Entry↔Decision Record/Commit/History/Snapshot/Evidence/Audit/Outbox/Sequential Reference·Correction/Supersession/Retention/Legal Hold↔Target Entry·Ledger Link↔Source/Target Digest.

## §44–§47 Tamper

- **§44 Tamper Detection 유형**: PAYLOAD/CONTEXT/REFERENCE/ENTRY/PREVIOUS_DIGEST_MISMATCH·CHAIN_BREAK·MISSING/INSERTED/DUPLICATE_ENTRY·SEQUENCE_CHANGED·ENTRY_ORDER_CHANGED·HEAD_DIGEST/SEQUENCE_MISMATCH·CHECKPOINT_DIGEST/RANGE_MISMATCH·LINK/SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/ATTACHMENT_MANIFEST_MISMATCH·CORRECTION/SUPERSESSION_TARGET_CHANGED·RETENTION_ACTION/LEGAL_HOLD_CHANGED·ALGORITHM_DOWNGRADE·CANONICALIZATION/FIELD_SET_VERSION_MISMATCH·CROSS_TENANT_CHAIN·UNKNOWN_ALGORITHM·LEGACY_HASH_UNTRUSTED·VERIFICATION_RESULT_TAMPER_REFERENCE·CUSTOM.
- **§45 Tamper Classification**(`APPROVAL_LEDGER_TAMPER_INCIDENT`): Severity INFO/LOW/MEDIUM/HIGH/CRITICAL/CATASTROPHIC. Category DATA_MUTATION/DELETION/INSERTION·ORDER_MANIPULATION·REFERENCE_MANIPULATION·HISTORY/AUDIT/SNAPSHOT/OUTBOX/ATTACHMENT_MANIFEST_REWRITE·ALGORITHM_DOWNGRADE·CONFIGURATION/CANONICALIZATION_DRIFT·MIGRATION_CORRUPTION·ADMINISTRATIVE_MUTATION·APPLICATION_DEFECT·STORAGE_CORRUPTION·UNKNOWN. 필드: incident id·tenant·ledger·partition·affected entry ids/sequences/decision ids·tamper type/category·severity·first/last detected_at·detection source·expected/actual digest·expected/actual version·write/read/workflow block applied·incident ref·status·evidence.
- **§46 Tamper Response Action**: LOG_ONLY·WARNING·BLOCK_LEDGER_APPEND·BLOCK_DECISION_COMMIT·BLOCK_AFFECTED_CASE/RESOURCE·BLOCK_TENANT_APPROVAL·RESTRICT_READ·REQUIRE_MANUAL_REVIEW·TRIGGER_RECONCILIATION/RECONSTRUCTION·ESCALATE_SECURITY_INCIDENT·PRESERVE_FORENSIC_SNAPSHOT·ACTIVATE_KILL_SWITCH·CUSTOM. 기본: Critical Entry Mismatch→Commit 차단·Chain Break→Partition Append 차단·Head Mismatch→Head갱신/Commit 차단·Audit/Evidence Mismatch→Manual Review+Security Incident·Weak Algorithm→신규 Commit 차단/Migration 요구·Legacy Untrusted→Warning/Manual Review+Canonical 별도생성.
- **§47 Tamper Evidence**(`APPROVAL_LEDGER_TAMPER_EVIDENCE`): evidence id·incident id·verification run id·ledger·partition·entry·sequence·expected/actual canonical projection ref·expected/actual digest·algorithm·canonicalization version·source record/database audit/CDC/log/forensic snapshot ref·collected_at/by·immutable digest·status·evidence. 민감 원문 전체 저장 금지.

## §48–§56 Verification 운영

- **§48 Verification Job**(`APPROVAL_LEDGER_VERIFICATION_JOB`): Job Type COMMIT_TIME/READ_TIME/PERIODIC_INCREMENTAL/PERIODIC_FULL/CHECKPOINT/ON_DEMAND/INCIDENT/MIGRATION/RECOVERY/COMPLIANCE/CUSTOM. 필드: job id·tenant·ledger·partition·job type·scope·start/end sequence·integrity version policy·checkpoint policy·priority·schedule ref·max duration·retry/failure policy·owner·status·evidence.
- **§49 Verification Run**: run id·job id·tenant·ledger·partition·scope·requested by·started/completed_at·first/last sequence·expected/verified entry count·passed/failed/warning/skipped count·first/last mismatch sequence·result status·run digest·status·evidence.
- **§50 Verification Result**: VERIFIED/VERIFIED_WITH_WARNINGS/FAILED/TAMPER_DETECTED/CHAIN_BROKEN/HEAD_MISMATCH/CHECKPOINT_MISMATCH/INCOMPLETE/ALGORITHM_UNSUPPORTED/CANONICALIZATION_UNSUPPORTED/SOURCE_UNAVAILABLE/MANUAL_REVIEW_REQUIRED. 필드: result id·run id·ledger entry id·sequence·verification type·expected/actual digest·algorithm·integrity version·canonicalization version·payload/context/reference/previous digest/chain/head/checkpoint result·result·failure code·verified_at·result digest·status·evidence.
- **§51 Commit-time Verification**: Canonical Projection·Payload/Context Digest·Previous Digest 조회·Entry Digest·Stored Entry 재조회·Stored vs 생성 Digest 비교·Head 갱신 검증·Head가 현재 Entry 지시·Outbox Binding Digest. 실패 시 전체 Transaction Rollback.
- **§52 Read-time Verification**: Critical Profile은 조회 시 Digest 검증·대량 목록은 Sampling/Checkpoint·실패 데이터를 정상처럼 반환 금지·응답에 Integrity Status·권한 없는 사용자에 내부 Digest 노출 금지·Critical Failure 시 읽기 제한/Security Banner.
- **§53 Periodic Verification**: Incremental since Last Verified·Full Partition·Full Ledger·Checkpoint Range·Random Sampling·High-risk Decision·Recently Migrated/Corrected/Superseded Entry·Legal Hold Entry.
- **§54 Verification Snapshot**: snapshot id·run id·tenant·ledger·partition·integrity definition version·algorithm registry snapshot·canonicalization policy snapshot·field set snapshot·ledger head snapshot·checkpoint snapshot·verified sequence range·mismatch summary·incident refs·captured_at·immutable digest·status·evidence.
- **§55 Verification Audit Event**: CRYPTO_INTEGRITY_REGISTRY/VERSION_CREATED·HASH_ALGORITHM_REGISTERED/DEPRECATED·CANONICALIZATION_POLICY/FIELD_SET_CREATED·LEDGER_ENTRY/CHAIN/HEAD/CHECKPOINT_DIGEST_GENERATED·VERIFICATION_JOB_CREATED·RUN_STARTED/COMPLETED·ENTRY_VERIFIED/FAILED·CHAIN_VERIFIED/BREAK_DETECTED·HEAD_VERIFIED/MISMATCH_DETECTED·CHECKPOINT_VERIFIED/MISMATCH_DETECTED·TAMPER_INCIDENT_CREATED·TAMPER_RESPONSE_APPLIED·ALGORITHM_DOWNGRADE_BLOCKED·DUAL_DIGEST_STARTED·DIGEST_VERSION_MIGRATION_STARTED/COMPLETED·LEGACY_HASH_IMPORTED·MANUAL_REVIEW_REQUESTED.
- **§56 Reconciliation**(`APPROVAL_CRYPTO_INTEGRITY_RECONCILIATION`): Stored vs Recomputed(Payload/Context/Entry Digest)·Previous Digest vs Previous Entry·Head vs Current·Checkpoint vs Range·Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Retention/Legal Hold Digest vs Record·DB Source vs Replica·Primary vs Audit Store·Canonical Ledger vs Legacy Hash/ERP Checksum/Workflow History Digest.

## §57–§60 Rotation·Migration·Legacy

- **§57 Algorithm Rotation Foundation**(`APPROVAL_DIGEST_ROTATION_PLAN`): plan id·tenant·source/target algorithm id·source/target integrity version·affected ledger types·affected sequence range·transition mode·dual-digest start/end·new write policy·historical migration policy·rollback/verification policy·approved by·status·evidence. Mode: NEW_ENTRIES_ONLY/DUAL_DIGEST/FULL_REHASH_REFERENCE/CHECKPOINT_ANCHOR/MIGRATION_BY_PARTITION/CUSTOM. **기존 Digest 덮어쓰기 금지.**
- **§58 Dual-Digest Transition Foundation**: primary/secondary digest·primary/secondary algorithm version·transition plan ref·generated_at·both verification result·cutover status. 과거 Primary Digest 유지.
- **§59 Digest Version Migration Foundation**: source/target digest version·source/target digest·source/target canonical payload version·semantic equivalence result·migration batch·migrated_at·migration actor·reconciliation result·status·evidence. Canonicalization 변경 시 단순 Rehash 아닌 Semantic Equivalence 검증.
- **§60 Legacy Hash Import**: TRUSTED_CRYPTOGRAPHIC_HASH/WEAK_CRYPTOGRAPHIC_HASH/NON_CRYPTOGRAPHIC_CHECKSUM/UNKNOWN_HASH/MISSING_HASH/CORRUPTED_HASH/UNVERIFIABLE_HASH. Legacy Hash를 Canonical Digest Field에 복사 금지 — 별도 Source Hash Metadata + Canonical Digest 신규 생성.

## §61 Critical Gap 후보

Canonicalization 없이 Hash·Field 문자열 단순연결·MD5/SHA-1/CRC/hashCode/DB convenience hash·Algorithm 하드코딩·Algorithm/Canonicalization/Field Set Version 미저장·Digest Input Field 불명확·Monetary Float·Local TZ Timestamp·Unicode Normalization 없음·Collection 비결정적·Display Name Reference·Previous Digest/Sequence/Tenant 미포함·Genesis 규칙 없음·Stored Digest 덮어쓰기·과거 Rehash 후 원본삭제·Head Digest 없음·Checkpoint/Commit-time Verification 없음·Verification 실패 무시·Tamper Incident 미생성·Weak Algorithm 고객설정 허용·Legacy Hash Canonical 신뢰·Verification Result 수정가능·Sensitive Payload Log·Timing-unsafe 비교·Cross-Tenant Chain·Algorithm Downgrade·Dual-Digest 없이 교체·Migration Rehash 미검증.

## §62 Static Lint (차단)

MD5/SHA-1 Import·CRC Security Use·hashCode Integrity Use·Raw String Concatenation Digest·Algorithm Literal 하드코딩·Canonicalization 없는 Digest·Floating Point Monetary Digest·Local Time Timestamp Digest·Default Charset·Platform-dependent Encoding·Unordered Map/Set 직접 Serialization·Display Name Digest Reference·Previous Digest 없는 Entry·Sequence/Tenant/Digest Version 없는 Entry·Stored Digest Setter·Digest Update Repository·Verification Result Update·Weak Algorithm Feature Flag·Sensitive Payload Logging·Digest Full Value 로그·Constant-time 비교 미사용·중복 Hash Utility·중복 Canonicalization.

## §63 Runtime Guard (차단)

Algorithm Not Allowed/Deprecated/Weak/Unknown·Canonicalization/Field Set Version Missing·Canonical Projection Failed·Unsupported Value Type·Invalid Unicode/Decimal/Monetary Scale/Timestamp·Default Charset·Previous Digest Missing·Genesis Marker Invalid·Entry Digest Mismatch·Chain Break·Head/Checkpoint Mismatch·Snapshot/Evidence/Audit/Outbox/Attachment Manifest/Correction/Supersession Digest Mismatch·Cross-Tenant Chain·Algorithm Downgrade·Verification Result Invalid·Tamper Incident Unhandled·Kill Switch Active.

## §64 Error Contract

APPROVAL_CRYPTO_INTEGRITY_REGISTRY/POLICY/DEFINITION/VERSION_NOT_FOUND·_VERSION_INACTIVE·HASH_ALGORITHM_NOT_FOUND/NOT_ALLOWED/DEPRECATED/WEAK·CANONICALIZATION_POLICY_NOT_FOUND·CANONICALIZATION_VERSION_MISSING·CANONICAL_FIELD_SET_NOT_FOUND/VERSION_MISSING·CANONICAL_PROJECTION_FAILED·CANONICAL_VALUE_TYPE_UNSUPPORTED·CANONICAL_UNICODE/DECIMAL/MONETARY/TIMESTAMP/ENCODING_INVALID·LEDGER_PREVIOUS_DIGEST_MISSING·LEDGER_GENESIS_MARKER_INVALID·LEDGER_PAYLOAD/CONTEXT/REFERENCE/ENTRY_DIGEST_MISMATCH·LEDGER_CHAIN_BREAK·LEDGER_HEAD/CHECKPOINT_DIGEST_MISMATCH·DECISION_SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/ATTACHMENT_MANIFEST/CORRECTION/SUPERSESSION_DIGEST_MISMATCH·LEDGER_CROSS_TENANT_CHAIN·HASH_ALGORITHM_DOWNGRADE_BLOCKED·LEDGER_VERIFICATION_FAILED·LEDGER_TAMPER_DETECTED·LEDGER_TAMPER_RESPONSE_REQUIRED·CRYPTO_INTEGRITY_RUNTIME_BLOCKED.

## §65 Warning Contract

HASH_ALGORITHM_DEPRECATION/ROTATION_WARNING·CANONICALIZATION_WARNING·FIELD_SET_DRIFT_WARNING·LEDGER_VERIFICATION/CHECKPOINT_WARNING·LEDGER_LEGACY_HASH_WARNING·LEDGER_DUAL_DIGEST/MIGRATION/TAMPER_WARNING·LEDGER_MANUAL_REVIEW_REQUIRED.

## §66 Existing Implementation 분류 태그

CANONICAL_CRYPTO_INTEGRITY_REGISTRY/POLICY·CANONICAL_HASH_ALGORITHM_REGISTRY·CANONICAL_CANONICALIZATION_POLICY·CANONICAL_FIELD_SET·CANONICAL_PAYLOAD_PROJECTION·CANONICAL_LEDGER_ENTRY/CHAIN/HEAD/CHECKPOINT_DIGEST·CANONICAL_VERIFICATION_ENGINE·CANONICAL_TAMPER_INCIDENT·VALIDATED_CRYPTO_HASH_UTILITY·VALIDATED_CANONICAL_JSON_UTILITY·VALIDATED_FILE_HASH_SOURCE·LEGACY_STRONG_HASH·LEGACY_WEAK_HASH·LEGACY_CHECKSUM·EXTERNAL_INTEGRITY_ADAPTER·MIGRATION_REQUIRED·CONSOLIDATION_REQUIRED·DEPRECATION_CANDIDATE·KEEP_SEPARATE_WITH_REASON·BLOCKED_WEAK_CRYPTO_RISK·BLOCKED_CANONICALIZATION_RISK·BLOCKED_TAMPER_RISK·UNVERIFIED·TEST_ONLY.

## §67 중복 구현 감사 대상

여러 Hash Utility·여러 Canonical JSON·서로 다른 Decimal/Timestamp/Unicode 정규화·동일 Entry 다중 비호환 Digest·Algorithm 문자열 하드코딩·Field Set 코드 중복·MD5/SHA-1 Legacy·File Hash↔Ledger Hash 혼용·Audit Hash↔Entry Hash 혼용·Checksum Security 사용·Previous Hash 누락·Genesis 불일치·Head/Checkpoint Digest 미검증·Verification 결과 중복저장·Tamper Incident SoT 중복·Migration Rehash Script 중복·Hex/Base64 혼용·Default Charset 의존·ORM Serialization 의존·Map 순서 의존·Client Hash 신뢰·ERP Hash 직접사용·Weak Algorithm 고객설정 활성.

## §68 API Contract

Registry/Policy 조회·Active Integrity Version·Algorithm Registry/상태·Canonicalization Policy·Canonical Field Set / Canonical Projection Preview·Payload/Context/Entry/Head/Checkpoint/Attachment Manifest Digest 생성(민감 원문 반환 금지) / Entry·Entry-with-Previous·Sequence Range·Partition·Ledger·Head·Checkpoint·Decision Reference·Correction/Supersession Chain Verification·Run/Result 조회 / Tamper Incident·Affected Entry·Evidence·Response 상태·Manual Review·Resolution / Rotation Plan·Dual-Digest 상태·Migration·Legacy Hash Import·Reconciliation. 공통: Tenant Context·AuthN·AuthZ·Integrity/Algorithm/Canonicalization Validation·Rate Limit·Sensitive Output Redaction·Verification Audit·Evidence·Pagination·Error Contract. **Digest/Verification Result 직접 수정 API 금지.**

## §69 Index / §70 Cache / §71 Performance

- **§69 Index**: Algorithm Code/Status·Integrity/Canonicalization/Field Set Version·Ledger Entry Digest·Sequence·Previous Entry Digest·Head Digest·Checkpoint Range·Verification Job/Run/Result·Failed Verification·Tamper Incident·Affected Decision/Sequence·Rotation Plan·Dual-Digest Entry·Legacy Hash·Migration Batch·Reconciliation Mismatch.
- **§70 Cache Key**: tenant·integrity version·algorithm id/version·canonicalization version·field set version·aggregate type/id/version·ledger sequence·entry digest·head version·checkpoint id. Tenant-isolated·Version-aware·Immutable Digest Cache·Sensitive Payload Cache 금지·Entry/Head 변경·Deprecation·Version 변경·Tamper·Verification 실패 시 Invalidation·Legacy Hash Canonical Cache 저장 금지.
- **§71 Performance**: Streaming Digest·대형 Attachment/Evidence는 Manifest/Reference Digest·Full vs Incremental 분리·Checkpoint 기반 Range·Batch·Worker Partitioning·Backpressure·Critical Commit Path 최소화·중복 Projection 방지·Provider Benchmark·Output Storage Size·SLA·Incident Priority Scheduling. 무결성 검증 이유로 Transaction Consistency 희생 금지.

## §72 Testing

Unit(Algorithm Registry/Policy·Canonical JSON·Null/Empty/Integer/Decimal/Monetary/Timestamp/Unicode/Encoding/Collection Ordering/Reference Projection·Payload/Context/Entry/Genesis/Previous/Head/Link/Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Checkpoint Digest) · Cross-language(동일 Canonical Payload→동일 Digest) · Property(Deterministic·Same→Same·Different Bound→Different·Sequence/Previous/Tenant/Entry Type 변경→변화·Immutable·Version Binding) · Integration(Commit/Append/Head/Snapshot/Evidence/Audit/Outbox/Attachment Digest·Checkpoint·Correction/Supersession Chain·Retention·Legal Hold·Verification Job·Tamper Incident·Rotation·Migration) · Tamper(각 필드/삭제/삽입/순서/Head/Checkpoint/Target/Algorithm/Canonicalization/Tenant 변경) · Security(MD5/SHA-1/Downgrade/Default Charset/Locale Decimal/Float Amount/Local TS/Invalid Unicode/Malformed/Oversized/Sensitive Log/Cross-Tenant Reuse/Client Injection/Result Mutation/Timing-unsafe/Truncation) · Concurrency(동시 Digest·동시 Append·Head↔Verify·Checkpoint↔Append·Rotation 중 Append·Dual-Digest 중 Verify·Migration↔Verify·Incident 중 중복 Verify) · Regression(기존 Decision Processing/Actions/Ledger/Assignment/Authority/Delegation/Sequential/Rebate/Claim/Settlement/Payment/ERP/Workflow/Audit/Reporting).

## §73 실행 절차 17단계

①기존 전수조사 ②Algorithm Governance ③Canonicalization ④Field Set ⑤Canonical Projection ⑥Digest Envelope ⑦Aggregate Digest ⑧Entry/Chain Digest ⑨Head/Checkpoint Digest ⑩Commit-time Verification ⑪Read/Periodic Verification ⑫Tamper Detection ⑬Tamper Incident ⑭Rotation Foundation ⑮Legacy Hash Migration ⑯Static Lint/Runtime Guard ⑰Existing Implementation 통합 + 문서/ADR/History.

## §74 생성/갱신 문서

`docs/segmentation/DSAR_APPROVAL_*`(Crypto Integrity Registry/Policy/Definition/Version·Profile·Hash Algorithm Registry/Policy·Canonicalization Policy·Canonical Field Set·Payload Projection·Null/Number/Monetary/Timestamp/Unicode/Encoding/Collection Ordering/Reference Policy·Digest Envelope·Payload/Context/Ledger Entry/Genesis/Hash Chain/Partition Hash Chain/Head/Link/Snapshot/Evidence/Audit/Outbox/Attachment Manifest/Correction/Supersession/Retention/Legal Hold/Checkpoint/Seal Digest Foundation·Chain/Entry/Range/Head/Checkpoint/Reference/Completeness Verification·Tamper Detection/Classification/Incident/Evidence/Response Policy·Verification Job/Run/Result·Commit/Read/Periodic Verification·Verification Snapshot·Reconciliation·Digest Algorithm Rotation/Dual Transition/Version Migration·Legacy Hash Import·Critical Gap Policy·Static Lint·Runtime Guards·Error Warning Contract·API Contract·Index Performance·Cache Policy·Test Strategy·Existing Implementation·Duplicate Implementation Audit·Migration·Function Regression Gate) + `docs/architecture/ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION.md` + `docs/pm/{PM_CHANGE_HISTORY,REPEAT_PROBLEM_HISTORY,AGENT_EXECUTION_HISTORY}.md`.

## §75–§80 Matrix

Algorithm Matrix / Canonicalization Matrix / Digest Matrix / Verification Matrix / Tamper Incident Matrix / Rotation Matrix — 각 표 헤더 원문 보존.

## §81 검증 게이트 / §82 완료 보고 형식 / §83 완료 조건(67항) / §84 최종 실행 명령

- §81: Registry/Policy/Definition/Version/Profile·Algorithm Registry·Weak 차단·Version 기록·Canonicalization·Field Set Versioned·Projection Deterministic·Null/Number/Monetary/Timestamp(UTC·Precision)/Unicode/UTF-8/Collection/Reference·Digest Envelope·Payload↔Context 분리·Entry에 Previous/Sequence/Tenant·Genesis Versioned·Partition Chain·Head·Link·Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Retention/Legal Hold/Checkpoint Digest·Commit/Read/Periodic Verification·Entry/Range/Head/Checkpoint Verification·Chain Break/Missing/Inserted/Reordered 탐지·Tamper Incident·Critical 시 Commit 차단·Verification Immutable·Sensitive Payload 비노출·Constant-time 비교·Rotation Foundation·Dual-Digest·Legacy 분류·Static Lint·Runtime Guard·Existing 분류·중복 통합·Migration 검증·회귀 없음·ADR/PM/Repeat/Agent History·다음 Actor Identity Assurance 실행가능.
- §83 완료 조건: 위 항목 전부 구축 + 기존 Decision 기능 무회귀 + ADR·PM·Repeat·Agent History 갱신 + **다음 EPIC 06-A-03-02-03-03(Actor Identity Assurance & Authentication Binding Governance)가 사용할 검증된 Cryptographic Integrity Foundation 준비.**
- §84 최종 명령: 검증된 Decision Integrity Core·Immutable Decision Ledger 위에 Strong Cryptographic Digest + Hash Chain을 구축(Digital Signature/PKI는 후속). MD5/SHA-1/CRC/hashCode/DB convenience/Runtime object hash를 Canonical Security Digest로 사용 금지. Canonicalization 없이 Hash 금지·문자열 임의연결 금지·Algorithm 하드코딩 금지·Digest Version Entry 고정·Previous Digest 포함·Genesis Versioned·Cross-Tenant Link 차단·Constant-time 비교·기존 Digest 덮어쓰기 금지·Legacy Hash 분류후 Canonical 신규생성·중복 Utility/Canonicalization 통합.

---

**정본 처리 결과**: [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(ⓑ) · per-entity DSAR 세트(ⓒ) · [`ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION`](../architecture/ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION.md)(ⓓ).

# DSAR — Cryptographic Integrity: API Contract (§68)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: **Digest/Verification Result 직접 수정 API 금지 · 민감 원문 반환 금지.** 신규 실배선은 /api 접두 필수.

## 1. 원문 전사 (Canonical Contract)

§68 API Contract 원문 전사: Registry/Policy 조회 · Active Integrity Version · Algorithm Registry/상태 · Canonicalization Policy · Canonical Field Set / Canonical Projection Preview · Payload/Context/Entry/Head/Checkpoint/Attachment Manifest Digest 생성(민감 원문 반환 금지) / Entry·Entry-with-Previous·Sequence Range·Partition·Ledger·Head·Checkpoint·Decision Reference·Correction/Supersession Chain Verification·Run/Result 조회 / Tamper Incident·Affected Entry·Evidence·Response 상태·Manual Review·Resolution / Rotation Plan·Dual-Digest 상태·Migration·Legacy Hash Import·Reconciliation. 공통: Tenant Context·AuthN·AuthZ·Integrity/Algorithm/Canonicalization Validation·Rate Limit·Sensitive Output Redaction·Verification Audit·Evidence·Pagination·Error Contract. **Digest/Verification Result 직접 수정 API 금지.**

의미: API는 무결성 자산을 **조회·생성(append-only)·검증·사고관리**만 노출한다. Digest 값과 Verification Result는 읽기 전용이며 어떤 endpoint도 이를 UPDATE/PATCH/DELETE하지 않는다. 민감 Canonical Payload/원문은 응답에서 redaction된다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| API 군 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Registry/Policy/Version/Algorithm/Canonicalization/Field Set 조회 | **부재** | 해당 데이터 구조 부재 |
| Canonical Projection Preview | **부재** | canonical projection 파이프라인 부재 |
| Digest 생성 API(Payload/Context/Entry/Head/Checkpoint/Attachment) | **부분(내부)** | Digest 생성 로직은 존재하나 API 아닌 내부 write(`SecurityAudit.php:27`)·파일 CAS(`MediaHost.php:93`, 원자쓰기 `:100-102`) |
| Verification 조회(Entry/Range/Partition/Ledger/Head/Checkpoint/Reference/Chain) | **부분(단일 배선)** | `SecurityAudit::verify` 소비가 `AdminGrowth.php:1429` 단일 배선(`integrity` 노출)·범용 검증 API 아님 |
| Run/Result 조회 | **부재** | Verification Run/Result 저장소 부재 |
| Tamper Incident/Evidence/Response/Manual Review/Resolution | **부재** | Tamper Incident SoT 부재 |
| Rotation Plan/Dual-Digest/Migration/Legacy Import/Reconciliation | **부재** | Rotation/Migration Foundation 부재 |
| 공통: Tenant Context | **부분(리스크)** | verify에 tenant 술어 없음(`SecurityAudit.php:56-68`) → API도 전역 노출 위험 |
| 공통: AuthN/AuthZ | **PRESENT(substrate)** | 플랫폼 인증 substrate 재사용(`AdminGrowth.php:1429` admin 배선) |
| 공통: Sensitive Output Redaction | **부재(정책)** | Canonical Payload redaction 정책 미명문 |
| **Digest/Result 직접 수정 API** | **없음(현행 안전)** | Digest UPDATE/setter/Verification Result update 경로 부재(INSERT/SELECT만·`SecurityAudit.php:8`) → §68 금지조항 현행 준수 |

## 3. 판정

- **Verdict: 대부분 신규 · 금지조항은 현행 준수.** Digest 생성은 내부 로직으로 실재(`SecurityAudit.php:27`·`MediaHost.php:93`)하나 **표준 API 계약이 아니며** Registry/Policy/Projection/Verification Run·Result/Tamper/Rotation API는 전무. verify 소비는 admin 단일 배선(`AdminGrowth.php:1429`)뿐.
- **★금지조항 현행 안전(정직 기술)**: "Digest/Verification Result 직접 수정 API 금지"는 현행에 위반 경로가 없다 — Digest setter·update repository·Verification Result update endpoint 부재. 이는 신규 API 설계 시 **유지해야 할 안전 속성**이지 교정 대상 아님.
- **리스크**: verify가 tenant 술어 없이 전역 체인을 노출(`SecurityAudit.php:56-68`) → API로 승격 시 X-Tenant-Id 강제·Cross-Tenant redaction 필수(§5.13). 내부 Digest를 권한 없는 사용자에 노출 금지(§52).
- cover: **부분** — Digest 생성 내부 로직·verify 단일 배선·AuthN substrate. 표준 API 계약은 0.
- 선행: Registry/Ledger/Tamper 대상 부재 → 대부분 endpoint는 결합 대상 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **Read API(신규)**: Registry/Policy/Active Version/Algorithm Registry·상태/Canonicalization Policy/Field Set/Canonical Projection Preview. 전부 GET·Tenant-scoped·Pagination.
- **Digest 생성 API(신규, append-only)**: Payload/Context/Entry/Head/Checkpoint/Attachment Manifest Digest 생성. **민감 원문 반환 금지** — Canonical Payload 전체 대신 digest·byte length·field 요약만(§15/§68). Attachment는 `MediaHost` 내용주소(`:88-102`) **참조 digest**만 반환.
- **Verification API(신규)**: Entry·Entry-with-Previous·Sequence Range·Partition·Ledger·Head·Checkpoint·Decision Reference·Correction/Supersession Chain 검증 트리거 + Run/Result 조회. 실 `SecurityAudit::verify` 패턴 확장(tenant 술어 추가).
- **Tamper/Rotation API(신규)**: Tamper Incident·Affected Entry·Evidence·Response·Manual Review·Resolution 상태 조회 + Rotation Plan·Dual-Digest·Migration·Legacy Import·Reconciliation 상태.
- **★금지조항 명문 유지**: Digest/Verification Result에 대한 PUT/PATCH/DELETE endpoint **미제공**(현행 안전 속성 보존). Verification Result·Tamper Incident는 immutable — 상태전이만 append.
- **공통 계약**: Tenant Context(X-Tenant-Id 강제)·AuthN/AuthZ(substrate 재사용)·Rate Limit·Sensitive Output Redaction·Verification Audit(§55)·Error Contract(§64) 연계. 신규 실배선은 `/api` 접두 필수(레포 라우팅 관례).
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_CACHE_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

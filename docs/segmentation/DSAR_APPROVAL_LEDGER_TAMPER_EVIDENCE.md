# DSAR — Ledger Tamper Evidence (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§47 **Tamper Evidence** (원문 전사, 정본 엔티티 `APPROVAL_LEDGER_TAMPER_EVIDENCE`) — Incident(§45)를 뒷받침하는 **포렌식 증거 레코드**. 필수 필드:

- `evidence id` · `incident id` · `verification run id`
- `ledger` · `partition` · `entry` · `sequence`
- `expected canonical projection ref` · `actual canonical projection ref`
- `expected digest` · `actual digest`
- `algorithm` · `canonicalization version`
- `source record ref` · `database audit ref` · `CDC ref` · `log ref` · `forensic snapshot ref`
- `collected_at` · `collected_by`
- `immutable digest`(Evidence 자체 무결성)
- `status` · `evidence`

원문 제약: **민감 원문(sensitive payload) 전체 직접 저장 금지** — Canonical Projection은 **참조(ref)**로만 보관하고, Digest 값만 봉인한다(§5.7·§15). Evidence는 "무엇이 기대되었고 실제로 무엇이었는가"를 재현 가능한 참조와 Digest로만 증명한다.

의미: Tamper Evidence는 Incident의 주장을 **독립적으로 재검증 가능한 증거 사슬**로 만든다. expected/actual canonical projection을 참조로 지목하고, 원본 출처(source record)·DB Audit·CDC·Log·Forensic snapshot을 상호 대조하여 §45 Category(`ADMINISTRATIVE_MUTATION` vs `APPLICATION_DEFECT` vs `STORAGE_CORRUPTION`)를 확증한다. Evidence 스스로도 `immutable digest`로 봉인된다.

## 2. 기존 구현 대조

- **Tamper Evidence 레코드 부재** — expected/actual canonical projection ref·source/DB Audit/CDC/Log/Forensic 참조를 봉인하는 구조체 전무.
- **부분 재사용 substrate 실재**:
  - **내용주소 파일 CAS** = `MediaHost.php:93`(SHA-256 digest·`:88-90` 바이트검증·`:100-102` 원자쓰기) — Evidence Store로 재사용 가능한 **VALIDATED_FILE_HASH_SOURCE**. Forensic snapshot을 내용주소로 봉인할 수 있는 실 자산.
  - **서버 UTC** = `SecurityAudit.php:24`(`gmdate`) — `collected_at` 신뢰시각 재사용.
  - **SHA-256/HMAC** = `Crypto.php:81,98-99` — Evidence `immutable digest` 산출 재사용.
- **그러나 무결성 증거로서는 전무** — `expected/actual canonical projection ref`는 §15 Canonical Projection·§13 Canonicalization Policy 부재(GROUND_TRUTH 4절: Canonical JSON/Decimal/Unicode normalizer 모두 ABSENT)로 생성 불가. `database audit ref`/`CDC ref`는 DB Audit/Binlog 대조 미배선(GROUND_TRUTH 4절 Batch/Worker PARTIAL) → `ADMINISTRATIVE_MUTATION` 확증 수단 없음.
- **민감원문 비저장 원칙은 이미 존중되는 편** — 현행 `SecurityAudit.php:27` preimage는 `json_encode(details,UNESCAPED_UNICODE)`를 해싱하나 Digest만 저장. 단 Canonicalization 부재로 재현 가능한 projection ref가 아니라 raw concat이라 Evidence 등급의 재현성은 미달.
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`, verify 0)는 Evidence 근거로 계상 금지.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** (증거 레코드 자체는 부재) — 단 `MediaHost.php:88-102`(내용주소 CAS)·`Crypto.php:81,98-99`·서버UTC는 Evidence Store substrate로 KEEP_SEPARATE 재사용 가능.
- 선행 의존: §45 Incident(상위)·§15 Canonical Projection·§13 Canonicalization Policy·§49 Verification Run(`verification run id`) 모두 종속. 순신규 봉인 레코드.

## 4. 확장/구현 방향 (설계)

- **순신규 `approval_ledger_tamper_evidence` 레코드** — expected/actual **canonical projection은 ref로만**(§5.7 민감원문 비저장), Digest 값과 algorithm/canonicalization version을 봉인. Evidence 자체 `immutable digest`는 `Crypto.php:81,98-99` 재사용.
- **Extend(발명 아닌 조립)**: Forensic snapshot·source record 재현은 `MediaHost.php:88-102`의 내용주소 CAS(Evidence Store)로 봉인 — 이미 검증된 바이트검증+원자쓰기 자산. `collected_at`은 `SecurityAudit.php:24` 서버 UTC.
- **Category 확증 사슬**: `database audit ref`/`CDC ref`/`log ref`를 상호 대조하여 §45 `ADMINISTRATIVE_MUTATION`(DBA 직접변경)·`STORAGE_CORRUPTION`·`MIGRATION_CORRUPTION`을 구분 — 이 참조들은 순신규 배선(현행 미배선). 대조 소스 없으면 §45에서 `UNKNOWN`으로 보수 분류.
- **재현성 전제 = Canonicalization**: `expected/actual canonical projection ref`가 성립하려면 §13 Canonicalization Policy·§15 Projection이 선행 실구현되어야 함 → 현행 `SecurityAudit` raw concat(§5.3/§5.4 위반, GROUND_TRUTH 5절)을 Canonical Projection으로 보강한 뒤에만 Evidence 등급 재현성 확보.
- **§5.13 불가침**: Verification Audit(증거 기록)은 고객설정으로 비활성 불가.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RUN]] · [[DSAR_APPROVAL_LEDGER_TAMPER_RESPONSE_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

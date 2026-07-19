# DSAR — Ledger Tamper Classification (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§45 **Tamper Classification** (원문 전사, 정본 엔티티 `APPROVAL_LEDGER_TAMPER_INCIDENT`) — §44에서 판별된 Tamper 유형을 **Severity(심각도) × Category(범주)** 두 축으로 등급화한다.

**Severity 6종**:
- `INFO` — 정보성(잔여 위험 없음)
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL` — Payment/Settlement/Contract/Legal/Compliance 등 Critical Ledger 불일치(§5.11)
- `CATASTROPHIC` — 광범위 History Rewrite·다수 Entry·Cross-Tenant·Algorithm Downgrade 결합

**Category** (원문 전사):
`DATA_MUTATION` / `DELETION` / `INSERTION` / `ORDER_MANIPULATION` / `REFERENCE_MANIPULATION` / `HISTORY_REWRITE` / `AUDIT_REWRITE` / `SNAPSHOT_REWRITE` / `OUTBOX_REWRITE` / `ATTACHMENT_MANIFEST_REWRITE` / `ALGORITHM_DOWNGRADE` / `CONFIGURATION_DRIFT` / `CANONICALIZATION_DRIFT` / `MIGRATION_CORRUPTION` / `ADMINISTRATIVE_MUTATION` / `APPLICATION_DEFECT` / `STORAGE_CORRUPTION` / `UNKNOWN`.

의미: Classification은 "무엇이 변조되었는가(§44 유형)"를 "얼마나 위험한가(Severity)"와 "어떤 성격의 변조인가(Category)"로 재정렬하여, §46 Response Action의 **기본 매핑을 결정하는 정책 입력**이 된다. 예: `CHAIN_BREAK`+Payment Ledger → Severity `CRITICAL`·Category `DATA_MUTATION`. `ADMINISTRATIVE_MUTATION`(DBA 직접변경)과 `APPLICATION_DEFECT`(앱 버그 History Rewrite)를 구분하는 것이 사후 대응·귀책의 핵심이다.

## 2. 기존 구현 대조

- **Severity/Category 등급화 체계 부재** — 무결성 불일치를 6단계 심각도·18종 범주로 분류하는 구조체 전무.
- **현행 유일 유사물** = `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 `{ok:false, checked, broken_at}`만 반환 — 파손 여부(boolean)와 위치(sequence)뿐, **심각도도 범주도 없다**. "체인이 끊겼다"까지만 알고 "그것이 CRITICAL Payment 변조인지 LOW 설정 드리프트인지"는 판정하지 않는다. 소비처(`AdminGrowth.php:1429`)도 `integrity` 상태로 노출만 할 뿐 Severity 라우팅 없음.
- **범주 분별 대상 부재** — HISTORY/AUDIT/SNAPSHOT/OUTBOX_REWRITE는 각 Digest(§32) 부재로 판별 대상 없음. `ADMINISTRATIVE_MUTATION`(DBA 직접변경)을 탐지할 DB Audit/CDC/Binlog 대조(§47 Evidence)도 미배선.
- **실 위험 = Warning 오취급 창** — 현행 소비 경로는 verify 실패를 별도 심각도 없이 상태값으로만 취급 → §5.11(Verification 실패를 Warning으로 무시 금지) 위배 위험. Severity 축이 없으면 CRITICAL을 INFO처럼 흘려보내는 구조적 결함.
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`)·`schema_migrations.checksum`(`Migrate.php:50,63-64`)은 verify 0/비교 미실행이므로 Classification 입력조차 생성 못함.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** — Severity/Category 등급화 전무. `SecurityAudit::verify`의 boolean+위치는 Classification의 **입력 신호(seed)**일 뿐 분류 결과가 아니다.
- 선행 의존: §44 Tamper Detection(유형)이 상위 입력 — 유형 없이 등급화 불가. §3.1/§3.2 ABSENT로 Category 대상(History/Audit/Snapshot/Outbox) 다수 부재. 순신규.

## 4. 확장/구현 방향 (설계)

- **순신규 `approval_ledger_tamper_incident` 분류 축**: §44 유형 → (Severity, Category) 매핑 테이블을 §11 Profile의 `tamper severity mapping`으로 데이터 선언(하드코딩 금지, §5.5). Profile(STANDARD/FINANCIAL_HIGH/PAYMENT_CRITICAL/SETTLEMENT_CRITICAL/LEGAL_HIGH/…)별로 동일 유형이라도 심각도를 달리 산정(예: 일반 원장 `CHAIN_BREAK`=HIGH, PAYMENT_CRITICAL=CRITICAL).
- **Extend**: `SecurityAudit::verify`의 `broken_at`을 최초 파손 sequence로 삼아 "영향 범위(1건 vs 다수 vs 파티션 전체)"를 산정 → CATASTROPHIC 승격 규칙의 근거. 단 verify는 최초 위치만 주므로, 다수 Entry·순서변경 판별은 §40 Range Verification 결합 필요.
- **Category 분별 핵심**: `ADMINISTRATIVE_MUTATION` vs `APPLICATION_DEFECT` vs `STORAGE_CORRUPTION` vs `MIGRATION_CORRUPTION` 구분은 §47 Evidence(DB Audit/CDC/Log/Forensic snapshot 대조)에 종속 → Evidence 부재 시 `UNKNOWN`으로 보수적 분류(과소평가 금지).
- **§5.13 불가침**: Critical Tamper Severity 산정·Category 기록은 고객설정으로 비활성 불가. Severity 축 자체를 끄는 옵션 금지.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_DETECTION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[DSAR_APPROVAL_LEDGER_TAMPER_RESPONSE_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

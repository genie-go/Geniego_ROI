# DSAR — Authorization Compliance & Regulatory Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(데이터 거버넌스·ML·SPC·ops audit).

---

## 1. 핵심 판정 — **authz 규제 프레임워크 골격 부재, 실재는 flat readiness card + 감사 export**

Part 3-17은 **규제-데이터모델 구동 거버넌스 엔진**(Regulation→Control→Policy/Role/Permission·기계평가 rule·per-scope 점수·attestation 워크플로·exception 라이프사이클·drift/simulation/revalidation)을 규정한다. **이 계층은 전무.** 실재는 단일 flat 하드코딩 SOC2/ISO readiness posture card(`Compliance.php:90-124`) + SIEM 감사 export(`:269-300`)뿐. 단 evidence/attestation/maker-checker **원자(primitive)** 는 실재(GT①).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Compliance Registry / Regulatory Catalog(Regulation ID/version/effective/region/industry/mandatory 데이터모델) | **ABSENT(grep 0)** | `Compliance.php:90-113` catalog=하드코딩 control 배열 주석이지 regulation 레지스트리 아님·region/industry=지오/벤치 용어 |
| Compliance Control Library(10 control 유형) | **PARTIAL(라이브러리 아님)** | `Compliance.php:93-113` 14 inline 리터럴·타입 taxonomy/영속 없음 |
| Control Mapping Engine(Regulation/Policy/Role/Permission/SoD/JIT→Control) | **ABSENT(grep 0)** | `Compliance.php:93-113` 정적 SOC2/ISO 문자열 라벨만·매핑엔진/SoD/JIT 없음 |
| Compliance Rule Engine(Mandatory/Optional/Advisory/Industry/Regional) | **ABSENT** | `RuleEngine.php:10-12`=마케팅 IF-THEN(무관)·`DataPlatform.php:282-287`=데이터품질 4 rule(compliance 아님) |
| Assessment Engine / Gap Analysis | **ABSENT(grep 0)** | `Compliance.php:115-120` 3버킷 카운트만(implemented/available/manual)·gap analysis 없음 |
| Compliance Score(Overall/Regulation/Control/Dept/Tenant/Region 0-100) | **PARTIAL(동음이의)** | `Compliance.php:119-124` 단일 flat readiness_pct·per-scope 분해 없음 |
| Attestation Engine(User/Manager/Auditor/Executive/System) | **ABSENT(grep 0)** | `attestation`/`attest` backend/src 전무. 근접=AccessReview justification(GT① §C) |
| Audit Readiness Engine / Regulatory Reporting(ISO/SOC/PCI/SOX/GDPR/HIPAA 리포트) | **ABSENT** | `Compliance.php:269-300` auditExport=raw event(SIEM용)이지 규제 리포트 아님·PCI/SOX/HIPAA grep 0 |
| Regulatory Change Manager | **ABSENT(grep 0)** | — |
| Compliance Exception Manager(request/justification/risk acceptance/expiration) | **ABSENT(grep 0)** | `exception manager`/`risk acceptance` 전무. 근접=Mapping maker-checker(GT① §D·compliance scope 아님) |
| Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation | **ABSENT(grep 0)** | compliance 의미 전무. drift=ML(`ModelMonitor`)·통계(`AnomalyDetection.php:4-6`)만 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | compliance 런타임 가드·lint 없음 |
| Immutable Evidence Chain(compliance 특화) | **PRESENT-generic** | `SecurityAudit.php:14-68`·`AdminMenu.php:182-218` 해시체인 실재하나 regulation/control-scoped 아님(GT① §B) |
| Tenant Isolation | **PRESENT** | `index.php:600-619` 서버도출 강제 |
| Audit Trail | **PRESENT** | `UserAuth.php:4165-4197`·`AdminMenu.php:123-212`·`SecurityAudit.php`(GT① §E) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **`Compliance.php`(정본 EXTEND)** — `:53-130`·`:269-300`·`:430-461`. 규제 프레임워크 확장점(데이터품질 희석 금지).
2. **SecurityAudit 해시체인** — `SecurityAudit.php:14-68`. Compliance Evidence Chain(§20).
3. **AccessReview justification** — `AccessReview.php:217-233`. Attestation/Exception 라이프사이클 모델.
4. **Mapping maker-checker** — `Mapping.php:238-291`. Compliance Workflow(§14)·Exception 승인(§15).
5. **TeamPermissions PDP·index.php PEP** — `TeamPermissions.php:695-701`·`index.php:600-619`. Control Mapping(§5) 대상.
6. **audit trail 3store** — Continuous Monitoring(§8) 입력.

## 4. ★KEEP_SEPARATE — authz compliance 아님 (데이터 거버넌스·ML·SPC·ops audit·동음이의)

### B-1. 데이터 거버넌스/프라이버시 compliance (★최대 혼동 — DATA track·별개 유지)
- `DataPlatform.php:282-287`·`:288-291`·`:297-302`·`:305`(데이터품질 `$compliance` gdpr/pii/retention/audit ok flag→DataTrust reliability_score). 데이터-거버넌스 posture이지 authz control assessment 아님·reliability_score≠compliance-control score.
- `Dsar.php`·`GdprConsent.php`·`PreferenceCenter.php`·`LegalDoc.php`(DSAR/consent/retention/legal-doc). 데이터주체 프라이버시 compliance. ★`Compliance.php:78`·`:105-106`은 gdpr_consent 카운트를 SOC2 privacy control 증거 신호로 **소비만**(소유 아님). ★Part 3-17 authz 거버넌스를 `DataPlatform.php`에 병합 금지·`Compliance.php`에 데이터품질 점수 희석 금지.

### B-2. 마케팅 ML risk/drift (risk-to-control·drift 동음이의)
- `Risk.php:12`·`:31`·`:81`·`:91`·`:149-152`(ML churn/risk 예측·risk_model_registry·sigmoid·AUC). 마케팅 ML risk이지 compliance risk-to-control(§13) 아님.
- `ModelMonitor.php`(ML 모델 drift 탐지·auto-retrain). ML ops drift·compliance drift(§23) 아님.

### B-3. SPC Control Chart (control 동음이의)
- `AnomalyDetection.php:2-6`·`:4-6`(μ±kσ·Western Electric·광고지표 관리도). "Control"=SPC 관리도/품질관리이지 authz control 아님.

### B-4. 마케팅 rule/evidence/audit 동음이의
- `RuleEngine.php:10-12`(마케팅 IF-THEN 자동화)·compliance rule engine 아님.
- `AttributionEngine.php`(마케팅 attribution "evidence"/credit)·compliance evidence 아님. `Db.php:809` attribution_result.evidence_json=마케팅.
- `AdminMenu.php:18`·`128-218`·ops `audit_log`(`Compliance.php:177-187`·tenant_id 없음·테넌트 compliance scope 제외). ops/admin 감사 trail·authz/security 감사와 구분.

### B-5. 커머스 compliance (grep 0 — 충돌 없음)
- product-listing/channel-policy/ad-policy compliance·ProductNotification "11st 40 notice" 핸들러 backend/src 전무. `KrChannel.php:244-297`=정산 컬럼 매핑만. 충돌 위험 없음.

## 5. 종합

**authz 규제 compliance 거버넌스 = EXTEND(`Compliance.php` 데이터/프라이버시 posture 실재·정본 확장점) / PRESENT(SecurityAudit evidence 해시체인·tenant 격리·audit trail) / PARTIAL(AccessReview attestation·Mapping maker-checker·flat readiness score) / ABSENT(Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap·per-scope Score·Attestation/Audit Readiness/Reporting Engine·Regulatory Change/Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규·SoD/JIT grep 0).** 재활용(흡수 아님·확장): `Compliance.php` 정본 EXTEND·SecurityAudit→Evidence Chain·AccessReview justification→Attestation/Exception·Mapping maker-checker→Workflow·PDP/PEP→Control Mapping 대상. **★KEEP_SEPARATE=DataPlatform 데이터품질·Dsar/GdprConsent/PreferenceCenter/LegalDoc 프라이버시·Risk/ModelMonitor ML·AnomalyDetection SPC·RuleEngine/AttributionEngine 마케팅·ops audit_log.** authz compliance≠데이터 거버넌스/ML/SPC/마케팅/ops.

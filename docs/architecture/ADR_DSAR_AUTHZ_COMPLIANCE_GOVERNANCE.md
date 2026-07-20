# ADR — Authorization Compliance & Regulatory Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-17
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-16 전체 — 규제가 매핑할 통제(RBAC/SoD/JIT/PDP/PEP/Zero Trust/AI Gov/Observability/Fabric)

---

## 1. Context

Part 3-17은 GeniegoROI Authorization Platform 전반에 국제 규제(ISO 27001/27017/27018/27701/42001·SOC1/2·NIST CSF/800-53/63/162/207·COBIT·PCI DSS·GDPR·HIPAA·CCPA·SOX·FedRAMP·CSA CCM) 준수를 **Compliance by Design** 으로 내장하는 거버넌스 프레임워크를 규정한다.

**★현 실측(2 스레드 상호검증·GT①②)**: 저장소에 **성숙한 authz/보안 compliance posture 계층(`Compliance.php`)이 실재**한다 — SOC2 TSC / ISO 27001 Annex A readiness 스코어카드(`:53-130`)·audit event 통합(`:143-190`)·SIEM export(`:269-300`·`:430-461`). 여기에 **불변 evidence 해시체인(`SecurityAudit.php:14-68`)·review/attestation(`AccessReview.php:177-242`)·maker-checker(`Mapping.php:238-291`)** 실 primitive가 결합. 그러나 **규제-데이터모델 구동 프레임워크**(Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap·per-scope Compliance Score·Attestation/Audit Readiness/Reporting Engine·Regulatory Change/Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint)는 **부재(grep 0)**. SoD/JIT도 grep 0(maker-checker self-approval `Mapping.php:267-269`이 유일 SoD-근접).

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **★EXTEND 정본 = `Compliance.php`**(`:2-10` 보안/authz compliance 핸들러·SOC2 TSC/ISO Annex A·RBAC/SSO/SCIM introspect `:90-113`·`/v424/compliance/*` 소유 `routes.php:1108-1118`). 데이터 거버넌스 아님.
- **Evidence Chain(PRESENT)**: SecurityAudit 해시체인(`SecurityAudit.php:14-68`·verify).
- **Attestation(PARTIAL)**: AccessReview justification+evidence(`AccessReview.php:177-242`·api_key 축).
- **Workflow/Exception(PARTIAL)**: Mapping maker-checker(`Mapping.php:238-291`·self-approval 차단)·action_request/mapping_change_request(`Db.php:592-600`·`:623-636`).
- **Audit Trail(PRESENT)**: auth_audit_log 평문(`UserAuth.php:4165-4197`)·menu_audit_log 체인(`AdminMenu.php:123-212`)·security_audit_log 체인.
- **Control Mapping 대상**: PEP(`index.php:600-619`)·PDP(`TeamPermissions.php:695-701`)·tenant 격리.

### 2.2 거버넌스 계층 (GT②)
Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap Engine·per-scope Compliance Score·Attestation Engine·Audit Readiness Engine·Regulatory Reporting·Regulatory Change/Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint = **grep 0**. ★KEEP_SEPARATE: DataPlatform 데이터품질(`:282-302`)·Dsar/GdprConsent/PreferenceCenter/LegalDoc 프라이버시·Risk/ModelMonitor ML·AnomalyDetection SPC(`:2-6`)·RuleEngine/AttributionEngine 마케팅·ops audit_log(`Compliance.php:177-187`).

### 2.3 종합
**판정 = EXTEND-Compliance.php / PRESENT-evidence / PARTIAL-attestation·workflow·score / ABSENT-framework / 데이터거버넌스 KEEP_SEPARATE.**

## 3. Decision

### D-1. `Compliance.php`를 규제 프레임워크로 확장 (Golden Rule EXTEND·신설 금지)
현 posture 핸들러(`Compliance.php:53-130`)를 Regulatory Catalog(§3)·Control Library 영속(§4)·Control Mapping Engine(§5)·Assessment(§9)·per-scope Compliance Score(§10)로 **확장**. ★현 하드코딩 14 control(`:90-113`·SOC2/ISO 태그)을 영속 Control Library + Regulation→Control 매핑으로 승격. 신규 `Compliance*` 핸들러 난립 금지·`/v424/compliance/*` 네임스페이스(`routes.php:1108-1118`) 재사용.

### D-2. SecurityAudit 해시체인을 Compliance Evidence Chain으로 승격
`SecurityAudit.php:14-68`(append-only·verify·broken_at)를 §20 Evidence Chain(Policy/Decision/Review/Approval/Snapshot/Audit Trail 불변)·§32 Immutable Evidence로 승격. ★현 generic security 체인을 regulation/control-scoped evidence로 태깅 확장(재발명 금지). Verify Evidence Chain API(§31)는 `verify()`(`:56-68`) 노출.

### D-3. AccessReview justification을 Attestation/Exception 라이프사이클로 확장
`AccessReview.php:177-242`(justification 필수·SecurityAudit 증거)를 §16 Attestation Engine(User/Manager/Auditor/Executive/System)·§15 Exception Manager(request/justification/risk acceptance/expiration/revalidation)의 모델로 확장. ★현 api_key 축 한정을 role/permission recertification으로 확장(app_user 축 선행 필요).

### D-4. Mapping maker-checker를 Compliance Workflow로 배선
`Mapping.php:238-291`(정족수·self-approval 차단 `:267-269`)를 §14 Compliance Workflow(Assessment→Review→Remediation→Validation→Approval→Evidence→Closure)·§15 Exception 승인에 배선. ★self-approval 차단=유일 SoD-근접 primitive를 SoD→Control(§5)의 seed로.

### D-5. Control Mapping Engine은 순신규 (PDP/PEP를 대상으로 바인딩)
§5 Control Mapping(Regulation/Policy/Role/Permission/SoD/JIT→Control)은 순신규 엔진. 매핑 **대상**=PEP(`index.php:600-619`)·PDP(`TeamPermissions.php:695-701` effectivePermissions)·RBAC role. ★SoD/JIT는 grep 0이므로 Part 3-9(JIT)/3-10(SoD) 통제 인증 후 매핑(선행 의존).

### D-6. Part 1~3-16과의 관계 (규제 매핑 대상·무중복)
Compliance는 RBAC/SoD(3-10)/JIT(3-9)/PDP(3-12)/PEP/Zero Trust(3-13)/AI Gov(3-15)/Observability(3-14)/Fabric(3-16) 통제를 **규제에 매핑·평가·증적화**한다. 각 통제 엔진 재구현 금지(중복 금지). Compliance는 평가·매핑·리포트만·집행은 기존 통제.

### D-7. ★데이터 거버넌스 흡수 절대 금지 (KEEP_SEPARATE)
DataPlatform 데이터품질(`DataPlatform.php:282-302` reliability_score)·Dsar/GdprConsent/PreferenceCenter/LegalDoc 프라이버시·Risk/ModelMonitor ML·AnomalyDetection SPC(`:2-6`)·RuleEngine/AttributionEngine 마케팅·ops audit_log는 authz compliance로 **흡수·병합·개명 금지**. ★특히 `Compliance.php`에 데이터품질 점수 희석 금지·`DataPlatform.php`에 authz 거버넌스 병합 금지(DATA track 별개 유지). gdpr_consent는 SOC2 privacy control 증거 **소비만**(소유 아님).

### D-8. 정직 분리
- **실재 과신 회피**: `Compliance.php`=flat readiness card(per-scope/regulation 분해 없음)·Control Library=in-memory 리터럴(영속/매핑 없음)·attestation=grep 0·Control Mapping Engine 없음.
- **부재 과장 회피**: evidence 해시체인·maker-checker·justification·audit trail·tenant 격리는 실재(재활용).
- **오흡수 회피**: 데이터 거버넌스/ML/SPC/마케팅/ops audit는 authz compliance 아님.

## 4. Consequences

- **긍정**: 규제 준수 자동화(정책~증적~감사대응 전 라이프사이클)·per-scope 점수·attestation·audit readiness·규제 리포트·drift/simulation. Compliance by Design.
- **비용**: 대규모 신규(Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap·per-scope Score·Attestation/Audit Readiness/Reporting Engine·Regulatory Change/Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint). `Compliance.php` 확장.
- **선행 의존**: Part 1~3-16 인증 후 실 구현(BLOCKED_PREREQUISITE). SoD/JIT→Control 매핑은 Part 3-9/3-10 인증 후.
- **무후퇴**: `Compliance.php` posture·SecurityAudit·AccessReview·Mapping·audit trail·데이터 거버넌스 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Assessment≤30초·Gap≤15초·Report≤60초·Evidence Verify≤3초·Score Refresh≤10초)·Compliance Validation(ISO27001/SOC2/PCI/SOX/GDPR/HIPAA/NIST CSF)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization Compliance & Regulatory Governance = EXTEND-`Compliance.php`(SOC2/ISO posture 실재·정본 확장점) / PRESENT-evidence(SecurityAudit 해시체인) / PARTIAL(AccessReview attestation·Mapping maker-checker·flat readiness score·audit trail 3store) / ABSENT-framework(Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap·per-scope Score·Attestation/Audit Readiness/Reporting Engine·Regulatory Change/Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규·SoD/JIT grep 0). Extend: Compliance.php→규제 프레임워크·SecurityAudit→Evidence Chain·AccessReview justification→Attestation/Exception·Mapping maker-checker→Workflow·PDP/PEP→Control Mapping 대상·Part1~3-16 규제 매핑(무중복). 코드0·NOT_CERTIFIED·선행의존. **★데이터 거버넌스(DataPlatform/Dsar/GdprConsent)·ML·SPC·마케팅·ops audit 흡수 금지.**

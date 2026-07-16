# ADR — Privacy Foundation, Purpose Limitation & Processing Governance (EPIC 06-A Part 3-3-3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Privacy·Purpose Limitation·Processing Governance 계약 명세 확정. 비파괴 — 코드변경 0). 실 Registry·Runtime Purpose Enforcement·CI 가드 구현은 후속 승인 세션(Golden Privacy Dataset+Consumer Conformance+Legacy Equivalence+verify+배포승인). **법률 적합성 자동 단정 금지·Retention/DSAR/Deletion/Cross-border=Part 3-3-3-2~6.**
- **근거**: [`../segmentation/CANONICAL_PRIVACY_SCHEMA.md`](../segmentation/CANONICAL_PRIVACY_SCHEMA.md) · [`PURPOSE_GOVERNANCE`](../segmentation/CANONICAL_PRIVACY_PURPOSE_GOVERNANCE.md) · [`ENFORCEMENT`](../segmentation/CANONICAL_PRIVACY_ENFORCEMENT.md) · 데이터 헌법 Vol1~5 · Part 3-3-1 Consent · Part 3-3-2 Suppression.

## 결정 (핵심)

1. **헌법 원칙의 런타임 강제화(재구현 금지)**: 데이터 헌법 Vol1~5(Trust First·수집≠사용·목/더미배제·테넌트격리)·No-PII 집계(Decisioning v418.1)·Compliance(SOC2/ISO 리포팅)·GdprConsent(쿠키)·DataTrust/DataPlatform 는 **정본 원칙/자산 — Privacy Governance 로 확장·강제화**. Consumer/채널/AI별 독립 Privacy Engine 신설 금지(§3.7·§100).

2. **수집가능 ≠ 사용가능(§3.1)**: 모든 처리에 Data Category·Source·Purpose·Lawful Basis·Consent·Consumer·Destination·Retention·Notice·Approval·Audit 연결. Purpose 없는 Query/Export/AI 호출/Audience 실행 금지.

3. **포괄 Purpose 금지·구체 Purpose(§3.2·14)**: BUSINESS/MARKETING/AI/PERSONALIZATION 운영 승인 금지 → EMAIL_MARKETING_CAMPAIGN_TARGETING 등 구체화. **Consent Purpose(Part3-3-1)+Processing Purpose 를 단일 Purpose Registry 로 통합**.

4. **Consent ≠ Purpose Limitation 우회(§3.3·3.4)**: Consent Granted 여도 필드/민감/제3자/AI학습/장기보존/자동결정/Secondary Use 자동허용 아님. Analytics→Marketing 자동전환 금지(별도 Purpose/Eligibility/Consent/Suppression 검증).

5. **파생/예측·Sensitive Proxy·Consumer 최소데이터(§3.5·3.6·3.7)**: Segment Membership/Churn/LTV/Affinity/AI Summary 도 Governance 대상. Sensitive Proxy Feature 탐지. Consumer별 PII Level(AGGREGATE_ONLY~FULL_PII)·Field Allowlist — Full Profile 무차별 제공 금지(No-PII 확장).

6. **Third-party Sharing=별도 Activity·Notice 정렬(§3.8·3.9)**: 내부 승인≠외부 공유 승인. Notice/Policy Version 없는 Material Processing 금지. AdAdapters audience 업로드=Data Sharing Activity(Part3-3-2 Removal/Reconciliation SEG-H2 연계).

7. **Runtime Purpose Enforcement·Fail 시 차단**: Query/Search/Export/Segment/Audience/AI Prompt/Automation/Data Sharing/Queue/Cache 에 Purpose Context 강제. Cross-Tenant/Wrong Brand/Test-Prod 혼합/미승인 Purpose·Consumer·Destination·Processor·Profiling·Automated Decision·AI Usage 차단. Purpose-bound Token(서버 발급·검증). Logging Minimization(Raw PII/Secret 로그 금지).

8. **정직·무후퇴·법률**: Purpose/Processing Activity/Lawful Basis/Processor/Notice Registry=현행 부재→목표계약. 법률 적합성 코드 자동확정 금지→`LEGAL_REVIEW_REQUIRED`. 데이터 헌법·No-PII·테넌트격리·GdprConsent·Compliance 보존(Legacy Equivalence). UNEXPLAINED·고객영향 LEGACY_PRIVACY_DEFECT→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§100)
신규 Processing Purpose/Data Category/Consumer Access/Processor/Profiling/AI Data Usage 생성 전: Canonical Privacy/Data Category/Purpose Registry·Existing Processing Activity·Lawful Basis/Consent/Suppression·Consumer Data Contract·Privacy Notice·Processor/Recipient·Sensitive/Minor/High-risk·Purpose Compatibility·Minimization·Field Allowlist·Approval/Review·Runtime Enforcement 조회 → 기존 확장 우선 · 중복/후퇴·ADR/PM 기록. **Consumer/채널/AI별 독립 Purpose·Privacy Engine 중복 생성 금지.**

## 결과
Privacy Entity·Data Category/Sensitive/Classification·Processing Purpose/Activity/Lawful Basis·Purpose Binding/Compatibility/Secondary Use·Minimization/Field Policy/Consumer PII Level·Notice/Processor/Recipient/Data Sharing·Profiling/Automated Decision/AI/Training·Minor/High-risk/Impact Review/Approval·Runtime Purpose Enforcement/Context/Cache/Logging·Explain/Lineage·Lint/Guard·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_PRIVACY_{SCHEMA,PURPOSE_GOVERNANCE,ENFORCEMENT}.md(§92 90여 문서 통합). 다음 **EPIC 06-A Part 3-3-3-2 — Retention, Archival & Data Lifecycle Governance** 입력 준비 완료.

# MEA Part 001 — Enterprise Data Platform Foundation · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 기준(baseline) 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상위 규범 정합(필수)**: 본 MEA는 데이터 최상위 규범 = 데이터 헌법 6볼륨(`docs/DATA_INTELLIGENCE_CONSTITUTION.md`·`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md`·`DATA_TRUST_QUALITY_CONSTITUTION.md`·`UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`·`MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md` + 본 문서)과 **구현 정본 = `docs/data/DATA_ARCHITECTURE.md`**를 **상속·정합**한다. Golden Rule(Replace 아니라 Extend·중복 정의 금지) 준수 — 본 문서는 그 위의 규범을 **재정의하지 않고 아키텍처 기준으로 통합**한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
GeniegoROI 전체 플랫폼의 데이터 처리·저장·분석·AI 활용·거버넌스를 위한 최상위 기반 아키텍처. 본 문서는 Enterprise Data Platform의 아키텍처 기준(Single Source of Truth·단 상위 헌법 6볼륨·구현 정본 DATA_ARCHITECTURE.md에 종속)이며, 이후 Data Platform 기능은 본 문서를 **상속·확장**한다(중복 정의 금지).

## §2 구현 범위
Enterprise Data Architecture · Canonical Data Model · Data Governance · Data Lifecycle · Data Quality · Metadata Framework · Master Data Foundation · Data Security · Data Classification · Data Integration Foundation. ※ETL/Data Lake/Warehouse/CDC/Data Catalog=이후 Part.

## §3 구현 목표 (10)
Enterprise Data Registry · Canonical Data Dictionary · Enterprise Metadata Registry · Data Domain Registry · Data Ownership Framework · Data Lifecycle Framework · Data Quality Framework · Data Classification Framework · Data Security Framework · Data Governance Framework.

## §4 아키텍처 원칙 (10)
Canonical First · Metadata Driven · Schema Versioning · Zero Trust Data · Immutable History · Event Driven · AI Ready · API First · Audit by Default · Global Standard Compliance.

## §5 Canonical Entity (15)
DATA_{DOMAIN·ENTITY·ATTRIBUTE·OWNER·CLASSIFICATION·POLICY·RETENTION·METADATA·VERSION·SOURCE·CONSUMER·LINEAGE·QUALITY·ACCESS_POLICY·AUDIT_LOG}. → 상세 = `MEA_PART001_CANONICAL_ENTITIES.md`.

## §6 Data Domain (15)
Identity · Authorization · Workflow · Governance · Compliance · Organization · Customer · Product · Commerce · Logistics · Finance · ROI · AI · Analytics · Operations. → ★실 핸들러 도메인과 매핑(GT① 참조).

## §7 Data Lifecycle (8)
Create → Validate → Classify → Store → Synchronize → Consume → Archive → Dispose.

## §8 Data Classification (5)
Public · Internal · Confidential · Restricted · Secret.

## §9 Data Ownership (5)
Business Owner · Technical Owner · Steward · Custodian · Approver. (Owner 없는 데이터=운영 배제.)

## §10 Data Governance (필수 규칙)
중복 Entity 금지 · Canonical Entity 우선 · 모든 변경 이력 저장 · Version 관리 · Metadata 자동 생성 · Data Lineage 자동 기록. → ★"중복 Entity 금지"는 기존 [[feedback_no_duplicate_features]] 정합.

## §11 Data Security (6)
Encryption at Rest · Encryption in Transit · Row Level Security · Column Level Security · Attribute Masking · Dynamic Data Masking.

## §12 데이터 표준 (필수 필드)
UUID · Tenant ID · Created At · Updated At · Version · Status · Created By · Updated By. → ★현행 정합: `Tenant ID`/`Created At`/`Updated At`/`Status`는 강한 관례(GT①)·`UUID`/`Version`/`Created By`/`Updated By`는 **미정착(신규 표준·점진 도입)**.

## §13 Runtime 규칙
Canonical Entity 접근 · Version 검증 · Metadata 검증 · Data Policy 검증 · Audit 기록만 허용.

## §14 API 표준
REST · GraphQL 지원 가능 · Event Publishing · Version Header · Idempotency · Trace ID.

## §15 Event 표준
DataCreated · DataUpdated · DataDeleted · DataArchived · DataValidated · DataPublished.

## §16 AI Integration
Metadata 생성 · Data Classification 추천 · Quality Score 계산 · Lineage 분석 · Anomaly Detection **만** 수행. ★AI는 Canonical Data 직접 수정 불가(데이터 헌법 V3/V4 정합: 수집≠사용·AI는 READY 데이터만·근거/신뢰도).

## §17 성능 요구사항
API ≤300ms · Metadata 조회 ≤100ms · Data Validation ≤500ms · Event Publishing ≤200ms · Availability ≥99.99%.

## §18 Completion Criteria
Enterprise Data Registry·Canonical Data Dictionary·Data Domain·Lifecycle·Classification·Ownership·Governance·Security 정책·Runtime 규칙·API/Event 표준 정의 완료. → **현재 미충족**(형식 Registry/Dictionary/Classification/Ownership Framework ABSENT·코드 0).

## 판정
**PARTIAL-strong(tenant 격리·created/updated 관례·Crypto 암호·SecurityAudit 불변·DataPlatform DataTrust/Lineage·도메인 매핑 실재) / ABSENT-formal(Enterprise Data Registry·Metadata Registry·5-tier Classification·Ownership Framework·UUID/version 표준 미정착).** ★핵심=데이터 헌법 6볼륨+DATA_ARCHITECTURE.md가 이미 규범/구현 정본 — 본 MEA는 상속·정합(재정의 금지). 형식 Registry/Framework만 신설·표준 필드는 점진 도입. 코드 변경 0.

## 다음
MEA Part 002 — Enterprise Data Lake Architecture(본 Foundation 상속·확장).

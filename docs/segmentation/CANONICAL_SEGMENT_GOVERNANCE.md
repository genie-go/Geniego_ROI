# Canonical Segment Governance — Versioning, Dependency, Permission, Migration, Lint & Test

> **EPIC 06-A Part 2** (5/5) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1 인벤토리 · 형제: [`CANONICAL_SEGMENT_SCHEMA.md`](CANONICAL_SEGMENT_SCHEMA.md) · [`CANONICAL_SEGMENT_DSL.md`](CANONICAL_SEGMENT_DSL.md) · [`CANONICAL_SEGMENT_RULE_ENGINE.md`](CANONICAL_SEGMENT_RULE_ENGINE.md) · ADR=[`../architecture/ADR_CANONICAL_SEGMENT_DSL.md`](../architecture/ADR_CANONICAL_SEGMENT_DSL.md)
> **성격**: 버전·의존성·권한·마이그레이션·정적/런타임 가드·테스트 거버넌스 계약. 실 구현·CI 가드 코드는 후속 승인 세션(기존 crm_segments 오탐 검증 후).

---

## 1. Versioning · Publish · Rollback (§18, §66-68)

### 1.1 Publish Gate (§66)
발행 전 확인: Validation 통과 · Dependency 정상 · Cost 허용 · **Owner 존재** · Permission · Version 고정 · Consent/Suppression 정책 · Identity 정책 · Preview · Diff · **Approval** · Rollback Target · Audit.

### 1.2 Version Diff (§67)
Added/Removed/Changed Rules · Operator 변경 · Value 변경 · Time Window 변경 · Dependency 변경 · Consent/Suppression/Identity 변경 · Purpose 변경 · **예상 Membership 차이(added/removed)** · Cost 차이 · Consumer 영향 · Automation 위험.

### 1.3 Rollback (§68)
이전 Published Version 선택 · Definition/Dependency 복구 · Membership Rebuild · Audience 영향 표시 · Active Campaign 영향 · Automation 일시중지 · Approval · Audit · Post-rollback Validation. **현행 인프라 매핑**: dist.bak 스왑백·백엔드 파일원복(288차 Rollback 등가) + 세그먼트는 previous_version_id 로 Definition 복구.

**§3.5 불변성**: Published/ACTIVE 직접수정 금지 → Draft→Validate→Review→Approve→Publish→Supersede. **현행=버전 개념 부재**(crm_segments rules 직접 UPDATE) → 최초 도입 시 v1 승격, 이후 편집=신규 버전.

---

## 2. Dependency Graph & Impact (§55-58)

### 2.1 Dependency 기록 (§55) & 상태 (§56)
버전별 Dependency: Attribute·Event·Metric·Model·Segment·Cohort·Consent Policy·Suppression Policy·Customer Schema·Query Contract·Evaluation Engine·Destination Consumer·Automation Workflow. 상태: ACTIVE/STALE/VERSION_MISMATCH/DEPRECATED/DELETED/BLOCKED/MISSING/INCOMPATIBLE.

### 2.2 Impact Analysis (§57)
Dependency 변경 시 영향 계산: 영향 Segment/Version/Membership/Audience/Destination/Campaign/Journey/Automation/Report · Membership Rebuild 필요성 · Reapproval 필요성 · Customer Impact · Cost · Rollback.
**현행 소비자**(Part 1 §9): Kakao/SMS/Email/Omni(segment_id)·Journey(name-match) → Attribute/Metric 변경 시 이들 발송대상 변동을 사전계산(현행 미제공).

### 2.3 Circular Reference (§58)
Direct/Indirect Cycle · Cross-workspace 금지 Reference · Template Cycle · Cohort·Segment Cycle · Max Depth · Cycle Path 표시 → **Cycle 존재 시 Publish 차단**.

### 2.4 Dependency Matrix (§89)
| Segment Version | Dep Type | Dep ID | Version | Status | Scope | Consumer Impact | Rebuild | Reapproval | Risk |

---

## 3. Permission · Sharing · Ownership · Approval (§62-65)

### 3.1 Permission (§62)
VIEW_DEFINITION · VIEW_COUNT · VIEW_SAMPLE · **VIEW_MEMBERS** · **VIEW_PII** · CREATE · EDIT_DRAFT · VALIDATE · SUBMIT_REVIEW · APPROVE · PUBLISH · ROLLBACK · ARCHIVE · DELETE · EXPORT · USE_IN_AUDIENCE · USE_IN_AUTOMATION · ADMIN_OVERRIDE.
**현행 실측**: create/refresh/delete=analyst+·Pro plan(RBAC 정합). **멤버행/export 노출 라우트 부재**(Part1 §10) → VIEW_MEMBERS/VIEW_PII/EXPORT 는 신규 권한으로 강화도입(세그먼트 뷰권한≠PII/Export 권한 §53).

### 3.2 Sharing Scope (§63)
PRIVATE/TEAM/WORKSPACE/BRAND/TENANT/TEMPLATE/GLOBAL_REFERENCE. **Global Reference 는 Customer Data·Membership 미포함**. 타 workspace 세그먼트 무단 재사용 차단.

### 3.3 Ownership (§64)
business_owner · technical_owner · data_owner · privacy_owner · approver · last_reviewer · support_owner. **Owner 없는 운영 세그먼트=OWNER_MISSING 경고/차단**.

### 3.4 Approval Workflow (§65)
No/Single/Data Owner/Privacy/Marketing/Automation Risk/Multi-party Approval. **고객 PII Export·광고 Audience·자동화 세그먼트=강화 승인**(MARKETING_INTELLIGENCE_AUTOMATION 헌법 안전자동화 정합).

---

## 4. Migration (§69-71) & Compatibility

### 4.1 Migration 절차 (§69) & 상태 (§70)
기존 rules(JSON)/Legacy DSL → Canonical: Source 보존 · Parser · Semantic Mapping · Operator Mapping · Type Mapping · Time/Null Semantics Mapping · **Unsupported Feature 기록** · Confidence · **Human Review** · **Shadow Compare** · Rollback · Status.
상태: NOT_STARTED/PARSED/MAPPED/VALIDATED/SHADOW_VERIFIED/MANUAL_REVIEW/BLOCKED_UNSUPPORTED/MIGRATED/ROLLED_BACK.

**crm_segments 현행 마이그레이션 경로**(비파괴): 기존 rules 는 이미 구조화 JSON `[{field,op,value}]` → Operator §0 매핑표로 자동변환 가능성 높음(Confidence 높음). ne/null 미세의미차만 Manual Review. **일괄전환 금지**(§85) — Shadow Compare(현행 SQL 결과 vs Canonical) 로 Semantic Equivalence 통과분만 전환.

### 4.2 Compatibility (§71)
기존 Segment Builder/API/Cohort UI/Membership 조회/Automation Reference/Report 는 **Adapter 로 점진 전환**(유지). **Adapter 가 Canonical Definition 우회해 별도 의미 생성 금지**.

### 4.3 Migration Matrix (§90)
| Legacy Def | Source Format | Canonical Mapping | Unsupported | Semantic Match | Shadow Result | Review | Status | Rollback |

---

## 5. Static Lint (§72) & Runtime Guard (§73)

### 5.1 Static Lint (CI, 신규 G-가드 후보 — 구현은 승인세션)
탐지: Raw SQL/Search/Graph Query Segment · 비공식 DSL · Registry 외 Attribute/Event/비인증 Metric/Registry 외 Operator · Tenant Scope 없는 Definition · Version 없는 Segment Reference · Circular Reference · **Published Definition 직접수정** · Consent 조건 누락 · Suppression 우회 · Sensitive Attribute 무단사용 · Automation 에 Predictive Score 무제한 · Client-side Query 실행 · **Hardcoded Customer List** · Direct Membership Write · Audit 없는 Publish/Rollback.
**주의**: 현행 crm_segments 는 내부적으로 rules→SQL 컴파일(정본 엔진, 허용) → Lint 는 **정본 엔진 화이트리스트** 후 나머지 raw 경로만 플래그(오탐 방지·pre-commit 영향 검증 필수, 기존 G9/G10/G11 패턴).

### 5.2 Runtime Guard (§73)
차단: Cross-Tenant/Cross-Workspace Segment Reference · Deleted Attr/Event/Metric 사용 · Deprecated Operator · Invalid Version · Circular Dependency · Cost Limit 초과 · Permission 부족 · Sensitive Attribute 무단조회 · Consent/Suppression Policy 누락 · Unsupported Engine · Stale Dependency · Automation Forbidden Definition · **Unpublished Version 사용** · Deleted Segment 실행. (286차 platform_growth act-as 하이재킹 클래스 회귀방지 포함.)

---

## 6. Golden Dataset & Equivalence Test (§76-79)

### 6.1 Golden Segment Dataset (§76)
**운영 Customer 미사용**(테스트 전용 합성). 33+ 시나리오: 단순 Equals·Null/Missing Attribute·Numeric Range·String Contains·Enum IN·Date Before/After·Rolling 30d·Calendar Month·Event Occurred/Not·Event Count·Distinct Product·Purchase Sum·Event Sequence·Late/Duplicate Event·Nested AND/OR/NOT·Nested Segment·**Circular 차단**·Consent Granted/Unknown·Suppression Active·Low Identity Confidence·Predicted Score·Expired Model Score·Cohort Anchor·Holdout Stable·**Cross-Tenant 차단**·Unsupported Operator·High Cost·Version Rollback·Legacy Migration.

### 6.2 Operator Conformance (§77) — Operator 문서 §9 참조.

### 6.3 Semantic Equivalence (§78) & Difference 상태 (§79)
Legacy(현행 SQL 결과) vs Canonical 비교: Rule 의미·Time Window·Null·Type Conversion·Event Dedup·Identity·Consent/Suppression·Count·Membership·Exclusion·Cost.
상태: MATCH / EXPECTED_SCOPE_CORRECTION / EXPECTED_NULL_SEMANTIC_CORRECTION / EXPECTED_TIMEZONE_CORRECTION / EXPECTED_CONSENT_CORRECTION / EXPECTED_SUPPRESSION_CORRECTION / LEGACY_SECURITY_DEFECT / LEGACY_SEMANTIC_DEFECT / CANONICAL_DSL_DEFECT / UNSUPPORTED_FEATURE / **UNEXPLAINED** / BLOCKED.
**게이트**: `UNEXPLAINED` 존재 시 Migration·Production 전환 **차단**(허구전환 금지·무음사망 방지).

---

## 7. Audit Events (§80)
SEGMENT_CREATED/VERSION_CREATED/VALIDATED/VALIDATION_FAILED/SUBMITTED_FOR_REVIEW/APPROVED/PUBLISHED/ROLLED_BACK/ARCHIVED/DELETED · REFERENCE_ADDED/REMOVED · DEPENDENCY_CHANGED · PREVIEW_EXECUTED · MIGRATION_STARTED/COMPLETED/ROLLED_BACK · AUTOMATION_USAGE_APPROVED. → 기존 audit_log/AuditRegistry 확장(신규 audit 스토어 난립 금지).

---

## 8. 기존 구현 분류 (§81) & 중복 통합 (§82) & 후퇴 방지 (§83)

### 8.1 분류
| 구현 | 분류 |
|---|---|
| crm_segments rules→SQL 컴파일(refreshSegmentMembers) | **VALIDATED_LEGACY → CANONICAL_RULE_ENGINE(SQL Adapter) 승격 후보** |
| isMarketingSendAllowed 게이트 | VALIDATED_LEGACY(Eligibility, DSL consent/suppression 조건과 연계) |
| cohortRetention | VALIDATED_LEGACY → COHORT_DEFINITION 형식화 |
| AdAdapters audience 컴파일 | KEEP_SEPARATE(Destination, Part 3) |
| AiGenerate generateSegment | UNVERIFIED(고아 → Canonical DSL 매핑 후 executable) |
| AISegmentsTab 클라이언트 휴리스틱 | TEST_ONLY/BLOCKED_SEMANTIC_MISMATCH(백엔드 미배선) |
| 실시간/스트리밍 | 부재(미구현) |

### 8.2 중복 통합 (§82)
현행은 **DSL/Rule Engine 이 단일**(crm_segments 만 rules 컴파일) → 다중 DSL 없음(양호). 통합대상=(a) Predicted 지표 SQL근사 vs BG/NBD 실모델(Model Score Reference 로 단일화 SEG-M4) (b) LTV 티어 이중(Semantic Metric SSOT SEG-M3) (c) 소비자 JOIN 4중복(공유 멤버해석 헬퍼 SEG-L3). **기존 정상기능·이력 보존하며 Canonical 아래 통합**.

### 8.3 기능 후퇴 방지 (§83)
전환 전후 비교: Rule Type·Operator·Nested·Segment Ref·Event Sequence·Time Window·Cohort·Holdout·Consent·Suppression·Preview·Count·Explain·Version·Rollback·Permission·Sharing·Audit·**기존 Consumer Compatibility**. **승인 안 된 기능감소 시 전환 차단**. 현행 6 operator·AND·fail-closed 가드·취소차감·identity통합은 **보존 필수**.

---

## 9. 완료 조건 대응
§93의 8(Nested/Composite=DSL)·16(Dependency/Impact)·17(Circular/Cost/Complexity=Rule Engine)·18(Permission/Approval)·19(Publish/Diff/Rollback)·20(Migration/Compatibility)·21(Lint/Guard)·22(Golden/Conformance/Equivalence)·23(분류)·24(중복통합)·25(후퇴방지)·26(ADR/PM/이력). **코드변경 0** — CI 가드·Runtime Guard·Migration·Golden 스위트 실 구현은 후속 승인 세션(기존 crm_segments 오탐 검증·verify·배포승인).

**다음**: EPIC 06-A Part 3 — Audience Builder, Eligibility, Consent, Suppression & Snapshot Governance. 선행 P0(구현세션)=발송 게이트 표준화(SEG-C1~C4)·Audience consent/Removal/Reconciliation(SEG-H1/H2/H5).

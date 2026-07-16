# Canonical Segment Rule Engine — Validation, Query Planner, Adapters, Preview & Explain

> **EPIC 06-A Part 2** (4/5) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1 인벤토리(현행 평가=`refreshSegmentMembers` DELETE+INSERT…SELECT `CRM.php:1530-1619`) · 형제: [`CANONICAL_SEGMENT_DSL.md`](CANONICAL_SEGMENT_DSL.md) · [`CANONICAL_SEGMENT_OPERATOR_REGISTRY.md`](CANONICAL_SEGMENT_OPERATOR_REGISTRY.md) · [`CANONICAL_SEGMENT_GOVERNANCE.md`](CANONICAL_SEGMENT_GOVERNANCE.md)
> **성격**: Definition→Validation→Plan→Execution 파이프라인 계약. 실 엔진 구현은 후속 승인 세션(무후퇴·Golden Dataset·verify·배포승인).

---

## 0. 파이프라인 (§3.2 분리)

`Canonical Definition → Validated Definition → Logical Plan → Physical Plan → Execution → Evaluation Result → Membership → Snapshot`

**현행 매핑**: 현재는 rules(JSON) → `refreshSegmentMembers` 가 직접 SQL 컴파일+실행+DELETE/INSERT 를 한 함수에서 수행(Validated/Logical/Physical 미분리). Canonical 은 단계 분리(벤더결합 제거 §3.2) — 단 **기존 배치 SQL 경로는 SQL Adapter 로 보존**(재구현 아님).

---

## 1. Validation Engine (§41)

20단계 검증(순서):
1 JSON Schema · 2 DSL Version · 3 Reference Existence · 4 Reference Version · 5 Scope · 6 Permission · 7 Data Type · 8 Operator Compatibility · 9 Value · 10 Time Semantics · 11 Consent·Suppression · 12 Sensitive Attribute · 13 **Circular Dependency** · 14 **Cost Estimation** · 15 Engine Capability · 16 Purpose Eligibility · 17 Automation Eligibility · 18 Compatibility · 19 Warning Generation · 20 Result 저장(`SEGMENT_VALIDATION_RESULT`).

**현행 delta**: 현재 검증=`is_numeric` + unknown field/op **무음 skip**(`1575,1583`) + fail-closed(유효술어0→멤버0 `1587`). Canonical 은 무음 skip → **명시 오류**(INVALID_REFERENCE/OPERATOR). fail-closed 가드는 **보존**(안전측).

### 1.1 Validation 상태 (§42)
VALID / VALID_WITH_WARNINGS / INVALID_SCHEMA / INVALID_REFERENCE / INVALID_TYPE / INVALID_OPERATOR / INVALID_SCOPE / INVALID_PERMISSION / INVALID_CONSENT / INVALID_SENSITIVITY / CIRCULAR_DEPENDENCY / COST_LIMIT_EXCEEDED / ENGINE_UNSUPPORTED / AUTOMATION_NOT_ALLOWED / BLOCKED.

---

## 2. Query Planner (§45-46)

Definition → ① Resolved Definition ② Logical Plan ③ Engine Assignment ④ Join Plan ⑤ Filter Pushdown ⑥ Aggregation Plan ⑦ Identity Plan ⑧ **Consent·Suppression Plan** ⑨ Cost Estimate ⑩ Execution Strategy ⑪ Reconciliation Strategy ⑫ Explain Plan.

**Logical Plan Node (§46)**: PROFILE_SCAN · ATTRIBUTE_FILTER · EVENT_FILTER · EVENT_AGGREGATE · METRIC_FILTER · MODEL_SCORE_FILTER · SEGMENT_REFERENCE · CONSENT_FILTER · SUPPRESSION_FILTER · IDENTITY_FILTER · UNION · INTERSECT · DIFFERENCE · SEQUENCE · PROJECT · DISTINCT · SNAPSHOT.

DSL 에 특정 DB Vendor 실행세부를 결합하지 않는다(§3.2) — Logical Plan 은 Physical Adapter 경계 위에 있다.

---

## 3. Physical Adapter Contract (§47) & 보안

지원 어댑터: SQL · Warehouse · Search Index · Graph · Streaming State · In-memory Preview · Materialized Membership. **동일 Operator Conformance Test 적용**(Operator §9).

### 3.1 SQL Adapter 보안 (§48) — ★현행 경로
- **Parameter Binding 강제**(현행 refreshSegmentMembers 는 `implode(' AND ')` 로 조건문자열 생성하나 field/op **화이트리스트**·value 는 바인딩 → 인젝션 안전. Canonical 도 이 안전성 유지·강화).
- **Raw SQL 금지**(Definition 저장) · **Tenant Predicate 강제** · **Workspace/Brand Predicate** · Identifier Allowlist · Statement Timeout · Row Limit · Cost Limit · Query Cancellation · Audit · Explain Plan Inspection.
- 285차 교훈: 루프 내 외부API/N+1 금지(공용카탈로그 재수집 502 회귀 방지) — 평가는 집합연산(단일 INSERT…SELECT) 유지.

### 3.2 Search Adapter (§49)
Index Alias allowlist · Tenant/Brand Filter · Query DSL 서버생성(client raw 금지) · Script Query 제한 · Regex 제한 · Result Limit · Timeout · Sensitive Field 제외 · Audit.

### 3.3 Graph Adapter (§50)
Start Node Scope · Edge Scope · Tenant Predicate · Traversal Depth · Path Limit · Sensitive/Deleted Node 제외 · Timeout · Explain · Audit. (EPIC02 KG 정합.)

### 3.4 Streaming Adapter (§51)
partition_key · event_schema · watermark · state_key · state_ttl · late_event · dedup · ordering · retraction · compensation · checkpoint · replay · reconciliation · version_routing. **현행=실시간 세그먼트 부재** → Streaming 은 필요성 입증 후(Baseline Option E: 배치우선). 미검증 실시간 활성화 금지(§85).

---

## 4. Preview & Explain (§52-54, §3.6)

### 4.1 Preview Engine (§52)
Exact/Approximate 표시 · Count · Sample · Inclusion Reason · Exclusion Reason · Attr/Event/Metric Version · Identity Confidence · **Consent·Suppression 결과** · Timezone · Cost Estimate · Warning · **PII Masking** · Audit.
**§3.6 핵심**: Preview/Count/Sample/Batch/Realtime 이 **동일 Canonical Definition·Operator Contract·Evaluation Time·Timezone·Null·Identity·Consent·Suppression** 사용 → "미리보기와 실제 대상이 다름" 방지. **현행=Preview UI 부재**(SEG 미평가) → 신규.

### 4.2 Approximate Preview (§53)
approximation_method · confidence_interval · sample_size · sampling_bias · freshness · **prohibited_consumer** · exact_execution_difference_warning. **자동화 승인=Exact Preview 요구 가능**.

### 4.3 Count 정확성 (Part 1 §6)
중복고객(identity 통합 ✔ 현행)·삭제/익명·Consent Blocked·Suppressed·Source Account 불일치·Stale·Approximate·Cache·TZ 고려. **"멤버 수" vs "발송가능 수" 구분 표기**(현행 미구분).

### 4.4 Explain (§54)
어떤 Rule 이 포함/제외했나 · 사용 Attr/Event/Metric · 사용 Version · Timezone/Window · Consent/Suppression 적용 방식 · Nested Segment 결과 · Validation Warning 사유 · 예상 Cost. (Explainable AI 헌법 Vol4 정합.)

---

## 5. Cost & Complexity Guard (§59-61)

### 5.1 Cost 추정 (§59) & 상태 (§60)
Profile Scan · Event Scan 기간 · Join 수 · Nested Depth · Aggregation/Distinct/Sequence Cost · Graph Traversal · Streaming State · Preview/Full Eval Cost → LOW/MEDIUM/HIGH/VERY_HIGH/**BLOCKED**. 고비용=Approval/Schedule/Quota/Materialization 요구.

### 5.2 Complexity Limit (§61)
최대 Rule 수 · Group 수 · Nested Depth · Segment Reference 수 · Event Window · Sequence Step · IN 값 수 · **Regex 길이** · Aggregation 수 · Join 수 · 예상 Scan · Preview Sample. Tenant Plan별 상이 가능하나 **보안 최소기준 유지**(전역 레이트리밋 282차 정합).

---

## 6. Error / Warning Contract (§74-75)

**Error**(대표): SEGMENT_DEFINITION_INVALID · SEGMENT_VERSION_NOT_PUBLISHED · INVALID_RULE_REFERENCE · INVALID_OPERATOR · OPERATOR_TYPE_MISMATCH · INVALID_TIME_WINDOW · INVALID_NULL_POLICY · REFERENCE_SCOPE_VIOLATION · CIRCULAR_SEGMENT_REFERENCE · SEGMENT_DEPENDENCY_MISSING/STALE · QUERY_COST_LIMIT_EXCEEDED · ENGINE_CAPABILITY_UNSUPPORTED · SEGMENT_PERMISSION_DENIED · CONSENT_POLICY_REQUIRED · SUPPRESSION_POLICY_REQUIRED · SENSITIVE_ATTRIBUTE_RESTRICTED · AUTOMATION_USAGE_NOT_ALLOWED · **RAW_QUERY_NOT_ALLOWED**.

**Warning**: APPROXIMATE_PREVIEW · STALE_ATTRIBUTE/METRIC/MODEL_SCORE · HIGH_QUERY_COST · DEPRECATED_REFERENCE · LEGACY_DEFINITION_USED · NULL_SEMANTICS_EXPLICIT_REQUIRED · TIMEZONE_DEFAULT_APPLIED · MANUAL_REVIEW_RECOMMENDED · PREDICTIVE_ATTRIBUTE_USED · MEMBERSHIP_REBUILD_REQUIRED · CONSUMER_REAPPROVAL_REQUIRED.

---

## 7. Evaluation & Membership 연계 (Schema 문서)
평가 실행=`SEGMENT_EVALUATION`(evaluation_time·registry versions 기록) → `SEGMENT_MEMBERSHIP`(effective_from/to·reason·lineage) → `SEGMENT_SNAPSHOT`(발송/업로드 시점 고정). **현행 파괴적 DELETE+INSERT 는 스냅샷 기록 후 수행**(SEG-H4: 과거 대상 재현). on-send 재물질화(`refreshSegmentForSend`)는 스냅샷을 남겨 "검토본≠실발송" 갭 해소.

---

## 8. 완료 조건 대응
§93의 12(Validation)·13(Planner/Plan 경계)·14(Adapter 보안)·15(Preview/Explain)·17(Cost/Complexity Guard). **코드변경 0** — 검증기/플래너/어댑터/Preview 실 구현은 Golden Dataset+Conformance+Equivalence 통과·verify·배포승인 후. 현행 배치 SQL 경로는 SQL Adapter 로 보존(무후퇴).

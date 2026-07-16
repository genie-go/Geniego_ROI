# Canonical Segment DSL — Root Schema, Rules, References, Semantics, Cohort & Holdout

> **EPIC 06-A Part 2** (2/5) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1 인벤토리 · 형제: [`CANONICAL_SEGMENT_SCHEMA.md`](CANONICAL_SEGMENT_SCHEMA.md) · [`CANONICAL_SEGMENT_OPERATOR_REGISTRY.md`](CANONICAL_SEGMENT_OPERATOR_REGISTRY.md) · [`CANONICAL_SEGMENT_RULE_ENGINE.md`](CANONICAL_SEGMENT_RULE_ENGINE.md) · [`CANONICAL_SEGMENT_GOVERNANCE.md`](CANONICAL_SEGMENT_GOVERNANCE.md)
> **성격**: 벤더중립 JSON DSL 목표계약. 현행 `crm_segments.rules`(JSON 평면 `[{field,op,value}]`, AND전용, 6 operator, `CRM.php:1560-1591`)의 **상위호환 확장**(기존 6 operator·AND 보존 + 확대). 실 파서/컴파일러 구현은 후속 승인 세션.

---

## 0. 현행→Canonical 상위호환 매핑

| 현행 rules | Canonical DSL |
|---|---|
| `[{"field":"ltv","op":"gte","value":500000}]` | `root_group.rules[].{reference_type:SEMANTIC_METRIC, field_path:ltv, operator:GREATER_THAN_OR_EQUAL, value:500000, value_type:CURRENCY}` |
| 암묵 AND(implode) | `root_group.logical_operator: AND` |
| unknown field/op → skip | Validation 단계에서 INVALID_REFERENCE/INVALID_OPERATOR(무음 skip 폐지 → 명시 오류) |
| churn/clv 인라인 SQL 근사 | `reference_type: MODEL_SCORE` + model_id/version/threshold 명시(근사는 별도 model_id) |

**무후퇴**: 기존 6 operator(gte/lte/gt/lt/eq/ne)·ltv/frequency/recency/rfm_score/grade/churn/clv 필드는 Canonical 에서 **전부 표현 가능**해야 한다(회귀 0). 현행 무음 skip 은 안전측 fail-closed 가드(`1587-1590`)와 함께 **명시 검증오류**로 승격.

---

## 1. DSL Root Schema (§9)

```json
{
  "dsl_version": "1.0",
  "segment_id": "<ULID>",
  "segment_version": "<int>",
  "scope": { "tenant_id":"...", "workspace_id":"...", "brand_id":"...", "environment":"prod" },
  "purpose": "CRM|EMAIL|SMS|RETARGETING|...",
  "root_group": { "group_id":"g0", "logical_operator":"AND", "rules":[], "child_groups":[] },
  "references": [ /* 사용 Attr/Event/Metric/Model/Segment 참조 목록 + version */ ],
  "time_semantics": { "default_timezone":"Asia/Seoul", "evaluation_time":"<runtime>" },
  "evaluation_policy": { "mode":"BATCH", "approximate_preview_allowed":false },
  "consent_policy": { "recheck_at_execution": true },
  "suppression_policy": { "recheck_at_execution": true },
  "identity_policy": { "min_identity_confidence":0.0, "exclude_deleted":true, "exclude_anonymized":true },
  "freshness_policy": { "max_membership_age":"P1D" },
  "cost_policy": { "max_cost_class":"HIGH" },
  "metadata": {}
}
```

**Vendor-neutral 강제(§3.1)**: `root_group` 은 SQL/ES/Graph 문자열을 담지 않는다. Raw SQL/ORM객체/프론트State/JS함수/하드코딩 조건을 canonical_definition 으로 저장 금지 → Static Lint(Governance §Lint).

---

## 2. Rule Group Schema (§11)

```
group_id, logical_operator, rules[], child_groups[], negated,
minimum_should_match, evaluation_order, short_circuit_policy, description, metadata
```

- **Logical Operator**: AND · OR · NOT · MINIMUM_MATCH. **XOR 은 실 필요성·기존기능 검증 후에만**(현행 미지원 → 기본 제외, 필요시 §Change Request).
- **현행 delta**: 현재 AND 전용 → **OR/NOT/중첩(child_groups)/minimum_should_match 신규 지원**(기능 확대, 후퇴 아님).
- `negated`: 그룹 전체 부정(예: "구매 없음" 그룹).
- `short_circuit_policy`: 평가 최적화(의미 불변, Preview/Batch 동일 결과 보장 — Operator Conformance).

---

## 3. Rule Schema (§12)

```
rule_id, rule_type, reference_type, reference_id, reference_version,
field_path, operator, value, value_type, unit, timezone,
window, aggregation, sequence, null_policy,
freshness_requirement, confidence_requirement, consent_requirement,
sensitivity_policy, negated, metadata
```

`rule_type`: ATTRIBUTE / EVENT / METRIC / MODEL_SCORE / SEGMENT_REF / COHORT_REF / CONSENT / SUPPRESSION / IDENTITY / SEQUENCE / COUNT / GEO / PRODUCT / CAMPAIGN / CREATOR.

---

## 4. Reference Type Registry (§13)

CUSTOMER_ATTRIBUTE · CUSTOMER_IDENTIFIER · CUSTOMER_STATUS · IDENTITY_CONFIDENCE · CUSTOMER_EVENT · SEMANTIC_METRIC · MODEL_SCORE · SEGMENT_REFERENCE · COHORT_REFERENCE · CONSENT_STATUS · SUPPRESSION_STATUS · CHANNEL_ELIGIBILITY · PRODUCT · SKU · CREATOR · CAMPAIGN · CHANNEL · GEOGRAPHY · ACCOUNT_RELATIONSHIP.

**모든 참조는 Registry 기반**(§4-5, EPIC03 Semantic Metric·EPIC05 Canonical Profile·Event Registry). 현행 ltv/frequency/recency 는 세그먼트가 **자체 SQL 재계산**(SEG-M4) → Canonical 은 SEMANTIC_METRIC 참조로 전환(중복경로 제거, 실모델 점수 참조).

### 4.1 Attribute Reference Contract (§14)
`canonical_attribute_id, attribute_version, data_type, source_type, temporal, sensitivity, null_policy, freshness, consent_requirement, permitted_purposes, allowed_operators, aggregation_support, indexing_support, engine_support`.

### 4.2 Event Reference Contract (§15)
`canonical_event_id, event_schema_version, event_time_field, processing_time_field, identity_requirement, consent_context, deduplication_key, late_event_policy, allowed_properties, allowed_operators, allowed_aggregations, retention, source_account_scope`. 현행 이벤트=`crm_activities.type`(purchase/refund/*_sent) → Canonical Event Registry 정합.

### 4.3 Metric Reference Contract (§16)
`metric_id, metric_version, semantic_certification_status, data_type, unit, grain, time_window, calculation_time, freshness, confidence, allowed_operators, allowed_purposes, automation_eligibility, lineage_reference`. **비인증 Metric 은 운영 자동화 세그먼트 사용 불가**.

### 4.4 Model Score Reference Contract (§17, §3.8)
`model_id, model_version, score_name, score_type, calibration_status, generated_at, freshness, expiry, confidence, threshold, explain_reference, allowed_purposes, fairness_review_status, automation_eligibility`. **현행 BG/NBD 실모델**(`CRM.php:398-445`)은 Model ID/Version/Confidence/Expiry 미영속(SEG-M4) → Canonical 은 영속 model_id 참조. 인라인 SQL 근사(churn≈recency/2avg)는 **별도 model_id='sql-heuristic-v1'** 로 명시(Predictive 라벨링 §3.8, Fact 와 혼용금지).

---

## 5. Type System (§43) & Value Validation (§44)

**Data Type**: STRING/INTEGER/DECIMAL/BOOLEAN/DATE/DATETIME/DURATION/ENUM/ARRAY/SET/OBJECT/GEO/CURRENCY/PERCENTAGE/IDENTIFIER/MODEL_SCORE.
- Implicit conversion 제한 → 명시 Conversion Rule Registry.
- Value 검사: Type일치·Enum존재·Range·Length·Currency·Unit·Timezone·DateFormat·**Regex 안전성(ReDoS)**·ArraySize·**Sensitive Literal/PII 직접입력 차단**·Invalid Identifier·Locale.
- 현행 delta: 현재 `is_numeric` 만 검사(`1583`) → 타입 시스템 전면 검증.

---

## 6. Null / Missing / Unknown Semantics (§29-30, §3.7)

**Null Policy(rule별 명시)**: NULL_IS_FALSE / NULL_IS_TRUE / NULL_IS_UNKNOWN / EXCLUDE_NULL / INCLUDE_NULL / ERROR_ON_NULL. Default 는 Operator·DataType별 Registry 정의.

**상태 구분(§30)**: MISSING / UNKNOWN / NOT_SYNCED / MASKED / RESTRICTED / CALCULATION_FAILED / STALE / NOT_APPLICABLE — **실제 False 와 구분**. Evaluation 결과에 Exclusion Reason 기록.

**핵심 원칙(§3.7)**: "값 없음/미동기화/Unknown/계산실패/Masked/Consent불가"를 False 로 뭉개지 않는다 — 오분류로 인한 wrong-target/누락 방지.

---

## 7. Time / Sequence / Count / Aggregation Contract

### 7.1 Time Window (§27)
유형 FIXED/ROLLING/CALENDAR/LIFETIME/SESSION/SINCE_EVENT/BETWEEN_EVENTS/AS_OF. 필드 `start,end,duration,unit,timezone,anchor,grace_period,late_arrival_window`.

### 7.2 Timezone 정책 (§28)
우선순위: Segment TZ > Workspace TZ > Brand TZ > Tenant Default > **UTC fallback**. **현행 실측: TZ 정규화 전무**(cohortRetention/refreshSegmentMembers 저장문자열 그대로, SEG-M2) → Canonical 은 TZ 명시 강제.

### 7.3 Sequence Rule (§25)
ordered steps · event ref · per-step filter · max_gap · total_window · same_customer · same_session · optional_steps · repeat_policy · overlap_policy · late_event. (예: ProductView→AddToCart→**NOT Purchase**). 현행 미지원 → 신규.

### 7.4 Count Rule (§26)
subject · event/entity · aggregation_window · filter · distinct_key · operator · threshold · timezone · late_event · dedup. 현행 frequency(COUNT purchase)는 특수사례로 포섭.

### 7.5 Aggregation (§24)
COUNT/DISTINCT_COUNT/SUM/AVG/MIN/MAX/FIRST/LAST/MEDIAN/PERCENTILE. **미지원 엔진 무단 근사 금지** → 근사는 명시표시 + 운영 Targeting 사용제한.

---

## 8. Identity / Consent / Suppression / Freshness 조건 Contract

### 8.1 Identity (§31)
`min_identity_confidence, verified_identifier_required, allowed_identifier_types, conflict_policy, merge_cooldown, deleted_profile_exclusion, anonymized_profile_exclusion, manual_review_exclusion`. EPIC05 Identity Graph 정합(합성 buyer_email 자동병합 금지 승계).

### 8.2 Consent (§32, §3.5)
`purpose, channel, brand_scope, jurisdiction, required_status, consent_version_policy, expiry_policy, unknown_policy, execution_time_recheck_required`. **목적 확대 금지**(email consent≠sms). 현행 consent=발송시점 게이트(`isMarketingSendAllowed`) → DSL 은 **조건으로도 표현 가능**하되 **실행시점 재평가 필수**(빌드시점 consent 를 실행자격으로 신뢰 금지).

### 8.3 Suppression (§33)
`suppression_types, global_suppression, brand_suppression, channel_suppression, temporary_suppression, legal_block, frequency_suppression, execution_time_recheck`. **현행 email_suppression(email) 존재·phone DNC 부재**(SEG-C4) → Canonical 은 phone suppression 참조 포함(실 스토어는 P0 구현세션).

### 8.4 Freshness (§34)
`max_attribute_age, max_event_lag, max_metric_age, max_model_score_age, max_identity_age, max_consent_lag, max_membership_age` + stale/warning/block 정책.

---

## 9. Nested / Composite Segment (§35-37)

### 9.1 Segment Reference (§35)
`referenced_segment_id, referenced_version, reference_mode(LIVE|VERSION_PINNED|SNAPSHOT_PINNED), membership_time, snapshot_id, freshness, fallback, permission, scope, deletion_protection`. **운영 자동화=Version/Snapshot Pinning 우선**(LIVE 는 표류위험).

### 9.2 Nested 정책 (§36)
max_depth · max_dependency_count · **circular reference detection**(Direct/Indirect/Template/Cross-workspace 금지) · stale/failed dependency behavior · permission inheritance · scope compatibility · publish/rollback order · deletion protection.

### 9.3 Composite (§37)
Union / Intersection / Difference / (Symmetric Difference=필요검증후) / Minimum Membership Match. 각 조합 Version·Evaluation Time 고정.

---

## 10. Cohort Definition Contract (§38-39)

`cohort_id, anchor_event, anchor_time, eligibility_filter, entry_window, period_granularity, retention_event, revenue_metric, timezone, identity_version_policy, late_event_policy, refund_policy, cohort_version, historical_freeze_policy`.

**현행 cohortRetention delta**(`CRM.php:1221-1270`): anchor=created_at월 ✔, retention=purchase ✔, **TZ 없음·refund netting 없음·version/freeze 없음**(SEG-M2) → Canonical 은 timezone·refund_policy·cohort_version·historical_freeze 강제.

### 10.1 Holdout / Control (§39-40)
`assignment_policy_id, source_population, eligibility, randomization_method, seed, allocation_ratio, persistence, re_entry_policy, exclusion, start/end, identity_merge_policy, assignment_version, audit`.
**Randomization**: Stable Hash / Cryptographic Hash / Random+persisted state / Stratified. **금지**: 매 평가 새 Random · Frontend Random · Tenant scope 없는 Hash · Seed 미기록. (현행 홀드아웃 엔티티 부재 → 신규.)

---

## 11. DSL Injection 방어 (§3.4)
Frontend/외부API/AI 가 전달한 DSL 은 서버에서 재검증: Schema·Type·Permission·Scope·Registry Reference·Consent·Sensitive·Cost·Circular·Unsupported Operator·Injection·Version. **현행 안전점**: rules 는 화이트리스트 field/op 컴파일만(raw SQL 실행 없음) → Canonical 도 이 안전성 유지·강화(Rule Engine 문서 §Adapter Security). AI NL→Segment(`generateSegment`)는 Canonical DSL 로 매핑·검증 후에만 executable(현행 고아 advisory, SEG-L1).

---

## 12. 완료 조건 대응
§93의 3(DSL)·4(Rule Group/Rule)·5(참조 Registry기반)·7(Time/Null/Missing/Unknown)·8(Sequence/Count/Aggregation/Window)·9(Identity/Consent/Suppression/Freshness)·10(Nested/Composite)·11(Cohort/Holdout/Randomization). Operator 상세=[`CANONICAL_SEGMENT_OPERATOR_REGISTRY.md`](CANONICAL_SEGMENT_OPERATOR_REGISTRY.md). **코드변경 0** — 파서/컴파일러/검증기 실 구현은 Golden Dataset+Semantic Equivalence 통과·verify·배포승인 후 후속 세션.

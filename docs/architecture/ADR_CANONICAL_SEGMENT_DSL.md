# ADR — Canonical Segment Schema, DSL, Rule Engine, Versioning & Dependency Governance (EPIC 06-A Part 2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Canonical 계약 명세 확정. 비파괴 — 코드변경 0). 실 파서/검증기/플래너/어댑터/CI가드 구현·기존 Definition Migration 은 후속 승인 세션(Golden Dataset+Semantic Equivalence+verify+배포승인).
- **근거**: [`../segmentation/CANONICAL_SEGMENT_SCHEMA.md`](../segmentation/CANONICAL_SEGMENT_SCHEMA.md) · [`CANONICAL_SEGMENT_DSL`](../segmentation/CANONICAL_SEGMENT_DSL.md) · [`OPERATOR_REGISTRY`](../segmentation/CANONICAL_SEGMENT_OPERATOR_REGISTRY.md) · [`RULE_ENGINE`](../segmentation/CANONICAL_SEGMENT_RULE_ENGINE.md) · [`GOVERNANCE`](../segmentation/CANONICAL_SEGMENT_GOVERNANCE.md) · Part 1 실코드 인벤토리.

## 결정 (핵심)

1. **기존 엔진 확장(재구현 금지)**: 현행 `crm_segments`+`crm_segment_members`+`refreshSegmentMembers`(SQL 컴파일)는 유일 정본 DSL/Rule Engine — Canonical 은 이를 **SQL Adapter 로 보존·승격**하며 교체하지 않는다. isMarketingSendAllowed(Eligibility)·crm_channel_prefs(Consent)·email_suppression·cohortRetention 도 확장.

2. **벤더중립 JSON DSL, 상위호환**: Canonical DSL 은 현행 `[{field,op,value}]`(AND전용·6 operator)의 **상위집합**(기존 표현 전부 보존 + OR/NOT/중첩/Sequence/Count/Aggregation/시간/이벤트 확대). Raw SQL/ORM/프론트State/하드코딩 조건을 운영 Definition 으로 직접 저장 금지(Static Lint·Runtime Guard).

3. **Definition↔Version↔Membership↔Snapshot 분리 + 불변버전**: Published/ACTIVE 버전 직접수정 금지(Draft→Validate→Review→Approve→Publish→Supersede). Version 에 Operator/Customer-schema/Event/Metric/Model/Consent/Suppression 레지스트리 버전 핀 고정 → 과거 캠페인 재현성(SEG-H4). 현행 버전부재 행은 v1 승격(비파괴).

4. **참조는 Registry 기반(중복경로 제거)**: Attribute/Event/Metric/Model Score 는 EPIC03 Semantic Metric·EPIC05 Canonical Profile·Event Registry 참조. 세그먼트 자체 SQL 재계산(ltv/frequency)·인라인 churn/clv 근사(SEG-M4)는 SEMANTIC_METRIC/MODEL_SCORE 참조로 단일화(BG/NBD 실모델 영속·근사는 별도 model_id 라벨).

5. **의미 일관성(§3.3·§3.6·§3.7)**: 동일 Operator·Time Window 는 Batch/Streaming/Preview/Count/실 Membership 에서 **같은 의미**(Operator Conformance Test). Preview=실행과 동일 Definition/Scope/Consent. Null/Missing/Unknown/Masked/Stale 를 실제 False 와 구분(오분류 wrong-target 방지). TZ 명시 강제(현행 미명세 SEG-M2 해소).

6. **안전·거버넌스**: SQL/Search/Graph/Streaming Adapter 보안(Tenant predicate·바인딩·timeout·cost·raw 금지)·Circular/Cost/Complexity Guard·Permission(멤버/PII/Export 분리)·Approval(PII Export·광고 Audience·자동화 강화)·Migration(Source 보존·Shadow Compare·UNEXPLAINED 시 전환차단)·Golden Dataset(운영 Customer 미사용).

7. **정직·무후퇴**: 실시간/스트리밍·Materialized 버전·Snapshot·Preview·Removal·Model 거버넌스는 **현행 부재→목표계약으로 명시**(있다고 보고 금지). 현행 6 operator·AND·fail-closed 가드·취소차감·identity통합은 Semantic Equivalence 로 보존 증명. 기능후퇴 0.

## 무후퇴·영구 규칙 (§94)

신규 Segment Rule/Operator/DSL/Query Adapter/Cohort/Holdout 생성 전: Canonical Segment Entity/DSL/Operator Registry·Attribute/Event/Metric Registry·Existing Rule Engine·Dependency Graph·Consent/Suppression·Identity/Freshness·Query Cost·Permission/Approval·Version/Rollback·Golden/Conformance·중복/후퇴 검사·ADR/PM 기록. **Canonical DSL 우회 Raw SQL/Search/Graph Query·비공식 조건 운영 생성 금지.**

## 결과

Canonical Segment Schema·DSL·Operator Registry·Rule Engine 파이프라인·Versioning·Dependency·Permission·Migration·Lint/Guard·Golden/Equivalence **계약 명세 확정**(설계 파운데이션·코드변경 0). 산출=docs/segmentation/CANONICAL_SEGMENT_{SCHEMA,DSL,OPERATOR_REGISTRY,RULE_ENGINE,GOVERNANCE}.md(§86 70여 문서 통합). 다음 **EPIC 06-A Part 3 — Audience Builder, Eligibility, Consent, Suppression & Snapshot Governance** 입력 준비 완료. 선행 P0(별도 승인 구현세션)=발송 게이트 표준화(SEG-C1~C4).

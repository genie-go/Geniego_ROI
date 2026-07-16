# Segmentation Architecture — Options, Baseline & Existing-Store Classification

> **EPIC 06-A Part 1** · 289차 (2026-07-16) · 비파괴(코드변경 0)
> 근거: [`SEGMENTATION_PLATFORM_INVENTORY.md`](SEGMENTATION_PLATFORM_INVENTORY.md) · 리스크: [`SEGMENT_RISK_REGISTER.md`](SEGMENT_RISK_REGISTER.md)
> 상위 원칙: [`../MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`](../MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md)(안전한 자동화·단일엔진)·[`../UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`](../UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md)(중복엔진 금지·무후퇴).

---

## 1. Existing Store/Service 분류 (§67)

| Store/Service | 분류 | 근거 | 처리 |
|---|---|---|---|
| `crm_segments` (Definition) | **VALIDATED_LEGACY → CANONICAL_SEGMENT_DEFINITION_STORE 후보** | 유일 실 고객 세그먼트 정의, tenant 격리, fail-closed | Part 2에서 Version/DSL 확장(교체 아님) |
| `crm_segment_members` (Membership) | **CONSOLIDATION_REQUIRED** | 멤버십 SoT이나 version/snapshot 부재 | Part 2에서 Snapshot/Version 컬럼 확장 |
| `CRM::refreshSegmentMembers` (Evaluation) | **VALIDATED_LEGACY** | 배치 평가 정본·취소차감·identity통합 | 확장(증분/스냅샷) |
| `CRM::isMarketingSendAllowed` (Eligibility gate) | **CANONICAL_ELIGIBILITY_GATE** | 중앙 게이트 정본 | 모든 발송경로 강제(SEG-C1~C4) |
| `crm_channel_prefs` (Consent) | **CANONICAL(EPIC05 정합)** | 채널/토픽/글로벌 consent | phone-키 확장(SEG-C4) |
| `email_suppression` (Suppression) | **CANONICAL_SUPPRESSION(email)** | 실 pre-send 필터·bounce/complaint | phone suppression 신설 필요 |
| `CRM::isFrequencyCapped` | **CANONICAL_FREQUENCY** | 중앙 cross-channel | customer_id>0 한계 보완 |
| `AdAdapters::syncAudience`(Meta/Google/TikTok) | **VALIDATED_LEGACY(Destination Sync)** | 실 API·해시전용 | consent/Removal/Reconcile 추가(SEG-H1/H2/H5) |
| `Connectors::audienceSync` | **LEGACY_ADAPTER** | 얇은 HTTP 위임(정상) | 유지 |
| `admin_growth_segment` | **KEEP_SEPARATE_WITH_REASON** | GeniegoROI 자체 B2B ICP(고객 아님·tenant 없음) | **명명 분리**(Growth ICP), 통합 금지 |
| `Decisioning::segments` | **KEEP_SEPARATE_WITH_REASON** | 집계 인구통계 코호트(PII없음) | **명명 분리**(Decisioning Cohort) |
| `CustomerAI::ltvSegments` | **CONSOLIDATION_REQUIRED** | LTV 티어 read-model, crm_segments ltv와 임계중복 | Semantic Metric SSOT로 티어 단일화(SEG-M3) |
| `AiGenerate::generateSegment` | **UNVERIFIED(고아)** | 실 AI이나 미배선·미영속 | UI 배선 또는 executable 브릿지 결정(Part 2) |
| `AISegmentsTab`(프론트) | **TEST_ONLY/UI-HEURISTIC** | 클라이언트 휴리스틱·"AI"오라벨 | 실 백엔드 배선 또는 라벨정정 |
| 실시간/스트리밍 세그먼트 | **부재(BLOCKED_PENDING_IMPLEMENTATION)** | 없음 | Part 2 이후 필요성 판단 |

---

## 2. Architecture Option 비교 (§70)

| 기준 | A. Query 확장 | B. Materialized Membership | C. Streaming-first | D. Semantic DSL | **E. Hybrid(권장)** |
|---|---|---|---|---|---|
| 정확성 | 중 | 고 | 중(late/order 위험) | 고 | **고** |
| 재현성 | 저(스냅샷 없음) | 고 | 중 | 고 | **고** |
| 실시간성 | 저 | 저 | 고 | 중 | **중(배치+선택적 스트림)** |
| 기존 재사용 | **고**(crm_segments 그대로) | 중 | 저(신 인프라) | 중 | **고** |
| Tenant 격리 | 고 | 고 | 중 | 고 | **고** |
| Consent/Wrong-target | 게이트 의존 | 스냅샷에 consent 고정 | 지연위험 | DSL 조건화 | **게이트+스냅샷+DSL** |
| Migration Risk | **저** | 중 | 고 | 중 | **저~중(무후퇴 증분)** |
| 운영복잡도 | 저 | 중 | 고 | 중 | **중** |

---

## 3. 권장 Baseline — Option E (Hybrid, 기존 확장)

**GeniegoROI 인프라 실매핑**(신 인프라 난립 금지, 기존 확장):

1. **Segment Definition Registry** = `crm_segments` 확장(+`definition_version`,`status`,`definition_hash`,`effective_from/to`). 교체 아님.
2. **Canonical Segment DSL** = 현 JSON 평면술어를 상위호환 확장(OR·그룹·이벤트/시퀀스/집계 조건·consent/eligibility 조건). 기존 6 operator 보존 + 확대.
3. **Attribute/Event/Metric Resolver** = **EPIC03 Semantic Metric Registry·EPIC05 Canonical Profile 참조**(세그먼트 자체 SQL 재계산 제거 → 중복경로 SEG-M4 해소).
4. **Batch Evaluation** = `refreshSegmentMembers` 확장(증분·스냅샷 기록). Streaming 은 후속(필요성 입증 후).
5. **Membership Store** = `crm_segment_members` + **Snapshot/Version**(SEG-H4). on-send 재물질화 결과를 스냅샷으로 고정.
6. **Consent/Suppression Resolver** = `crm_channel_prefs`+`email_suppression`+**phone suppression 신설**(SEG-C4/H1). 발송·업로드 **양 시점** 재평가.
7. **Audience Eligibility & Snapshot Builder** = 발송/업로드 대상을 **명시 Snapshot 엔티티**로 분리(현재 부재). consent/suppression/identity-confidence/verified-identifier 적용본 기록.
8. **Destination Sync Orchestrator** = `AdAdapters` 확장(+consent 조인·**Removal**·**Reconciliation**·upsert 정리). SEG-H1/H2/H5.
9. **Eligibility Gate 표준화** = `isMarketingSendAllowed` 를 **모든 발송경로에 강제**(SEG-C1~C3). 무게이트 경로 제거.
10. **Preview/Diff/Explain·Automation Eligibility Gate·Monitoring/Audit** = 순차 도입.

**단일엔진 원칙**: 위 전부 **기존 자산 확장**이며 신규 병렬 엔진/테이블/DSL 난립 금지(Unified Intelligence Layer 헌법). 3개 "segment" 도메인은 통합이 아니라 **Canonical 명명 분리**(Customer Segment / Decisioning Cohort / Growth ICP Persona).

---

## 4. 무후퇴·영구 규칙 (§84)

신규 Segment Table/Rule Engine/DSL/Membership Store/Audience Builder/Destination Sync 생성 전 필수:
1. 본 인벤토리 + [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md) 조회 → 기존 확장으로 해결가능한지 증명.
2. `crm_segments`·`crm_segment_members`·`isMarketingSendAllowed`·`crm_channel_prefs`·`email_suppression`·`isFrequencyCapped`·`AdAdapters::syncAudience` 는 **정본 — 재구현 금지, 확장만**.
3. Tenant/Workspace/Brand/Source-Account Scope·Version/Rollback/Delete·중복/후퇴 검사·ADR/PM 기록.
4. 동일 목적 Segment/Audience 를 기능별 독립 Canonical 로 중복 생성 금지.

---

## 5. Part 2 입력 (다음 단계)
**EPIC 06-A Part 2 — Canonical Segment Schema, DSL, Rule Engine, Versioning & Dependency Governance**: 본 베이스라인의 §3 권장을 스키마·DSL·버전·의존성 거버넌스로 구체화. 선행 P0=발송 게이트 표준화(SEG-C1~C4, 별도 승인 구현세션).

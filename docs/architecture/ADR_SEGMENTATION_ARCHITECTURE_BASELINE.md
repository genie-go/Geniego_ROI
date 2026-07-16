# ADR — Segmentation, Audience & Cohort Architecture Baseline (EPIC 06-A Part 1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Inventory·Risk·Architecture Baseline 확정. 비파괴 — 코드변경 0). Schema/DSL/Versioning 확장·발송 게이트 표준화는 후속 승인·verify·배포 후.
- **근거**: [`../segmentation/SEGMENTATION_PLATFORM_INVENTORY.md`](../segmentation/SEGMENTATION_PLATFORM_INVENTORY.md) + [`../segmentation/SEGMENT_RISK_REGISTER.md`](../segmentation/SEGMENT_RISK_REGISTER.md) + [`../segmentation/SEGMENT_ARCHITECTURE_BASELINE.md`](../segmentation/SEGMENT_ARCHITECTURE_BASELINE.md). 4개 병렬 감사 에이전트 실코드 조사(모든 주장 file:line, CRITICAL 3건 PM 직접 재증명).

## 결정 (핵심)

1. **기존 자산 확장(중복 신설 금지)**: 실 고객 세그먼트 엔진은 `crm_segments`+`crm_segment_members`(SoT)로 **이미 존재**. Eligibility 정본=`CRM::isMarketingSendAllowed`, Consent=`crm_channel_prefs`, Suppression=`email_suppression`, Frequency=`isFrequencyCapped`, Destination Sync=`AdAdapters`(Meta/Google/TikTok 실동작·해시전용). **이들은 재구현 금지·확장만**.

2. **"segment" 3도메인 명명 분리(통합 아님)**: Customer Segment(`crm_segments`)·Decisioning Cohort(`Decisioning::segments`, 집계·PII없음)·Growth ICP Persona(`admin_growth_segment`, GeniegoROI 자체 B2B·tenant없음)는 **의미가 다르므로 하나로 합치지 않고 Canonical 명칭으로 분리**. LTV 티어 중복(`ltvSegments` vs 세그먼트 ltv룰)만 Semantic Metric SSOT로 단일화.

3. **Definition↔Membership↔Audience 분리 확정**: 현재 Definition/Membership은 물리분리이나 **Version/Snapshot/Evaluation-Time 부재** → 과거 대상 재현·감사 불가. Audience/Audience-Snapshot 은 독립 엔티티로 **부재**(발송루프 즉석필터). Part 2에서 `crm_segments`+`definition_version`·`crm_segment_members`+Snapshot·명시 Audience Snapshot 엔티티 신설.

4. **Consent는 발송/업로드 시점 재평가(빌드 아님)**: 설계상 타당. 그러나 (a) 발송 경로 일부 무게이트/우회(`/sms/send`·`/whatsapp/send`·`sendOne`·`/sms/broadcast` — PM 재증명), (b) **phone이 consent lookup key 아님**(미매핑 fail-open)+인바운드 STOP 부재, (c) **Audience 업로드 시 consent/suppression 재검증·Removal·Reconciliation 전무**. → **CRITICAL/HIGH 블로커**(SEG-C1~C4·H1~H5).

5. **정직(허구 전환 금지)**: 실시간/스트리밍 세그먼트·Materialized 버전·OR/중첩 DSL·Audience Snapshot·Removal·Reconciliation·Model 거버넌스(ID/Version/Confidence/Expiry)는 **미구현→부재로 기록**(있다고 보고 금지). 미구현은 기능후퇴가 아니라 애초 부재(후퇴 0 확인).

6. **권장 아키텍처=Option E(Hybrid, 기존 확장)**: Definition Registry·Canonical DSL 상위호환·Semantic/Profile Resolver 참조·Batch(증분+스냅샷)·Membership Snapshot·Consent(발송+업로드 양시점, phone 확장)·Audience Snapshot·Destination Orchestrator(consent/Removal/Reconcile)·Eligibility Gate 전경로 강제. 신 병렬엔진 난립 금지(Unified Intelligence Layer 헌법).

## 무후퇴·영구 규칙

신규 Segment Table/Rule Engine/DSL/Membership Store/Audience Builder/Destination Sync 생성 전: 본 Inventory + Canonical Entity Registry 조회 → 기존 확장 우선 증명 · `crm_segments`/`crm_segment_members`/`isMarketingSendAllowed`/`crm_channel_prefs`/`email_suppression`/`isFrequencyCapped`/`AdAdapters::syncAudience` 정본 재구현 금지 · Tenant/Workspace/Brand/Source-Account Scope·Version/Rollback/Delete·중복/후퇴·ADR/PM 기록. 동일목적 Segment/Audience 기능별 독립 Canonical 중복 생성 금지.

## 결과

Segmentation/Audience/Cohort **전수 인벤토리·리스크 레지스터·아키텍처 베이스라인 확정**(엔진 5·"segment"도메인 3·operator 6·목적지 실동작 3+unsupported 2·소비자 5·CRITICAL 4·HIGH 5·중복후보 4·기능후퇴 0). **코드변경 0.** 다음 **EPIC 06-A Part 2 — Canonical Segment Schema, DSL, Rule Engine, Versioning & Dependency Governance** 입력 준비 완료. 선행 P0=발송 게이트 표준화(SEG-C1~C4)는 별도 승인 구현세션(verify+배포승인).

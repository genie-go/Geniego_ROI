# ADR — Canonical Audience Eligibility Engine, Identity, Freshness, Purpose & Channel Readiness (EPIC 06-A Part 3-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Eligibility Engine 계약 명세 확정. 비파괴 — 코드변경 0). 실 Engine 구현·기존 게이트 통합·CI 가드는 후속 승인 세션(Golden Dataset+Channel Conformance+Equivalence+verify+배포승인). **외부 채널 실행은 본 단계 범위 밖(§97).**
- **근거**: [`../segmentation/CANONICAL_AUDIENCE_ELIGIBILITY.md`](../segmentation/CANONICAL_AUDIENCE_ELIGIBILITY.md) · [`FRESHNESS_DESTINATION`](../segmentation/CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md) · [`ELIGIBILITY_GOVERNANCE`](../segmentation/CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md) · Part 1(중앙 게이트 isMarketingSendAllowed·무게이트 SEG-C1~C4) · Part 3-1 Audience Builder.

## 결정 (핵심)

1. **기존 게이트 승격(재구현 금지)**: `CRM::isMarketingSendAllowed`(채널/토픽 opt-out+email suppression+quiet-hours+freq cap `CRM.php:1118`)는 **CANONICAL_ELIGIBILITY_ENGINE 정본** — Identity Confidence·Verified Identifier·Freshness·Destination Readiness·Jurisdiction·Data Classification 을 **확장**. 채널별 자체 Eligibility 신설 금지(§3.10) — 단일 Core + 채널 Policy Adapter.

2. **3중 분리(§3.1·3.2·3.3)**: Segment Membership ≠ Eligibility · Eligibility ≠ Consent(Consent Granted 여도 다른 조건 차단 가능) · **Contactability(정책적 연락가능) ≠ Reachability(유효 검증 Identifier+기술 전달가능)**. 현행 미분리 → 결과에 eligible/contactable/reachable 별도 산출.

3. **Unknown ≠ Eligible·Fail-closed(§3.5·73)**: Identity/Consent/Identifier/Freshness/Destination/Jurisdiction/Wrong-target Unknown = 기본 차단. Scope/Resolver/Credential 확인불가 시 실 실행 Fail-closed. **현행 게이트 fail-open(SEG-M1)·phone fail-open(SEG-C4) 정면 교정.**

4. **Identifier 결정론 선택(§25)**: Purpose→Channel→Verification→Validity→Consent→Suppression→Destination→Source Authority→Recency→Quality→Stable Tie-breaker. DB 반환순서 금지. Shared Identifier(가족/회사/재사용 phone) Purpose별 정책.

5. **단계별 Recheck(§3.4·63-67)**: Build-time Eligibility 영구신뢰 금지 → Snapshot Approval·Destination Sync·**Execution-time** 재검증(Current Consent/Suppression/Deletion/Frequency/Kill Switch/Wrong-target). 현행 발송루프 게이트가 Execution-time Recheck 의 원형 — **무게이트 경로(SEG-C1~C4)에 강제 적용이 선행 P0**.

6. **Wrong-target·Test/Demo 차단(§56-58)**: Cross-Tenant/Brand·Wrong Destination Account(286차 platform_growth 하이재킹)·Stale·Merge 미반영·Reused Phone·Wrong Hash·Deleted = Wrong-target Risk HIGH/CRITICAL/UNKNOWN → 차단. Test/Demo Profile→Production Destination 차단(Environment 혼합=Critical).

7. **정직·무후퇴**: Identity Confidence/Freshness/Destination Readiness/Contactability≠Reachability/Reconciliation=현행 부재→목표계약. isMarketingSendAllowed·isFrequencyCapped·email_suppression·crm_channel_prefs 로직 보존(Equivalence). UNEXPLAINED/LEGACY_WRONG_TARGET_RISK→전환차단. 기능후퇴 0. Threshold 는 Golden Dataset+운영증거로 확정(임의 숫자 금지).

## 무후퇴·영구 규칙 (§106)
신규 Eligibility Service/Channel Eligibility/Identifier Selector/Freshness Evaluator/Destination Readiness 생성 전: Eligibility/Purpose/Channel/Identity/Identifier/Freshness/Consent-Suppression/Destination/Jurisdiction Registry·Existing Eligibility·Execution Recheck·Wrong-target·Cache/Reconcile 조회 → 기존 확장 우선 · 중복/후퇴·ADR/PM 기록. **채널별 독립 Canonical Eligibility Engine 중복 생성 금지.**

## 결과
Canonical Audience Eligibility Engine·Identity/Identifier/Contactability/Reachability·Freshness·Destination Readiness·Jurisdiction/Classification·단계별 Recheck·Reconciliation·Override·Lint/Guard·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_AUDIENCE_{ELIGIBILITY,FRESHNESS_DESTINATION,ELIGIBILITY_GOVERNANCE}.md(§98 80여 문서 통합). 다음 **EPIC 06-A Part 3-3 — Consent, Suppression, Purpose Limitation & Privacy Governance** 입력 준비 완료. 선행 P0(구현세션)=발송 게이트 표준화(SEG-C1~C4, Execution-time Recheck)·Audience Removal/Reconciliation(SEG-H2/H5).

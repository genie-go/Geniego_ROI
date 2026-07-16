# ADR — Canonical Suppression Engine, Preference Center, Revocation Propagation & Execution-time Validation (EPIC 06-A Part 3-3-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Suppression·Preference·Revocation·Execution-time 계약 명세 확정. 비파괴 — 코드변경 0). 실 스토어(email_suppression 확장)·phone DNC·Provider Removal·Reconciliation·CI 가드 구현은 후속 승인 세션(Golden Suppression Dataset+Propagation Conformance+Legacy Equivalence+verify+배포승인). **외부 Provider Audience 일괄 재생성·Legal Block 일반 Override 금지.**
- **근거**: [`../segmentation/CANONICAL_SUPPRESSION_SCHEMA.md`](../segmentation/CANONICAL_SUPPRESSION_SCHEMA.md) · [`PREFERENCE_REVOCATION`](../segmentation/CANONICAL_PREFERENCE_REVOCATION.md) · [`SUPPRESSION_GOVERNANCE`](../segmentation/CANONICAL_SUPPRESSION_GOVERNANCE.md) · Part 1(email_suppression·bounceWebhook·isFrequencyCapped·isQuietNow·AdAdapters Removal 부재 SEG-H2·phone DNC 부재 SEG-C4) · Part 3-3-1 Consent.

## 결정 (핵심)

1. **기존 store 승격(재구현 금지)**: `email_suppression`(실 pre-send 필터·bounce/complaint/unsubscribe)=**CANONICAL_SUPPRESSION_STORE 로 확장**(email만→전 채널·Type/Scope/Priority/Evidence/Version). `isFrequencyCapped`=CANONICAL_FREQUENCY_ENGINE · `isQuietNow`=Quiet Hours · `bounceWebhook`=Complaint/Bounce Source · PreferenceCenter=CANONICAL_PREFERENCE_CENTER · `isMarketingSendAllowed`=Execution Recheck. 채널별 자체 Suppression Engine 신설 금지(§3.10).

2. **Consent≠Suppression·유효 Suppression 우선(§3.1·3.3)**: Consent GRANTED 여도 Global/Complaint/Bounce/Legal/Freq/Quiet 차단. Priority: Deletion>Legal>Privacy>Global DNC>Safety>Fraud>Complaint>Hard Bounce>Channel/Brand Unsubscribe>… 낮은 허용이 높은 차단 덮어쓰기 금지.

3. **Boolean→Contextual Record·Complaint≠Bounce≠Unsubscribe(§3.2·3.7)**: Subject/Identifier/Type/Scope/Priority/Source/Evidence/Effective/Expiry/Status. Complaint/Hard Bounce/Soft Bounce/Unsubscribe/Opt-out 분리(Source/복구정책 상이).

4. **Revocation 즉시 전파(§3.4)**: Preference 변경/Withdrawal/Complaint/Deletion 을 **Audience Snapshot(Overlay)/Queue/Journey/CRM/Email/SMS/Push/Ads Destination/Cache/Projection 에 우선 전파**. **현행 Revocation Propagation 부재**(unsubscribe→email_suppression 만·Audience 미제거 SEG-H2) → 신규.

5. **Provider 200≠Removed·Re-add 방지(§3.6·88)**: Removal 상태 Requested/Accepted/Processing/Removed/Failed/Unverifiable/Reconciliation 구분. Removal 후 Scheduled Refresh/Retry/Old Snapshot/Reimport/Backfill/Restore 로 재추가 금지 → Suppression Tombstone/Live Check. **현행 AdAdapters=Add만·Remove/Reconcile 없음**(SEG-H2/H5 구현 대상).

6. **Execution-time Live Validation·Fail-closed(§70-72)**: Build-time 영구신뢰 금지 → Snapshot 승인/예약/Queue 소비/Provider 전송 직전 Current Consent/Suppression/Frequency/Quiet Hours/Kill Switch/Wrong-target 재검증. **선행 P0(SEG-C1~C3 발송게이트 수정)가 이 계약의 원형·SEG-C4 잔여.** 조회 실패 시 Fail-closed.

7. **Merge 시 차단 보존·Delete Block(§3.9·89-91)**: 병합 시 모든 Suppression/Complaint/Bounce/Preference 보존(더 활성 Profile 이 덮어쓰기 금지). 삭제=즉시 Deletion Block+신규 포함/Queue 차단+Destination Removal+Re-ingestion Tombstone. (현행 Dsar push/line/instagram 미도달 SEG-H3 보완.)

8. **정직·무후퇴**: Revocation Propagation/Destination Removal/Reconciliation/phone DNC/Frequency Reservation=현행 부재→목표계약. email_suppression·isFrequencyCapped(4/7d)·isQuietNow·bounceWebhook·List-Unsubscribe 보존(Legacy Equivalence). UNEXPLAINED·LEGACY_WRONG_TARGET_RISK→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§120)
신규 Suppression Store/Unsubscribe/Preference Center/Frequency Cap/Destination Removal 생성 전: Canonical Suppression/Type/Priority·Consent Purpose/Channel·Existing Unsubscribe/Bounce/Complaint Store·Preference Center·Destination Account/Provider·Customer Identity·Audience Snapshot/Eligibility·Queue/Execution Gate 조회 → 기존 확장 우선 · Scope/Version/Expiry·Propagation/Removal/Reconciliation·Execution Recheck·Re-add Prevention 정의 · 중복/후퇴·ADR/PM 기록. **Email/SMS/Push/CRM/광고별 독립 Canonical Suppression Engine 중복 생성 금지.**

## 결과
Canonical Suppression Engine·Type/Scope/Priority·Complaint/Bounce/Opt-out·Legal/Fraud/Safety·Frequency/Quiet Hours/Recent Contact·Preference Center·Revocation Propagation·Snapshot Invalidation/Overlay·Destination Removal·Execution-time Validation·Projection/Reconciliation·Release/Override·Lint/Guard·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_SUPPRESSION_{SCHEMA,GOVERNANCE}+CANONICAL_PREFERENCE_REVOCATION.md(§112 100여 문서 통합). 다음 **EPIC 06-A Part 3-3-3 — Purpose Limitation, Privacy, Retention, Cross-border, Deletion & DSAR** 입력 준비 완료. 선행 P0/P1(구현세션)=SEG-C4(phone DNC/SMS STOP)·SEG-H2(Audience Removal)·SEG-H3(DSAR 채널)·SEG-H5(Reconciliation).

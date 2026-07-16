# ADR — Canonical Consent Engine, Registry, Evidence, Versioning & Projection Foundation (EPIC 06-A Part 3-3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Consent Engine Foundation 계약 명세 확정. 비파괴 — 코드변경 0). 실 스토어(crm_channel_prefs 확장)·Import·Projection·CI 가드 구현은 후속 승인 세션(Golden Consent Dataset+Conformance+Legacy Equivalence+verify+배포승인). **외부 Destination 전체 전파·Suppression 전체는 Part 3-3-2 범위.**
- **근거**: [`../segmentation/CANONICAL_CONSENT_SCHEMA.md`](../segmentation/CANONICAL_CONSENT_SCHEMA.md) · [`EVIDENCE_CAPTURE`](../segmentation/CANONICAL_CONSENT_EVIDENCE_CAPTURE.md) · [`PROJECTION_GOVERNANCE`](../segmentation/CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md) · Part 1(crm_channel_prefs·PreferenceCenter·isMarketingSendAllowed) · EPIC05 ADR(Consent를 person_id·Purpose/Brand 차원 승격).

## 결정 (핵심)

1. **기존 store 승격(재구현 금지)**: `crm_channel_prefs`(opted_in TINYINT·채널/토픽/global-all·opt-out 기본허용 `PreferenceCenter.php:30-134`)는 **CANONICAL_CONSENT_STORE 로 확장 승격**(Purpose/Brand/Jurisdiction/Policy Version/Evidence/Record Version 추가). PreferenceCenter Resolver·`isMarketingSendAllowed` 는 Consent Engine/Eligibility Hook 로 편입. 채널별 자체 Consent Engine 신설 금지(§3.10).

2. **Boolean→Contextual Record(§3.1)**: Consent 를 단일 Boolean 저장 금지 → Subject+Purpose+Channel+Brand+Jurisdiction+Policy Version+Status+Source+Evidence+Effective/Expiry+Withdrawal+Scope+Audit. 현행 opted_in 은 **Evidence 없는 Legacy Boolean → LOW trust·Import 시 자동 GRANTED 금지**(§68).

3. **Unknown≠Granted·목적 확대 금지(§3.2·3.3)**: 값없음/미동기화/Policy불명/Conflict = Granted 아님(기본 차단). 한 Purpose/Channel/Brand 의 GRANTED 를 다른 것으로 자동확장 금지. **현행 opt-out 기본허용(SEG-M1)·채널 동의를 전목적 확대하던 암묵을 Unknown 차단+Purpose 분리로 교정**.

4. **Consent≠Suppression(§3.4)**: Consent(허용/거부 의사+근거) ≠ Suppression(운영/법적/기술 차단). GRANTED 여도 Global DNC/Spam/Bounce/Legal/Fraud/Frequency/Manual 차단 가능. email_suppression=Suppression(Part 3-3-2). phone DNC(SEG-C4)=Suppression 영역.

5. **Merge 시 Consent 보존(§3.5)**: 병합해도 Source/Brand/Channel/Purpose/Policy/Jurisdiction별 Consent·Evidence·Withdrawal History 독립 보존 — 한 Profile GRANTED 가 다른 Profile DENIED/WITHDRAWN 덮어쓰기 금지. **EPIC05 ADR(병합 시 동의확대 방지) 구현**. Unmerge=재귀속+잘못확장 Projection 제거+Destination Removal 표시.

6. **Projection≠Source(§3.9)·보수적 Resolution(§42-43)**: Projection 은 파생(Source Record/Version/Policy Version 연결·Withdrawal 즉시 무효화·Conflict 시 차단). Resolution 은 Legal Block>Latest Withdrawal>Denial>Exact Scope>… 최신 Record 만으로 Withdrawal 무시 금지. UNKNOWN/CONFLICT/RESTRICTED=기본 마케팅 차단.

7. **단계별 Consent Hook·Fail-closed(§57-60·85)**: Build/Approval/Sync/**Execution-time** Consent 재검증(Part 3-2 Recheck·선행 P0 발송게이트와 동일 지점). Subject/Scope/Policy/Evidence/Withdrawal/Conflict 확인불가 시 실 마케팅 Fail-closed.

8. **정직·무후퇴**: Purpose/Brand/Evidence/Policy Version/Projection/Conflict/Temporal=현행 부재→목표계약. crm_channel_prefs 채널/토픽/global-all·isMarketingSendAllowed·quiet-hours 보존(Legacy Equivalence). UNEXPLAINED·고객영향 LEGACY_PRIVACY_DEFECT→전환차단. 기능후퇴 0. Trust Level/Threshold=Golden+운영증거.

## 무후퇴·영구 규칙 (§110)
신규 Consent Store/Purpose/Channel Consent/Evidence Store/Resolver/Projection 생성 전: Canonical Consent/Purpose/Channel/Policy Registry·Existing Consent Store/Resolver·Customer Identity·Audience Eligibility Contract 조회 → 기존 확장 우선 · Evidence/Scope/State Transition/Conflict/Withdrawal/Expiry/Projection/Cache/Merge-Unmerge 정의 · 중복/후퇴·ADR/PM 기록. **CRM/Email/SMS/Push/광고별 독립 Canonical Consent Engine 중복 생성 금지.**

## 결과
Canonical Consent Engine·Subject/Record/Version·Status/State Machine·Purpose/Channel/Scope·Policy/Versioning·Capture/Evidence/Trust·Conflict/Resolution·Temporal·Projection·Audience/Eligibility Hook·Merge/Unmerge·Import/Correction·API/Cache·Fail-closed/Override·Lint/Guard·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_CONSENT_{SCHEMA,EVIDENCE_CAPTURE,PROJECTION_GOVERNANCE}.md(§102 90여 문서 통합). 다음 **EPIC 06-A Part 3-3-2 — Suppression, Preference Center, Revocation Propagation & Execution-time Validation** 입력 준비 완료. 선행 P0(구현세션)=SEG-C4(phone DNC=Suppression)·SEG-H2(Audience Removal=Withdrawal Propagation).

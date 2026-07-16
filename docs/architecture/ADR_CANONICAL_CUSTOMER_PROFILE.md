# ADR — Canonical Customer Profile Schema & Identity Governance (EPIC 05-B)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Schema·Identity Graph·Merge/Unmerge·Consent Governance 확정. 비파괴 — 코드변경 0). 실 Store 확장·Migration·crosswalk는 후속 승인·회귀 후.
- **근거**: [`../customer-profile/CANONICAL_CUSTOMER_PROFILE_SCHEMA.md`](../customer-profile/CANONICAL_CUSTOMER_PROFILE_SCHEMA.md) + 05-A + EPIC 01~04.

## 결정 (핵심)
1. **crm_customers 확장(중복 CDP 신설 금지)**: CUSTOMER_PROFILE=crm_customers·PERSON=identity_id 승격·IDENTITY_LINK=merge_link+attribution_link(evidence/version 확장)·CONSENT=crm_channel_prefs(identity 차원 승격)·Identity Graph=KG graph_node/edge 확장. app_user(Platform User)=별개 Entity.
2. **Canonical ID(UUID)≠Source ID**·외부 채널/CRM/Commerce ID=Identifier(Source Account Scope)·Profile Version(과거 재현).
3. **Identity Link≠Merge**(§3.5): 약한 Signal(합성 buyer_email 등)=Candidate/Manual Review·자동 Merge 금지. 모든 Merge=Case+Evidence+Version+Unmerge+Rollback(§3.6).
4. **★05-A CRITICAL 해소**: Consent를 **person_id(identity) 차원 승격**+Purpose/Legal-basis/Brand 분리(병합 시 동의확대 방지). Suppression>Consent 우선.
5. **★05-A HIGH 해소**: 합성 buyer_email=자동 Merge 금지(Manual)·Merge evidence/version 컬럼 신설·**AI PII Masking 기본**(AI_ALLOWED_WITH_MASKING)·정규화 통일(email lower·phone E.164·해시 통일).
6. **삭제=identity_id 기반**(05-A DSAR 병합형제 누락 해소)·삭제 Profile 자동 재병합 금지(Tombstone/Restore Suppression).
7. **Golden Record=Attribute별 Resolver**·Raw/Derived/**Predicted** 분리·Runtime Guard/Static Lint(Cross-Tenant Link·이메일 단독 자동 Merge·Consent 우회·Raw PII AI 차단).

## 무후퇴·영구 규칙(§67)
새 Customer Entity/Identifier/Match Rule/Profile Store/Merge Rule/Consent Projection/Context Builder 전: Customer Entity/Store/Identifier/Identity Link/Match Rule Registry·Merge/Unmerge·Golden Record·Consent/Suppression·Tenant/Workspace/Brand/Source Account Scope·삭제/정정·AI/Automation 영향·중복/후퇴 → ADR/PM. Canonical Schema 우회 비공식 Profile/Identity Map 운영 생성 금지.

## 결과
Canonical Customer Profile Schema·Identity Governance 확정(Entity 19·Identifier 21·Migration 3·Risk 해소 설계). 다음 **EPIC 05-C — Customer Identity Resolution Engine, Profile Assembly, Query Layer & Consumer Enforcement** 입력 준비 완료. 코드변경 0.

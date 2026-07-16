# ADR — Customer Identity Resolution Engine & 360 Query Layer (EPIC 05-C)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (실행 계층 설계·Engine/Query/Consumer Enforcement. 비파괴 — 코드변경 0). 실 구현·Consumer 전환은 후속 승인·Shadow·회귀 후.
- **근거**: [`../customer-profile/CUSTOMER_360_QUERY_ARCHITECTURE.md`](../customer-profile/CUSTOMER_360_QUERY_ARCHITECTURE.md) + 05-A/B + 실코드.

## 결정 (핵심)
1. **부분 실동작 정직**: Identity Resolution(Union-Find CRM:600)·확률병합·Unmerge(CRM:913)·발송게이트(isMarketingSendAllowed)=VALIDATED_LEGACY 확장. **Query Layer/Consumer Enforcement/단일 Normalizer/PII Masking/Wrong-target/consent 실행시점 재평가=설계 PLANNED**. Production 0(05-B Critical 미해소).
2. **Candidate≠Link≠Merge 분리**(§3.2)·약한 Signal(합성 buyer_email 등) 자동 Merge 금지→Manual Review. 모든 Merge=Dry Run+Case+Evidence+Unmerge+Rollback.
3. **Customer 360 Query Layer 단일 진입점**(16계층): UI/CRM/Segment/AI/Automation의 DB/Graph/Source 직접 조합 금지·목적별 Masking Level(Aggregate~Sensitive Restricted).
4. **Consent/Suppression 실행 시점 재평가**(§3.5): 과거 Eligibility 영구 신뢰 금지·Suppression>Consent. Consent identity 차원(05-B).
5. **Wrong-target Prevention**: 실행 시점 Verified Destination Identifier·Consent·Merge 상태·Identity Version·Merge/Unmerge 직후 Cooldown.
6. **Derived=Semantic/Model 참조**(프론트 직접 계산 금지·03-C 정합)·Identity Graph=KG 확장(비공식 Link 금지).
7. **무후퇴**: 기존 Customer API/UI/Service 즉시삭제 금지(Adapter/Shadow/Read Compare/Canary 점진)·전체 일괄 자동 Merge·소급 귀속 금지.

## 무후퇴·영구 규칙(§77)
새 Customer Source/Identifier/Match Rule/Merge Rule/Profile Query/Consumer 전: Customer Entity/Identifier/Match Rule Registry·Source Account Scope·기존 Candidate/Merge Engine·Consent/Suppression Resolver·360 Consumer Contract·삭제/정정 전파·Wrong-target Risk·Golden/보안/회귀·중복/후퇴 → ADR/PM. **Canonical Engine/Query Layer 우회 자체 Profile 병합/조합 금지**.

## 결과
Customer Identity Execution·360 Query Layer 설계 확정(Engine 확장·Query Layer 신설·Consumer Enforcement·Wrong-target). Production 0(구현 전). 다음 **EPIC 05-D — Final Validation, Production Certification, Governance & Recurrence Prevention** 입력 준비 완료. 코드변경 0.

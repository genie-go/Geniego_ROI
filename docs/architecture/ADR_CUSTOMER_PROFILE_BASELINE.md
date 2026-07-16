# ADR — Enterprise Customer & Unified Profile Baseline (EPIC 05-A)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Inventory·Identity·Consent·격리·Architecture Baseline. 비파괴 — 코드변경 0). 실 신설(crosswalk·consent 승격·정규화·RBAC)은 후속 승인·회귀 후.
- **근거**: [`../customer-profile/CUSTOMER_PROFILE_ARCHITECTURE_BASELINE.md`](../customer-profile/CUSTOMER_PROFILE_ARCHITECTURE_BASELINE.md) + 288차 고객/Identity/Consent 전수조사 + EPIC 00~04.

## 결정 (핵심)
1. **중복 CDP 신설 금지**: crm_customers(Profile Primary)+Union-Find/확률병합(merge_link)+Unmerge+isMarketingSendAllowed+PreferenceCenter+DSAR 캐스케이드 **재사용**. Architecture=A(crm_customers 확장)+D(Graph crosswalk) Hybrid.
2. **플랫폼 User(app_user)≠Marketing Customer(crm_customers)** 분리 확정(자동병합 없음·양호). Customer=crm_customers SSOT(EPIC01-B 일치)·Buyer=alias.
3. **양호 확인**: Cross-Tenant 병합 차단·Unmerge 지원·Mock/Demo 격리·자동(phone/kakao) vs 승인(확률) 명확 분리.
4. **신설 대상 5**: ①cross-domain identity crosswalk(crm identity_id↔attribution hash↔pixel session↔app_user)②Consent identity 차원 승격+Purpose/Legal-basis/Brand 분리③Merge evidence(reasons)/version 컬럼④식별자 정규화 통일(email lower·phone E.164·해시 3종 통일)⑤Column-level PII RBAC/마스킹.
5. **동의는 Identity Link와 별도**(§3.4): 병합해도 Channel/Purpose/Brand/Region/Policy Version 유지. 가장 관대한 동의로 수렴 금지.
6. **모든 병합 Unmerge/근거/Version/Audit 가능**(§3.5). Profile≠SoT(주문/결제/원본동의 유일저장소 금지).

## Risk (§46)
CRITICAL 1(병합 시 동의확대: 게이트 customer_id vs merge identity_id)·HIGH 3(합성 buyer_email 오병합 ChannelSync:4676·Merge evidence/version 소실·PII 무마스킹 CRM:212/ClaudeAI:703)·MEDIUM 3(DSAR 병합형제 누락·정규화 3종 불일치·crosswalk 부재). Cross-Tenant/자동병합 Risk 0.

## 재발 이력 편입
288차 확정 고객 결함=①합성 buyer_email 오병합(Root=email 없는 주문 name@channel.noemail 합성키·동명이인 미구분)②정규화 3종 불일치(Root=저장 시 미정규화·소비처별 재정규화)③PII 무마스킹(Root=column-level RBAC 부재·requirePro만)→docs/registry/RepeatedDefectHistory 편입.

## 무후퇴·영구 규칙(§68)
새 Customer Table/Profile Store/Identity Resolver/Merge Rule/Search Index/Context Builder 전: Customer Entity/Store/Identifier Registry·Source Account Scope·기존 Resolver·Consent/Suppression·Merge/Unmerge·Tenant/Workspace/Brand Scope·삭제/정정·Consumer/AI/Automation 영향·중복/후퇴 검사 → ADR/PM. 동일 Customer 개념 기능별 중복 Profile 금지.

## 결과
Customer & Unified Profile Baseline 확정(Store 9·Identifier 8·Resolver 2·Risk CRITICAL 1/HIGH 3·신설 5). 다음 **EPIC 05-B — Canonical Customer Profile Schema, Identity Graph, Merge·Unmerge & Consent Governance** 입력 준비 완료. 코드변경 0.

# EPIC 05-A — Enterprise Customer & Unified Profile Inventory, Identity Resolution, Consent & Data Isolation Baseline (정식 마스터)

> **근거**: EPIC 00~04(Metadata·CE/REL·KG·Semantic·AI Memory) + 288차 **고객/Identity/Consent 전수조사**(실코드). **비파괴**: Inventory·Scope·Consent·격리·Architecture Baseline·Risk만. 코드변경 0. 대규모 Merge·Customer ID 교체·Store 삭제·미검증 Identity Link 활성·소급 연결·대량 Migration 없음(§57/§59).
> **§60 통합**: ~48개 파편 대신 본 마스터가 Entity/Store/Service/API/UI Inventory·Identifier Registry·Normalization·Source/Channel Scope·Anonymous·Identity Resolution/Merge/Unmerge/Golden Record·Consent/Suppression·Classification·Attribute/Event·Consumer·Cross-Tenant/Mock 오염·Lineage/Freshness/Quality·Risk·Architecture Option/Baseline을 통합. ADR=[`../architecture/ADR_CUSTOMER_PROFILE_BASELINE.md`](../architecture/ADR_CUSTOMER_PROFILE_BASELINE.md). 재발이력=기존 `../registry/RepeatedDefectHistory.md`.
> **교차검증**: 기존 [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md)(Customer=crm_customers SSOT·Buyer=alias)·`../registry/DatabaseRegistry.md`.

---

## 0. 요약 판정
**이미 상당한 CDP 자산 존재 → 중복 CDP 신설 금지 타당.** crm_customers(canonical)+Union-Find identity resolution+승인 확률병합(crm_identity_merge_link)+Unmerge+PreferenceCenter 동의+DSAR 전테이블 캐스케이드 배선됨. 재사용 원칙. 신설=동의 Purpose/Brand 차원·Merge Evidence/Version·cross-domain crosswalk·정규화 통일·PII RBAC.

## 1. Customer Store Matrix (§61)

| Store | 위치 | Scope | PII | Canonical Role | Status |
|---|---|---|---|---|---|
| **crm_customers** | CRM:48·UNIQUE(tenant,email)·identity_id CRM:109 | tenant(workspace/brand 없음) | email 평문·name·phone 원문·kakao_id | **CANONICAL_PROFILE_PRIMARY** | VALIDATED_LEGACY |
| crm_identity_merge_link | CRM:708(a_id,b_id,score,actor) | tenant | — | **CANONICAL_IDENTITY_STORE** | MIGRATION_REQUIRED(evidence/version 컬럼) |
| crm_activities/segments/segment_members | CRM:57~75 | tenant | customer_id 참조 | CANONICAL_SOURCE | VALIDATED_LEGACY |
| crm_channel_prefs/customer_prefs | PreferenceCenter:64/79 | tenant | email | CANONICAL(Consent) | MIGRATION_REQUIRED(identity 차원) |
| channel_orders(buyer_email) | 주문 원장·DSAR 고객키 Dsar:470 | tenant | buyer_email/name/addr | CANONICAL_SOURCE | VALIDATED_LEGACY(합성키 위험) |
| gdpr_consents | GdprConsent:28(user_id/session·tenant 없음) | app_user/session | 쿠키동의 | KEEP_SEPARATE(웹방문자) | — |
| app_user | Db:1099(acct_ tenant) | tenant | 로그인 유저 | **KEEP_SEPARATE(플랫폼 User≠Customer)** | — |
| pixel_events/pixel_sessions | PixelTracking:76(hash/anonymous) | tenant | email_hash/phone_hash | CANONICAL_SOURCE(익명) | VALIDATED_LEGACY |
| attribution_identity_link | Attribution:133(identity_hash↔session) | tenant | 해시 | CANONICAL_SOURCE(cross-device) | VALIDATED_LEGACY |

**★app_user(플랫폼 User) vs crm_customers(Marketing Customer) 코드 명확 분리**(Dsar:39 명시·email 조인 없음·자동병합 경로 없음) → §3.1 위험 낮음.

## 2. Entity / 상태 분류 (§4/§5)
- **Entity**: Customer(crm_customers)=SSOT·Buyer(channel_orders.buyer=alias)·Lead(AdminGrowth platform_growth 미러)·Anonymous Visitor(pixel_sessions)·CRM Contact=Customer·Subscriber(구독=별개)·**Platform User(app_user)=별개 Entity**. Household/Company/Account 모델 부재(B2B 미구현).
- **상태**: crm_customers.grade/lifecycle·churn·suppressed·deleted(DSAR)·anonymized(법정보존). FRAUD/BLOCKED 별도 없음.

## 3. Identifier Registry (§6/§62) & Normalization (§8)

| Identifier | 위치 | 정규화 | Scope | 오병합 위험 |
|---|---|---|---|---|
| crm email | CRM:184 | ★**저장 시 정규화 없음**(원문 대소문자)·조회 시 LOWER Dsar:518 | tenant·UNIQUE | 낮음 |
| crm phone | CRM:189 | ★**미정규화**(하이픈 원문)·조회 normalizePhone 숫자만 CRM:559 | tenant | 중 |
| kakao_id | CRM:560 | strtolower(trim) | tenant | — |
| pixel email_hash/phone_hash | PixelTracking:216 | sha256(lower/digits) | tenant | — |
| attribution identity_hash | Attribution:115 | 'e'+substr(sha256,0,32)·'p'+... | tenant | — |
| **channel buyer_email(합성)** | ChannelSync:4676 | email 없으면 `name@channel.noemail` | tenant | ★**동명이인 오병합 실재** |
| review contact_hash | Reviews:522 | sha256(email\|phone) | tenant | — |

★**정규화 3종 상이**(pixel sha256 full / attribution 32자 절단+e/p / review email\|phone)=조용한 미삭제·crosswalk 실패 원인. **정규화 통일 신설 핵심.**

## 4. Identity Resolution Matrix (§17/§63) & Merge/Unmerge (§21/§22)
- **결정적 Union-Find**: resolveIdentitiesForTenant CRM:600(phone/kakao 정확일치·canonical identity_id='idt_'+sha1(tenant:root))·lazy 훅 CRM:566. email은 이미 UNIQUE라 병합키 아님. **자동**.
- **확률적 human-in-the-loop**: identityCandidates(read-only) CRM:772·scoreIdentityPair CRM:750(email local 0.7/phone suffix 0.4/name)·**자동병합 절대금지 CRM:699**·승인병합 mergeIdentities CRM:848. **승인 전용**.
- **영속**: crm_identity_merge_link(score,actor·재해석 시 union 시드 CRM:621).
- **Unmerge 지원**: identityUnmerge CRM:913(링크삭제+solo 'idts_' 분리)·단 phone/kakao 공유 시 재병합 CRM:926.
- **★Cross-Tenant 병합 차단**(mergeIdentities WHERE tenant_id CRM:851·resolve/candidates 전부 tenant 스코프) → 구조적 불가.
- **★Merge Evidence/Version 부족**: score/actor만 저장·**reasons(evidence)·version 미저장**(감사·설명 부족·신설 대상).

## 5. Consent / Suppression (§26~29)
- **발송 게이트 단일정본**: isMarketingSendAllowed CRM:1118(채널 opt-out→토픽 opt-out→email suppression→quiet-hours→STO→빈도캡·fail-open).
- **채널 동의**: crm_channel_prefs(email/sms/kakao/whatsapp/push+all) PreferenceCenter:30 opt-out.
- **토픽(Purpose 유사)**: TOPICS(promo/newsletter/product/event) channel='topic:{key}' PreferenceCenter:35.
- **쿠키 동의(별개)**: gdpr_consents(necessary/analytics/marketing/personalization·user_id/session·tenant 없음)=웹방문자용·CRM 고객 무관.
- ★**Channel 분리 O·Brand/법적 Purpose(legal basis) 분리 X**(topic은 콘텐츠 카테고리·consent purpose 아님).
- ★**병합 시 동의 확대 위험 실재**: 동의 키=(customer_id/email) PreferenceCenter:120이나 merge는 identity_id만 통합(crm_customers 행 미병합)·게이트가 customer_id 단위→병합 identity의 한 행 opt-in이 다른 행 발송을 막지 못할 수 있음(가장 관대한 동의로 수렴)→**consent를 identity 차원 승격 필요**.

## 6. Data Classification / Attribute / Event (§30~34)
- **Classification**: crm_customers=PERSONAL/SENSITIVE(email/phone/kakao)·Revenue=FINANCIAL·pixel=BEHAVIORAL/DEVICE·consent=CONSENT_RECORD. ★**Column-level PII RBAC 없음**(requirePro 게이트만·getCustomer/CustomerAI/ClaudeAI raw PII·마스킹 identityCandidates만 CRM:840)→**신설**.
- **Attribute**: Raw(email/name/phone)·Derived(ltv/rfm/grade CRM:288)·**Predicted(predicted_clv/churn BG/NBD CRM:388)** 구분. Derived/Predicted에 Metric/Model Version·Confidence·Freshness 연결 필요(부분).
- **Event**: pixel(view/cart/purchase)·crm_activities(purchase/refund)·email/sms/kakao sends·conversion. Event Identity Scope=tenant+anonymous_id/customer_id/session·idempotency.

## 7. Consumer Matrix (§35/§64) & 사용제한 (§47~50)
- **Consumer**: CustomerAI(CLV/RFM CustomerAI:114)·ClaudeAI AI세그(:703 **raw email 프롬프트 투입**)·CRM(RFM/cohort/affinity/segment)·JourneyBuilder·Email/Sms/Kakao/WhatsApp/WebPush/Omnichannel(발송)·AdAdapters(오디언스)·AdminGrowth·PixelTracking syncToCRM·Dsar·Report/Export.
- ★**PII 접근 권한 분리 없음**(대부분 requirePro만·column 마스킹 부재).
- **사용제한 원칙**: POSSIBLE_MATCH/CONFLICT/MANUAL_REVIEW/STALE/DELETION_PENDING/CONSENT_UNKNOWN Identity Link=고위험 자동화 금지. AI Context에 전체 PII Profile 무분별 전달 금지(최소·Masking). Automation=Verified Identity+Consent+Suppression+Fresh+중복제거+Frequency+Preview+Approval+Kill Switch.

## 8. 삭제/정정 (§51/§52) — DSAR
- **DSAR 전 캐스케이드 정본**: Dsar::eraseSubject Dsar:587(FK 없음·앱단 캐스케이드). customer_id 삭제(crm_activities/segment_members/sends/omni/journey/prefs)·merge_link 사각지대 처리(a/b_id Dsar:608)·해시(pixel/attribution/device Dsar:674)·법정보존 익명화(orders/claims/shipment/live_orders Dsar:750)·crm_customers 맨마지막 Dsar:821.
- ★**DSAR 병합 형제 누락 잠재**: customerIds=email/phone 매칭 Dsar:512·**identity_id 미기반**→다른 식별자로만 묶인 형제 행 누락 가능.
- 정정=Source of Truth·재해석·Merge 영향·Segment 재계산 필요(부분).

## 9. Identity Risk Register (§46)

| 위험 | 판정 | 근거 |
|---|---|---|
| Cross-Tenant 병합 | **차단됨(양호)** | CRM:851 tenant 스코프 |
| app_user↔customer 자동병합 | **없음(양호)** | 별개 테이블 Dsar:39 |
| Unmerge 불가 | **지원됨(양호)** | CRM:913(phone/kakao 재병합 주의) |
| Mock/Demo 오염 | **낮음** | tenant 격리·platform_growth 예약 AdminGrowth:353 |
| **합성 buyer_email 오병합** | **HIGH(실재)** | ChannelSync:4676 동명이인 |
| **병합 시 동의 확대** | **CRITICAL(실재)** | 게이트 customer_id 단위 vs merge identity_id PreferenceCenter:120·CRM:883 |
| **Merge Evidence/Version 소실** | **HIGH** | score/actor만 CRM:708 |
| **PII 무마스킹 노출** | **HIGH** | getCustomer/CustomerAI/ClaudeAI:703 raw PII·RBAC 없음 |
| **DSAR 병합 형제 누락** | **MEDIUM(잠재)** | Dsar:512 email/phone 매칭·identity_id 미기반 |
| **정규화 3종 불일치** | **MEDIUM** | Dsar:23·pixel/attribution/review 상이 |
| cross-domain crosswalk 부재 | **MEDIUM** | crm identity_id↔attribution hash↔pixel session 링크 약함 |

**Cross-Tenant Risk 0·자동병합 Risk 0·Mock 오염 낮음 · CRITICAL 1(동의확대)·HIGH 3(buyer_email·evidence·PII 마스킹).**

## 10. 중복 구현 (§54) — Identity 파편화
4개 식별 도메인 병렬·링크 약함: ①crm_customers.identity_id(phone/kakao union)②app_user(플랫폼)③pixel_events(hash/session 익명)④attribution_identity_link(hash cross-device). **canonical 통합 crosswalk 부재**=Customer 360 핵심 갭.

## 11. Architecture Options & Baseline (§55/§56)
- **옵션 비교**: A(crm_customers 확장)·B(전용 Profile Store)·C(Event-Sourced)·D(Graph-assisted, KG 확장)·E(Hybrid CDP). **권고=A+D Hybrid**(crm_customers=Profile Primary 유지·identity crosswalk를 신 테이블 or KG graph_edge로·정규화 통일 레이어·consent identity 승격). Dedicated Store 신설 금지(중복).
- **논리 계층(§56)**: Source Adapter→Identity Event Ingestion→Scope Resolver→Consent Resolver→**Identifier Normalizer(통일)**→Candidate→Match Engine(기존 Union-Find/확률 재사용)→Conflict→**Identity Link Store(evidence/version 확장)**→Canonical Profile(crm_customers)→Attribute Resolver→Temporal→Consent/Suppression Projection(identity 차원)→Query Service→360 UI/API→Segment/AI/Automation Adapter→Merge/Unmerge Orchestrator(재사용)→Audit/Lineage→Reconciliation→Governance.

## 12. 재사용 vs 신설
- **재사용(신설 금지)**: crm_customers+identity_id·Union-Find+확률병합+merge_link·Unmerge·isMarketingSendAllowed·PreferenceCenter·DSAR 캐스케이드.
- **신설**: ①cross-domain identity crosswalk(crm↔attribution↔pixel↔app_user)②Consent identity 차원 승격+Purpose/Legal-basis/Brand 분리③Merge evidence(reasons)/version 컬럼④식별자 정규화 통일(email lower·phone E.164)⑤Column-level PII RBAC/마스킹.

## 13. §66 완료 보고 수치
Customer Entity 조사 ~10 · Store ~9(crm_customers=Primary) · Service ~15(CRM/CustomerAI/발송/Dsar 등) · API 다수 · Identifier Type 8(email/phone/kakao/hash 3종/buyer합성/anonymous) · Source 다수(commerce/pixel/attribution/CRM) · Anonymous 경로 2(pixel/attribution) · Identity Resolver 2(Union-Find 자동·확률 승인) · Merge 경로 2 · **Unmerge 지원 O** · Consent Type=채널5+토픽4(Purpose/Brand 분리 없음) · Suppression=isMarketingSendAllowed 6단 · Consumer ~18 · **Cross-Tenant Risk 0·자동병합 Risk 0·Mock 오염 낮음** · Duplicate Store 후보=Identity 4파편 · **Identity CRITICAL 1(동의확대)·HIGH 3(buyer_email 오병합·evidence 소실·PII 무마스킹)·MEDIUM 3(DSAR 형제·정규화·crosswalk)** · 문서=본 마스터+ADR+PM · 남은리스크=동의 identity 승격·정규화 통일·PII RBAC·crosswalk·구현 시 처리 · **EPIC05-B(Canonical Customer Profile Schema·Identity Graph·Merge/Unmerge·Consent Governance) 준비 완료**. 코드변경 0.

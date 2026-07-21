# MEA Part 025 — Enterprise Customer & Customer 360 Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+024(OMS)+Data Platform(001~012)+ROI Platform(013~020)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**고객 마스터/360/세그먼트/저니/동의는 이미 실재**(GT①·`CRM`·`CustomerAI`·`JourneyBuilder`·`GdprConsent`)·본 Part는 형식 Customer 360 Engine/Identity Manager 계층만 추가(고객 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
고객 전 정보 통합 관리·구매/행동/선호/서비스 이력/ROI 기여도를 통합 프로파일(Customer 360)로 제공. OMS/PIM/CRM/Marketing/AI/ROI/Logistics 연계 Enterprise Customer Platform.

## §2 구현 범위
Customer Master Management · Customer 360 Profile · Identity · Segmentation · Journey · Preference Management · Analytics · Governance · Intelligence · AI Customer Intelligence.

## §3 구현 목표 (10)
Customer Master Repository · Customer 360 Engine · Customer Identity Manager · Customer Segmentation Engine · Customer Journey Manager · Customer Analytics Service · Customer Dashboard · Customer Audit Service · Customer Governance Manager · AI Customer Advisor.

## §4 아키텍처 원칙 (10)
Customer First · Single Customer View · Privacy by Design · Consent Driven · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Multi-Tenant · Audit by Default.

## §5 Canonical Entity (15)
CUSTOMER · CUSTOMER_PROFILE · CUSTOMER_360 · CUSTOMER_IDENTITY · CUSTOMER_SEGMENT · CUSTOMER_PREFERENCE · CUSTOMER_CONTACT · CUSTOMER_ADDRESS · CUSTOMER_JOURNEY · CUSTOMER_INTERACTION · CUSTOMER_CONSENT · CUSTOMER_SCORE · CUSTOMER_STATUS · CUSTOMER_AUDIT · CUSTOMER_POLICY. → 상세 = `MEA_PART025_CANONICAL_ENTITIES.md`.

## §6 Customer Domain (10)
Individual/Business/Member/Guest/VIP/Marketplace/Global/Subscription/Partner/Enterprise Customer. Customer Master 기준. → ★현행=`CRM`(crm_customers·grade)·Member=`UserAuth`·Subscription=`Paddle`·Partner=`PartnerPortal`·VIP=`CRM`(grade/RFM). 형식 Customer Master 통합=부분.

## §7 Customer Lifecycle (10)
Registration→Verification→Activation→Engagement→Purchase→Loyalty→Dormant→Reactivation→Withdrawal→Archive. 상태 변경 감사. → ★현행=Registration/Verification=`UserAuth`(OTP 273차)·Purchase=`OrderHub`·Loyalty=`CRM`(grade/RFM)·Dormant/Reactivation=`CRM`(cutoff·이탈)·Withdrawal=`Dsar`/`GdprConsent`. 형식 통합 Lifecycle Manager=부분.

## §8 Customer 360 Profile (10)
Basic/Identity/Contact/Purchase·Order·Payment·Service History/Marketing Response/Loyalty Activity/ROI Contribution. 실시간 최신. → ★★현행=`CRM`(crm_customers·crm_activity·ltv·rfm·255차 omnichannel identity 360)·Order=`OrderHub`·Payment=`Payment`·ROI Contribution=`CRM` LTV(263차 취소/반품 역분개)·Marketing=`Attribution`. ★형식 통합 Customer 360 Engine(실시간 조립)=부분.

## §9 Customer Segmentation (8)
Demographic/Geographic/Behavioral/Purchase/Value/Loyalty/AI Dynamic/Custom Segment. 실시간 재계산. → ★현행=`CRM`(crm_segments·crm_segment_members·RFM·Value/Loyalty)·AI Dynamic=`CustomerAI`/`Decisioning`(no-PII aggregate)·EPIC 06-A Segmentation(289차·crm_segments=SoT·version/snapshot 부재). 형식 Segmentation Engine=부분.

## §10 Customer Journey (10)
Awareness→Visit→Interest→Consideration→Purchase→Delivery→Support→Repurchase→Loyalty→Advocacy. Event 기반. → ★현행=`JourneyBuilder`(저니 캔버스)·Attribution=`Attribution`(터치포인트)·Purchase=`OrderHub`. ★확률 아이덴티티(282차). 형식 통합 Journey Manager(Event 기반 전 단계)=부분.

## §11 Customer Governance (8)
Identity Verification · Duplicate Detection · Consent Management · Preference · Data Retention · Data Quality · Privacy Compliance · Customer Merge Policy. → ★현행=Consent=`GdprConsent`·Privacy=`Compliance`/`Dsar`·Identity=`UserAuth`·Data Quality=`DataPlatform`(DataTrust). ★Duplicate Detection/Merge Policy(형식)=부분.

## §12 Data Security
Tenant Isolation · Customer Data Encryption · PII Masking · RBAC · Consent Enforcement · Audit Logging. → ★Part 021 상속: Tenant=`Db.php`·Encryption=`Crypto`·★No-PII 집계(v418.1·aggregate cohort)·RBAC=`index.php`·Consent=`GdprConsent`·Audit=`SecurityAudit`.

## §13 Runtime 규칙
Identity 검증 · Consent 확인 · Profile 갱신 · Segment 계산 · Journey 기록 · Customer 360 갱신 · Audit. → ★현행=Identity=`UserAuth`·Consent=`GdprConsent`·Profile/Segment=`CRM`·Journey=`JourneyBuilder`·Audit=`SecurityAudit`.

## §14 API 표준 (8)
Register/Update Customer · Query Customer 360 · Update Preference · Manage Consent · Query Journey · Query Segment · Get Dashboard. → ★현행=`CRM` API(고객/세그먼트·360)·`GdprConsent` API(동의)·`JourneyBuilder` API 실재. Part 001 API 표준(`/api` 접두) 상속.

## §15 Event 표준 (8)
CustomerRegistered/Verified/Updated · CustomerSegmentChanged · CustomerJourneyUpdated · CustomerConsentUpdated · CustomerProfileMerged · CustomerAudited. → ★현행=`CRM`(segment)·`GdprConsent`(consent) seed(동기·event-driven 부재). Data Platform §15 정합.

## §16 AI Integration
고객 세분화 추천 · LTV 예측 · 이탈 가능성 · 재구매 가능성 · 개인화 추천 · Next Best Action · 감성 분석 · Explainable Customer Insight. **AI는 고객 정보 자동 변경/동의 대신 수행 불가.** → ★현행=LTV/이탈/재구매=`CustomerAI`(churn/purchase_prob·BG-NBD 279차)·개인화/NBA=`AutoRecommend`·세분화=`Decisioning`·Explainability=헌법 V4·동의 대신 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Customer 조회 ≤200ms · 360 ≤500ms · Segment 계산 ≤2초 · Journey ≤300ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 `CRM` seed.)

## §18 Completion Criteria
Customer Master Repository·Customer 360·Identity·Segmentation·Journey·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(고객 마스터/360/세그먼트/저니/동의 실재·형식 Customer 360 Engine·Identity Manager·Merge Policy=미완). 코드 0.

## 판정
**PARTIAL-strong(★고객 마스터=`CRM`(crm_customers·grade·ltv·RFM)·Customer 360=`CRM`(255차 omnichannel identity 360·crm_activity·LTV 263차 역분개)·세그먼트=`CRM`(crm_segments/members·SoT 289차)+`CustomerAI`/`Decisioning`(no-PII)·저니=`JourneyBuilder`·동의=`GdprConsent`·Privacy=`Compliance`/`Dsar`·확률 아이덴티티(282차)·AI=`CustomerAI`(LTV/churn·BG-NBD)) / ABSENT-formal(형식 Customer 360 Engine(실시간 조립)·Customer Identity Manager(deterministic+probabilistic resolution·Merge Policy)·형식 Customer Master Repository(단일 SSOT)·Segmentation Engine version/snapshot·Journey Manager(Event 기반 전 단계)·Event 표준).** ★핵심=고객 마스터·360·세그먼트·저니·동의는 **실재**(CRM 강함·LTV 정본·GDPR 동의·No-PII 집계)이나 형식 통합 Customer 360 Engine·Identity Manager(Merge)는 부재(고객=handler별·Part 021 정합·EPIC 06-A crm_segments SoT version 부재 정합). Part 021/024/Data Platform 상속(재정의 금지)·★중복 고객/세그먼트/LTV 도메인 절대 금지(값 분산=회귀·LTV 역분개 정본 재구현 금지)·★No-PII 원칙 준수(v418.1)·마케팅 AI KEEP_SEPARATE·★AI 고객 정보 자동 변경/동의 대신 수행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 026 — Enterprise Promotion, Coupon & Campaign Management Architecture(본 Customer 360 상속·확장).

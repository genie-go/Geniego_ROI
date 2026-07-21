# ADR — MEA Part 025 Enterprise Customer & Customer 360 Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part025 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 025는 Customer & Customer 360(고객 통합 프로파일). ★코드베이스에는 **고객 마스터/360/세그먼트/저니/동의가 이미 실재**: `CRM.php`(crm_customers·grade·ltv·rfm_r/f/m·crm_activity·crm_segments·crm_segment_members·255차 omnichannel identity 360·263차 LTV 취소/반품 역분개·GT①)·`CustomerAI`(churn/CLV/purchase_prob·BG-NBD 279차)·`Decisioning`(segment·no-PII aggregate)·`JourneyBuilder`(저니 캔버스)·`GdprConsent`(동의)·`Dsar`(DSAR)·`Compliance`·`Attribution`(확률 아이덴티티 282차). ★No-PII 집계 원칙(v418.1·aggregate cohort). ★EPIC 06-A(289차)=crm_segments+members=SoT·version/snapshot 부재. 본 Part는 Part 021/024 상속(재정의 금지).

## 결정
- **D-1 (Part 021/024/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·OMS(Part 024)·Metadata(Part 004)를 준수·인용. 고객 도메인=`CRM`/`CustomerAI`/`JourneyBuilder`. 중복 정의 금지.
- **D-2 (고객 마스터/360 = CRM 승격·★중복 고객/LTV 도메인 절대 금지):** 고객 = `CRM`(crm_customers·grade·RFM·crm_activity)·360=255차 omnichannel identity·ROI Contribution=LTV. ★LTV 취소/반품 역분개(263차)=정본(재구현 금지). ★중복 고객/LTV/RFM 도메인 신설 절대 금지(값 분산=회귀). 형식 Customer 360 Engine은 `CRM`을 실시간 조립·Single Customer View로 승격(고객 재구현 아님).
- **D-3 (세그먼트 = CRM/Decisioning 승격·No-PII):** 세그먼트 = `CRM`(crm_segments/members·SoT)·AI Dynamic=`CustomerAI`/`Decisioning`(no-PII aggregate cohort). ★EPIC 06-A(289차)=crm_segments+members=SoT·version/snapshot 부재(형식 신설 대상). ★No-PII 원칙(v418.1·집계≠구매자 레코드) 준수. 형식 Segmentation Engine(version/snapshot)=순신설(중복 세그먼트 금지).
- **D-4 (저니/동의/Privacy = 기존 승격):** 저니=`JourneyBuilder`+`Attribution`(터치포인트·확률 아이덴티티 282차)·동의=`GdprConsent`·Privacy=`Compliance`/`Dsar`·Identity=`UserAuth`(OTP 273차). ★형식 Identity Manager(deterministic+probabilistic resolution·Merge Policy)·Journey Manager(Event 기반)=순신설(중복 아이덴티티/저니 금지).
- **D-5 (Security/AI = 헌법·Privacy by Design 정합):** Tenant=`Db.php`·Encryption=`Crypto`·★No-PII 집계(v418.1)·PII Masking·RBAC=`index.php`·Consent Enforcement=`GdprConsent`·Audit=`SecurityAudit`. AI(LTV/이탈/재구매/NBA)=`CustomerAI`/`AutoRecommend`·Explainability=헌법 V4·★AI 고객 정보 자동 변경/동의 대신 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/024/Data Platform/헌법 상속·재정의 금지·고객 마스터/360(`CRM`)·세그먼트(`CRM`/`Decisioning`)·저니(`JourneyBuilder`)·동의(`GdprConsent`)·Privacy(`Compliance`/`Dsar`)·`SecurityAudit` 재사용(★중복 고객/세그먼트/LTV 도메인 절대 금지·LTV 역분개 정본 재구현 금지·No-PII 준수)·형식 Customer 360 Engine·Identity Manager(Merge)·Segmentation Engine version·Journey Manager만 신설(고객 재구현 없이). 실행은 실시간 360 조립 계층 신설 종속.

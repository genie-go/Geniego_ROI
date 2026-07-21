# MEA Part 039 — Enterprise Cross Border Logistics & Customs Management Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Foundation(Part 031)+TMS(032)+WMS(033)+Marketplace(029)+Payment(028)+Profit(016)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**국제 배송 추적/글로벌 마켓 판매/원산지·다통화는 seed 실재이나 통관/HS Code/관세/무역 규정은 부재**(GT①·부재증명 완료). ★비즈니스 모델: GeniegoROI는 글로벌 마켓 판매+DHL 국제 추적 e-커머스 플랫폼이지 통관사(Customs Broker)가 아님·통관은 3PL/통관사 담당. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
국제 운송/통관/수출입/관세/무역 규정/국제 배송/해외 물류 파트너/국가별 규제 통합 관리. TMS/WMS/Marketplace/Payment/ERP/Global Carrier/Customs System/ROI/AI 연계 Enterprise Cross Border Logistics Framework.

## §2 구현 범위
Cross Border Logistics · Customs · Import/Export Management · Trade Compliance · International Carrier · Customs Documentation · Analytics · Governance · AI Cross Border Intelligence.

## §3 구현 목표 (10)
Cross Border Logistics Engine · Customs Management Engine · Import & Export Service · Trade Compliance Engine · Customs Documentation Service · Analytics Service · Dashboard · Governance Manager · Audit Service · AI Cross Border Advisor.

## §4 아키텍처 원칙 (10)
Compliance First · Country Policy Driven · End-to-End Visibility · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Multi-Country Ready · High Availability · Audit by Default.

## §5 Canonical Entity (15)
IMPORT_ORDER · EXPORT_ORDER · CUSTOMS_DECLARATION · CUSTOMS_DOCUMENT · HS_CODE · COUNTRY_RULE · DUTY · TAX · INTERNATIONAL_SHIPMENT · BORDER_CHECKPOINT · TRADE_LICENSE · CUSTOMS_STATUS · COMPLIANCE_POLICY · CUSTOMS_AUDIT · CUSTOMS_EXCEPTION. → 상세 = `MEA_PART039_CANONICAL_ENTITIES.md`.

## §6 Cross Border Domain (10)
Export/Import Logistics/Customs Clearance/Bonded/International Parcel/International Freight/FTA/Multi-Country/International Warehouse/Enterprise Global Logistics. International Shipment 기준. → ★현행=International Parcel=`Logistics`(DHL 국제 추적·INTL const)·글로벌 판매=`ChannelSync`(amazon/ebay). ★Customs Clearance/Bonded/International Freight/FTA/International Warehouse=부재.

## §7 Cross Border Lifecycle (10)
Export Request→Documentation→Customs Declaration→Export Clearance→International Transportation→Import Declaration→Import Clearance→Domestic Delivery→Completion→Archive. 국가별 규정. → ★현행=International Transportation=`Logistics`(DHL 추적)·Domestic Delivery=`Logistics`(택배사). ★Export/Import Declaration/Clearance/Documentation(통관 워크플로우)=부재.

## §8 Customs Management (8)
Customs Declaration/HS Code Validation/Duty·Tax Calculation/Customs Inspection/Release/Hold Management/Electronic Filing. 국가별 자동 검증. → ★현행=Tax=`Pnl`(VAT·통관 관세 아님). ★Customs Declaration/HS Code Validation/Duty Calculation/Electronic Customs Filing(통관 시스템 미연동)=부재.

## §9 Import & Export Management (8)
Export/Import Registration/Shipping Instruction/Certificate/Commercial Invoice/Packing List/Certificate of Origin/Export License Validation. 국가별 필수 서류. → ★현행=Certificate of Origin seed=`Catalog`+`st11_notice_types.json`(11번가 원산지·country of origin·286차). ★Commercial Invoice/Packing List/Export License/형식 서류 검증=부재.

## §10 Trade Compliance (8)
Sanction Screening/Restricted Goods/Country Compliance/Trade License/FTA Eligibility/Dangerous Goods/Customs Regulation/Compliance Reporting. → ★현행=**부재**(형식 무역 규정 없음). Compliance seed=`Compliance`(범용·무역 아님).

## §11 International Carrier Management (8)
Global Carrier Registration/Performance/Rate/Transit Time/International Tracking/Multi-Carrier/SLA Monitoring/Settlement. → ★현행=International Tracking=`Logistics`(DHL·INTL const dhl/fedex/ups/tnt/cj_intl·현재 DHL 실구현·나머지 pending)·Carrier Registration=`Wms`(wms_carriers)/`ChannelRegistry`. ★International Rate/Transit Time/SLA Monitoring=부재.

## §12 Cross Border Analytics (8)
Customs Clearance Time/Import·Export Cycle Time/Duty Cost/International Freight Cost/Compliance Rate/Customs Exception Rate/Cross Border ROI. → ★현행=International Freight Cost seed=`Pnl`(배송비)·Cross Border ROI=`Rollup`/`Pnl`(글로벌 채널)·SoS(267차). ★Customs Clearance Time/Duty Cost/Compliance Rate=부재.

## §13 Customs Governance (8)
Customs/Trade Policy/Country Rule/Documentation/Compliance/Duty Policy/Approval/Audit. → ★현행=Audit=`SecurityAudit`·Compliance=`Compliance`(범용). ★Customs/Trade/Country Rule/Duty Policy=부재.

## §14 Data Security
Tenant Isolation · RBAC · Customs Data Encryption · International Document Protection · Audit · Secure Government API. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`. ★International Document/Government API(통관 부재)=해당 없음.

## §15 Runtime 규칙
국가 규정 검증 · HS Code 확인 · 관세 계산 · 통관 문서 생성 · Compliance 검사 · Customs Event · Audit. → ★현행=Audit=`SecurityAudit`만. ★국가 규정/HS Code/관세/통관 문서/Compliance Runtime=부재.

## §16 API 표준 (8)
Create Export/Import Order/Submit Customs Declaration/Calculate Duty/Validate Trade Compliance/Query Customs Status/Register Customs Document/Query Audit. → ★현행=International Tracking=`Logistics` API. ★Customs Declaration/Calculate Duty/Trade Compliance API=부재. Part 001 API 표준 상속(신설 시).

## §17 Event 표준 (8)
ExportRequested/CustomsDeclarationSubmitted/CustomsReleased/ImportStarted/ImportCompleted/ComplianceViolationDetected/InternationalShipmentDelivered/CustomsAudited. → ★현행=InternationalShipmentDelivered=`Logistics`(DHL 추적) seed. ★Customs/Compliance Event=부재. Data Platform §15 정합.

## §18 AI Integration
통관 지연 예측 · HS Code 추천 · FTA 적용 · 관세 비용 예측 · 국가별 규정 변경 · Compliance 위험 예측 · 국제 운송 경로 최적화 · Explainable Cross Border Insight. **AI는 통관 신고 자동 제출/정부 승인 자동 수행 불가.** → ★현행=지연 예측=`AnomalyDetection`(범용)·Explainability=헌법 V4·통관 신고 자동 제출 불가=헌법 V3+V5+`CHANGE_GATE`. ★HS Code 추천/관세 예측/Compliance(통관 부재)=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
통관 문서 ≤2초 · 관세 계산 ≤500ms · Compliance ≤1초 · 국제 운송 조회 ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. (대상 통관 엔진 미존재·벤치 대상 부재.)

## §20 Completion Criteria
Cross Border Engine·Customs·Import·Export·Trade Compliance·International Carrier·Analytics·Governance·Security·Runtime·API/Event·AI 구현. → **대부분 미충족·부재**(국제 추적/글로벌 판매/원산지 seed만·통관 전 계층=부재). 코드 0.

## 판정
**ABSENT-heavy / PARTIAL-weak(seed 극소).** ★실재 seed=International Tracking(`Logistics`·DHL Unified Tracking·INTL const·현재 DHL 실구현·FedEx/UPS/TNT 정직하게 pending)·글로벌 마켓 판매(`ChannelSync`·amazon/ebay·Part 029)·Certificate of Origin seed(`Catalog`+`st11_notice_types.json`·11번가 원산지·286차)·International Freight Cost(`Pnl` 배송비)·다통화(`Connectors::fxToKrw`)·Cross Border ROI(`Rollup`/`Pnl`·SoS 267차)·Audit(`SecurityAudit`). ★**부재(부재증명 완료)=Customs Management(Customs Declaration/HS Code Validation/Duty Calculation/Electronic Filing)·Trade Compliance(Sanction Screening/Restricted Goods/FTA/Dangerous Goods)·Import/Export Registration·Customs Documentation(Commercial Invoice/Packing List/Export License)·Bonded/International Warehouse·통관 전 계층.** ★★핵심=**GeniegoROI는 글로벌 마켓 판매+DHL 국제 추적 e-커머스 플랫폼이지 통관사(Customs Broker)가 아니므로 통관/HS Code/관세/무역 규정은 부재**(통관은 3PL/통관사 담당·Part 034/035 정합·과대주장 금지·[[feedback_competitive_gap_verify]]). 국제 추적/글로벌 판매/원산지는 seed 실재이나 통관 전 계층은 순신설(자체 통관 운영 착수 시·통관 시스템/정부 API 연동 필수). Logistics/Commerce Platform 상속(재정의 금지)·★중복 국제 추적/원산지/VAT/다통화 절대 금지(`Logistics`/`Catalog`/`Pnl`/`Connectors` 정본 재구현 금지·★VAT≠관세 오흡수 금지)·마케팅 AI KEEP_SEPARATE·★AI 통관 신고 자동 제출/정부 승인 자동 수행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 040 — Enterprise Logistics Analytics & AI Logistics Intelligence Architecture(본 Cross Border 상속·Logistics Platform 완료 예정).

# MEA Part 028 — Enterprise Payment, Billing & Settlement Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+023(Pricing)+024(OMS)+016(Profit·VAT)+Data Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**결제/구독 청구/정산/VAT는 이미 실재**(GT①·`Payment`·`Paddle`·`PgSettlement`·`Pnl`)·본 Part는 형식 Reconciliation/Multi-Gateway 계층만 추가(결제 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 결제/청구/정산/환불/수수료/세금·회계 연계 통합 관리. OMS/Pricing/Customer/Financial/ERP/Marketplace/Banking/PG/ROI/AI 연계 Enterprise Payment Framework.

## §2 구현 범위
Payment Processing · Billing · Settlement · Refund · Fee · Tax Management · Financial Reconciliation · Governance · Analytics · AI Payment Intelligence.

## §3 구현 목표 (10)
Payment Processing Engine · Billing Management Engine · Settlement Engine · Refund Management Service · Financial Reconciliation Engine · Tax Calculation Service · Payment Analytics Service · Payment Dashboard · Payment Audit Service · AI Payment Advisor.

## §4 아키텍처 원칙 (10)
Payment First · Financial Accuracy · Security by Default · Event Driven · **Idempotent Processing** · Metadata Driven · Multi-Gateway Ready · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PAYMENT · PAYMENT_TRANSACTION · PAYMENT_METHOD · PAYMENT_GATEWAY · BILLING · INVOICE · SETTLEMENT · REFUND · FEE · TAX · RECONCILIATION · PAYMENT_STATUS · PAYMENT_POLICY · PAYMENT_AUDIT · PAYMENT_BATCH. → 상세 = `MEA_PART028_CANONICAL_ENTITIES.md`.

## §6 Payment Domain (10)
Online/Offline Payment · Subscription Billing · Marketplace/Partner Settlement · International Payment · Wallet/Installment Payment · Enterprise Billing · Financial Settlement. Payment Master 기준. → ★현행=Online=`Payment`(Toss)·Subscription Billing=`Paddle`(MoR)·Marketplace Settlement=`PgSettlement`/`ChannelSync`(kr_settlement)·Partner=`PartnerPortal`. 형식 Payment Master 통합=부분.

## §7 Payment Lifecycle (10)
Requested→Authorized→Approved→Billing Generated→Settlement Scheduled→Completed→Refund Requested→Completed→Reconciliation→Archive. 변경 불가 감사 이력. → ★현행=Requested/Approved=`Payment`(Toss confirm)·Billing=`Paddle`(webhook)·Settlement=`PgSettlement`·Refund=`OrderHub`/`Payment`·★변경 불가 감사=`SecurityAudit`. 형식 통합 Lifecycle Manager=부분.

## §8 Payment Processing (10)
Credit Card/Bank Transfer/Virtual Account/Digital Wallet/Mobile/QR/International/Recurring/Partial/Split Payment. Idempotency Key 중복 방지. → ★현행=`Payment`(Toss·카드/계좌/가상계좌)·Recurring=`Paddle`(구독)·★Idempotency=`Paddle`(webhook authoritative·중복 방지·215차 webhook 토큰). Wallet/QR/Split(형식)=부분.

## §9 Billing Management (8)
Invoice Generation · Subscription Billing · Scheduled/Consolidated/Partial Billing · Tax/Electronic Invoice · Notification. 고객 유형별 정책. → ★현행=Subscription Billing=`Paddle`(Billing v2·MoR)·Tax Invoice=`Pnl`(VAT 267차·Paddle MoR 납부뷰)·Notification=`Mailer`. ★형식 Invoice Generation Engine(전자세금계산서)=부분.

## §10 Settlement Management (8)
Merchant/Marketplace/Partner Settlement · Multi-Currency · Batch/Real-Time · Adjustment · Rollback. 거래+배치 단위. → ★★현행=`PgSettlement`(Toss Settlements API·Adyen CSV Report 228차·pg_settlement)·Marketplace=`ChannelSync`(kr_settlement·net_payout)·Multi-Currency=`Connectors::fxToKrw`·정산 머니경로=`Pnl`(SSOT). Real-Time/Rollback(형식)=부분.

## §11 Refund Management (8)
Full/Partial/Automatic/Manual Refund · Approval Workflow · Reason Management · Tracking · Reconciliation. 원거래 연결. → ★현행=Refund=`OrderHub`(RETURN_TOKENS·취소 역분개 268차)·`Payment`(Toss cancel)·원거래 연결=`OrderHub`(claimType). ★형식 Refund Approval Workflow/Reconciliation=부분.

## §12 Financial Reconciliation (8)
Payment/Settlement/Bank/Gateway/Invoice/Tax Matching · Exception Detection · Report. 불일치 자동 예외 관리. → ★현행=정산 머니경로 매칭=`Pnl`(netPayout·settlement SSOT)·`PgSettlement`(정산 수집)·Exception=`AnomalyDetection`(부분). ★형식 Reconciliation Engine(Bank/Gateway Matching·Exception 등록)=ABSENT.

## §13 Tax & Fee Management (8)
VAT/GST/Sales Tax/Withholding Tax · Platform/Gateway/Service/Currency Conversion Fee. 국가/지역별 세금. → ★현행=VAT=`Pnl`(267차·상계/과세기간·해외광고비 제외 288차)·Platform Fee=`Pnl`(platformFee 컴포넌트)·Gateway Fee=`PgSettlement`. ★형식 GST/Withholding Tax=부분.

## §14 Payment Governance (8)
Payment/Refund Approval · Settlement/Fee/Tax Policy · Gateway Priority · Compliance · Audit Trail. → ★현행=Approval=`Payment`/admin·Audit=`SecurityAudit`·Compliance=`Compliance`. ★Gateway Priority/형식 Governance Manager=부분.

## §15 Data Security
Tenant Isolation · PCI DSS · Payment Data Encryption · Tokenization · RBAC · Audit Logging · Secret Management · Fraud Protection. 민감 정보 토큰 관리. → ★현행=★PCI/Tokenization=`Paddle`(MoR·카드정보 미저장·Paddle 처리)+`Payment`(Toss paymentKey·raw 카드 미저장)·Encryption=`Crypto`·Secret=`ChannelCreds`(TOSS/PADDLE 키)·Audit=`SecurityAudit`·Fraud=`AnomalyDetection`.

## §16 Runtime 규칙
Payment 검증 · Gateway 선택 · Payment 승인 · Billing 생성 · Settlement · Reconciliation · Audit. → ★현행=Payment=`Payment`(Toss verify)·Billing=`Paddle`·Settlement=`PgSettlement`·Audit=`SecurityAudit`. Gateway 선택(형식 Multi-Gateway)=부분.

## §17 API 표준 (8)
Create/Authorize/Capture/Cancel Payment · Create Billing · Execute Settlement · Request Refund · Query History. → ★현행=`Payment` API(/auth/payment/confirm·Toss)·`Paddle` API(webhook/plans/config)·`PgSettlement` API(/v427/pg/settlements) 실재. Part 001 API 표준(`/api` 접두·Paddle webhook public bypass) 상속.

## §18 Event 표준 (8)
PaymentRequested/Authorized/Captured · BillingGenerated · SettlementCompleted · RefundRequested · ReconciliationCompleted · PaymentAudited. → ★현행=`Paddle`(webhook 이벤트·authoritative)·`Payment`(confirm) seed(Paddle webhook=준 event-driven·나머지 동기). Data Platform §15 정합.

## §19 AI Integration
결제 실패 예측 · Fraud 탐지 · Gateway 자동 선택 · Refund 이상 탐지 · Settlement 최적화 · Fee 최적화 · Cash Flow 예측 · Explainable Payment Report. **AI는 결제 승인/취소/환불·금융 거래 직접 실행 불가.** → ★현행=Fraud/이상=`AnomalyDetection`·Cash Flow 예측=`Mmm`/`DemandForecast`·Explainability=헌법 V4·금융 거래 직접 실행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §20 성능 요구사항
Payment 승인 ≤2초 · Gateway 응답 ≤1초 · Billing 생성 ≤500ms · Settlement ≤3초 · Reconciliation ≤5초 · Availability ≥99.99%. (현행 Toss/Paddle 실시간·PgSettlement 배치 seed.)

## §21 Completion Criteria
Payment Processing·Billing·Settlement·Refund·Reconciliation·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(결제/구독 청구/정산/VAT 실재·형식 Reconciliation Engine·Multi-Gateway·Invoice Generation=미완). 코드 0.

## 판정
**PARTIAL-strong(★결제=`Payment`(Toss PG·confirm/verify)·구독 청구=`Paddle`(Billing v2·MoR·webhook HMAC authoritative·Idempotent)·정산=`PgSettlement`(Toss Settlements·Adyen CSV 228차·pg_settlement)+`ChannelSync`(kr_settlement·net_payout)·정산 머니경로 SSOT=`Pnl`·VAT=`Pnl`(267차·상계/과세기간)·환불=`OrderHub`(취소 역분개 268차)·PCI/Tokenization=`Paddle` MoR(카드 미저장)·Secret=`ChannelCreds`·Fraud=`AnomalyDetection`) / ABSENT-formal(형식 Payment Processing Engine(Multi-Gateway 추상화)·Billing Engine(Invoice Generation·전자세금계산서)·Settlement Engine(Batch/Real-Time/Adjustment/Rollback)·Financial Reconciliation Engine(Bank/Gateway Matching·Exception)·Refund Approval Workflow·형식 Fee/Tax Policy(GST/Withholding)·Event 표준).** ★핵심=결제·구독 청구·정산·VAT는 **실재**(Toss/Paddle MoR·PgSettlement·Pnl money-path SSOT·VAT 정본)이나 형식 Reconciliation Engine·Multi-Gateway 추상화·Invoice Generation은 부재(Part 021 정합). Part 021/023/024/016/Data Platform 상속(재정의 금지)·★중복 결제/정산/VAT/환불 도메인 절대 금지(값 분산=회귀·VAT/정산 머니경로/취소 역분개 정본 재구현 금지)·★PCI/Tokenization=Paddle MoR 준수(카드정보 미저장)·마케팅 AI KEEP_SEPARATE·★AI 금융 거래 직접 실행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 029 — Enterprise Marketplace Integration & Channel Management Architecture(본 Payment 상속·확장).

# MEA Part 028 — Governance Mechanisms (§7~§21 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★결제(`Payment`)·구독 청구(`Paddle` MoR)·정산(`PgSettlement`/`Pnl`)·VAT(`Pnl`)·환불(`OrderHub`)·SecurityAudit 재사용(★중복 결제/정산/VAT/환불 도메인 절대 금지)·형식 Reconciliation/Multi-Gateway 신설(결제 재구현 없이).

## §7 Lifecycle 거버넌스
Requested→Authorized→Approved→Billing Generated→Settlement Scheduled→Completed→Refund Requested→Completed→Reconciliation→Archive·변경 불가 감사. 현행=Payment=`Payment`(Toss confirm)·Billing=`Paddle`(webhook)·Settlement=`PgSettlement`·Refund=`OrderHub`. ★변경 불가 감사=`SecurityAudit`(append-only). 형식 통합 Lifecycle=순신설.

## §8 Processing 거버넌스 (★Idempotent)
Credit Card/Bank/Virtual Account/Wallet/Mobile/QR/International/Recurring/Partial/Split·Idempotency Key. 현행=`Payment`(Toss)·Recurring=`Paddle`(구독). ★Idempotent=`Paddle`(webhook authoritative NOT frontend redirect·중복 방지·215차 webhook 토큰). Wallet/QR/Split(형식)=순신설.

## §9 Billing 거버넌스
Invoice Generation/Subscription/Scheduled/Consolidated/Partial/Tax·Electronic Invoice/Notification. 현행=Subscription=`Paddle`(Billing v2·MoR)·Tax Invoice=`Pnl`(VAT 267차·Paddle MoR 납부뷰)·Notification=`Mailer`. ★형식 Invoice Generation(전자세금계산서)=순신설.

## §10 Settlement 거버넌스
Merchant/Marketplace/Partner/Multi-Currency/Batch/Real-Time/Adjustment/Rollback. 현행=`PgSettlement`(Toss Settlements·Adyen CSV 228차·pg_settlement)·Marketplace=`ChannelSync`(kr_settlement·net_payout)·Multi-Currency=`Connectors::fxToKrw`·머니경로 SSOT=`Pnl`. ★거래+배치 단위·Real-Time/Rollback(형식)=순신설(중복 정산 계산 금지).

## §11 Refund 거버넌스
Full/Partial/Automatic/Manual/Approval Workflow/Reason/Tracking/Reconciliation·원거래 연결. 현행=`OrderHub`(RETURN_TOKENS·취소 역분개 268차·원거래 claimType)·`Payment`(Toss cancel). ★취소 역분개=정본. 형식 Refund Approval Workflow/Reconciliation=순신설.

## §12 Reconciliation 거버넌스
Payment/Settlement/Bank/Gateway/Invoice/Tax Matching·Exception Detection·Report. 현행=머니경로 매칭=`Pnl`(netPayout SSOT)·`PgSettlement`(정산 수집)·Exception=`AnomalyDetection`. ★형식 Reconciliation Engine(Bank/Gateway Matching·불일치 자동 예외 등록)=순신설.

## §13 Tax & Fee 거버넌스
VAT/GST/Sales Tax/Withholding·Platform/Gateway/Service/Currency Conversion Fee. 현행=VAT=`Pnl`(267차·상계/과세기간·해외광고비 제외 288차)·Platform Fee=`Pnl`(platformFee)·Gateway Fee=`PgSettlement`. ★국가/지역별 GST/Withholding=순신설(중복 세금 계산 금지·Pnl VAT 정본).

## §14 Governance 거버넌스
Payment/Refund Approval·Settlement/Fee/Tax Policy·Gateway Priority·Compliance·Audit Trail. 현행=Approval=`Payment`/admin·Compliance=`Compliance`·Audit=`SecurityAudit`. ★Gateway Priority/형식 Governance Manager=순신설.

## §15 Security 거버넌스 (★PCI/Tokenization)
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·★PCI DSS/Tokenization=`Paddle` MoR(카드정보 미저장·Paddle 처리)+`Payment`(Toss paymentKey·raw 카드 미저장)·Encryption=`Crypto`·RBAC=`index.php`·Secret=`ChannelCreds`(TOSS/PADDLE 키·평문노출 회피 [[feedback_credentials_handling]])·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])·Fraud=`AnomalyDetection`.

## §16 Runtime 거버넌스
Payment 검증·Gateway 선택·Payment 승인·Billing 생성·Settlement·Reconciliation·Audit. Payment=`Payment`(Toss verify)·Billing=`Paddle`·Settlement=`PgSettlement`·Audit=`SecurityAudit`·Gateway 선택(형식 Multi-Gateway)=순신설.

## §17 API 거버넌스 (8)
Create/Authorize/Capture/Cancel Payment·Create Billing·Execute Settlement·Request Refund·Query History. 현행=`Payment` API(/auth/payment/confirm)·`Paddle` API(webhook/plans/config·public bypass)·`PgSettlement` API(/v427/pg/settlements) 실재. ★Paddle webhook=public bypass(index.php). Part 001 API 표준 상속.

## §18 Event 거버넌스 (8)
PaymentRequested/Authorized/Captured/BillingGenerated/SettlementCompleted/RefundRequested/ReconciliationCompleted/PaymentAudited. 현행=`Paddle`(webhook 이벤트·authoritative=준 event-driven)·`Payment`(confirm) seed. Data Platform §15 정합.

## §19 AI 거버넌스
결제 실패 예측/Fraud/Gateway 선택/Refund 이상/Settlement·Fee 최적화/Cash Flow 예측/Explainable. 현행=Fraud/이상=`AnomalyDetection`·Cash Flow=`Mmm`/`DemandForecast`·Explainability=헌법 V4. ★AI는 결제 승인/취소/환불·금융 거래 직접 실행 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §20~§21 성능·완료
성능=Toss/Paddle 실시간·PgSettlement 배치 seed(벤치 대상 미존재). 완료=형식 Reconciliation Engine/Multi-Gateway/Invoice Generation 구현 시(부분 충족·코드 0). ★단 결제·구독 청구·정산·VAT는 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★결제(`Payment` Toss)·구독 청구(`Paddle` MoR·Idempotent)·정산(`PgSettlement`/`ChannelSync`)·머니경로 SSOT/VAT(`Pnl`)·환불(`OrderHub` 취소 역분개)·PCI(Paddle MoR)·Audit(`SecurityAudit`) 재사용·승격(★중복 결제/정산/VAT/환불 도메인 절대 금지=값 분산=회귀·정산 머니경로/VAT/취소 역분개 정본 재구현 금지)·형식 Payment Processing Engine(Multi-Gateway)/Billing Engine/Settlement Engine/Financial Reconciliation Engine/Refund Approval Workflow만 신설(결제 재구현 없이). Part 021/023/024/016/Data Platform/헌법 상속·재정의 금지·★AI 금융 거래 직접 실행 불가(V3+V5+CHANGE_GATE).

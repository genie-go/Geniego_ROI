# ADR — MEA Part 028 Enterprise Payment, Billing & Settlement Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part028 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 028은 Payment/Billing/Settlement. ★코드베이스에는 **결제/구독 청구/정산/VAT가 이미 실재**: `Payment.php`(Toss Payments PG·paymentKey/orderId/amount confirm·Toss API verify·플랜 업그레이드·GT①)·`Paddle.php`(Billing v2·webhook authoritative HMAC-SHA256·MoR·subscription 활성/비활성·GT①)·`PgSettlement.php`(Toss Settlements API·Adyen CSV Report 228차·pg_settlement·GT①)·`ChannelSync`(kr_settlement·net_payout)·`Pnl`(정산 머니경로 SSOT·VAT 267차·Paddle MoR 납부뷰). 본 Part는 Part 021/023/024/016 상속(재정의 금지).

## 결정
- **D-1 (Part 021/023/024/016/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·Pricing(Part 023)·OMS(Part 024)·Profit/VAT(Part 016)·Metadata(Part 004)를 준수·인용. 결제 도메인=`Payment`/`Paddle`/`PgSettlement`. 중복 정의 금지.
- **D-2 (결제/구독 청구 = Payment/Paddle 승격·★중복 결제 절대 금지·Idempotent):** 결제 = `Payment`(Toss)·구독 청구=`Paddle`(Billing v2·MoR·★webhook authoritative NOT frontend redirect·HMAC-SHA256·Idempotent). ★Paddle=Merchant of Record(MoR·한국 미지원→Stripe 대신 Paddle 원복·PG provider 이력). ★중복 결제/청구 로직 신설 절대 금지(값 분산=회귀). 형식 Payment Processing Engine은 `Payment`/`Paddle`을 Multi-Gateway로 추상화(결제 재구현 아님).
- **D-3 (정산/VAT = PgSettlement/Pnl 승격·★중복 정산/VAT 절대 금지):** 정산 = `PgSettlement`(Toss/Adyen·pg_settlement)·`ChannelSync`(kr_settlement·net_payout)·정산 머니경로 SSOT=`Pnl`(netPayout). VAT=`Pnl`(267차·상계/과세기간·해외광고비 제외 288차). ★정산 머니경로/VAT=Financial 정본(재구현 금지). 형식 Settlement Engine(Batch/Real-Time/Rollback)·Reconciliation Engine=순신설(중복 정산/VAT 계산 금지).
- **D-4 (환불/Reconciliation = 기존 승격·형식 신설):** 환불=`OrderHub`(RETURN_TOKENS·취소 역분개 268차·원거래 claimType 연결)·`Payment`(Toss cancel). ★취소 역분개=정본(재구현 금지). ★형식 Refund Approval Workflow·Financial Reconciliation Engine(Bank/Gateway Matching·Exception Detection)=순신설(중복 환불/매칭 로직 금지).
- **D-5 (Security/AI = PCI/헌법 정합):** ★PCI DSS/Tokenization=`Paddle` MoR(카드정보 미저장·Paddle 처리)+`Payment`(Toss paymentKey·raw 카드 미저장)·Secret=`ChannelCreds`(TOSS/PADDLE 키·평문노출 회피)·Encryption=`Crypto`·Tenant=`Db.php`·Audit=`SecurityAudit`·Fraud=`AnomalyDetection`. AI(실패 예측/Fraud/Gateway 선택/Cash Flow)=`AnomalyDetection`/`Mmm`/`DemandForecast`·Explainability=헌법 V4·★AI 금융 거래 직접 실행(승인/취소/환불) 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/023/024/016/Data Platform/헌법 상속·재정의 금지·결제(`Payment` Toss)·구독 청구(`Paddle` MoR)·정산(`PgSettlement`/`ChannelSync`)·머니경로 SSOT/VAT(`Pnl`)·환불(`OrderHub` 취소 역분개)·PCI(Paddle MoR)·`SecurityAudit` 재사용(★중복 결제/정산/VAT/환불 도메인 절대 금지·정산 머니경로/VAT/취소 역분개 정본 재구현 금지)·형식 Payment Processing Engine(Multi-Gateway)·Billing Engine(Invoice)·Settlement Engine·Reconciliation Engine·Refund Approval Workflow만 신설(결제 재구현 없이). 실행은 형식 Engine 신설 종속.

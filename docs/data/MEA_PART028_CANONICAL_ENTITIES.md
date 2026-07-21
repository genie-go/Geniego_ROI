# MEA Part 028 — Canonical Entities Design & Judgment (§5~§19)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Payment/Paddle/PgSettlement/Pnl/OrderHub 재사용·형식 Reconciliation/Multi-Gateway greenfield·Part 021/023/024/016 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PAYMENT | Toss 결제 | `Payment.php`(:11) | PARTIAL-strong |
| 2 | PAYMENT_TRANSACTION | 거래(paymentKey) | `Payment.php`(confirm) | PARTIAL-strong |
| 3 | PAYMENT_METHOD | 카드/계좌/가상계좌 | `Payment.php`(Toss) | PARTIAL |
| 4 | PAYMENT_GATEWAY | Toss/Paddle/Adyen | `Payment`·`Paddle`·`PgSettlement`(228차) | PARTIAL(형식 레지스트리 ABSENT) |
| 5 | BILLING | 구독 청구(MoR) | `Paddle.php`(Billing v2) | PARTIAL-strong |
| 6 | INVOICE | 세금계산서(VAT 뷰·형식 Invoice 부분) | `Pnl`(VAT 267차) | PARTIAL |
| 7 | SETTLEMENT | Toss/Adyen/채널 | `PgSettlement.php`·`ChannelSync`(kr_settlement) | PARTIAL-strong |
| 8 | REFUND | 취소 역분개 | `OrderHub.php`(268차)·`Payment`(cancel) | PARTIAL-strong |
| 9 | FEE | Platform/Gateway Fee | `Pnl`(platformFee)·`PgSettlement` | PARTIAL |
| 10 | TAX | VAT | `Pnl.php`(267차) | PARTIAL-strong |
| 11 | RECONCILIATION | 머니경로 매칭(부분) | `Pnl`(netPayout SSOT) | PARTIAL(형식 Engine ABSENT) |
| 12 | PAYMENT_STATUS | 결제 상태 | `Payment`·`Paddle`(webhook) | PARTIAL-strong |
| 13 | PAYMENT_POLICY | 게이트 산재 | (게이트) | PARTIAL |
| 14 | PAYMENT_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | PAYMENT_BATCH | 정산 배치(부분) | `PgSettlement`(Adyen CSV) | PARTIAL |

## §6~§19 표준 판정
- **§6 Domain(10)**: Online=Payment(Toss)·Subscription=Paddle(MoR)·Marketplace Settlement=PgSettlement/ChannelSync·Partner=PartnerPortal. 형식 Master 통합=부분.
- **§7 Lifecycle(10)**: Payment=Payment·Billing=Paddle·Settlement=PgSettlement·Refund=OrderHub·변경 불가 감사=SecurityAudit·형식 Lifecycle Manager=부분.
- **§8 Processing(10)**: Toss(카드/계좌/가상계좌)·Recurring=Paddle·★Idempotent=Paddle(webhook)·Wallet/QR/Split=부분.
- **§9 Billing(8)**: Subscription=Paddle·Tax Invoice=Pnl(VAT)·형식 Invoice Generation=부분.
- **§10 Settlement(8)**: PgSettlement(Toss/Adyen)·ChannelSync(kr_settlement)·Multi-Currency=fxToKrw·Real-Time/Rollback=부분.
- **§11 Refund(8)**: OrderHub(취소 역분개 268차)·원거래 연결=claimType·형식 Approval Workflow=부분.
- **§12 Reconciliation(8)**: 머니경로 매칭=Pnl(netPayout)·Exception=AnomalyDetection·★형식 Reconciliation Engine(Bank/Gateway Matching)=ABSENT.
- **§13 Tax&Fee(8)**: VAT=Pnl(267차)·Platform Fee=Pnl·GST/Withholding(형식)=부분.
- **§15 Security**: ★PCI/Tokenization=Paddle MoR(카드 미저장)·Secret=ChannelCreds·Encryption/Audit/Fraud(Part 021 상속).
- **§19 AI**: Fraud/이상=AnomalyDetection·Cash Flow=Mmm/DemandForecast·Explainability=헌법 V4·금융 거래 직접 실행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§5·§7·§8·§10·§12 refund·§14=결제/청구/정산/환불/감사 ★§8 Idempotent) / PARTIAL(§3·§4·§6·§9·§11·§13·§15) / ABSENT-formal(형식 Multi-Gateway 레지스트리·Reconciliation Engine·Invoice Generation·Settlement Batch/Rollback·Refund Approval Workflow).** 코드 0. ★결제(`Payment`)·구독 청구(`Paddle` MoR)·정산(`PgSettlement`/`Pnl`)·VAT(`Pnl`)·환불(`OrderHub`) 재사용(★중복 결제/정산/VAT/환불 도메인 절대 금지·정산 머니경로/VAT/취소 역분개 정본 재구현 금지·PCI=Paddle MoR)·형식 Reconciliation/Multi-Gateway 신설(결제 재구현 없이)·Part 021/023/024/016 상속·★AI 금융 거래 직접 실행 불가(V3+V5+CHANGE_GATE).

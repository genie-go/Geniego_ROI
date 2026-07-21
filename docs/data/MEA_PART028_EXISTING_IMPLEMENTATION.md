# MEA Part 028 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 028 SPEC/ADR.

## 전수조사 방법
payment/toss/paddle/billing/settlement/refund/reconcil/vat/fee/idempot 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★결제·구독 청구·정산·VAT)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 결제 처리(PG) | Toss Payments | `Payment.php`(:11·confirm·verify) | PARTIAL-strong |
| 구독 청구(MoR) | Paddle Billing v2 | `Paddle.php`(:11·webhook HMAC:19·MoR) | PARTIAL-strong |
| Idempotent | webhook authoritative | `Paddle.php`(:14·215차 webhook 토큰) | PARTIAL-strong |
| 정산 수집 | Toss/Adyen | `PgSettlement.php`(:17·Adyen CSV 228차:45·pg_settlement:81) | PARTIAL-strong |
| 채널 정산 | kr_settlement | `ChannelSync.php`·`KrChannel` | PARTIAL-strong |
| 정산 머니경로(SSOT) | netPayout | `Pnl.php`(정산 머니경로) | PARTIAL-strong |
| VAT/Tax | 부가세 | `Pnl.php`(267차·상계/과세기간·288차) | PARTIAL-strong |
| Platform/Gateway Fee | 수수료 컴포넌트 | `Pnl.php`(platformFee)·`PgSettlement` | PARTIAL |
| 환불 | 취소 역분개 | `OrderHub.php`(RETURN_TOKENS·268차)·`Payment`(cancel) | PARTIAL-strong |
| PCI/Tokenization | MoR·카드 미저장 | `Paddle`(MoR)·`Payment`(Toss paymentKey) | PARTIAL-strong |
| Secret | PG 키 | `ChannelCreds`(TOSS/PADDLE) | PARTIAL-strong |
| Fraud/이상 | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Reconciliation/Multi-Gateway (grep 판정)
형식 Payment Processing Engine(Multi-Gateway 추상화)·Billing Management Engine(Invoice Generation·전자세금계산서)·Settlement Engine(Batch/Real-Time/Adjustment/Rollback 통합)·Financial Reconciliation Engine(Payment/Bank/Gateway Matching·Exception Detection)·Refund Approval Workflow·형식 Fee/Tax Policy(GST/Withholding Tax)·PAYMENT_METHOD/GATEWAY 형식 레지스트리·Event 표준(PaymentRequested 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★결제·구독 청구·정산·VAT는 **실재**: `Payment`(Toss PG)·`Paddle`(Billing v2·MoR·webhook HMAC·Idempotent)·`PgSettlement`(Toss/Adyen 228차·pg_settlement)·`ChannelSync`(kr_settlement)·`Pnl`(정산 머니경로 SSOT·VAT 267차)·`OrderHub`(취소 역분개 268차)·PCI/Tokenization=`Paddle` MoR(카드 미저장)이나, **형식 Payment Processing Engine(Multi-Gateway)·Billing Engine(Invoice)·Settlement Engine(Batch/Rollback)·Financial Reconciliation Engine·Refund Approval Workflow는 부재**(Part 021 정합). 실행은 형식 Engine 신설(결제 재구현 없이) 종속.

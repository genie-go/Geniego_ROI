# MEA Part 028 — Enterprise Payment, Billing & Settlement Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART028_PAYMENT_BILLING_SETTLEMENT_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§21 |
| 2 | ADR | `docs/architecture/ADR_MEA_PAYMENT_BILLING_SETTLEMENT_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART028_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART028_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART028_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§19 |
| 6 | GOVERNANCE | `docs/data/MEA_PART028_GOVERNANCE_MECHANISMS.md` | §7~§21 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART028_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal.** ★결제·구독 청구·정산·VAT는 **실재**: `Payment`(Toss PG·confirm/verify)·`Paddle`(Billing v2·MoR·webhook HMAC authoritative·Idempotent)·`PgSettlement`(Toss Settlements·Adyen CSV 228차·pg_settlement)·`ChannelSync`(kr_settlement·net_payout)·`Pnl`(정산 머니경로 SSOT·VAT 267차)·`OrderHub`(취소 역분개 268차)·PCI/Tokenization=`Paddle` MoR(카드 미저장)이나, **형식 Payment Processing Engine(Multi-Gateway)·Billing Engine(Invoice Generation)·Settlement Engine(Batch/Rollback)·Financial Reconciliation Engine(Bank/Gateway Matching)·Refund Approval Workflow는 미완**(Part 021 정합). ★중복 결제/정산/VAT/환불 도메인 절대 금지(값 분산=회귀·정산 머니경로/VAT/취소 역분개 정본 재구현 금지)·★PCI=Paddle MoR 준수·마케팅 AI KEEP_SEPARATE·★AI 금융 거래 직접 실행 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Commerce Platform(Part 021~027)+ROI Platform(013~020·Part 016 Profit/VAT)+Data Platform(001~012)+자격증명 규범+헌법 V3/V4/V5.
- 다음: **MEA Part 029 — Enterprise Marketplace Integration & Channel Management Architecture**(본 Payment 상속·확장).

## ★Commerce Platform 진행 (Part 021~028)
Part 021 Commerce Foundation · 022 PIM · 023 Pricing · 024 OMS · 025 Customer 360 · 026 Promotion/Coupon/Campaign · 027 Inventory · **028 Payment/Billing/Settlement** → 다음 029 Marketplace Integration & Channel.

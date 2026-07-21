# MEA Part 028 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Payment 신설이 기존 결제(`Payment`/`Paddle`)·정산(`PgSettlement`)·VAT(`Pnl`)·Part 021/016과 중복 재정의하지 않도록 경계 확정. ★결제/정산/VAT 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| PAYMENT/정산 | ★MEA Part 021 Commerce·`Payment`/`PgSettlement` | ★재정의 금지·재사용 |
| VAT/Tax | ★MEA Part 016 Profit·`Pnl`(VAT 267차) | ★재정의 금지·재사용 |
| 환불/취소 역분개 | ★MEA Part 024 OMS·`OrderHub`(268차) | ★재정의 금지·재사용 |
| Currency 변환 Fee | ★MEA Part 023 Pricing·`Connectors::fxToKrw` | 참조·재사용 |
| Secret/자격증명 | ★[[feedback_credentials_handling]]·`ChannelCreds` | ★재정의 금지(평문노출 회피) |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 결제/정산/VAT 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 결제 처리 | Toss PG | `Payment.php` | ★재사용(★중복 결제 신설 절대 금지) |
| 구독 청구(MoR) | Paddle Billing v2 | `Paddle.php`(webhook authoritative) | ★재사용(중복 청구 금지·MoR 이력) |
| 정산 수집 | Toss/Adyen | `PgSettlement.php` | ★재사용(중복 정산 금지) |
| 정산 머니경로/VAT | SSOT | `Pnl.php`(netPayout·VAT 267차) | ★재사용(★중복 정산/VAT 계산 절대 금지) |
| 환불 | 취소 역분개 | `OrderHub.php`(268차) | ★재사용(★중복 환불/역분개 절대 금지) |
| PCI/Token | MoR | `Paddle`(카드 미저장) | 재사용(중복 카드 저장 금지) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 결제/정산/VAT/환불 단일 정의·값 무후퇴=★중복 절대 금지(값 분산=회귀).
- ★`Pnl` 정산 머니경로 SSOT·VAT(267차·상계/과세기간·288차 해외광고비 제외)=Financial 정본·재구현 금지.
- ★`OrderHub` 취소 역분개(268차)·`Paddle` MoR(한국 미지원→Stripe 대신 Paddle 원복 이력)=정본·재구현 금지.
- ★PCI/Tokenization=Paddle MoR(카드정보 미저장)·중복 카드 저장/PCI 스코프 확대 금지.
- ★자격증명 평문노출 회피([[feedback_credentials_handling]])·TOSS/PADDLE 키=`ChannelCreds`.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Payment Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Payment Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 결제=`Payment`/`Paddle` 승격(결제 재구현 금지·Multi-Gateway 추상화). 정산=`PgSettlement`/`Pnl`. VAT=`Pnl`. 환불=`OrderHub`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(결제·정산·VAT 실재·금융 정본 다수).** ★핵심=`Payment`(Toss)·`Paddle`(MoR 청구)·`PgSettlement`(정산)·`Pnl`(정산 머니경로 SSOT·VAT)·`OrderHub`(취소 역분개)·`SecurityAudit`는 **재사용/승격**(★중복 결제/정산/VAT/환불 도메인 신설 절대 금지=값 분산=무후퇴 위반·정산 머니경로/VAT/취소 역분개 정본 재구현 금지). Part 021 Commerce·Part 016 Profit·Part 024 OMS·Part 023 Pricing·자격증명 규범·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Payment Processing Engine(Multi-Gateway)·Billing Engine(Invoice)·Settlement Engine(Batch/Rollback)·Financial Reconciliation Engine·Refund Approval Workflow·Event 표준뿐. ★PCI/Tokenization=Paddle MoR 준수·마케팅 AI KEEP_SEPARATE·★AI 금융 거래 직접 실행 불가(V3+V5+CHANGE_GATE).

# MEA Part 023 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Pricing 신설이 기존 가격 최적화(`PriceOpt`)·할인(`CouponRedeem`)·다통화(`Connectors`/`Pnl`)·Part 014/021과 중복 재정의하지 않도록 경계 확정. ★가격 도메인 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| 통화 변환/Exchange Rate | ★MEA Part 014 Calc·`Connectors::fxToKrw` | ★재정의 금지·재사용 |
| Tax/VAT | ★MEA Part 016 Profit·`Pnl`(VAT 267차) | ★재정의 금지·재사용 |
| Pricing Authority/Approval | ★MEA Part 018 Decision(Authority ABSENT) | 참조·재정의 금지 |
| Coupon/Promotion | ★MEA Part 021 Commerce·`CouponRedeem` | ★재정의 금지·재사용 |
| Price Metadata | MEA Part 004 Metadata | 참조·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 가격/할인/통화 계산 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Dynamic Pricing | 탄력성 최적가 | `PriceOpt.php`(v420) | ★재사용(★중복 가격 계산 신설 절대 금지) |
| Discount/Coupon | 원자 소진 | `CouponRedeem.php`(TOCTOU 289차) | ★재사용(★중복 할인 금지·이중지불 정본) |
| Multi-Currency | KRW base | `Connectors::fxToKrw`·`Pnl` | ★재사용(★중복 통화 변환 절대 금지) |
| Channel Pricing | master 게이트 | `MenuPricingSync.php`(287차) | 재사용(중복 채널가격 금지) |
| Tax/VAT | 부가세 | `Pnl.php`(267차) | ★재사용(재구현 금지) |
| Audit | 해시체인 | `SecurityAudit.php` | 재사용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 가격/할인/통화 단일 정의·값 무후퇴=★중복 가격/할인/통화 계산 절대 금지(값 분산=회귀).
- ★`CouponRedeem` 원자 소진(TOCTOU 289차)=이중지불 방지 정본·재구현 금지.
- ★`Pnl` VAT(267차)·`Connectors::fxToKrw` 다통화=Financial 정본·중복 통화/세금 계산 금지.
- ★Part 014 판정: Daily/Historical Exchange Rate versioning·Currency Audit=ABSENT(형식 신설 대상).
- ★Part 018 판정: Pricing/Approval Authority=ABSENT(형식 Governance 신설은 Authority foundation 종속).
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Price Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Price Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- Dynamic Pricing=`PriceOpt` 승격(가격 재계산 금지·Single Price Authority). 할인=`CouponRedeem`. 통화=`Connectors::fxToKrw`(versioning 형식 신설). Tax=`Pnl`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(가격 최적화·할인·다통화 실재).** ★핵심=`PriceOpt`(동적가격)·`CouponRedeem`(할인·이중지불 정본)·`Connectors::fxToKrw`+`Pnl`(다통화·VAT)·`MenuPricingSync`(채널가격)·`SecurityAudit`는 **재사용/승격**(★중복 가격/할인/통화/세금 계산 신설 절대 금지=값 분산=무후퇴 위반·정본 재구현 금지). Part 014 Calc·Part 016 Profit·Part 018 Authority·Part 021 Commerce·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Enterprise Pricing Engine(Single Price Authority)·Price Master/Rule version·Daily/Historical Exchange Rate versioning·Currency Audit·Pricing Governance Manager·Tiered/BOGO 우선순위 엔진·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI 가격 정책 자동 승인/직접 반영 불가(V3+V5+CHANGE_GATE).

# MEA Part 026 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Promotion 신설이 기존 쿠폰(`CouponAdmin`/`CouponRedeem`)·프로모션(`Promotion`)·캠페인(`AutoCampaign`)·발송 게이트(`CRM`)·Part 021/023/025와 중복 재정의하지 않도록 경계 확정. ★쿠폰/프로모션 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| COUPON/Discount | ★MEA Part 021 Commerce·Part 023 Pricing·`CouponRedeem` | ★재정의 금지·재사용 |
| Eligibility/발송 게이트 | ★EPIC 06-A Part 3-2·`CRM::isMarketingSendAllowed` | ★재정의 금지·재사용 |
| Audience/Segment | ★MEA Part 025 Customer 360·`CRM` 세그먼트 | ★재정의 금지·재사용 |
| Promotion ROI | ★MEA Part 013~020 ROI·`Mmm` | 참조·재사용 |
| Promotion Metadata | MEA Part 004 Metadata | 참조·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 쿠폰/프로모션/발송 게이트 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 쿠폰 관리/소진 | 룰·원자 소진 | `CouponAdmin`·`CouponRedeem`(TOCTOU 289차) | ★재사용(★중복 쿠폰 신설 절대 금지·이중지불 정본) |
| 프로모션 | merchant_promotion | `Promotion.php` | ★재사용(중복 프로모션 금지) |
| 캠페인 | budget·guardrails | `AutoCampaign.php`·`WebPopupCampaign` | 재사용(중복 캠페인 금지) |
| 적격성/발송 게이트 | 단일 SSOT | `CRM::isMarketingSendAllowed`(289차) | ★재사용(★중복 발송 게이트/빈도캡 절대 금지) |
| Audience | 세그먼트 | `CRM`(crm_segments) | 재사용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 쿠폰/프로모션/발송 게이트 단일 정의·값 무후퇴=★중복 절대 금지(값 분산=회귀).
- ★`CouponRedeem` 원자 소진(TOCTOU 289차·UPDATE+rowCount)=이중지불 방지 정본·쿠폰 코드=bin2hex(random_bytes) 안전 확정·재구현 금지.
- ★`CRM::isMarketingSendAllowed`=발송 게이트 단일 SSOT(289차 Eligibility·RuleEngine 빈도캡 deprecated·H2 디덕)·중복 발송 게이트 금지.
- ★EPIC 06-A Part 3-2(289차): Eligibility=Contactability≠Reachability·Unknown≠Eligible Fail-closed·isMarketingSendAllowed 승격 정본.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Promotion Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Promotion Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 쿠폰=`CouponAdmin`/`CouponRedeem` 승격(쿠폰 재구현 금지·Coupon Engine). 프로모션=`Promotion`. 캠페인=`AutoCampaign`. 적격성=`CRM::isMarketingSendAllowed`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(쿠폰·프로모션·캠페인·발송 게이트 실재).** ★핵심=`CouponAdmin`/`CouponRedeem`(쿠폰·이중지불 정본)·`Promotion`(프로모션)·`AutoCampaign`/`WebPopupCampaign`(캠페인)·`CRM::isMarketingSendAllowed`(적격성 SSOT)·`SecurityAudit`는 **재사용/승격**(★중복 쿠폰/프로모션/발송 게이트 신설 절대 금지=값 분산=무후퇴 위반·TOCTOU 원자성/발송 게이트 정본 재구현 금지). Part 021 Commerce·Part 023 Pricing·Part 025 Customer 360·EPIC 06-A Eligibility·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 통합 Promotion Engine·Eligibility Rule Engine(Stackable/우선순위)·Conflict Detection·Reward Point/Cashback·Benefit Management Service·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI Promotion 자동 승인/자동 실행 불가(V3+V5+CHANGE_GATE).

# N-152-F 결제 정책 spec — USD 단일 통화 + 카드 결제 전용

> **작성일**: 2026-05-26
> **세션**: 168차
> **트랙 ID**: 본 spec 은 168차 사용자 신규 지시에 의해 N-152-F 통합 트랙 후속 정책으로 등재
> **저장 위치**: `docs/spec/n152f_billing_usd_card_only.md`
> **상위 spec**: `docs/spec/n152f_consolidated_pm_track.md`
> **사용자 지시 (원문)**: "GeniegoROI 플랫폼 구독요금을 달러로만 카드 결재 가능 하도록 할 것입니다."

---

## 0. 정책 (최상위)

1. **통화** = **USD 단일** (다중 통화 X). 모든 구독 가격 표시 + 청구 = USD.
2. **결제 수단** = **카드 (credit / debit) 전용**. 카카오페이 / 네이버페이 / 휴대폰결제 / 계좌이체 / PayPal / Apple Pay / Google Pay / Wire transfer 등 **모두 차단**.
3. **결제 provider** = **Paddle Billing v2 단일**. Toss / 토스 / PortOne / 자체 PG 경로 모두 비활성화.
4. **Merchant of Record** = Paddle (세금 / VAT / GDPR / 환불 처리 위임).
5. **enterprise plan** = "Contact Sales" 정적 페이지 (사전 Paddle 가격 미부착, 영업 단계 처리).

---

## 1. 절대원칙 cross-check

| 절대원칙 | 본 spec 매핑 |
|---|---|
| §1 초엔터프라이즈 | Paddle Merchant of Record + 다국가 자동 세금 처리 (글로벌 SaaS 표준) |
| §2 기존 안정성 | Toss/KRW 경로 즉시 삭제 X — deprecated stub (410 Gone) 으로 보존, 운영 트래픽 모니터링 후 단계 cleanup |
| §3 PM 책임 | 본 spec 작성 → 사용자 승인 → 구현 → 인계서 통합 |
| §4 데이터 보안 | 카드 정보는 Paddle Vault 직접 처리 (PCI DSS Level 1) — 본 플랫폼 PCI 책임 위임 |
| §5 글로벌 / 은행급 | Paddle = SOC 2 Type II + ISO 27001 + PCI DSS Level 1 — baseline 충족 |
| §6 누락 보고 | §3 미적용 트랙 + §6 한계 명시 |
| §7 경쟁 | 글로벌 SaaS 표준 (Notion / Linear / Figma 등 Paddle / Stripe USD 단일 패턴 동일) |
| §8 모듈화 | Paddle handler 보존, Payment.php deprecated stub 분리 |
| §9 최종 목표 | 글로벌 SaaS 진출 = USD 표준 + 카드 결제 표준 (해외 사용자 95%+ 카드 사용) |

또한 N-152-A 은행급 baseline:
- 카드 정보 plaintext 비저장 (Paddle 위임)
- webhook HMAC-SHA256 검증 (Paddle.php 기 구현)
- audit log (paddle_events 테이블)

---

## 2. 현 상태 vs 목표

### 2.1 코드 매핑

| 영역 | 파일 | 현 상태 | 목표 | 변경 |
|---|---|---|---|---|
| Public pricing page | `frontend/src/pages/public/PricingPublic.jsx` (317L) | USD + Paddle | ✅ 동일 | 푸터에 "Card only" 명시 |
| App pricing page | `frontend/src/pages/Pricing.jsx` (679L) | KRW + Toss + menu_tier_pricing DB | redirect to /pricing | route redirect 처리 |
| Subscription mgmt | `frontend/src/pages/SubscriptionPricing.jsx` (58L) | mock UI | 동일 | 변경 없음 |
| Public web | `frontend/src/pages/Landing.jsx` etc | 진입 CTA → `/pricing` | 동일 | 변경 없음 |
| Backend Paddle | `backend/src/Handlers/Paddle.php` (740L) | USD 기본 + webhook | ✅ 유지 | 변경 없음 |
| Backend Payment (Toss) | `backend/src/Handlers/Payment.php` (1694L) | KRW + Toss + KakaoPay + 등 | **deprecated** | routes.php 등록 해제 |
| .env 결제 키 | `backend/.env.example` | TOSS_* + PADDLE_* 혼재 | Paddle only | TOSS_* 표시 deprecated |

### 2.2 routes.php 의 Payment 경로 (deprecate)

| 경로 | 현 mapping | 변경 후 |
|---|---|---|
| `GET /auth/payment/config` | Payment::config | **routes 등록 해제 → 404** |
| `GET /auth/payment/plans` | Payment::plans | 동일 |
| `POST /auth/payment/confirm` | Payment::confirm | 동일 |
| `POST /auth/payment/cancel` | Payment::cancel | 동일 |
| `POST /payment/webhook/toss` | Payment::tossWebhook | 동일 |
| `GET/POST/DELETE /auth/pg/config*` | Payment::*PgConfig | 동일 |
| `GET/POST /auth/pricing/config` | Payment::*PricingConfig | 동일 |
| `GET/POST/DELETE /auth/pricing/plans*` | Payment::*MenuPricing* | **보존** (admin 인 menu_tier_pricing 운영 데이터 관리, USD 환산 후 별도 운영) |
| `GET/POST /auth/pricing/menu-access` | Payment::*MenuAccess* | 보존 (메뉴 권한 관리, 결제와 무관) |
| `GET/POST/DELETE /auth/pricing/packages*` | Payment::*SubscriptionPackage* | 보존 (admin pkg 관리) |
| `GET /auth/admin/subscribers*` | Payment::*Subscriber* | 보존 (admin 구독자 조회) |

**deprecate 대상**: `/auth/payment/*` 5 endpoint + `/auth/pg/config*` 3 endpoint = **총 8 endpoint** (Toss + PG 직접 결제 경로 만).

**보존**: 메뉴/플랜/패키지/구독자 admin 관리 경로 (Toss 결제 외).

### 2.3 Paddle Checkout — "카드 전용" 강제 방법

Paddle Billing v2 의 Checkout 은 코드 차원에서 `paymentMethods` 옵션으로 강제 가능:

```js
Paddle.Checkout.open({
  items: [{ priceId, quantity: 1 }],
  settings: {
    allowedPaymentMethods: ['card']  // Paddle 측에서 카드만 허용
  }
});
```

또는 Paddle Dashboard > Settings > Checkout 에서 globally card-only 설정. **본 spec 은 client-side 명시 + dashboard 설정 양쪽 권장**.

---

## 3. 본 phase 구현 범위 (단계)

| 단계 | 산출 | 변경량 |
|---|---|---:|
| 1 | 본 spec commit | +본 파일 |
| 2 | routes.php 의 Payment 5+3=8 endpoint **$custom + $register 라인 주석 처리** (코드 보존, 라우팅 차단) | 약 -16/+24 |
| 3 | App.jsx `/app-pricing` route → `<Navigate to="/pricing" replace />` | +1/-1 |
| 4 | PricingPublic.jsx — `Paddle.Checkout.open` 호출부에 `allowedPaymentMethods: ['card']` 추가 + 푸터에 "Card payments only" 명시 | +2 |
| 5 | .env.example — `GENIE_BILLING_CURRENCY=USD` + `GENIE_BILLING_PROVIDER=paddle` + `GENIE_BILLING_METHOD=card_only` 추가 + TOSS_* 키에 `# DEPRECATED` 주석 | +6 |

본 phase = 1 commit. 위험도 낮음 (Payment Handler 코드 변경 X, routes 차단만).

---

## 4. 운영 적용 절차

1. **운영 적용 이전** (본 168차 commit 종결 시점):
   - 코드 차원 변경만, 운영 DB 변경 X
   - 운영 trafic 영향: `/app-pricing` 으로 진입한 사용자 → `/pricing` 자동 redirect
   - `/auth/payment/*` 호출은 즉시 404 (Slim 미등록)

2. **운영 deploy 시 (cc plink + pscp)**:
   - 사용자 명시 승인 후
   - routes.php / App.jsx / PricingPublic.jsx / .env.example 갱신
   - 운영 .env 에 GENIE_BILLING_* 3 env 추가
   - PHP-FPM reload + nginx reload

3. **결제 사고 모니터링**:
   - paddle_events 테이블 모니터 (subscription_created / payment_failed 등)
   - app_user.plan 변경 audit log
   - error_log 의 `[Paddle]` prefix 추적

---

## 5. 미적용 트랙 (절대원칙 §6 보고)

| 항목 | 사유 | 별도 트랙 |
|---|---|---|
| Payment.php 코드 완전 삭제 | 운영 트래픽 일시적 보호 (404 vs 410 Gone 차이) — 단계 cleanup 권장 | N-152-G-billing-cleanup |
| menu_tier_pricing DB 컬럼 `price_krw` → `price_usd` rename + 환산 데이터 마이그레이션 | 운영 DB 변경 — 사용자 승인 + 환율 정책 결정 후 (예: 1 USD = 1300 KRW 환산 vs 신규 가격 책정) | N-152-G-pricing-data-migration |
| `Pricing.jsx` (679L) 자체 삭제 | redirect 만으로 사용자 영향 0, 코드 보존이 안전 | N-152-G-frontend-cleanup |
| paddle_subscriptions 의 currency != 'USD' 데이터 처리 | 현 운영 데이터 검토 필요 | 별도 |
| Apple Pay / Google Pay / PayPal 별도 차단 검증 | Paddle dashboard 설정 의무 | 운영자 작업 |
| 환불 정책 명문화 | 글로벌 표준 (7-day refund 등) | 별도 spec |
| VAT / 부가세 처리 | Paddle Merchant of Record 위임 | 자동 |
| Stripe / Lemon Squeezy 대체 검토 | 본 spec 의 Paddle 단일 결정 정합 | 검토 외 |

---

## 6. 검증 (수용 기준)

1. `/pricing` (public) — USD 가격 + Paddle Checkout + 카드 only
2. `/app-pricing` (인증) → `/pricing` 으로 자동 redirect
3. `GET /api/auth/payment/config` → **404** (Slim 미등록)
4. `POST /api/auth/payment/confirm` → **404**
5. Paddle Checkout 열기 → `allowedPaymentMethods: ['card']` 적용 확인
6. .env 의 `GENIE_BILLING_CURRENCY=USD` 명시
7. 푸터에 "Card payments only" 문구 노출

---

## 7. 본 spec 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 | 2026-05-26 | 168차 사용자 신규 지시 — USD 단일 + 카드 전용 + Paddle 단일 |

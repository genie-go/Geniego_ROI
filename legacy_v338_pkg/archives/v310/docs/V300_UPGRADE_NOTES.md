# V300 Launch-Final 패키지 (상용 런칭 직전 마감)

이 버전은 V299 상용 런칭 준비 패키지 위에, **실제 런칭 직전**에 필요한 마지막 요소를 한 번에 묶었습니다.

## 1) SSO(OIDC) 로그인: 토큰 검증 + 세션 + nonce/state
- `/v1/auth/oidc/start`: state/nonce 생성 및 authorize URL 생성
- `/v1/auth/oidc/callback`: (레퍼런스) id_token 검증(RS256 + JWKS) 후 session 발급
- 이후 모든 API 호출은 `Authorization: Bearer <session_token>` 방식으로 사용 가능
- state/nonce는 DB에 저장 후 1회 사용(consume) 처리

> 운영 환경에서는 callback에서 authorization code를 token endpoint로 교환하는 단계까지 확장하면 됩니다.

## 2) RBAC 기반 UI 보호
- `/v1/me`에서 사용자 권한(perms)을 받아 UI 메뉴를 자동 필터링
- 권한이 없으면 403 화면을 띄워 페이지 접근을 보호합니다.

## 3) Stripe 연동(레퍼런스)
- `billing_stripe_configs`에 키 저장
- `/v1/billing/stripe/checkout_session`로 Stripe Checkout Session 생성(REST 호출)
- `/v1/billing/stripe/webhook`로 이벤트 수신(서명 검증 스캐폴딩)

## 4) 정책 템플릿 × 플랜 번들
- `plan_policy_bundles`로 플랜에 정책 템플릿을 묶어 영업 패키징 가능
- 예: Starter/Pro/Enterprise 별 승인 정책/가드레일/보안 정책을 번들로 제공

## 5) Commerce Hub (멀티 판매몰)
- Amazon/Shopify/Qoo10/Rakuten/Coupang/Naver SmartStore/Cafe24용 커넥터 스텁 제공
- Gateway에 제품 업로드/가격 업데이트/주문 동기화/재고 동기화 API 제공
- 기본 구현은 “레퍼런스(스텁)”이며 실제 채널 API 호출은 connectors provider에서 확장합니다.


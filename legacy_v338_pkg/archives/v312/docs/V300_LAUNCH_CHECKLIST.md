# V300 Launch Checklist (실제 런칭 직전)

- [ ] Admin Console에서 OIDC Issuer/ClientID/RedirectURL/Scopes 및 JWKS 설정
- [ ] Stripe Secret/Webhook Secret 설정 + 플랜에 stripe_price_id 입력
- [ ] RBAC: 역할/권한 정책 정의(권한별 메뉴 확인)
- [ ] Policy Template을 Plan Bundle로 연결(영업 플랜별 기본 정책)
- [ ] Commerce Hub: 판매몰 커넥터 자격증명 저장/연동(Provider 확장)
- [ ] Webhook 엔드포인트 방화벽/레이트리밋/감사로그 확인

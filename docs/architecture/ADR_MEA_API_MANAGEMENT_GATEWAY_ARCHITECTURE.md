# ADR — MEA Part 042 Enterprise API Management & API Gateway Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part042 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 042는 API Management & API Gateway. ★**API Gateway·보안·RBAC·레이트리밋·버전 관리는 Part 001에서 확립된 대로 강하게 실재**: `index.php`(★단일 진입점·CORS·v421 api_key 미들웨어·RBAC roles viewer<connector<analyst<admin·scopes·289차후속 P1 전역 writeGuard·setBasePath /api·GT①)·`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML·GT①)·api_key(SHA-256·GT①)·전역 레이트리밋(282차)·버전 라우트(/v377~/v431). 부재=Developer Portal/Monetization/OpenAPI Catalog/SDK(제품화). 본 Part는 Developer Foundation(Part 041)/Data Platform(Part 001) 상속(재정의 금지).

## 결정
- **D-1 (Part 041/001/Data Platform 재정의 금지):** Developer Foundation(Part 041)·API Gateway(Part 001·`index.php`)·Security(Part 010~012)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (API Gateway = index.php 승격·★중복 게이트웨이 절대 금지):** API Gateway = `index.php`(단일 진입점·CORS·api_key 미들웨어·RBAC·writeGuard·basePath /api). ★Part 001 정본(inlined middleware·289차후속 전역 writeGuard·[[reference_api_prefix_routing]])·재구현 금지. ★중복 API Gateway 신설 절대 금지(값 분산=회귀). 형식 API Gateway=`index.php` 승격.
- **D-3 (API Security = OAuth/EnterpriseAuth/api_key 승격):** API Security = OAuth2/OIDC/JWT/SAML=`OAuth`/`EnterpriseAuth`·API Key=api_key(SHA-256·RBAC roles/scopes·write:*/admin:keys)·MFA=`UserAuth`·세션 토큰 hash-only(289차). ★인증/권한 정본(재구현 금지)·외부 벤더 JWT 오흡수 회피(289차 Part3-6). 형식 API Product/Subscription 인증=순신설.
- **D-4 (Developer Portal/Monetization/OpenAPI = 부재·순신설):** ★형식 Developer Portal(Interactive Docs/SDK Download/Testing Console/Subscription Management)·API Monetization·OpenAPI Catalog/API Registry·SDK Generation·GraphQL/Streaming API=**부재·순신설**(부재증명 완료). ★GeniegoROI는 API 소비 앱이지 API 제품 판매 플랫폼 아님(과대주장 금지). API Catalog seed=`routes.php`(2658 라우트)·Documentation=docs/챗봇(270차).
- **D-5 (Rate Limit/Runtime/AI = 헌법 정합):** Rate Limiting=전역(282차·MFA OTP 90s 289차)·Runtime=`index.php`(인증→권한→정책→라우팅)·Tenant=`Db.php`(X-Tenant-Id)·Traffic Encryption=nginx TLS·Audit=`SecurityAudit`. AI(설계 품질/보안 취약점/문서)=`security-scan.yml`(283차)/`AnomalyDetection`/챗봇·Explainability=헌법 V4·★AI API 자동 게시/운영 정책 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Developer/Data Platform/헌법 상속·재정의 금지·API Gateway(`index.php`)·Security(`OAuth`/`EnterpriseAuth`/api_key)·Rate Limiting(전역)·Versioning(버전 라우트)·api_key 관리(`ApiKeys`)·`SecurityAudit` 재사용(★중복 API Gateway/보안/RBAC/레이트리밋 절대 금지·Part 001 정본 재구현 금지)·형식 Developer Portal/Monetization/OpenAPI Catalog/SDK Generation만 신설(부재·과대주장 금지·API 제품화 착수 시). 실행은 API 제품화 결정 종속.

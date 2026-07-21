# MEA Part 042 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 042 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
index.php·routes.php·OAuth/EnterpriseAuth·api_key·rate-limit 전수 grep + 판독.

## 실존 substrate (★API Gateway·보안·RBAC·레이트리밋·버전 관리 강하게 실재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| API Gateway(단일 진입점) | CORS·api_key·RBAC·writeGuard | `index.php`(setBasePath /api:33·CORS:36·v421 api_key+RBAC:68·전역 writeGuard:72) | PARTIAL-strong |
| Request Routing | 버전 라우트 | `routes.php`(/v377~/v431·2658 라우트) | PARTIAL-strong |
| OAuth2/OIDC/JWT/SAML | 엔터프라이즈 인증 | `OAuth.php`·`EnterpriseAuth.php` | PARTIAL-strong |
| API Key | SHA-256·RBAC·scopes | api_key(viewer<connector<analyst<admin·write:*/admin:keys) | PARTIAL-strong |
| Rate Limiting | 전역 레이트리밋 | (282차·MFA OTP 90s 289차) | PARTIAL-strong |
| Versioning | 버전 라우트·구 버전 스텁 | `routes.php`(backwards compat) | PARTIAL-strong |
| api_key 관리 | 발급/폐기 | `ApiKeys`(/v421/keys·admin:keys) | PARTIAL-strong |
| Runtime(인증→권한→정책) | 미들웨어 체인 | `index.php`(v421) | PARTIAL-strong |
| API Catalog seed | 라우트 레지스트리 | `routes.php`·docs·챗봇(270차) | PARTIAL |
| Token/Secret | SHA-256·hash-only | api_key·세션 토큰(289차)·`ChannelCreds` | PARTIAL-strong |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — Developer Portal/Monetization/OpenAPI (grep 판정)
형식 Developer Portal(Interactive Documentation/SDK Download/Testing Console/Subscription Management/Usage Dashboard)·API Monetization·형식 OpenAPI Catalog/API Registry(OpenAPI Spec)·SDK Generation·API Product/Subscription·GraphQL/Streaming API·형식 API Analytics(Calls/Throughput/Subscription Stats)·Event 표준(APIRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal(Developer Portal·Monetization·OpenAPI Catalog·SDK).** ★API Gateway·보안·RBAC·레이트리밋·버전 관리는 **강하게 실재**: `index.php`(단일 진입점·CORS·api_key 미들웨어·RBAC·writeGuard·basePath /api)·`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML)·api_key(SHA-256·RBAC roles/scopes)·전역 레이트리밋(282차)·버전 라우트(/v377~/v431·backwards compat)·`ApiKeys`(/v421/keys 관리)·세션 토큰 hash-only(289차)이나, **형식 Developer Portal·Monetization·OpenAPI Catalog·SDK Generation·API Product/Subscription은 부재**(부재증명 완료). ★★핵심=**API Gateway·보안·버전 관리는 Part 001 정본으로 강함이나 형식 Developer Portal/Monetization/OpenAPI Catalog는 부재**(API 소비 앱·API 제품 판매 플랫폼 아님·과대주장 금지). 실행은 API 제품화 결정 후 신설 종속.

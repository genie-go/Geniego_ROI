# MEA Part 042 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = API Management 신설이 기존 API Gateway(`index.php`)·보안(`OAuth`/api_key)·레이트리밋과 중복 재정의하지 않도록 경계 확정. ★API Gateway 강하게 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| API Gateway | ★MEA Part 001·`index.php` | ★재정의 금지·재사용(정본) |
| API Security(OAuth/JWT) | ★MEA Part 010~012·`OAuth`/`EnterpriseAuth` | ★재정의 금지·재사용 |
| RBAC/api_key | ★MEA Part 001·api_key/`index.php` | ★재정의 금지·재사용 |
| Rate Limiting | ★전역 레이트리밋(282차) | ★재정의 금지·재사용 |
| Secret/Token | ★자격증명 규범·api_key/`ChannelCreds` | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 API Gateway/보안/RBAC/레이트리밋 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| API Gateway | 단일 진입점 미들웨어 | `index.php` | ★재사용(★중복 게이트웨이 신설 절대 금지·Part 001 정본) |
| OAuth2/OIDC/JWT | 엔터프라이즈 인증 | `OAuth`/`EnterpriseAuth` | ★재사용(중복 인증 금지) |
| API Key/RBAC | SHA-256·roles/scopes | api_key/`index.php` | ★재사용(★중복 RBAC 절대 금지) |
| Rate Limiting | 전역 | (282차) | ★재사용(★중복 레이트리밋 절대 금지) |
| Versioning | 버전 라우트 | `routes.php` | ★재사용(중복 버전 금지) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: API Gateway/보안/RBAC/레이트리밋 단일 정의·무후퇴=★중복 절대 금지(값 분산=회귀).
- ★`index.php` API Gateway(v421 api_key+RBAC·289차후속 전역 writeGuard·[[reference_api_prefix_routing]])=Part 001 정본·재구현 금지.
- ★OAuth2/OIDC/JWT/SAML=`OAuth`/`EnterpriseAuth`·외부 벤더 JWT 오흡수 회피(289차 Part3-6)·재구현 금지.
- ★전역 레이트리밋(282차)·MFA OTP 90s(289차)·세션 토큰 hash-only(289차)=정본·재구현 금지.
- ★[[feedback_competitive_gap_verify]]: Developer Portal/Monetization/OpenAPI Catalog 부재=부재증명(과대주장 금지·API 제품 아님).
- [[reference_platform_growth_actas_tenant_hijack]]: X-Tenant-Id 주입·Cross-Tenant API Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: API Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- API Gateway=`index.php` 승격(중복 금지·Part 001). 보안=`OAuth`/api_key. 레이트리밋=전역. Versioning=버전 라우트. ★Developer Portal/Monetization/OpenAPI Catalog/SDK=순신설(부재·API 제품화 착수 시).

## 판정
**중복 위험 최상(API Gateway 강하게 실재·Part 001 정본).** ★핵심=`index.php`(API Gateway)·`OAuth`/`EnterpriseAuth`(보안)·api_key(RBAC)·전역 레이트리밋·버전 라우트·`SecurityAudit`는 **재사용/승격**(★중복 API Gateway/보안/RBAC/레이트리밋 신설 절대 금지=값 분산=무후퇴 위반·Part 001 정본 재구현 금지). Part 001 API Gateway·Part 010~012 Security·전역 레이트리밋·자격증명 규범·헌법 **재정의 금지**. 본 Part 고유 순신설=★형식 Developer Portal(Interactive Docs/SDK Download/Testing Console/Subscription Management)·API Monetization·OpenAPI Catalog/API Registry·SDK Generation·API Product/Subscription·GraphQL/Streaming API(부재·부재증명 완료)뿐. ★API 소비 앱·API 제품 판매 플랫폼 아님·API 제품화 착수 시·과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI API 자동 게시/운영 정책 자동 변경 불가(V3+V5+CHANGE_GATE).

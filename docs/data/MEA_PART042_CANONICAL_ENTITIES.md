# MEA Part 042 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★index.php/OAuth/EnterpriseAuth/api_key/버전 라우트 재사용·Developer Portal/Monetization/OpenAPI Catalog 순신설·Part 041/001 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | API | 라우트 | `routes.php`(2658) | PARTIAL-strong |
| 2 | API_VERSION | 버전 라우트 | `routes.php`(/v377~/v431) | PARTIAL-strong |
| 3 | API_PRODUCT | 부재(형식 API Product) | — | ABSENT |
| 4 | API_GATEWAY | 단일 진입점 미들웨어 | `index.php`(v421) | PARTIAL-strong |
| 5 | API_CONSUMER | api_key 소비자(tenant) | api_key·`Db`(X-Tenant-Id) | PARTIAL-strong |
| 6 | API_KEY | SHA-256·RBAC·scopes | api_key/`ApiKeys`(/v421/keys) | PARTIAL-strong |
| 7 | CLIENT_APPLICATION | 부재(형식 Client App) | — | ABSENT |
| 8 | API_POLICY | RBAC/writeGuard/bypass | `index.php` | PARTIAL-strong |
| 9 | API_SUBSCRIPTION | 부재(형식 Subscription) | — | ABSENT |
| 10 | API_ANALYTICS | 이상/health(형식 부분) | `AnomalyDetection`·`/health` | PARTIAL-weak |
| 11 | API_DOCUMENT | docs·챗봇(OpenAPI 부재) | docs·챗봇(270차) | PARTIAL |
| 12 | API_RUNTIME | 미들웨어 체인 | `index.php` | PARTIAL-strong |
| 13 | API_STATUS | health·라우트 상태 | `/health` | PARTIAL |
| 14 | API_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | API_USAGE | api_key 사용(형식 부분) | api_key | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Internal/External/Partner=routes.php/index.php/PartnerPortal·REST=routes.php. ★GraphQL/Event/Streaming/형식 Registry=부재.
- **§7 Lifecycle(10)**: Versioning=버전 라우트(backwards compat)·Runtime=index.php·Testing=e2e. ★Design Review/Publication/Subscription=부분.
- **§8 Gateway(8)**: ★index.php(단일 진입점·CORS·api_key·RBAC·writeGuard·basePath)·Routing=routes·SSL=nginx·Rate Limit=전역(282차).
- **§9 Security(8)**: ★OAuth2/OIDC/JWT/SAML=OAuth/EnterpriseAuth·API Key=SHA-256·RBAC roles/scopes·MFA·hash-only. Mutual TLS/WAF/DDoS(인프라)=부분.
- **§10 Lifecycle Mgmt(8)**: Version Mgmt=버전 라우트·api_key 관리=/v421/keys·Documentation=docs. ★OpenAPI/SDK Generation/Subscription Approval=부재.
- **§11 Portal(8)**: API Catalog seed=routes.php·Documentation=docs/챗봇. ★Interactive Docs/SDK Download/Testing Console/Subscription Mgmt=부재.
- **§12 Analytics(8)**: Error/이상=AnomalyDetection·Availability=/health. ★Calls/Throughput/Subscription Stats=부재.
- **§13 Governance**: Naming/Version=CLAUDE.md 규약·Security Policy=index.php·Change Gate=CHANGE_GATE·Audit=SecurityAudit.
- **§14 Security**: Tenant(X-Tenant-Id)/RBAC/TLS/Token(SHA-256 hash-only)/Audit.
- **§18 AI**: 보안 취약점=security-scan.yml(283차)·문서=챗봇·장애=AnomalyDetection·Explainability=헌법 V4·API 자동 게시/정책 변경 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§4·§5·§6·§8·§12·§14=API/버전/게이트웨이/소비자/정책/런타임/감사) / PARTIAL(§10·§11·§13·§15) / ABSENT(§3·§7·§9 sub·API_PRODUCT/CLIENT_APPLICATION/API_SUBSCRIPTION·Developer Portal/Monetization/OpenAPI).** 코드 0. ★API Gateway(`index.php`)·보안(`OAuth`/api_key)·레이트리밋(전역)·버전 관리 재사용(★중복 절대 금지·Part 001 정본 재구현 금지)·Developer Portal/Monetization/OpenAPI Catalog/SDK 순신설(과대주장 금지)·Part 041/001 상속·★AI API 자동 게시/운영 정책 자동 변경 불가(V3+V5+CHANGE_GATE).

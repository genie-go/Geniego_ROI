# MEA Part 011 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 011 SPEC/ADR.

## 전수조사 방법
index.php/middleware/RBAC/api_key/routes/APIRegistry/AgencyPortal/PartnerPortal/OAuth/EnterpriseAuth/rateLimit/graphql/grpc/kafka/mtls/waf 키워드로 `backend` 전수 grep + 판독.

## 실존 substrate (★REST API 플랫폼·게이트웨이/레지스트리/인증 강함)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| API Gateway | ★CORS+api_key 미들웨어+RBAC+writeGuard+basePath | `public/index.php`(v421 auth·289차 writeGuard) | PARTIAL-strong |
| API Registry | ★버전 라우트 레지스트리 | `routes.php`(2658 매핑·/v377~v431) | PARTIAL-strong |
| Service Registry | API 레지스트리 문서 | `docs/registry/APIRegistry.md` | PARTIAL |
| API Security(OAuth/OIDC/JWT/SAML) | 엔터프라이즈 SSO·OAuth | `EnterpriseAuth.php`·`OAuth.php` | PARTIAL-strong |
| API Key/RBAC | SHA-256 api_key·role/scope | `index.php`·`ApiKeys.php`(Part 3-6) | PARTIAL-strong |
| Rate Limiting | 전역 레이트리밋(282차)·throttle | `recoveryThrottle`·login_attempt·`captureRateOk` | PARTIAL-strong |
| Partner Integration | 대행사/파트너 등록·credential·구독·승인 | `AgencyPortal.php`·`PartnerPortal.php` | PARTIAL-strong |
| Credential Management | AES-256-GCM 비밀 | `Crypto`(channel_credential) | PARTIAL |
| Protocol Adapter | 채널 어댑터 | `ChannelSync.php`·`AdAdapters.php` | PARTIAL |
| Routing | Slim+Tenant(X-Tenant)·basePath | `index.php`·`Db.php` | PARTIAL |
| Audit/Monitoring | 해시체인·health·알림 | `SecurityAudit.php`·health·`Alerting.php` | 실재/PARTIAL |

## 부재(ABSENT-formal) — GraphQL/gRPC/이벤트버스/mTLS/WAF (grep 0)
형식 API Gateway 제품(Kong/Apigee) · **GraphQL/gRPC** · **Message Queue/Event Bus/Kafka/MQTT/AMQP** · **mTLS** · **WAF** · Canary/Region/Dynamic Routing · Contract Validation(OpenAPI)/Version Negotiation · **SLA Management** · Load Balancing · Service Mesh · Integration Monitoring Dashboard(형식 API Metrics) · Event 표준(APIRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★REST API 플랫폼의 게이트웨이(`index.php`)·레지스트리(`routes.php` 2658)·인증(OAuth2/OIDC/JWT/api_key/RBAC/writeGuard)·파트너 통합(Agency/Partner)·레이트리밋(282차)·credential(Crypto)·프로토콜 어댑터(ChannelSync/AdAdapters)는 실 강하나, **GraphQL/gRPC/Kafka/이벤트버스/mTLS/WAF/Canary Routing/Contract negotiation/SLA는 전무**(단일 호스트 REST). 실행은 선행 Part 001~010 + 형식 API Gateway 제품/스트리밍 인프라 종속.

# MEA Part 011 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★index.php Gateway·routes.php Registry·OAuth/api_key/RBAC·Agency/Partner 재사용·형식 GraphQL/gRPC/Event Bus greenfield·Part 001~010 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | INTEGRATION_SERVICE | 커넥터/핸들러 통합 | `ChannelSync`·`Connectors` | PARTIAL |
| 2 | API_SERVICE | REST 엔드포인트 핸들러 | `routes.php` | PARTIAL-strong |
| 3 | API_ENDPOINT | 버전 라우트 | `routes.php`(2658) | PARTIAL-strong |
| 4 | API_CONTRACT | 부재(OpenAPI)·라우트 스키마 | — | ABSENT-formal(seed 라우트) |
| 5 | API_VERSION | /v{NNN} 버전 | `routes.php` | PARTIAL-strong |
| 6 | SERVICE_REGISTRY | API 레지스트리 | `docs/registry/APIRegistry.md`·`routes.php` | PARTIAL |
| 7 | INTEGRATION_FLOW | 커넥터 sync 흐름 | `ChannelSync` | PARTIAL |
| 8 | PROTOCOL_ADAPTER | 채널 어댑터 | `ChannelSync`·`AdAdapters` | PARTIAL |
| 9 | PARTNER_CONNECTION | 대행사/파트너 | `AgencyPortal`·`PartnerPortal` | PARTIAL-strong |
| 10 | EVENT_CHANNEL | 부재(Event Bus)·SSE/webhook | `LiveCommerce`(SSE)·webhook | PARTIAL-seed |
| 11 | ROUTING_RULE | Slim+Tenant·basePath | `index.php`·`Db.php` | PARTIAL |
| 12 | TRANSFORMATION_MAPPING | 채널→표준 매핑 | `ChannelSync`(Part 010) | PARTIAL |
| 13 | API_POLICY | RBAC/scope/writeGuard/rate | `index.php` | PARTIAL-strong |
| 14 | API_USAGE | use_count(passive) | `api_key.use_count` | PARTIAL-informal |
| 15 | API_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |

## §6~§16 표준 판정
- **§6 Integration 유형(10)**: REST(`routes.php`)·WebSocket/SSE(`LiveCommerce`)·Partner Connector(`AgencyPortal`)·File(`MediaHost`). GraphQL/gRPC/Message Queue/Event Bus=ABSENT.
- **§7 API Exchange**: Request Validation(인라인)·Rate Limiting(282차)·Routing(Slim)·Version(/v{NNN}). Contract/Load Balancing=ABSENT.
- **§8 Protocol**: HTTPS(nginx)·WebSocket/SSE·Adapter=`ChannelSync`/`AdAdapters`. gRPC/MQTT/AMQP/Kafka/SFTP=ABSENT.
- **§9 Partner Integration**: `AgencyPortal`/`PartnerPortal`(등록/credential/구독/승인)·SLA=ABSENT.
- **§10 Routing**: Static(Slim)·Tenant(X-Tenant)·basePath. Dynamic/Region/Canary/Failover=ABSENT.
- **§11 API Security**: ★OAuth2/OIDC/JWT/SAML=`EnterpriseAuth`/`OAuth`·API Key/RBAC=`index.php`·Signature=`Crypto`/webhook HMAC. mTLS/WAF=ABSENT.
- **§12 Runtime**: ★`index.php` 미들웨어(Auth/Authz/Rate Limit/Audit) 실재. Contract/Response Validation=순신설.
- **§16 AI**: 이상=`AnomalyDetection`·Contract 직접변경/배포 불가=헌법 V3+배포 승인. 트래픽/최적화=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§2·§3·§5·§9·§13·§15=API Endpoint/Version/Partner/Policy/Audit) / PARTIAL(§1·§6~8·§10~12·§14) / ABSENT-formal(§4 Contract·GraphQL/gRPC/Event Bus/mTLS/WAF).** 코드 0. ★index.php(Gateway)/routes.php(Registry)/OAuth·api_key·RBAC(Security)/Agency·Partner/레이트리밋/Crypto 재사용(★중복 게이트웨이/인증/레지스트리/레이트리밋 절대 금지)·형식 GraphQL/gRPC/Event Bus/mTLS/WAF 신설·Part 001~010 상속·AI Contract 직접변경/배포 불가(V3+배포 승인).

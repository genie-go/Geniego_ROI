# MEA Part 011 — Index (Enterprise Data Integration & API Exchange Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 011 (Data Integration & API Exchange) 산출 문서 색인. ★MEA Part 001~010 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART011_DATA_INTEGRATION_API_EXCHANGE_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_INTEGRATION_API_EXCHANGE_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~010 상속·index.php Gateway/routes Registry 승격) |
| `docs/data/MEA_PART011_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART011_DUPLICATE_AUDIT.md` | GT② Gateway/Registry/Auth·Part 004/3-6 중복 경계 |
| `docs/data/MEA_PART011_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Integration/API/Security 판정 |
| `docs/data/MEA_PART011_GOVERNANCE_MECHANISMS.md` | §11~18 Security/Runtime/API/Event/Monitoring/AI |
| `docs/data/MEA_PART011_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(REST API 플랫폼·게이트웨이/레지스트리/인증 강함):** ★API Gateway=`public/index.php`(Slim bootstrap+CORS+api_key 미들웨어+RBAC(role viewer<connector<analyst<admin+scope)+**writeGuard 289차 서버전역**+basePath `/api` 감지) · API Registry=`routes.php`(**2658 매핑**·버전 /v377~v431) · Service Registry=`docs/registry/APIRegistry.md` · API Security=OAuth2/OIDC/JWT/SAML(`EnterpriseAuth`/`OAuth`)+api_key(SHA-256·Part 3-6)+RBAC · Partner Integration=`AgencyPortal`/`PartnerPortal`(등록/credential/구독/승인) · Rate Limiting=282차 전역+`recoveryThrottle`+login_attempt · Credential=`Crypto`(AES-256-GCM) · Protocol Adapter=`ChannelSync`/`AdAdapters` · Routing=Slim+Tenant(X-Tenant) · Audit=`SecurityAudit` · Monitoring=health/`Alerting`.
- **ABSENT-formal(스트리밍/멀티노드 인프라 greenfield):** 형식 API Gateway 제품(Kong/Apigee) · **GraphQL/gRPC** · **Message Queue/Event Bus/Kafka/MQTT/AMQP** · **mTLS** · **WAF** · Canary/Region/Dynamic Routing · Contract Validation(OpenAPI)/Version Negotiation · **SLA Management** · Load Balancing · Service Mesh · API Metrics Dashboard · Event 표준(APIRegistered 등).
- **★핵심:** 본 Part는 MEA 중 substrate가 가장 강함 — GeniegoROI가 **REST API 플랫폼 자체**라 게이트웨이(index.php·이번 세션 전 보안감사의 대상)·레지스트리(routes.php 2658)·인증(OAuth/api_key/RBAC/writeGuard)·파트너 통합(Agency/Partner)·레이트리밋이 실 강함. GraphQL/gRPC/이벤트버스/mTLS/WAF만 신설.
- **★재사용(★중복 게이트웨이/인증/레지스트리/레이트리밋/파트너 신설 절대 금지):** `index.php`(Gateway)·`routes.php`(Registry)·`EnterpriseAuth`/`OAuth`/api_key/RBAC(Security)·`AgencyPortal`/`PartnerPortal`(Partner)·전역 레이트리밋·`Crypto`(Credential)·`ChannelSync`/`AdAdapters`(Adapter)·`SecurityAudit`(Audit). Part 004 Metadata·Part 3-6 Service Identity·헌법 재정의 금지. AI=Contract 직접변경/배포 불가(V3+배포 승인)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[reference_api_prefix_routing]](신규 실배선=/api 접두·Gateway basePath) · [[project_n289_post_writeguard_server_enforcement]](writeGuard 서버전역=API Gateway authorization 정본) · [[reference_platform_growth_actas_tenant_hijack]](Tenant Routing 고착 방지) · [[reference_menu_audit_log_not_tamper_evident]](API Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~010 + 형식 API Gateway 제품/스트리밍 인프라).

## 다음
MEA Part 012 — Enterprise Data Platform Operations & Governance Architecture(본 Integration 상속·확장·중복 정의 금지).

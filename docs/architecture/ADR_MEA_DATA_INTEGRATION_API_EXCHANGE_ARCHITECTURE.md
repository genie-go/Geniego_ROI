# ADR — MEA Part 011 Enterprise Data Integration & API Exchange Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part011 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 011은 Data Integration & API Exchange. ★GeniegoROI는 **REST API 플랫폼 자체**로 substrate가 강하다 — `index.php`(API Gateway: CORS+api_key 미들웨어+RBAC(role/scope)+writeGuard 289차+basePath `/api` 감지)·`routes.php`(2658 매핑·버전 API Registry /v377~v431)·`EnterpriseAuth`/`OAuth`(OAuth2/OIDC/JWT/SAML)·api_key(Part 3-6)·`AgencyPortal`/`PartnerPortal`(Partner Integration)·전역 레이트리밋(282차)·`Crypto`(Credential). 단 GraphQL/gRPC/Kafka/이벤트 버스/mTLS/WAF는 부재. 본 Part는 Part 001~010 상속(재정의 금지).

## 결정
- **D-1 (Part 001~010·헌법·EPIC 06-A 상속·재정의 금지):** API Metadata(Part 004)·Event/CDC(Part 009)·Transformation(Part 010)·Service Identity(api_key·Part 3-6)를 준수·인용. 중복 정의 금지.
- **D-2 (API Gateway = index.php 승격):** API Gateway = `public/index.php`(Slim bootstrap+CORS+api_key 미들웨어+RBAC viewer<connector<analyst<admin+scope+writeGuard 289차 서버전역+basePath 감지). 형식 게이트웨이는 이를 승격(중복 게이트웨이/미들웨어 신설 절대 금지·[[project_n289_post_writeguard_server_enforcement]]).
- **D-3 (API/Service Registry = routes.php/docs/registry 승격):** API Registry = `routes.php`(2658 매핑·버전 /v{NNN})·Service Registry = `docs/registry/APIRegistry.md`. 형식 Registry는 통합 인덱싱(중복 라우트 레지스트리 신설 금지·[[reference_api_prefix_routing]]).
- **D-4 (API Security/Partner = OAuth/RBAC/api_key/Agency 재사용):** OAuth2/OIDC/JWT/SAML=`EnterpriseAuth`/`OAuth`·API Key/RBAC=`index.php`·Rate Limiting=282차 전역+`recoveryThrottle`+login_attempt·Partner Integration=`AgencyPortal`/`PartnerPortal`(등록/credential/구독/승인)·Credential=`Crypto`(AES-256-GCM). 중복 인증/레이트리밋/파트너 로직 신설 금지. mTLS/WAF=순신설(단일 호스트라 우선순위 낮음).
- **D-5 (GraphQL/gRPC/Event Bus/Kafka = ABSENT·조기구현 금지·AI 제약):** GraphQL/gRPC/Message Queue/Event Bus/Kafka/MQTT/AMQP·Canary/Region Routing·Contract negotiation·SLA·Load Balancing·Service Mesh는 스트리밍/멀티노드 인프라 전제라 부재(Part 007/047 정합). 조기구현 금지(블라인드 스켈레톤 방지). Protocol Adapter=`ChannelSync`/`AdAdapters`. AI(API 이상/트래픽 예측)=`AnomalyDetection`·API Contract 직접변경/배포 불가=헌법 V3+배포 승인. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Tenant Routing=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~010/헌법 상속·재정의 금지·index.php(Gateway)/routes.php(Registry)/EnterpriseAuth·OAuth·api_key·RBAC(Security)/Agency·PartnerPortal(Partner)/레이트리밋/Crypto 재사용(중복 게이트웨이/인증/레지스트리 신설 절대 금지)·형식 GraphQL/gRPC/Event Bus/mTLS/WAF만 신설(조기구현 금지). 실행은 선행 Part 001~010 종속.

# MEA Part 011 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 API Security (8)
OAuth2 · OpenID Connect · JWT · mTLS · API Key · Request Signature · IP Allow List · WAF.
- 판정 **PARTIAL-strong**. ★OAuth2/OIDC/JWT/SAML=`EnterpriseAuth.php`/`OAuth.php`·API Key=`index.php`(SHA-256 해시 조회·api_key table·Part 3-6)·RBAC(role viewer<connector<analyst<admin+scope+**writeGuard 289차 서버전역**·[[project_n289_post_writeguard_server_enforcement]])·Request Signature=`Crypto`(HMAC)/webhook HMAC·IP Allow List=일부(webhook). **mTLS/WAF=ABSENT**(단일 호스트라 우선순위 낮음·순신설).

## §12 Runtime 규칙
Contract 검증 · Authentication · Authorization · Rate Limit · Request Logging · Response Validation · Audit.
- 판정 **PARTIAL-strong**. ★`public/index.php` 미들웨어 실재: Authentication(Bearer/api_key)·Authorization(RBAC/writeGuard 289차)·Rate Limit(282차 전역 레이트리밋)·Request Logging/Audit(`SecurityAudit`·auth_audit_log). Contract/Response Validation(형식 OpenAPI)=순신설.

## §13 API 표준 (8)
Register/Publish/Subscribe/Invoke API · Validate Contract · Query Service Registry · Get API Metrics · Revoke API Access.
- **PARTIAL**. Register=`routes.php`+`ApiKeys`·Subscribe=`AgencyPortal`·Revoke=`ApiKeys` rotate/revoke seed·Query Registry=`docs/registry/APIRegistry.md`. Publish/Contract/Metrics=ABSENT. Register/Revoke=admin:keys 게이트(Part 3-6).

## §14 Event 표준 (8)
APIRegistered · APIPublished · APIInvoked · APIFailed · ContractValidated · PartnerConnected · IntegrationCompleted · APIRevoked.
- **ABSENT**(event-driven 부재·Part 001~010 정합·`SecurityAudit`가 API 호출/실패 로그 대체·내부 이벤트버스 후 신설).

## §15 Monitoring (10)
API Availability · Response Time · Error Rate · Throughput · Auth Failure · SLA · Partner Usage · Event Delivery · Integration Health.
- 판정 **PARTIAL**. Availability=health check·Auth Failure=login_attempt/`SecurityAudit`·Alert=`Alerting`·Partner Usage=`api_key.use_count`. 형식 API Metrics Dashboard(Response Time/Throughput/SLA)=순신설.

## §16 AI Integration
API 이상 탐지 · 트래픽/장애 예측 · API 최적화 추천 · Contract 변경 영향 분석 · 병목 분석 · Partner 사용 패턴 · Routing 최적화 · API Contract 직접 변경/배포 불가.
- 판정 **PARTIAL**(헌법 정합). API 이상 탐지=`AnomalyDetection`. ★API Contract 직접 변경/배포 불가=데이터 헌법 V3(수집≠사용)+배포 승인 필수([[feedback_deploy_approval_mandatory]]). 트래픽/장애 예측·최적화/병목 분석=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §17 성능 요구사항
API 응답 ≤300ms · 인증 ≤100ms · Routing ≤50ms · Event 전달 ≤500ms · Availability ≥99.99% · Gateway ≥100k TPS. — 벤치 대상 미존재(단일 호스트 TPS 한계).

## §18 Completion Criteria
Integration Hub·API Gateway·Service Registry·Partner Integration·Routing·Security·Runtime·API/Event·Monitoring·AI 구현.
- **현재 미충족**(형식 API Gateway 제품·GraphQL/gRPC/Event Bus·mTLS/WAF·SLA·Contract validation·Event 표준 ABSENT·코드 0). ★단 REST API Gateway/Registry/Auth/Partner/Rate-Limit는 실 강함.

## 종합 판정
전 메커니즘 **PARTIAL-strong/ABSENT-formal** — API Gateway(index.php)·Registry(routes.php)·Security(OAuth/api_key/RBAC/writeGuard)·Partner(Agency/PartnerPortal)·Rate Limit(282차)·Credential(Crypto)·Adapter(ChannelSync/AdAdapters)·Audit는 재사용(★중복 게이트웨이/인증/레지스트리/레이트리밋/파트너 절대 금지·비교적 강함), **형식 GraphQL/gRPC·Message Queue/Event Bus/Kafka·mTLS/WAF·Canary/Region Routing·Contract negotiation·SLA·Load Balancing·Service Mesh·API Metrics Dashboard·Event 표준은 스트리밍/멀티노드 인프라 전제라 순신설**. Part 001~010/헌법 재정의 금지. 코드 변경 0.

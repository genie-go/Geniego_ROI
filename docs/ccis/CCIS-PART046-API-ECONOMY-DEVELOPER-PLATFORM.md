# GeniegoROI Claude Code Implementation Specification

# CCIS Part046 — Enterprise API Economy, API Product Management & Developer Platform Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise API Economy·API Product Management·Developer Platform 표준을 수립한다.

> ★**성격(축 분리 — "내부 API 관리" 실재 vs "API-as-a-Product 비즈니스" 사업범위 밖)**: 이 저장소는 **SaaS
> 제품**이지 **API 를 상품으로 판매하는 API-Economy 플랫폼이 아니다**. 명세가 다루는 **형식 API Product
> Management·API Marketplace·API Monetization(usage-based API 과금)·Developer Portal(interactive docs/API
> console)·SDK 자동생성·OpenAPI 3.x/AsyncAPI 스펙·Partner API 프로그램·Rate Plan(API 판매)**은 이 제품의
> **사업 범위 밖(out of scope)**이라 **부재**한다(grep 0). ★결함이 아니라 정직한 비적용(MEA 064 "out of
> scope"·Part035~045 어휘 재적용). ★**실재 축(내부 API 거버넌스)**: **`Keys`**(v421·**API 키 lifecycle**·
> 발급/list/**rotate**/revoke/whoami·scope `admin:keys`·SHA-256·테넌트 격리)·**api_key RBAC+Scope**
> (viewer<connector<analyst<admin·write:*/write:ingest·Part030)·**버전 라우팅**(`/v{NNN}`·Part011)·
> **`AccessReview`**(휴면/만료 키 검토·Part030)·**Rate Limiting**(로그인·`PlanLimits` 쿼터)·**OAuth Client**
> (외부 채널·Part030/042)·**연동허브 발급 가이드**(`GeniegoKnowledge`·`OpenPlatform` webhook) 는 실재한다.
> ★★**오흡수 차단**: **연동허브=외부 채널 API 키를 사용자가 등록(외부 API 소비)이지 자사 API marketplace 아님**
> · **`OpenPlatform`=webhook emit(아웃바운드)이지 API Product Platform 아님** · **구독 빌링(Paddle/Stripe)=
> SaaS 구독이지 API usage 과금 아님**. Part001 §4 에 따라 실측 → Marketplace/SDK Gen/Monetization 부재증명 →
> api_key+버전 라우팅+Keys+AccessReview 성문화했다. ★정본=**Part011(API Design)·Part030(IAM api_key RBAC)·
> Part028(Connector)** 승계. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 API 관리 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| API Platform Architecture | Portal→Gateway→Product→Services | **부분(내부)** — `index.php` 미들웨어(auth/RBAC)→routes.php→핸들러. Developer Portal/Product 계층 아님 |
| API Product Management | Product ID/Version/Visibility | **부재(out of scope)** — API 를 제품으로 관리 안 함. 버전=`/v{NNN}` 라우팅 |
| API Marketplace | Public/Partner/Private API | **부재(out of scope)** — API 마켓플레이스 없음. 연동허브=**외부 API 소비**(자사 API 판매 아님) |
| API Monetization | Free/Usage/Transaction 과금 | **부재(out of scope)** — API 과금 없음. 구독 빌링(Paddle/Stripe)=**SaaS 구독**(API usage 아님) |
| Developer Portal | Catalog/Docs/SDK/Console | **부재(out of scope)** — 개발자 포털 없음. 연동허브(채널 키 발급 가이드)는 소비자용 |
| API Subscription | Request/Approval/Plan | **부분(대응물)** — 구독=SaaS 플랜(`PlanLimits`·Paddle). API 구독 승인 워크플로 아님 |
| API Key Management | Issue/Rotation/Expiration/Revoke | ★**실재** — `Keys`(v421·발급/**rotate**/revoke/whoami·scope admin:keys·SHA-256·expires_at) |
| OAuth Client Management | Client/Secret/Redirect/Scope | ★**부분 준수** — `OAuth`(외부 채널 client·state CSRF·Part042)·`EnterpriseAuth`(OIDC client). 자사 OAuth 서버 부분 |
| API Lifecycle | Design→Publish→Deprecate→Retire | **부분** — `/v{NNN}` 버전(구버전 stub 유지·Part011). 형식 lifecycle 상태머신 아님 |
| SDK Generation | OpenAPI 기반 SDK | **부재(out of scope)** — SDK 생성기 없음(OpenAPI 스펙 부재) |
| API Documentation | OpenAPI 3.x/Playground | **부분** — `docs/V*` 명세·`backend/README`·연동허브 가이드. OpenAPI/Swagger UI 부재 |
| API Analytics | Request/Error/Consumers/Revenue | **부분** — `ai_call_log`·`SystemMetrics`·error_log. API Product Analytics/Revenue 없음 |
| API Version Governance | SemVer/Backward Compat/Deprecation | ★**부분 준수** — `/v{NNN}` 버전(구버전 stub·하위호환)·신규=최신 prefix. Migration Guide 부분 |
| Rate Plan Management | Free/Standard/Premium 호출제한 | **부분(대응물)** — `PlanLimits`(플랜 쿼터·402)·로그인 rate-limit. API Rate Plan 판매 아님 |
| Partner API | Registration/Scope/SLA | **부분** — `api_key`(connector role·scope)·`PartnerPortal`. 형식 Partner API 프로그램 부분 |
| Monitoring | Availability/Latency/Revenue | **부분** — `SystemMetrics`·`Alerting`·nginx. API Revenue 대상 없음 |
| Logging | Product/Client/Request ID | **부분** — `SecurityAudit`·`ai_call_log`·error_log. Product/Request ID 부분 |
| Security(OAuth2.1/OIDC/Key Encrypt/RBAC/Rate Limit) | API 보안 | ★**준수** — api_key SHA-256·RBAC+Scope·OIDC(Part030)·rate-limit·`Crypto` |
| Compliance | API 데이터 정책 | **부분** — `SecurityAudit`·PII 미저장·테넌트 격리 |
| Disaster Recovery | Product/Portal/Subscription 복구 | **부분** — DB 백업(`api_key`/plan_config). Product/Portal 대상 없음 |
| Performance(Response/SDK/Doc Cache) | 대규모 API | **부분** — HTTP 캐시(Part017). SDK/Doc 캐시 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(API First/Product Driven/Developer Friendly/Contract First/Usage Measurable/Monetization Ready/Version Controlled/Tenant Isolated) | **부분(내부축)** | ★API First·Secure by Default·Version Controlled(`/v{NNN}`)·Tenant Isolated. Product Driven/Monetization=out of scope |
| §4 API Platform Architecture | **부분(내부)** | 미들웨어→routes→핸들러. Developer Portal/Product 계층 아님 |
| §5 API Product Management | **부재(out of scope)** | API 제품 관리 안 함. 버전=`/v{NNN}` |
| §6 API Marketplace | **부재(out of scope)** | 마켓플레이스 없음. 연동허브=외부 API 소비 |
| §7 API Monetization | **부재(out of scope)** | API 과금 없음. 구독=SaaS(API usage 아님) |
| §8 Developer Portal | **부재(out of scope)** | 개발자 포털 없음 |
| §9 API Subscription | **부분(대응물)** | SaaS 플랜 구독(`PlanLimits`/Paddle). API 구독 아님 |
| §10 API Key Management | **★실재** | `Keys`(발급/rotate/revoke/whoami·scope·SHA-256) |
| §11 OAuth Client Management | **부분 준수** | `OAuth`(외부 채널)·`EnterpriseAuth`(OIDC). 자사 OAuth 서버 부분 |
| §12 API Lifecycle | **부분** | `/v{NNN}`(구버전 stub). 형식 lifecycle 아님 |
| §13 SDK Generation | **부재(out of scope)** | SDK 생성기 없음(OpenAPI 부재) |
| §14 API Documentation | **부분** | `docs/V*`·연동허브 가이드. OpenAPI/Swagger 부재 |
| §15 API Analytics | **부분** | `ai_call_log`·`SystemMetrics`. Product Analytics/Revenue 없음 |
| §16 API Version Governance | **부분 준수** | `/v{NNN}`(하위호환·구버전 stub). Migration Guide 부분 |
| §17 Rate Plan Management | **부분(대응물)** | `PlanLimits`·rate-limit. API Rate Plan 판매 아님 |
| §18 Partner API | **부분** | `api_key`(connector scope)·`PartnerPortal`. 형식 Partner 프로그램 부분 |
| §19 Monitoring | **부분** | `SystemMetrics`·`Alerting`. API Revenue 없음 |
| §20 Logging | **부분** | `SecurityAudit`·`ai_call_log`. Product/Request ID 부분 |
| §21 Security | **★준수** | api_key SHA-256·RBAC+Scope·OIDC·rate-limit·`Crypto` |
| §22 Compliance | **부분** | `SecurityAudit`·PII 미저장·테넌트 격리 |
| §23 Disaster Recovery | **부분** | DB 백업(`api_key`/plan_config) |
| §24 Performance | **부분** | HTTP 캐시. SDK/Doc 캐시 없음 |
| §25~§26 PHP/Claude(Product/Portal/Subscription/SDK Generator Service) | **부분** | ★`Keys`·api_key RBAC·`/v{NNN}`·`AccessReview`. Product/Portal/SDK Gen 부재 |
| §27~§28 검증(api:platform:health/developer:portal/subscription) | **대상 없음** | artisan 없음·Portal/Product 없음. `Keys` API·`AccessReview`·`PlanLimits` 로 대체 |

---

## 4. 확립된 표준 (신규 API 관리 코드가 따를 정본)

- ★**API 키 정본 = `Keys`**(v421·발급/rotate/revoke/whoami·scope `admin:keys`·SHA-256·expires_at). 신규 키 관리는 이 핸들러 확장. ★**키 발급/조회는 민감** → `auth_tenant`(미들웨어 주입)만 신뢰·raw X-Tenant-Id 폴백 금지(227차·교차테넌트 위조 차단).
- ★**인증/인가 = api_key RBAC+Scope**(viewer<connector<analyst<admin·write:*/write:ingest/admin:keys·Part030). 신규 엔드포인트는 이 미들웨어 게이트. Bot/Device identity=api_key(신설 금지).
- ★**버전 거버넌스 = `/v{NNN}` 라우팅**(Part011). 신규는 최신 prefix·구버전 stub 유지(하위호환). `/api/...` alias 변형·public bypass 리스트 동시 갱신(index.php).
- ★**휴면/만료 키 = `AccessReview`**(Part030·회수=api_key `is_active=0`·증거 필수·fail-secure admin). 정기 검토.
- ★**Rate/쿼터 = `PlanLimits`(플랜 쿼터·402)+로그인 rate-limit**(Part045). API Rate Plan 판매 아님.
- ★★**오흡수 차단**: **연동허브=외부 채널 API 소비(사용자가 채널 키 등록)이지 자사 API marketplace 아님** · **`OpenPlatform`=webhook emit(아웃바운드)이지 API Product 아님** · **구독 빌링=SaaS 구독이지 API usage 과금 아님**. 혼동·오흡수 금지.
- ★**사업범위 원칙**: **API-as-a-Product(Marketplace/Monetization/Developer Portal/SDK Gen)는 이 제품 범위 밖**(SaaS 제품이지 API 판매 비즈니스 아님) — 제품결정 전 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — API-as-Product 대부분 out of scope)

1. **형식 API Product Management·API Marketplace·API Monetization(usage 과금)** — 안 함. **사업 범위 밖**(SaaS 제품이지 API 를 상품으로 파는 API-Economy 비즈니스 아님). 구독은 SaaS 플랜(Paddle/Stripe)이지 API usage 과금 아님.
2. **Developer Portal(interactive docs/API console)·SDK 자동생성·OpenAPI 3.x/AsyncAPI 스펙** — 안 함. 내부/파트너 연동은 `docs/V*`·`backend/README`·연동허브 가이드. OpenAPI 스펙/SDK 생성기 미도입.
3. **형식 Partner API 프로그램·API Rate Plan(판매)** — 부분. `api_key`(connector scope)·`PartnerPortal`·`PlanLimits`가 대응물. 형식 파트너 API 등록/SLA 부분.
4. **API Product Analytics/Revenue 대시보드** — 부분. `ai_call_log`·`SystemMetrics`. API 제품 수익 분석 없음(API 과금 없음).
5. **연동허브/`OpenPlatform`/구독을 API-Economy 로 오흡수 금지** — 연동허브=외부 API 소비·`OpenPlatform`=webhook·구독=SaaS. 자사 API 판매 아님.
6. **artisan `api:platform:*`/`developer:portal`/`subscription:status` 명령** — 없음(Slim·Portal/Product 없음). `Keys` API·`AccessReview`·`PlanLimits` 로 대체.

★**준수하는 실 원칙(내부 API 거버넌스)**: **`Keys`(키 lifecycle·rotate·민감 tenant 위조 차단)·api_key RBAC+Scope·`/v{NNN}` 버전(하위호환·구버전 stub)·`AccessReview`(휴면키)·rate-limit/쿼터·OAuth client·`SecurityAudit`·테넌트 격리·PII 미저장**. ★**오흡수 차단**: 연동허브/OpenPlatform/구독≠API-Economy. ★**out of scope 정직 선언**: API-as-a-Product 는 이 SaaS 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. API 키=`Keys`(발급/rotate/revoke·scope admin:keys·SHA-256) 확장. ★키 발급/조회는 `auth_tenant`만 신뢰(raw 헤더 위조 차단·227차).
2. 인증/인가=api_key RBAC+Scope 미들웨어(Part030). 신규 엔드포인트=`/v{NNN}` 최신 prefix·구버전 stub 유지·public bypass 리스트 동시 갱신.
3. 휴면키=`AccessReview`(회수=is_active=0·증거 필수). Rate/쿼터=`PlanLimits`+rate-limit.
4. ★★**오흡수 금지**: 연동허브(외부 API 소비)/`OpenPlatform`(webhook)/구독(SaaS)을 자사 API marketplace/monetization 으로 표기하지 않는다.
5. ★**API Marketplace/Monetization/Developer Portal/SDK Gen 을 선이식하지 않는다** — SaaS 제품 사업 범위 밖(제품결정 선행).
6. OpenAPI/Swagger/SDK 생성기/API Product 계층을 "명세에 있다"는 이유로 이식하지 않는다(`Keys`+api_key RBAC+`/v{NNN}`+`AccessReview` 로 커버).

---

## 7. Completion Criteria

- [x] API 관리 스택 **실측**(API Marketplace/Monetization/Developer Portal/SDK Gen/OpenAPI 부재·`Keys`·api_key RBAC+Scope·`/v{NNN}`·`AccessReview`·rate-limit 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(API-as-a-Product **out of scope** 증명·내부 API 거버넌스 실재)
- [x] 실 API 관리(Keys+api_key RBAC+버전 라우팅+AccessReview+PlanLimits) 성문화(§4)
- [x] ★키 lifecycle(rotate·tenant 위조 차단)·RBAC+Scope·버전 하위호환·휴면키 검토·★★오흡수 차단(연동허브/OpenPlatform/구독≠API-Economy) 명시
- [x] 의도적 미적용 + 사유(§5) — API Marketplace/Monetization/Developer Portal/SDK Gen/OpenAPI/Partner API 프로그램
- [x] Claude Code 규칙(§6) · `Keys`·api_key RBAC·`/v{NNN}`·`AccessReview`·`PlanLimits` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **내부 API 거버넌스**(`Keys` 키 lifecycle + api_key RBAC+
> Scope + `/v{NNN}` 버전 + `AccessReview` 휴면키 + rate-limit)의 성문화이지 API Marketplace/Monetization/
> Developer Portal/SDK Gen 이식이 아니다. ★★**오흡수 차단**: **연동허브(외부 API 소비)·`OpenPlatform`(webhook)·
> 구독(SaaS)은 자사 API-Economy 가 아니다**. ★**out of scope 정직 선언**: API-as-a-Product 는 이 SaaS 제품 범위
> 밖이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part047 — Enterprise Digital Workspace, Collaboration, Knowledge Management & Productivity** — ★사전 실측 예고: 형식 협업 스위트(Wiki/Whiteboard/실시간 협업/Presence)는 **부재/부분**(대체로 사업범위 밖)이나, 협업 실체는 **`TeamPermissions`(팀 RBAC/ABAC·231차)·`AdminGrowth`(성장 자동화)·`PM\*`(프로젝트 관리·Events/Gantt/Assignees/Dependencies)·`GeniegoKnowledge`/`GeniegoGlossary`(지식 SSOT)·`Alerting`(Slack 협업 알림)·`action_request`(승인 협업)**로 부분 실재. Part047 도 실측→Wiki/Whiteboard/실시간 협업 부재증명→TeamPermissions+PM+지식 SSOT 성문화. ★주의: 실시간 협업/Presence 는 사업범위 밖·`PM\*` 프로젝트 관리는 실재.

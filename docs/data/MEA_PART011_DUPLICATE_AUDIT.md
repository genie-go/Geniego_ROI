# MEA Part 011 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Integration & API Exchange 신설이 기존 index.php Gateway/routes Registry/Auth·Part 001~010과 중복 재정의하지 않도록 경계 확정. ★API 게이트웨이/인증 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| API Metadata | ★MEA Part 004 Metadata | ★재정의 금지·재사용 |
| Service Identity(api_key) | ★EPIC 06-A Part 3-6·Part 3-47 | ★재정의 금지·재사용 |
| Event Bus/Streaming | MEA Part 009 CDC(ABSENT) | 참조·미래 |
| Protocol Adapter/Transformation | MEA Part 010 ETL | 참조·재사용 |
| Federation(Agency/Partner) | EPIC 06-A Part 3-45/3-56·`AgencyPortal` | 참조·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 게이트웨이/인증/레지스트리 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| API Gateway | 미들웨어(CORS/api_key/RBAC/writeGuard) | `public/index.php` | ★재사용(중복 게이트웨이/미들웨어 신설 절대 금지) |
| API Registry | 버전 라우트 | `routes.php`(2658) | ★재사용(중복 라우트 레지스트리 금지) |
| API Security(OAuth/JWT/api_key/RBAC) | SSO·api_key·RBAC | `EnterpriseAuth`·`OAuth`·`index.php` | ★재사용(중복 인증 신설 금지) |
| Rate Limiting | 전역 레이트리밋 | `recoveryThrottle`·login_attempt | 재사용(중복 레이트리밋 금지) |
| Partner Integration | 대행사/파트너 | `AgencyPortal.php`·`PartnerPortal.php` | 재사용(중복 파트너 통합 금지) |
| Credential | AES-256-GCM | `Crypto` | 재사용 |
| Protocol Adapter | 채널 어댑터 | `ChannelSync`·`AdAdapters` | 재사용 |
| Audit | 해시체인 | `SecurityAudit.php` | 재사용 |

## ★교훈 반영
- [[reference_api_prefix_routing]]: ★신규 실배선=/api 접두 필수(nginx SPA HTML 폴백 착시)·Gateway basePath 감지.
- [[project_n289_post_writeguard_server_enforcement]]: writeGuard 서버전역=API Gateway authorization 정본.
- [[reference_platform_growth_actas_tenant_hijack]]: Tenant Routing=tenant 요청시점 검증·고착 방지.
- [[reference_menu_audit_log_not_tamper_evident]]: API Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- Gateway=`index.php` 승격. Registry=`routes.php`+`docs/registry/APIRegistry.md`. Auth=`EnterpriseAuth`/`OAuth`/api_key/RBAC. Rate Limit=282차 전역. Partner=`AgencyPortal`/`PartnerPortal`. Credential=`Crypto`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(API 게이트웨이/레지스트리/인증/파트너 실재·강함).** ★핵심=`index.php`(Gateway)·`routes.php`(Registry 2658)·`EnterpriseAuth`/`OAuth`/api_key/RBAC(Security)·`AgencyPortal`/`PartnerPortal`(Partner)·전역 레이트리밋·`Crypto`(Credential)·`ChannelSync`/`AdAdapters`(Adapter)는 **재사용/승격**(★중복 게이트웨이/미들웨어/인증/레지스트리/레이트리밋/파트너 신설 절대 금지). Part 004 Metadata·Part 3-6 Service Identity·헌법 **재정의 금지**. 본 Part 고유 순신설=GraphQL/gRPC·Message Queue/Event Bus/Kafka·mTLS/WAF·Canary/Region Routing·Contract negotiation·SLA·Load Balancing·Service Mesh뿐(스트리밍/멀티노드 인프라 전제). 마케팅 AI KEEP_SEPARATE·AI Contract 직접변경/배포 불가(V3+배포 승인).

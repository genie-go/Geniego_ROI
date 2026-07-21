# ADR — MEA Part 045 Enterprise Service Mesh & Traffic Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part045 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료·오흡수 금지.

## 맥락
MEA Part 045는 Service Mesh & Traffic Management. ★★**도메인 자체가 부재**: 백엔드=단일 Slim 4 앱(index.php→routes.php)·React SPA=**모놀리식**(마이크로서비스 아님·GT①)·K8s 부재(Part 044)→**Service Mesh는 mesh할 마이크로서비스 자체가 부재**. istio/envoy/linkerd/consul/mtls/sidecar **부재(부재증명 완료·grep 0)**. 실재 seed=nginx/Caddy 리버스 프록시(routing/TLS·mesh 아님)·`index.php`(단일 게이트웨이·Part 042·mesh data plane 아님). 본 Part는 Container(Part 044)/API(042) 상속(재정의 금지).

## 결정
- **D-1 (Part 044/042/001 재정의 금지):** Container Platform(Part 044)·API Gateway(Part 042·`index.php`)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (도메인 부재 명시·오흡수 금지):** ★Service Mesh=**부재**(모놀리식·마이크로서비스 없음·부재증명 완료). ★★역방향 오흡수 금지: nginx 리버스 프록시≠Service Mesh Data Plane(Envoy)·`index.php` API 게이트웨이≠Service Mesh Control Plane·php-fpm 2 pool≠Sidecar·SQLite fallback≠Circuit Breaker·nginx config≠per-service Traffic Policy("코드 존재≠구현 완료" 283차·[[feedback_competitive_gap_verify]]). ★비즈니스/아키텍처=모놀리식 단일 앱·마이크로서비스 mesh 아님(과대주장 금지).
- **D-3 (Traffic Routing/Gateway seed = nginx/index.php 재사용):** Traffic Routing seed=nginx(reverse proxy)·Secure Gateway=`index.php`(api_key·RBAC·Part 042)·Media 프록시=Caddyfile(infra/media). ★이들은 mesh가 아니며 재사용(오흡수 금지)·mesh Control/Data Plane=순신설(마이크로서비스 전환 시).
- **D-4 (Resilience seed = 기존 승격·mesh 순신설):** Health Check=`/health`·Failover seed=SQLite fallback(`Db.php`)·Recovery seed=php-fpm pool·Graceful Degradation seed=fail-closed(발송 게이트/Trust First). ★Circuit Breaker/Outlier Detection/Fault Injection/mTLS/Distributed Tracing=순신설(mesh·부재).
- **D-5 (Security/AI = 헌법 정합):** Secure Gateway=`index.php`·TLS=nginx·Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`. AI(이상/SLA)=`AnomalyDetection`/`Alerting`(대상 mesh 부재)·Explainability=헌법 V4·★AI 서비스 라우팅 정책 자동 변경/운영 트래픽 자동 전환 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·ABSENT(near-total)**. Container/API/Data Platform/헌법 상속·재정의 금지·Traffic Routing(nginx)·Gateway(`index.php`)·TLS·Failover(SQLite fallback)·`SecurityAudit` 재사용(★오흡수 금지·nginx≠Data Plane·index.php≠Control Plane·php-fpm pool≠Sidecar·중복 게이트웨이 금지)·Service Mesh Control/Data Plane·Sidecar·mTLS·Circuit Breaker·Distributed Tracing 전부 순신설(부재·모놀리식·마이크로서비스 전환 착수 시·과대주장 금지). 실행은 마이크로서비스 전환 결정 종속.

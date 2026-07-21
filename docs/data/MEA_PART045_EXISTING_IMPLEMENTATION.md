# MEA Part 045 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 045 SPEC/ADR. ★부재증명 완료·과대주장 금지·오흡수 금지.

## 전수조사 방법
istio/envoy/linkerd/consul/service-mesh/mtls/sidecar/circuit-break·nginx/index.php 전수 grep + 판독. ★Service Mesh(istio/envoy/linkerd/consul/mtls/sidecar) 부재증명(grep incidental만).

## 실존 substrate (★reverse proxy/gateway seed·mesh 전 계층 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Traffic Routing seed | nginx reverse proxy | nginx·`routes.php` | PARTIAL-weak(mesh 아님) |
| Load Balancing seed | php-fpm 2 pool | ([[reference_phpfpm_pool_tuning_502]]) | PARTIAL-weak(mesh 아님) |
| Secure Gateway | 단일 게이트웨이 | `index.php`(api_key·RBAC·Part 042) | PARTIAL(mesh Control Plane 아님) |
| Media 프록시 | Caddy | `infra/media/Caddyfile` | PARTIAL-weak |
| TLS | nginx | nginx(SSL) | PARTIAL-weak(mesh mTLS 아님) |
| Health Check | health | `/health` | PARTIAL |
| Failover seed | SQLite fallback | `Db.php`(MySQL 불가 시) | PARTIAL-weak(Circuit Breaker 아님) |
| Recovery seed | php-fpm pool 재시작 | ([[reference_phpfpm_pool_tuning_502]]) | PARTIAL-weak |
| Graceful Degradation seed | fail-closed | (발송 게이트/Trust First) | PARTIAL-weak |
| Error/이상 | 이상 탐지 | `AnomalyDetection` | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·istio/envoy/linkerd grep 0·모놀리식)
★**Service Mesh Control Plane**(Istio)·**Data Plane Proxy**(Envoy/Sidecar)·**Service Discovery**·**mTLS**·**Circuit Breaker**·**Distributed Tracing**·**Destination Rule/Virtual Service**·**Traffic Mirroring/Canary/Blue-Green/Weighted Routing**·**Certificate Rotation**·**Service Topology/Dependency Mapping**·**Outlier Detection/Fault Injection**·형식 Service Mesh 전 계층·Event 표준(ServiceRegistered 등).

## 판정
**ABSENT (near-total) / PARTIAL-weak(reverse proxy seed만).** ★실재 seed=Traffic Routing(nginx)·Load Balancing(php-fpm 2 pool)·Secure Gateway(`index.php`·Part 042)·TLS(nginx)·Health Check(`/health`)·Failover(SQLite fallback)·Recovery(php-fpm pool)·Graceful Degradation(fail-closed)이나, **Service Mesh Control/Data Plane·Sidecar·mTLS·Circuit Breaker·Distributed Tracing은 진짜 부재**(부재증명 완료·istio/envoy/linkerd grep 0). ★★핵심=**백엔드=단일 Slim 4 앱·React SPA=모놀리식이므로 mesh할 마이크로서비스 자체가 부재**(Part 044 K8s/마이크로서비스 부재 정합)·nginx 리버스 프록시/index.php 게이트웨이는 mesh 아님(오흡수 금지·nginx≠Data Plane·index.php≠Control Plane·php-fpm≠Sidecar·SQLite fallback≠Circuit Breaker·과대주장 금지). 실행은 마이크로서비스 전환 후 신설 종속.

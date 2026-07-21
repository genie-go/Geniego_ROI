# MEA Part 045 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★nginx/index.php/Db.php seed 재사용(mesh 아님·오흡수 금지)·Service Mesh 전 계층 순신설·Part 042/044 상속·과대주장 금지·모놀리식.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | SERVICE | 모놀리식 앱(형식 Service 부재) | (Slim 4 단일 앱) | ABSENT-formal |
| 2 | SERVICE_INSTANCE | php-fpm 워커(형식 Instance 부재) | php-fpm pool | ABSENT-formal |
| 3 | SERVICE_PROXY | nginx(형식 Sidecar 아님) | nginx | PARTIAL-weak(오흡수 금지) |
| 4 | TRAFFIC_POLICY | nginx config(per-service 아님) | nginx | PARTIAL-weak |
| 5 | ROUTE | routes.php/nginx | `routes.php`·nginx | PARTIAL-weak |
| 6 | DESTINATION_RULE | 부재(mesh) | — | ABSENT |
| 7 | VIRTUAL_SERVICE | 부재(mesh) | — | ABSENT |
| 8 | GATEWAY | index.php(API Gateway·mesh Gateway 아님) | `index.php` | PARTIAL(오흡수 금지) |
| 9 | SERVICE_POLICY | RBAC/writeGuard(mesh 아님) | `index.php` | PARTIAL-weak |
| 10 | SERVICE_CERTIFICATE | nginx TLS(mesh mTLS 아님) | nginx | PARTIAL-weak |
| 11 | SERVICE_METRIC | Rollup/health(mesh 아님) | `Rollup`·`/health` | PARTIAL-weak |
| 12 | SERVICE_TRACE | 부재(Distributed Tracing) | — | ABSENT |
| 13 | SERVICE_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | SERVICE_TOPOLOGY | 부재(mesh) | — | ABSENT |
| 15 | SERVICE_HEALTH | health | `/health` | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Traffic Routing seed=nginx·LB seed=php-fpm·Gateway=index.php. ★Service Discovery/mTLS/Fault Tolerance/Multi Cluster Mesh(mesh)=ABSENT.
- **§7 Lifecycle(10)**: Version Migration seed=버전 라우트·Monitoring=/health. ★Service Registration/Certificate Provisioning/Traffic Activation(mesh)=ABSENT.
- **§8 Traffic(8)**: Routing seed=nginx·Timeout seed=nginx/php(285차). ★Canary/Blue-Green/Weighted/Circuit Breaker/Mirroring(mesh)=ABSENT.
- **§9 Security(8)**: Secure Gateway=index.php·TLS=nginx·Secret=ChannelCreds. ★mTLS/Service Identity/Certificate Rotation(mesh)=ABSENT.
- **§10 Resilience(8)**: Health=/health·Failover seed=SQLite fallback·Recovery seed=php-fpm pool·Graceful Degradation seed=fail-closed. ★Circuit Breaker/Outlier Detection/Fault Injection(mesh)=ABSENT.
- **§11 Observability(8)**: Error=AnomalyDetection·SLA=Alerting·Metrics seed=Rollup. ★Distributed Tracing/Dependency Mapping/Topology(mesh)=ABSENT.
- **§13 Security**: Tenant/RBAC/TLS/Audit. ★mTLS/Certificate Encryption(mesh)=ABSENT.
- **§17 AI**: 이상=AnomalyDetection(대상 mesh 부재)·SLA=Alerting·Explainability=헌법 V4·라우팅 정책 자동 변경/트래픽 자동 전환 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§13 범용 AUDIT) / PARTIAL-weak(§3~5·§8~11 seed·§15) / ABSENT(§1·§2·§6·§7·§12·§14 SERVICE/INSTANCE/DESTINATION_RULE/VIRTUAL_SERVICE/TRACE/TOPOLOGY·mesh 전 계층).** 코드 0. ★nginx(Routing/TLS)·index.php(Gateway)·Db.php(Failover) 재사용(★오흡수 금지: nginx≠Data Plane·index.php≠Control Plane·php-fpm≠Sidecar·SQLite fallback≠Circuit Breaker·중복 게이트웨이 금지)·Service Mesh 전 계층 순신설(부재·모놀리식·마이크로서비스 전환 착수 시·과대주장 금지)·Part 042/044 상속·★AI 서비스 라우팅 정책 자동 변경/운영 트래픽 자동 전환 불가(V3+V5+CHANGE_GATE).

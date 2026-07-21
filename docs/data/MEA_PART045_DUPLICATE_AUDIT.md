# MEA Part 045 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Service Mesh 신설이 기존 게이트웨이(`index.php`)·리버스 프록시(nginx)와 오흡수/중복하지 않도록 경계 확정. ★중복 위험 거의 없음(모놀리식·mesh 대상 부재·전부 순신설).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| API Gateway/Secure Gateway | ★MEA Part 042/001·`index.php` | ★재정의 금지·재사용(mesh Control Plane 아님) |
| Traffic Routing | ★nginx reverse proxy | ★재정의 금지·재사용(mesh 아님) |
| TLS | ★nginx | ★재정의 금지·재사용(mTLS 아님) |
| Failover | ★`Db.php`(SQLite fallback) | 참조·재사용(Circuit Breaker 아님) |
| Audit | ★`SecurityAudit` | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 오흡수 금지 (★nginx≠Data Plane·index.php≠Control Plane·모놀리식)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Traffic Routing | nginx | nginx | 재사용·★오흡수 금지(nginx≠Service Mesh Data Plane/Envoy) |
| Secure Gateway | 단일 게이트웨이 | `index.php` | 재사용·★오흡수 금지(index.php≠Service Mesh Control Plane) |
| Load Balancing | php-fpm 2 pool | php-fpm | 재사용·★오흡수 금지(php-fpm≠Sidecar) |
| Failover | SQLite fallback | `Db.php` | 재사용·★오흡수 금지(SQLite fallback≠Circuit Breaker) |
| Graceful Degradation | fail-closed | (발송 게이트) | 재사용·★오흡수 금지(fail-closed≠Outlier Detection) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- ★[[feedback_competitive_gap_verify]]: Service Mesh(Istio/Envoy/mTLS/Circuit Breaker/Distributed Tracing) 부재=부재증명(istio/envoy/linkerd grep 0·과대주장 금지).
- ★★"코드 존재≠구현 완료"(283차)·★역방향 오흡수 금지: nginx≠Service Mesh Data Plane·index.php≠Control Plane·php-fpm 2 pool≠Sidecar·SQLite fallback≠Circuit Breaker·nginx config≠per-service Traffic Policy·fail-closed≠Outlier Detection.
- ★아키텍처=백엔드 단일 Slim 4 앱(index.php→routes.php)·React SPA=모놀리식(마이크로서비스 아님)→mesh 대상 자체 부재.
- ★`index.php`(API Gateway·Part 042)·nginx(리버스 프록시)=정본·재구현 금지(mesh로 오흡수 금지).
- [[reference_menu_audit_log_not_tamper_evident]]: Service Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지 / 순신설)
- Gateway=`index.php` 재사용(mesh 아님·Part 042). Routing=nginx. TLS=nginx. ★Service Mesh Control/Data Plane/Sidecar/mTLS/Circuit Breaker/Distributed Tracing/Service Discovery=전부 순신설(부재·마이크로서비스 전환 착수 시).

## 판정
**중복 위험 거의 없음(모놀리식·mesh 대상 부재·전부 순신설).** ★핵심=`index.php`(Secure Gateway)·nginx(Traffic Routing/TLS)·php-fpm 2 pool(LB)·`Db.php`(Failover)·`SecurityAudit`는 **재사용하되 Service Mesh가 아님(오흡수 금지·nginx≠Data Plane·index.php≠Control Plane·php-fpm≠Sidecar·SQLite fallback≠Circuit Breaker·fail-closed≠Outlier Detection)**. Part 042 API Gateway·Part 044 Container·nginx·헌법 **재정의 금지**. 본 Part 고유 순신설=★Service Mesh Control Plane(Istio)·Data Plane Proxy(Envoy/Sidecar)·Service Discovery·mTLS·Circuit Breaker·Distributed Tracing·Destination Rule/Virtual Service·Traffic Mirroring·Certificate Rotation·Service Topology(부재·부재증명 완료·grep 0)뿐. ★모놀리식 단일 앱·마이크로서비스 mesh 아님·마이크로서비스 전환 착수 시(대규모)·과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI 서비스 라우팅 정책 자동 변경/운영 트래픽 자동 전환 불가(V3+V5+CHANGE_GATE).

# GeniegoROI Claude Code Implementation Specification

# CCIS Part025 — API Gateway, Service Mesh & Microservice Communication Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

API Gateway·Service Mesh·Microservice 통신 표준을 수립한다.

> ★**성격(Part001~024 과 동일)**: 사용자가 Part025 명세(Microservice·Service Mesh(Istio/Linkerd/Envoy)·
> gRPC·Service Discovery·Sidecar·mTLS·Circuit Breaker·Kong/APISIX Gateway)를 제공했으나 **그대로 따르지
> 않았다.** 실측 결과 이 저장소는 **마이크로서비스가 아니라 단일 Slim 4 모놀리스**(index.php 1개·Part007)
> 이며, Service Mesh/gRPC/Discovery/Sidecar/mTLS/Circuit Breaker 는 **전부 부재**(모놀리스는 서비스간
> 네트워크 인프라가 불요)하다. "API Gateway" 역할은 **nginx + `index.php` Slim 미들웨어**(CORS·API-key
> RBAC·`X-Tenant-Id` 주입·`/api` basePath·public bypass)가 수행한다. Part001 §4 에 따라 **실측 →
> 마이크로서비스 부재 증명 → 모놀리스+게이트웨이 미들웨어 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 아키텍처

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 아키텍처 | Microservice | **단일 Slim 4 모놀리스**(진입점 `public/index.php` 1개·Part007) |
| API Gateway | Kong/APISIX/Envoy | ★**nginx(TLS·정적·라우팅) + `index.php` Slim 미들웨어** — `setBasePath('/api')`·CORS·API-key RBAC·`X-Tenant-Id` 주입·public bypass 목록 |
| Service Mesh(Istio/Linkerd/Envoy) | Sidecar/Control Plane | **전부 부재**(0) |
| gRPC/Protobuf | 내부 고성능 통신 | **부재**(0) — 내부 호출=핸들러 직접(모놀리스·같은 프로세스) |
| Service Discovery/Registry | Consul/Eureka/k8s DNS | **부재**(discovery 5=비즈니스 코드 오탐) |
| Sidecar/mTLS | 서비스 identity·암호화 | **부재**(모놀리스·외부 TLS=nginx) |
| Circuit Breaker | Closed/Open/Half-Open | **부재**(0) — timeout+catch 폴백(Part013) |
| Retry/Timeout | 백오프·상한 | **retry 6·timeout 187**(외부 API·무제한 없음) |
| Load Balancing | Round Robin 등 | **N/A**(단일 인스턴스·php-fpm 풀) |
| Service Versioning | v1/v2 | ★**API 버전 `/v{NNN}` 50종**(v377~v428+·하위호환 stub)·서비스 버전 아님 |
| Zero Trust/Auth | Gateway 1차 보안 | ★**index.php 미들웨어=매 요청 API-key RBAC·tenant 주입·public bypass**(Part011/012) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Gateway First/Zero Trust/Secure/Resilient/Observable) | **부분 준수** | ★Gateway First(index.php 미들웨어 매 요청)·Zero Trust(API-key/tenant 검증)·Secure(CORS/prepared). Resilient(Circuit Breaker)·분산 Observable 은 미흡 |
| §4 Microservice Architecture | **미적용** | 모놀리스. 외부 진입=nginx→index.php |
| §5 API Gateway 역할 | **★대응물 준수** | index.php 미들웨어=Auth/Authz/Routing/CORS/Rate(부분)/Logging. ★비즈니스 로직 미포함(미들웨어) |
| §6 Gateway 제품(Kong 등) | **상이** | nginx + Slim 미들웨어(전용 Gateway 제품 아님) |
| §7~§8 Service Discovery/Registry | **대상 없음** | 단일 프로세스·내부 서비스 없음 |
| §9 REST | **★준수** | REST `/v{NNN}`+`/api`(Part011) |
| §10 gRPC | **미적용** | 부재. 내부=같은 프로세스 함수 호출 |
| §11 API Aggregation | **부분** | 핸들러가 다중 도메인 데이터 조합(모놀리스 내). Gateway aggregation 아님 |
| §12~§15 Service Mesh/Sidecar/Istio/Linkerd | **미적용** | 전부 부재(모놀리스) |
| §16 Load Balancing | **N/A** | 단일 인스턴스·php-fpm |
| §17 Retry | **부분 준수** | 외부연동 retry. Validation/Auth 재시도 안 함 |
| §18 Circuit Breaker | **미적용** | 부재. timeout+catch 폴백 |
| §19 Timeout | **★준수** | connect/exec timeout 187·무제한 없음. ★외부 API 트랜잭션 밖(285차) |
| §20~§21 mTLS/Zero Trust Network | **부분** | 내부 서비스 없음(mTLS N/A). 외부 TLS=nginx. Zero Trust=매 요청 인증(index.php) |
| §22 Traffic Management(Blue-Green/Canary) | **미적용** | 수동 dist swap(Part015). 트래픽 분배 없음 |
| §23 Service Versioning | **상이(API 버전)** | `/v{NNN}` 하위호환. 서비스 버전 아님 |
| §24 Health Check | **★준수** | `/healthz`·`/health`(200) |
| §25~§26 Monitoring/Logging(Trace 연결) | **부분** | SystemMetrics·error_log. traceId/분산 추적 부재(Part013/023) |
| §27 Security(Gateway 1차) | **★준수** | index.php 미들웨어=API-key RBAC·CORS·tenant·public bypass |
| §28 PHP(PSR-18/gRPC/Circuit Breaker Middleware) | **부분** | cURL/HTTP·timeout. gRPC/Circuit Breaker 미들웨어 부재 |
| §29 Claude(Service URL 하드코딩/Timeout 없는 호출/Gateway 우회 금지) | **부분 준수** | 외부 URL=설정·timeout 필수·index.php 미들웨어 필수. traceId 부재 |
| §30~§31 검증(istioctl/linkerd/kubectl) | **대상 없음** | Mesh/k8s 없음. Health curl·`make quality` |

---

## 4. 확립된 표준 (신규 통신 코드가 따를 정본)

- **아키텍처 = 단일 Slim 4 모놀리스**. 내부 "서비스 간 통신"은 **핸들러 직접 호출**(같은 프로세스). 마이크로서비스/gRPC/Mesh 신설 금지(대규모 재설계).
- ★**Gateway = `index.php` Slim 미들웨어**(+nginx). 매 요청 **API-key RBAC 인증·`X-Tenant-Id` 주입·CORS·basePath**. ★공개 경로는 **bypass 목록(+`/api` alias 변형) 둘 다 등록**(Part011). 미들웨어에 비즈니스 로직 금지.
- **외부 호출**: **timeout 필수**(무제한 금지)·retry(외부연동만·백오프)·**트랜잭션 밖·루프 내 N+1 금지**(285차 502). Circuit Breaker 대신 timeout+catch 폴백.
- **버전**: 신규 API=최신 `/v{NNN}` 접두(하위호환 stub 유지). 기존 URL 변경 금지(§19·Part011).
- **Health**: `/healthz`·`/health`(200). Zero Trust=매 요청 인증(익명 public 경로만 bypass).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Microservice 분해·Service Mesh(Istio/Linkerd/Envoy)·gRPC·Service Discovery/Registry·Sidecar** — 안 함. **단일 모놀리스**가 정본(Part007). 분해=대규모 아키텍처 재설계·Golden Rule 위반.
2. **mTLS·Zero Trust Network(서비스간)** — 안 함. 내부 서비스 없음(같은 프로세스). 외부 TLS=nginx·인증=index.php 미들웨어.
3. **Circuit Breaker·Load Balancing** — 안 함. timeout+폴백·단일 php-fpm 풀(285차 튜닝).
4. **전용 Gateway 제품(Kong/APISIX)·Traffic Management(Canary)** — 안 함. nginx+Slim 미들웨어·수동 dist swap(Part015).
5. **traceId/분산 추적** — 안 함(Part013/023).

★**준수하는 실 원칙**: Gateway First(index.php 미들웨어 매 요청)·Zero Trust(API-key/tenant 검증)·Secure(CORS/prepared)·Timeout·Health·API 버전 하위호환·외부 API 트랜잭션 밖.

---

## 6. Claude Code 구현 규칙

1. 아키텍처=모놀리스. 내부 호출=핸들러 직접. 마이크로서비스/Mesh/gRPC 신설 금지.
2. ★**Gateway=`index.php` 미들웨어** — 신규 공개경로는 bypass 목록(+`/api` alias) 등록. 미들웨어에 비즈니스 로직 금지.
3. 외부 호출=**timeout 필수**·retry(외부만)·**트랜잭션 밖·N+1 금지**(285차). Service URL 하드코딩 금지(설정).
4. 신규 API=최신 `/v{NNN}`+`/api` 접두·하위호환. 기존 URL 변경 금지.
5. 매 요청 인증(Zero Trust)·tenant 주입. Health=`/healthz`.
6. Service Mesh/gRPC/Circuit Breaker/mTLS/Kong 을 "명세에 있다"는 이유로 이식하지 않는다(모놀리스 유지).

---

## 7. Completion Criteria

- [x] 아키텍처 **실측**(모놀리스 1 진입점·Mesh/gRPC/Discovery/Sidecar/mTLS/Circuit Breaker 0·index.php 게이트웨이 미들웨어)
- [x] 명세 §3~§31 **섹션별 매핑·판정**(Microservice/Service Mesh/gRPC 부재 증명)
- [x] 실 게이트웨이(nginx+index.php 미들웨어·API-key RBAC·tenant·CORS·timeout·버전) 성문화(§4)
- [x] Gateway First·Zero Trust·Security·Timeout·Health 준수 명시
- [x] 의도적 미적용 + 사유(§5) — Microservice/Mesh/gRPC/mTLS/Circuit Breaker
- [x] Claude Code 규칙(§6) · `make quality`(AI Gateway 게이트 정합)

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 모놀리스 + nginx/index.php 게이트웨이 미들웨어의 성문화이지 Microservice/Service Mesh 이식이 아니다.

---

## 다음 Part

**CCIS Part026 — Data Analytics, BI, Data Warehouse & Reporting** — ★사전 경고: DW/Data Lake/OLAP/ETL 도구(Airflow 등) 부재. 실 분석=**MySQL rollup 집계**(`performance_metrics`·`channel_orders`)·`Rollup`/`Mmm`/`AttributionEngine`/`ReportBuilder`·데이터 품질=V3 Trust(READY/WARNING/BLOCKED)·정직 미산출. Part026 도 실측→DW 부재증명→rollup/Trust 성문화(DW 이식 금지).

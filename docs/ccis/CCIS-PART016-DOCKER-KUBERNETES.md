# GeniegoROI Claude Code Implementation Specification

# CCIS Part016 — Docker, Container & Kubernetes Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Container·Kubernetes 운영 표준을 수립한다.

> ★**성격(Part001~015 과 동일·강한 경고)**: 사용자가 Part016 명세(Docker Multi-stage·k8s Deployment/
> StatefulSet/HPA·Helm·Service Mesh·NetworkPolicy)를 제공했으나 **그대로 따르지 않았다.** 실측 결과
> 이 저장소의 실 런타임은 **컨테이너가 아니라 서버 직접(nginx + php-fpm)** 이며, 배포는 **수동 dist
> swap**(Part015)이다. ★**주의: `docker-compose.yml`·`infra/` 의 Docker/k8s/Helm/Terraform 파일은
> 실재하나 전부 가상 스택(Python+FastAPI+PostgreSQL+Redis+Kafka)을 겨냥하는 미사용 shadow**이며 실 배포와
> 무관하다(Part003 정합). 이를 배포/운영 근거로 삼으면 안 된다. Part001 §4 에 따라 **실측 → 부재/허구
> 증명 → 실 서버직접 운영 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 컨테이너/런타임 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 실 런타임 | Container(Docker/k8s) | **서버 직접** — nginx(정적 dist 서빙) + **php-fpm(php8.1-fpm.service)** |
| 배포 | Image push/rollout | **수동 dist tarball swap**(Part015 §5·SHA 검증)·Docker 명령 0 |
| `docker-compose.yml`(root) | Local 재현 | **존재하나 `postgres:16`**(★실 DB=MySQL — 불일치·미사용) |
| `frontend/Dockerfile` | 프론트 컨테이너 | 존재(Node build·ARG NODE_VERSION=20/.nvmrc). ★**배포 미사용**(dist tarball) |
| `infra/Dockerfile.api` | PHP 백엔드 이미지 | ★**`python:3.11-slim` + `uvicorn app.main:app`** — **PHP 아님·FastAPI 허구 스텁**(Part003) |
| `infra/docker-compose.yml` | 통합 스택 | **`postgres:15`+`redis:7`** — 실 스택(MySQL·Redis 없음)과 무관 |
| k8s Manifest | Deployment/Service/… | **`kind:` YAML 6개 존재하나 허구 스택 겨냥**·미사용 |
| Helm Chart | Chart/values/templates | **Chart.yaml 6개 존재하나 미사용 stub** |
| Terraform IaC | 인프라 | **`.tf` 11개 존재하나 미사용 stub**(`infra/aws`·Part003) |
| Health Check | Liveness/Readiness | ★**`/healthz`·`/health` 실재**(index.php·200 — 본 세션 curl 확인) |
| Opcache | 활성·reload | ★**opcache 활성**·배포 시 **`php-fpm reload`(opcache 리셋)**(본 세션 백엔드 배포에 사용) |
| Registry/HPA/StatefulSet/NetworkPolicy/Service Mesh | 운영 | **전부 부재/미사용** |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Immutable/Non-root/Multi-stage/k8s Native) | **미적용** | 컨테이너 런타임 아님. 서버 직접 |
| §4~§7 Docker Image/Base/Multi-stage/Dockerfile | **미적용(허구 스텁)** | frontend/Dockerfile 만 실질(빌드용·배포 미사용). infra Dockerfile=Python 허구 |
| §8 Docker Compose | **미적용** | compose=postgres(실 MySQL 아님)·미사용 |
| §9~§10 Naming/Container 보안 | **대상 없음** | 컨테이너 미운영 |
| §11 Health Check | **★부분 준수** | `/healthz`·`/health`(200). Liveness/Readiness Probe 구분은 없음(k8s 미사용) |
| §12~§13 Resource/Namespace | **대상 없음** | k8s 미사용 |
| §14~§17 Deployment/StatefulSet/Job/CronJob | **상이(대응물)** | k8s 없음. ★배치=**cron 워커 33개**(`bin/*_cron.php`·Part010)·Job/CronJob 아님 |
| §18~§19 Service/Ingress | **상이** | nginx 직접(TLS·라우팅). k8s Service/Ingress 아님 |
| §20~§21 ConfigMap/Secret | **상이** | 설정=`.env`(GENIE_·Part006). Secret=`.env`+`Crypto`. k8s Secret 아님 |
| §22~§23 PVC/StorageClass | **대상 없음** | 로컬 FS(MediaHost·SQLite). PVC 없음 |
| §24 HPA | **미적용** | 수동 스케일. php-fpm 풀 튜닝(285차 502)으로 용량 관리 |
| §25 NetworkPolicy | **대상 없음** | k8s 미사용 |
| §26~§27 Helm/Service Mesh | **미적용(스텁)** | Helm 파일 stub·미사용. Mesh 없음 |
| §28 Logging(stdout) | **상이** | `error_log()`·서버 로그(Part013). stdout 컨테이너 로그 아님 |
| §29 Monitoring(Prometheus/Grafana) | **부분** | `SystemMetrics` 프로브·`Compliance` SIEM. Prometheus 아님 |
| §30 Image Registry | **미적용** | Registry 없음. dist tarball |
| §31 PHP(php-fpm/Opcache/Graceful) | **★부분 준수** | php-fpm·**Opcache(배포 시 reload)**·Health Endpoint. Composer autoload 최적화(build-backend) |
| §32~§33 검증(docker/kubectl/helm/trivy) | **대상 없음** | Docker/k8s 미사용. 검증=`make quality`·수동 배포 검증 |

---

## 4. 확립된 표준 (실 운영이 따를 정본)

- **런타임 = 서버 직접**: nginx(정적 dist·TLS·라우팅) + **php-fpm(php8.1-fpm.service)**. 컨테이너 오케스트레이션 없음.
- **배포**: 수동 dist swap(Part015 §5 SHA 검증 런북). 백엔드 파일 교체 시 **`systemctl reload php8.1-fpm`(opcache 리셋)**.
- **Health**: `/healthz`·`/health`(200). 배포 후 확인.
- **배치**: **cron 워커**(`bin/*_cron.php`). k8s Job/CronJob 아님.
- **설정/Secret**: `.env`(GENIE_) + `Crypto`(테넌트 자격증명). ConfigMap/k8s Secret 아님.
- **용량**: php-fpm 풀 튜닝(★"등록 502=워커 고갈"은 285차 오진 정정 — `upstream timed out` 엔드포인트부터 보라). HPA 없음.

---

## 5. ★관찰 — 허구 인프라 shadow (트랩 · 미변경)

- `docker-compose.yml`·`infra/`(Dockerfile.api=Python·docker-compose=postgres/redis·k8s YAML 6·Helm 6·Terraform 11)는 **실재하나 전부 가상 스택(Python+FastAPI+PostgreSQL+Redis+Kafka)을 겨냥**한다. **실 스택(PHP+MySQL+nginx+php-fpm)과 무관·미사용**이다(Part003 §infra 실측).
- ★**트랩**: 이 파일들을 "배포/운영 방식"으로 오독하면 안 된다. `docker compose up` 은 실패가 정상이며(`make compose-up`/`compose-down` 도 동작 안 함), 배포 근거로 삼지 말 것(Part006 §infra 정합).
- **본 차수 미변경**: 이 stub 들의 제거/정정은 광범위(11 .tf + 6 k8s + 6 Helm + compose·미추적 다수)하고 Part003 이 이미 "미사용 스텁"으로 문서화했다. 실 배포에 무해(실행되지 않음)하므로 **관찰·경고로 기록**하고, 향후 정리 시 **실 스택으로 재작성 or 삭제**를 권고(실 배포 방식은 Part015).

---

## 6. Claude Code 구현 규칙

1. **배포/운영은 서버 직접**(nginx+php-fpm·수동 dist swap·Part015). Docker/k8s Manifest 를 배포 근거로 삼지 않는다.
2. ★**`infra/`·`docker-compose.yml`·k8s/Helm/Terraform 은 허구 스택 스텁** — 실 스택(PHP+MySQL) 근거로 인용 금지. 실측은 `Db.php`·`routes.php`·서버(§Part015).
3. 배치=`bin/*_cron.php`(k8s Job 신설 금지). Health=`/healthz`. 배포 후 php-fpm reload(opcache).
4. 용량=php-fpm 풀 튜닝(HPA 신설 금지). 502 진단은 `upstream timed out` 엔드포인트부터(285차).
5. Docker Image/k8s/Helm/Service Mesh 를 "명세에 있다"는 이유로 이식하지 않는다(서버직접 유지·컨테이너화=인프라 재설계 결정).

---

## 7. Completion Criteria

- [x] 컨테이너/런타임 **실측**(서버직접 nginx+php-fpm·Docker 배포 0·k8s/Helm 미사용)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(Docker/k8s/Helm/HPA/StatefulSet 부재·허구 스텁 증명)
- [x] 실 운영(nginx+php-fpm·수동 swap·cron·`.env`·health) 성문화(§4)
- [x] ★허구 인프라 shadow 트랩 관찰·경고(Docker/k8s/Helm/Terraform=Python/PostgreSQL 스텁)(§5)
- [x] Health(§11)·Opcache/php-fpm(§31) 부분 준수 명시
- [x] Claude Code 규칙(§6) · `make quality` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 서버직접(nginx+php-fpm) 운영의 성문화 + 허구 컨테이너 스텁 경고이지, Docker/k8s 이식이 아니다.

---

## 다음 Part

**CCIS Part017 — Caching, Redis & Performance** — ★사전 경고: **Redis 부재**(Part006·composer predis 0). 캐시=rollup 테이블 집계·SQLite 폴백. Rate Limiter/Distributed Lock=Redis 아님(DB `FOR UPDATE`·비Redis throttle). Opcache 실재. Part017 도 실측→Redis 부재증명→기존 집계/FOR UPDATE/opcache 성문화(Redis 이식 금지).

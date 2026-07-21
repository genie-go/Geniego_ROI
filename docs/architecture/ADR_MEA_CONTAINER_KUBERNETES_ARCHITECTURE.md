# ADR — MEA Part 044 Enterprise Container Platform & Kubernetes Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part044 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 044는 Container Platform & Kubernetes. ★**Docker 컨테이너 정의는 seed 실재이나 Kubernetes/오케스트레이션은 부재**: 실재=`docker-compose.yml`(postgres:16/genie_api_prod/genie_web_prod nginx 3-tier·GT①)·`infra/docker-compose.yml`(postgres:15/redis:7·GT①)·`frontend/Dockerfile`·`security-scan.yml`(Image Scan seed·Part 043)·cron(CronJob seed)·nginx(Ingress/TLS seed). ★부재(부재증명 완료·kubernetes grep 0)=Kubernetes/pod/node/HPA/registry/service mesh. ★운영은 단일 호스트 nginx/php-fpm 모놀리식(비컨테이너·docker-compose는 dev/aspirational·[[reference_ops_host.md]]). 본 Part는 Developer/DevSecOps(Part 041/043) 상속(재정의 금지).

## 결정
- **D-1 (Part 041/043/042 재정의 금지):** Developer Foundation(Part 041)·DevSecOps(Part 043·`security-scan.yml`)·API(Part 042)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Container 정의 = docker-compose/Dockerfile 승격·★중복 금지):** Container 정의 = `docker-compose.yml`(3-tier·db/api/web)+`infra/docker-compose.yml`(postgres/redis)+`frontend/Dockerfile`. ★단, 운영 실배포는 단일 호스트 nginx/php-fpm(docker-compose는 dev/aspirational·과대주장 금지). ★중복 컨테이너 정의 신설 절대 금지. 형식 Container Runtime Platform=`docker-compose` 승격.
- **D-3 (Image Scan = security-scan.yml 승격):** Image Vulnerability Scan seed = `security-scan.yml`(SCA=npm/composer audit·Part 043). ★Container Scan(trivy)/Image Signing=순신설(Part 043 DevSecOps 정합·중복 스캔 금지).
- **D-4 (Kubernetes = 부재·전부 순신설):** ★Kubernetes Cluster/Node/Pod/Namespace/Deployment/StatefulSet/DaemonSet/HPA/VPA·Container Registry/Image Signing/Promotion·Service Mesh·Auto Scaling·Cluster Management=**부재·순신설**(kubernetes grep 0·부재증명 완료). ★GeniegoROI는 단일 호스트 모놀리식·K8s 오케스트레이션 앱 아님(과대주장 금지)·컨테이너 오케스트레이션 전환 착수 시(대규모). Self-Healing seed=php-fpm pool 재시작(K8s 아님)·CronJob seed=cron(K8s 아님).
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC=`index.php`·Secret=`.env`/`ChannelCreds`(AES-256-GCM·K8s Secret 아님)·TLS=nginx·Audit=`SecurityAudit`. AI(이상/취약점)=`AnomalyDetection`/`security-scan.yml`(대상 K8s 부재)·Explainability=헌법 V4·★AI 클러스터 자동 삭제/운영 정책 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·ABSENT-heavy**. Developer/DevSecOps/Data Platform/헌법 상속·재정의 금지·Container 정의(`docker-compose`/`Dockerfile`)·Image Scan(`security-scan.yml`)·nginx(Ingress/TLS seed)·Secret(`.env`/`ChannelCreds`)·`SecurityAudit` 재사용(★중복 컨테이너 정의/이미지 스캔 절대 금지·정본 재구현 금지)·Kubernetes/오케스트레이션/레지스트리/오토스케일링/서비스 메시 전부 순신설(부재·단일 호스트 모놀리식·컨테이너 오케스트레이션 전환 착수 시·과대주장 금지). 실행은 컨테이너 오케스트레이션 전환 결정 종속.

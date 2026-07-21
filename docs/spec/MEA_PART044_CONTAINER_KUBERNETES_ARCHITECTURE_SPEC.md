# MEA Part 044 — Enterprise Container Platform & Kubernetes Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Developer Platform Foundation(Part 041)+DevSecOps(043)+API(042)**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**Docker 컨테이너 정의(docker-compose/Dockerfile)는 seed 실재이나 Kubernetes/오케스트레이션/레지스트리/오토스케일링/서비스 메시는 부재**(GT①·부재증명 완료·kubernetes grep 0). ★비즈니스 모델: 운영은 **단일 호스트 nginx/php-fpm 모놀리식**(비컨테이너·docker-compose는 dev/aspirational)·GeniegoROI는 K8s 오케스트레이션 앱 아님. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 애플리케이션/마이크로서비스 컨테이너 표준화·Kubernetes 오케스트레이션/확장성/고가용성/자동 복구/운영 자동화. Developer/DevSecOps/API/Security/Observability/AI Platform 연계 Enterprise Container Platform Framework.

## §2 구현 범위
Container Platform · Kubernetes Cluster · Container Runtime · Workload Management · Service Mesh · Auto Scaling · Container Registry · Cluster Governance · Security · AI Container Intelligence.

## §3 구현 목표 (10)
Kubernetes Cluster Platform · Container Runtime Platform · Container Registry · Cluster Management Service · Workload Scheduler · Auto Scaling Engine · Container Operations Dashboard · Governance Manager · Audit Service · AI Container Advisor.

## §4 아키텍처 원칙 (10)
Cloud Native · Container First · Immutable Infrastructure · Declarative Configuration · Self-Healing · Event Driven · GitOps Ready · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
CLUSTER · NODE · POD · CONTAINER · NAMESPACE · DEPLOYMENT · STATEFULSET · DAEMONSET · SERVICE · INGRESS · CONFIG_MAP · SECRET · CONTAINER_IMAGE · CLUSTER_POLICY · CLUSTER_AUDIT. → 상세 = `MEA_PART044_CANONICAL_ENTITIES.md`. ★K8s 엔티티 대부분 부재.

## §6 Container Platform Domain (10)
Kubernetes Cluster/Container Runtime/Registry/Workload/Resource Scheduling/Service Networking/Persistent Storage/Cluster Operations/Hybrid Cloud/Enterprise Container. Cluster Registry 기준. → ★현행=Container Runtime seed=`docker-compose.yml`(postgres/api/web 3-tier)+`Dockerfile`·Persistent Storage=docker volume. ★Kubernetes Cluster/Registry/Scheduling/Service Networking(K8s)=부재.

## §7 Container Lifecycle (10)
Build Image→Image Scan→Registry Publish→Deployment→Scheduling→Running→Scaling→Upgrade→Termination→Archive. Immutable 버전. → ★현행=Build Image seed=`Dockerfile`(build)·Image Scan seed=`security-scan.yml`(SCA·Part 043)·Deployment=`docker-compose`(dev)/단일 호스트(운영). ★Registry Publish/Scheduling/Scaling(K8s)=부재.

## §8 Kubernetes Cluster Management (8)
Multi-Cluster/Node/Namespace Management/Resource Quota/Scheduling Policy/Node Auto Recovery/Cluster Upgrade/Federation. → ★현행=**부재**(Kubernetes 없음·단일 호스트 nginx/php-fpm). Node Auto Recovery seed=php-fpm pool 재시작([[reference_phpfpm_pool_tuning_502]]).

## §9 Workload Management (8)
Deployment/StatefulSet/DaemonSet/Job/CronJob/HPA/VPA/Resource Optimization. 선언형. → ★현행=CronJob seed=cron(reports_cron/media_gc_cron·bin/*_cron.php)·Deployment seed=`docker-compose`(services). ★StatefulSet/DaemonSet/HPA/VPA(K8s)=부재.

## §10 Container Registry (8)
Image Repository/Versioning/Signing/Vulnerability Scan/Promotion/Replication/Retention/Audit. 승인 이미지만 배포. → ★현행=Vulnerability Scan seed=`security-scan.yml`(SCA·Part 043)·이미지 base=docker-compose(postgres:16/redis:7). ★형식 Container Registry/Image Signing/Promotion/Replication=부재.

## §11 Service Networking (8)
Service Discovery/Internal LB/Ingress Controller/Network Policy/DNS/Service Mesh/Traffic Routing/TLS. 서비스 간 암호화. → ★현행=Ingress seed=nginx(reverse proxy·SSL/TLS)·Internal LB=php-fpm 2 pool·TLS=nginx. ★Service Discovery/Ingress Controller(K8s)/Network Policy/Service Mesh=부재(Part 045 상세).

## §12 Cluster Governance (8)
Namespace/Resource/Scheduling/Security/Image/Upgrade Policy/Compliance/Audit. → ★현행=Audit=`SecurityAudit`·Change Gate=`CHANGE_GATE`·Image Policy seed=`security-scan.yml`. ★Namespace/Resource/Scheduling Policy(K8s)=부재.

## §13 Data Security
Tenant Isolation · RBAC · Secret Encryption · Image Integrity · Network Segmentation · Audit. K8s Secret/외부 Secret Manager. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Secret=`.env`/`ChannelCreds`(AES-256-GCM)·Audit=`SecurityAudit`. ★K8s Secret/Image Integrity/Network Segmentation(K8s)=부재.

## §14 Runtime 규칙
Image Validation · Pod Scheduling · Resource Allocation · Health Check · Auto Scaling · Self-Healing · Audit. → ★현행=Health Check=`/health`·Self-Healing seed=php-fpm pool 재시작·Audit=`SecurityAudit`. ★Pod Scheduling/Resource Allocation/Auto Scaling(K8s)=부재.

## §15 API 표준 (8)
Create Cluster/Deploy Workload/Scale Deployment/Query Cluster·Node Status/Image Registry/Resource Usage/Query Audit. → ★현행=Health=`/health`. ★Create Cluster/Deploy Workload/Scale(K8s API)=부재. Part 001 API 표준 상속(신설 시).

## §16 Event 표준 (8)
ClusterCreated/NodeAdded/PodScheduled/DeploymentCompleted/ImagePublished/AutoScalingTriggered/ClusterRecovered/ClusterAudited. → ★현행=DeploymentCompleted seed=`deploy.yml`(Part 043). ★Cluster/Node/Pod/AutoScaling Event(K8s)=부재. Data Platform §15 정합.

## §17 AI Integration
리소스 사용량 예측 · Pod 장애 원인 · Auto Scaling 최적화 · Node Capacity 예측 · 이미지 취약점 우선순위 · 비용 최적화 · 클러스터 이상 탐지 · Explainable. **AI는 클러스터 자동 삭제/운영 정책 자동 변경 불가.** → ★현행=이상=`AnomalyDetection`(범용·대상 K8s 부재)·이미지 취약점=`security-scan.yml`·Explainability=헌법 V4·운영 정책 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. ★리소스/Auto Scaling/Node Capacity AI(K8s 부재)=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
Pod Scheduling ≤2초 · Image Pull ≤30초 · Auto Scaling ≤30초 · Cluster API ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. (대상 K8s 미존재·벤치 대상 부재.)

## §19 Completion Criteria
Kubernetes Cluster·Container Registry·Workload·Service Networking·Auto Scaling·Governance·Security·Runtime·API/Event·AI 구현. → **대부분 미충족·부재**(Docker compose seed만·K8s 전 계층=부재). 코드 0.

## 판정
**ABSENT-heavy / PARTIAL-weak(Docker seed만).** ★실재 seed=Container 정의(`docker-compose.yml`·postgres:16/genie_api_prod/genie_web_prod nginx 3-tier·+`infra/docker-compose.yml`·postgres:15/redis:7·+`frontend/Dockerfile`)·Image Scan seed(`security-scan.yml`·SCA·Part 043)·CronJob seed(cron/bin/*_cron.php)·Ingress/TLS seed(nginx)·Health Check(`/health`)·Self-Healing seed(php-fpm pool 재시작)·Audit(`SecurityAudit`). ★**부재(부재증명 완료·kubernetes grep 0)=Kubernetes Cluster/Node/Pod/Namespace/Deployment/StatefulSet/DaemonSet/HPA/VPA·Container Registry/Image Signing/Promotion·Service Mesh·Auto Scaling·Cluster Management·형식 K8s 전 계층.** ★★핵심=**Docker 컨테이너 정의(docker-compose/Dockerfile)는 seed 실재이나 Kubernetes/오케스트레이션/레지스트리/오토스케일링은 부재이며, 운영은 단일 호스트 nginx/php-fpm 모놀리식(비컨테이너·docker-compose는 dev/aspirational)**(GeniegoROI는 K8s 오케스트레이션 앱 아님·과대주장 금지·[[feedback_competitive_gap_verify]]). Developer/DevSecOps Platform 상속(재정의 금지)·★중복 컨테이너 정의/이미지 스캔 절대 금지(`docker-compose`/`security-scan.yml` 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 클러스터 자동 삭제/운영 정책 자동 변경 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 045 — Enterprise Service Mesh & Traffic Management Architecture(본 Container Platform 상속·★nginx seed 실재·Service Mesh 부재).

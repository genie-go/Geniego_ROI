# MEA Part 044 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 044 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
docker-compose/Dockerfile·kubernetes/helm/kubectl·nginx/php-fpm 전수 조사 + 판독. ★K8s(kind: Deployment/apiVersion: apps/kubernetes/helm/kubectl) 부재증명(grep 0).

## 실존 substrate (★Docker 컨테이너 정의 seed·K8s 전 계층 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Container 정의 | 3-tier compose | `docker-compose.yml`(postgres:16·genie_api_prod·genie_web_prod nginx) | PARTIAL(seed·dev) |
| Container 정의(infra) | postgres/redis | `infra/docker-compose.yml`(postgres:15·redis:7) | PARTIAL(seed·dev) |
| Image Build | Dockerfile | `frontend/Dockerfile`·(build) | PARTIAL(seed) |
| Image Scan | SCA | `security-scan.yml`(Part 043) | PARTIAL |
| CronJob | cron | cron(bin/*_cron.php) | PARTIAL-weak |
| Ingress/TLS seed | nginx | nginx(reverse proxy·SSL) | PARTIAL-weak |
| Health Check | health | `/health` | PARTIAL |
| Self-Healing seed | php-fpm pool 재시작 | ([[reference_phpfpm_pool_tuning_502]]) | PARTIAL-weak |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·kubernetes grep 0)
★**Kubernetes Cluster/Node/Pod/Namespace/Deployment/StatefulSet/DaemonSet**·**HPA/VPA**·**Container Registry/Image Signing/Promotion/Replication**·**Service Mesh**·**Auto Scaling**·**Cluster Management/Multi-Cluster/Federation**·**Service Discovery/Ingress Controller/Network Policy**(K8s)·**K8s Secret/Network Segmentation**·형식 K8s 전 계층·Event 표준(ClusterCreated 등).

## 판정
**ABSENT-heavy / PARTIAL-weak(Docker seed만).** ★실재 seed=Container 정의(`docker-compose.yml`·3-tier·+`infra/docker-compose.yml`·postgres/redis·+`frontend/Dockerfile`)·Image Scan(`security-scan.yml`·Part 043)·CronJob(cron)·Ingress/TLS(nginx)·Health Check(`/health`)·Self-Healing(php-fpm pool)이나, **Kubernetes/pod/node/HPA/registry/service mesh/auto-scaling은 진짜 부재**(부재증명 완료·kubernetes grep 0). ★★핵심=**Docker 컨테이너 정의는 seed 실재이나 Kubernetes/오케스트레이션은 부재이며, 운영은 단일 호스트 nginx/php-fpm 모놀리식(비컨테이너·docker-compose는 dev/aspirational)**(K8s 오케스트레이션 앱 아님·과대주장 금지). 실행은 컨테이너 오케스트레이션 전환 후 신설 종속.

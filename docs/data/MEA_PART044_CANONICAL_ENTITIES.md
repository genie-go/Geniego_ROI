# MEA Part 044 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★docker-compose/Dockerfile/security-scan.yml/nginx seed 재사용(K8s 아님·오흡수 금지)·Kubernetes 전 계층 순신설·Part 041/043 상속·과대주장 금지·단일 호스트 모놀리식.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | CLUSTER | 부재(K8s cluster) | — | ABSENT |
| 2 | NODE | 단일 호스트(형식 Node 부재) | (nginx/php-fpm host) | ABSENT-formal |
| 3 | POD | 부재(K8s pod) | — | ABSENT |
| 4 | CONTAINER | compose 컨테이너(dev seed) | `docker-compose.yml` | PARTIAL-weak(dev seed) |
| 5 | NAMESPACE | 부재(K8s namespace) | — | ABSENT |
| 6 | DEPLOYMENT | compose services seed | `docker-compose.yml`(services) | PARTIAL-weak |
| 7 | STATEFULSET | 부재 | — | ABSENT |
| 8 | DAEMONSET | 부재 | — | ABSENT |
| 9 | SERVICE | compose service/nginx seed | `docker-compose`·nginx | PARTIAL-weak |
| 10 | INGRESS | nginx(K8s Ingress 아님) | nginx | PARTIAL-weak(오흡수 금지) |
| 11 | CONFIG_MAP | .env(형식 ConfigMap 부재) | `.env` | PARTIAL-weak |
| 12 | SECRET | .env/ChannelCreds(K8s Secret 아님) | `.env`/`ChannelCreds` | PARTIAL(오흡수 금지) |
| 13 | CONTAINER_IMAGE | base image(compose) | `docker-compose`(postgres/redis) | PARTIAL-weak |
| 14 | CLUSTER_POLICY | 부재(K8s policy)·Change Gate | `CHANGE_GATE` | ABSENT-formal |
| 15 | CLUSTER_AUDIT | 해시체인(신설 시) | `SecurityAudit.php` | PARTIAL(범용) |

## §6~§17 표준 판정
- **§6 Domain(10)**: Container Runtime seed=docker-compose·Persistent Storage=docker volume. ★Kubernetes Cluster/Registry/Scheduling/Service Networking(K8s)=ABSENT.
- **§7 Lifecycle(10)**: Build Image=Dockerfile·Image Scan=security-scan.yml·Deployment=compose(dev)/단일 호스트(운영). ★Registry Publish/Scheduling/Scaling(K8s)=ABSENT.
- **§8 Cluster Mgmt(8)**: ABSENT(K8s 없음)·Node Auto Recovery seed=php-fpm pool 재시작.
- **§9 Workload(8)**: CronJob seed=cron·Deployment seed=compose. ★StatefulSet/DaemonSet/HPA/VPA(K8s)=ABSENT.
- **§10 Registry(8)**: Vulnerability Scan seed=security-scan.yml·base image=compose. ★Registry/Signing/Promotion=ABSENT.
- **§11 Networking(8)**: Ingress/TLS seed=nginx·Internal LB=php-fpm 2 pool. ★Service Discovery/Ingress Controller/Network Policy/Service Mesh(K8s)=ABSENT.
- **§13 Security**: Tenant/RBAC/Secret(.env/ChannelCreds·K8s Secret 아님)/Audit. ★Network Segmentation(K8s)=ABSENT.
- **§17 AI**: 이상=AnomalyDetection(대상 K8s 부재)·취약점=security-scan.yml·Explainability=헌법 V4·클러스터 자동 삭제/운영 정책 자동 변경 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL(§4·§6·§9·§10·§12·§13 seed·§15 범용 AUDIT) / ABSENT(§1·§3·§5·§7·§8·§2·§14 CLUSTER/POD/NAMESPACE/STATEFULSET/DAEMONSET/NODE/CLUSTER_POLICY·K8s 전 계층).** 코드 0. ★Container 정의(`docker-compose`/`Dockerfile`)·Image Scan(`security-scan.yml`)·nginx(Ingress/TLS·K8s 아님) 재사용(★중복 컨테이너 정의/이미지 스캔 절대 금지·오흡수 금지: nginx≠Ingress Controller·cron≠CronJob·docker-compose dev≠운영 K8s)·Kubernetes 전 계층 순신설(부재·단일 호스트 모놀리식·컨테이너 오케스트레이션 전환 착수 시·과대주장 금지)·Part 041/043 상속·★AI 클러스터 자동 삭제/운영 정책 자동 변경 불가(V3+V5+CHANGE_GATE).

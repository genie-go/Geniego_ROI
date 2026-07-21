# MEA Part 044 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Container/K8s 신설이 기존 컨테이너 정의(`docker-compose`)·이미지 스캔(`security-scan.yml`)과 중복 재정의하지 않도록 경계 확정. ★중복 위험 국소(Docker seed만·K8s 순신설).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| Container 정의 | ★MEA Part 043 IaC seed·`docker-compose`/`Dockerfile` | ★재정의 금지·재사용 |
| Image Scan | ★MEA Part 043 DevSecOps·`security-scan.yml` | ★재정의 금지·재사용 |
| Ingress/TLS | ★nginx(reverse proxy) | ★재정의 금지·재사용 |
| Secret | ★자격증명 규범·`.env`/`ChannelCreds` | ★재정의 금지·재사용 |
| Audit | ★`SecurityAudit` | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 컨테이너 정의/이미지 스캔 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Container 정의 | 3-tier compose | `docker-compose.yml`/`infra` | ★재사용(★중복 컨테이너 정의 신설 절대 금지) |
| Image Build | Dockerfile | `frontend/Dockerfile` | 재사용 |
| Image Scan | SCA | `security-scan.yml` | ★재사용(중복 스캔 금지·Part 043) |
| Ingress/TLS | nginx | nginx | 재사용·★오흡수 금지(nginx≠K8s Ingress Controller) |
| CronJob | cron | cron | 재사용·★오흡수 금지(cron≠K8s CronJob) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 컨테이너 정의/이미지 스캔 단일 정의·무후퇴=★중복 절대 금지(값 분산=회귀).
- ★`docker-compose.yml`/`Dockerfile`(Part 043 IaC seed)·`security-scan.yml`(SCA)=정본·재구현 금지.
- ★[[feedback_competitive_gap_verify]]: Kubernetes/pod/node/HPA/registry/service mesh 부재=부재증명(grep 0·과대주장 금지).
- ★역방향 오흡수 금지: nginx(reverse proxy)≠K8s Ingress Controller·cron≠K8s CronJob·php-fpm pool 재시작≠Self-Healing·docker-compose(dev/aspirational)≠운영 K8s.
- ★운영=단일 호스트 nginx/php-fpm 모놀리식([[reference_ops_host.md]]·[[reference_phpfpm_pool_tuning_502]])·K8s 아님.
- [[reference_menu_audit_log_not_tamper_evident]]: Cluster Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지 / 순신설)
- Container 정의=`docker-compose`/`Dockerfile` 재사용(중복 금지). Image Scan=`security-scan.yml`. Ingress=nginx. ★Kubernetes/Cluster/Pod/Node/HPA/Registry/Service Mesh/Auto Scaling=전부 순신설(부재·컨테이너 오케스트레이션 전환 착수 시).

## 판정
**중복 위험 국소(Docker seed만·K8s 순신설).** ★핵심=`docker-compose`/`Dockerfile`(Container 정의)·`security-scan.yml`(Image Scan)·nginx(Ingress/TLS)·`.env`/`ChannelCreds`(Secret)·`SecurityAudit`는 **재사용하되 K8s 오케스트레이션이 아님(오흡수 금지·nginx≠Ingress Controller·cron≠CronJob·php-fpm 재시작≠Self-Healing·docker-compose dev≠운영 K8s)**. Part 043 DevSecOps/IaC seed·nginx·자격증명 규범·헌법 **재정의 금지**. 본 Part 고유 순신설=★Kubernetes Cluster/Node/Pod/Namespace/Deployment/StatefulSet/DaemonSet·HPA/VPA·Container Registry/Image Signing·Service Mesh·Auto Scaling·Cluster Management(부재·부재증명 완료·grep 0)뿐. ★단일 호스트 모놀리식·K8s 오케스트레이션 앱 아님·컨테이너 오케스트레이션 전환 착수 시(대규모)·과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI 클러스터 자동 삭제/운영 정책 자동 변경 불가(V3+V5+CHANGE_GATE).

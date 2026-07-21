# MEA Part 044 — Enterprise Container Platform & Kubernetes Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·과대주장 금지.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART044_CONTAINER_KUBERNETES_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_CONTAINER_KUBERNETES_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART044_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART044_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART044_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART044_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART044_INDEX.md` | 본 문서 |

## 한 줄 판정
**ABSENT-heavy / PARTIAL-weak(Docker seed만).** ★실재 seed=Container 정의(`docker-compose.yml`·postgres:16/genie_api_prod/genie_web_prod nginx 3-tier·+`infra/docker-compose.yml`·postgres/redis·+`frontend/Dockerfile`)·Image Scan(`security-scan.yml`·Part 043)·CronJob seed(cron)·Ingress/TLS seed(nginx)·Health Check(`/health`)·Self-Healing seed(php-fpm pool)이나, **Kubernetes/pod/node/HPA/registry/service mesh/auto-scaling은 진짜 부재**(부재증명 완료·kubernetes grep 0). ★★핵심=**Docker 컨테이너 정의는 seed 실재이나 Kubernetes/오케스트레이션은 부재이며, 운영은 단일 호스트 nginx/php-fpm 모놀리식(비컨테이너·docker-compose는 dev/aspirational)**(K8s 오케스트레이션 앱 아님·과대주장 금지). ★오흡수 금지(nginx≠K8s Ingress Controller·cron≠CronJob·php-fpm 재시작≠Self-Healing·docker-compose dev≠운영 K8s)·마케팅 AI KEEP_SEPARATE·★AI 클러스터 자동 삭제/운영 정책 자동 변경 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Developer Platform Foundation(Part 041)+DevSecOps(043)+API(042)+헌법 V3/V4/V5.
- 다음: **MEA Part 045 — Enterprise Service Mesh & Traffic Management Architecture**(본 Container Platform 상속·★nginx seed 실재·Service Mesh 부재).

## ★Developer Platform 진행 (Part 041~044)
Part 041 Foundation(PARTIAL) · 042 API Management(★PARTIAL-strong) · 043 DevSecOps & CI/CD(★PARTIAL-strong) · **044 Container Platform & Kubernetes(ABSENT-heavy·Docker seed만·단일 호스트 모놀리식)** → 다음 045 Service Mesh & Traffic Management.

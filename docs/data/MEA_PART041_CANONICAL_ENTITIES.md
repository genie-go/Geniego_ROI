# MEA Part 041 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★deploy.yml/security-scan.yml/git/CHANGE_GATE/ChannelCreds 재사용·제품화 IDP(Developer Portal/Artifact Repository/Container) 순신설·Data/ROI/Commerce/Logistics 상속·과대주장 금지·★마케팅 AI≠개발 AI.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DEVELOPER | 개발자(git/GitHub) | git·`ChannelCreds` | PARTIAL |
| 2 | DEVELOPMENT_PROJECT | 부재(형식 Project Registry) | — | ABSENT-formal |
| 3 | SOURCE_REPOSITORY | git repo | git(master/main) | PARTIAL-strong |
| 4 | BUILD_PIPELINE | CI 빌드 | `deploy.yml`·`deploy.ps1` | PARTIAL-strong |
| 5 | DEPLOYMENT_PIPELINE | 배포 워크플로우 | `deploy.yml`(master push) | PARTIAL-strong |
| 6 | ARTIFACT | dist tarball(형식 Repository 부재) | (dist) | PARTIAL-weak |
| 7 | ENVIRONMENT | 운영/데모/로컬 | (roi/roidemo) | PARTIAL |
| 8 | RELEASE | git commit/tag(형식 Release 부분) | git | PARTIAL |
| 9 | VERSION | 버전 라우트·git | routes.php(/v377~/v431)·git | PARTIAL-strong |
| 10 | API_PACKAGE | 라우트 레지스트리 | routes.php | PARTIAL |
| 11 | COMPONENT | 핸들러/컴포넌트(형식 Catalog 부재) | (handlers/pages) | PARTIAL-weak |
| 12 | PLATFORM_POLICY | 변경 게이트·헌법 | `CHANGE_GATE.md`/registry | PARTIAL-strong |
| 13 | DEVELOPER_AUDIT | 해시체인·git | `SecurityAudit`·git | PARTIAL-strong |
| 14 | BUILD_RESULT | 빌드 로그 | `deploy.yml`·GitHub Actions | PARTIAL |
| 15 | DEPLOYMENT_RESULT | 배포 결과·smoke | `deploy.yml`(smoke test) | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Source=git·Build=deploy.ps1/vite·Test=e2e·Deployment=deploy.yml·DevSecOps=security-scan.yml. ★제품화 IDP/Project Registry=ABSENT.
- **§7 Lifecycle(10)**: Build/Test/Security Scan/Deployment=deploy.yml/security-scan.yml/e2e·변경 추적=git+SecurityAudit·Planning/Improvement(형식)=부분.
- **§8 Source(8)**: Git/Branch Strategy/Version Control=git. ★Merge Request/Code Review/Template(GitHub 기능 의존)=부분.
- **§9 Build&Artifact(8)**: Automated Build=deploy.yml·Dependency=npm/composer·Cache=vite. ★Artifact Repository/Signing/Promotion=ABSENT.
- **§10 CI/CD(8)**: CI/CD=deploy.yml(secrets gating)·Rollback seed=dist.bak(278차). ★Canary/Blue-Green/Environment Promotion=ABSENT.
- **§11 Portal(8)**: Documentation=docs·API Catalog seed=routes.php. ★Self-Service/SDK/Team Workspace=ABSENT.
- **§12 Governance(8)**: Coding Standard=CLAUDE.md·Change Gate=CHANGE_GATE/registry·Deployment Policy=배포 승인·문서 기반 강함.
- **§13 Security**: Secret=.env/ChannelCreds/CI gating·RBAC/Audit(상속).
- **§17 AI**: ★AI Developer Assistant=Claude Code(본 세션)·보안 스캔=security-scan.yml·Explainability=헌법 V4·소스 자동 병합/운영 자동 배포 불가=배포 승인+헌법 V3+V5. ★마케팅 AI(ClaudeAI)≠개발 AI(KEEP_SEPARATE·오흡수 금지).

## 판정
**PARTIAL-strong(§3~5·§9·§12·§13=source/build/deploy/version/policy/audit) / PARTIAL(§1·§7·§8·§10·§11·§14·§15) / ABSENT-formal(§2 PROJECT_REGISTRY·§6 ARTIFACT Repository·§11 COMPONENT Catalog·제품화 IDP).** 코드 0. ★CI/CD(`deploy.yml`)·DevSecOps(`security-scan.yml`)·Governance(`CHANGE_GATE`)·Secret(`ChannelCreds`) 재사용(★중복 CI/CD·거버넌스·시크릿 절대 금지·정본 재구현 금지)·제품화 IDP(Developer Portal/Artifact Repository/Container) 순신설(과대주장 금지)·Data/ROI/Commerce/Logistics 상속·★마케팅 AI≠개발 AI(KEEP_SEPARATE)·★AI 소스코드 자동 병합/운영 자동 배포 불가(V3+V5+CHANGE_GATE).

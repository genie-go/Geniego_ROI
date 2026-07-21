# MEA Part 043 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★deploy.yml/security-scan.yml/scan_secrets.sh/e2e/docker-compose 재사용·Canary/Blue-Green/DAST/Orchestrator 순신설·Part 041/042 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PIPELINE | GitHub Actions 워크플로우 | `deploy.yml`·`security-scan.yml` | PARTIAL-strong |
| 2 | BUILD | vite 빌드 | `deploy.yml`(GATE 4)·`deploy.ps1` | PARTIAL-strong |
| 3 | BUILD_JOB | CI job | `deploy.yml`(GATE 1~4) | PARTIAL-strong |
| 4 | TEST_SUITE | E2E/render | `e2e`/`render.mjs`(266/281차) | PARTIAL-strong |
| 5 | TEST_RESULT | smoke 결과 | `deploy.yml`(Phase 6) | PARTIAL |
| 6 | SECURITY_SCAN | SAST/SCA/Secret | `security-scan.yml`(CodeQL/audit/B4) | PARTIAL-strong |
| 7 | RELEASE | git commit/tag·버전 라우트 | git·routes.php | PARTIAL |
| 8 | DEPLOYMENT | SCP/SSH·수동 | `deploy.yml`(Phase 3-5)·pscp/plink | PARTIAL |
| 9 | ENVIRONMENT | 운영/데모/로컬 | (roi/roidemo) | PARTIAL |
| 10 | INFRASTRUCTURE_TEMPLATE | docker-compose/Dockerfile | docker-compose.yml·Dockerfile | PARTIAL(seed) |
| 11 | PIPELINE_POLICY | 게이트·배포 승인 | `deploy.yml`·배포 승인 | PARTIAL-strong |
| 12 | PIPELINE_STATUS | Actions 상태 | GitHub Actions | PARTIAL |
| 13 | PIPELINE_AUDIT | 해시체인·git | `SecurityAudit`·git | PARTIAL-strong |
| 14 | PIPELINE_TRIGGER | push/수동 | `deploy.yml`(push) | PARTIAL |
| 15 | PIPELINE_ARTIFACT | dist(형식 Repository 부재) | (dist) | PARTIAL-weak |

## §6~§18 표준 판정
- **§6 Domain(10)**: Source=git·Build/Test=deploy.yml·Security=security-scan.yml·Deployment=Phase 3-5·IaC=docker-compose. ★형식 Pipeline Registry=부분.
- **§7 Lifecycle(10)**: Commit→Build(GATE 4)→Security Scan(security-scan.yml)→Test(e2e/render)→Deployment(Phase 3-5)→Validation(Phase 6)→Monitoring(/health). 실 파이프라인.
- **§8 CI(8)**: Trigger=deploy.yml(push)·Static Analysis=GATE 1~3(팬텀/라우트/hooks)·Build=GATE 4·Artifact=dist. Parallel/Incremental=부분.
- **§9 CD(8)**: Deployment=Phase 3-5·Approval=배포 승인·Rollback=dist.bak. ★Canary/Blue-Green/Progressive/Zero Downtime=ABSENT.
- **§10 Security Automation(8)**: ★SAST=CodeQL·SCA=npm/composer audit·Secret Detection=B4 scan_secrets.sh·authz G15. ★DAST/Container Scan/IaC Scan/License=ABSENT.
- **§11 IaC(8)**: docker-compose/Dockerfile seed. ★Terraform/Drift Detection/Provisioning=ABSENT.
- **§12 Release(8)**: Versioning=git/버전 라우트·Approval=배포 승인·Rollback=dist.bak·History=git log. ★Release Calendar=ABSENT.
- **§13 Governance**: Deployment Policy=배포 승인·Branch=master/main·Security=security-scan.yml·Change Gate=CHANGE_GATE·Audit=SecurityAudit/git.
- **§14 Security**: Secret=CI gating(파이프라인 미저장)/ChannelCreds. ★Secret Vault/Code Signing=ABSENT.
- **§18 AI**: 취약점=security-scan.yml·테스트/실패 분석=Claude Code(본 세션)·Explainability=헌법 V4·운영 배포 자동 승인/보안 정책 자동 변경 불가=배포 승인+헌법 V3+V5. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~4·§6·§11·§13=파이프라인/빌드/테스트/스캔/정책/감사) / PARTIAL(§5·§7~9·§12·§14) / ABSENT(§9 Canary/Blue-Green·§10 DAST/Container Scan·형식 IaC(Terraform)/Orchestrator/Secret Vault).** 코드 0. ★CI(`deploy.yml`)·Security Automation(`security-scan.yml`)·테스트(`e2e`/`render.mjs`)·Secret Detection(`scan_secrets.sh`) 재사용(★중복 CI/CD·보안 스캔·배포 파이프라인 절대 금지·정본 재구현 금지)·Canary/Blue-Green/DAST/Container Scan/IaC(Terraform)/Orchestrator 순신설(과대주장 금지)·Part 041/042 상속·★AI 운영 배포 자동 승인/보안 정책 자동 변경 불가(배포 승인 필수·V3+V5+CHANGE_GATE).

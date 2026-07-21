# ADR — MEA Part 043 Enterprise DevSecOps & CI/CD Pipeline Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part043 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 043은 DevSecOps & CI/CD Pipeline. ★**CI 게이트·Security Automation·빌드/테스트·IaC seed는 강하게 실재**: `deploy.yml`(GATE 1 팬텀자산·GATE 2 라우트 정합+PHP 구문·GATE 3 hooks/no-undef·GATE 4 빌드·Phase 6 E2E·GT①)·`security-scan.yml`(SAST=CodeQL·SCA=npm/composer audit·Secret Detection=B4 `tools/scan_secrets.sh` SSOT·authz regression G15·★283차 부재증명[codeql|npm audit|snyk|trivy grep 0] 후 신설·GT①)·`e2e`/`render.mjs`(266/281차)·docker-compose/Dockerfile(IaC seed·GT①). 부재=Canary/Blue-Green/DAST/Container Scan/formal Orchestrator. 본 Part는 Developer Foundation(Part 041)/API(042) 상속(재정의 금지).

## 결정
- **D-1 (Part 041/042/Data Platform 재정의 금지):** Developer Foundation(Part 041·CI/CD/거버넌스)·API Gateway(Part 042·`index.php`)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (CI = deploy.yml 승격·★중복 CI 절대 금지):** CI = `deploy.yml`(GATE 1~4 게이트·Static Analysis=팬텀자산/라우트 정합/hooks/no-undef·빌드 검증·Phase 6 E2E). ★다중 게이트 정본(팬텀 정적자산·라우트 등록 정합·no-undef 런타임 ReferenceError 차단·280/281차)·재구현 금지. ★중복 CI 파이프라인 신설 절대 금지. 형식 CI Engine=`deploy.yml` 승격.
- **D-3 (Security Automation = security-scan.yml 승격·★중복 스캔 절대 금지):** Security Automation = `security-scan.yml`(SAST=CodeQL·PHP는 CodeQL 미지원→composer audit·SCA=npm/composer audit·Secret Detection=B4 `tools/scan_secrets.sh` SSOT·authz regression G15). ★283차 부재증명 후 신설·Secret 규칙 SSOT=scan_secrets.sh(pre-commit 동일 스크립트)·재구현 금지. 형식 DAST/Container Scan(trivy)/IaC Scan=순신설(중복 스캔 금지).
- **D-4 (CD/IaC = 기존 승격·형식 신설):** Deployment=`deploy.yml`(Phase 3-5·secrets gating)+수동 pscp/plink·Approval=배포 승인 필수·Rollback=dist.bak(278차)·환경=운영/데모 동등 swap·IaC seed=docker-compose/Dockerfile. ★Canary/Blue-Green/Progressive Delivery/Zero Downtime·형식 IaC(Terraform)/Drift Detection/Pipeline Orchestrator=순신설(부재·과대주장 금지).
- **D-5 (Security/AI = 헌법·자격증명 정합):** Secret=CI secrets gating(HAS_SSH_SECRETS·파이프라인 내부 미저장·평문노출 회피 [[feedback_credentials_handling]])+`ChannelCreds`·Audit=`SecurityAudit`/git. ★Secret Vault/Code Signing/Artifact Integrity=순신설. AI(취약점/테스트/실패 분석)=`security-scan.yml`+Claude Code(본 세션·Part 041)·Explainability=헌법 V4·★AI 운영 배포 자동 승인/보안 정책 자동 변경 불가=배포 승인 필수([[feedback_deploy_approval_mandatory]])+헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Developer/API/Data Platform/헌법 상속·재정의 금지·CI(`deploy.yml` 게이트)·Security Automation(`security-scan.yml`·SAST/SCA/Secret)·Build(vite)·Test(`e2e`/`render.mjs`)·IaC seed(docker-compose)·Release(git)·Rollback(dist.bak)·배포 승인 정책·`SecurityAudit` 재사용(★중복 CI/CD·보안 스캔·배포 파이프라인 절대 금지·정본 재구현 금지)·형식 Canary/Blue-Green/DAST/Container Scan/IaC(Terraform)/Pipeline Orchestrator/Secret Vault만 신설(부재·과대주장 금지). 실행은 K8s/컨테이너 운영 착수 시 종속.

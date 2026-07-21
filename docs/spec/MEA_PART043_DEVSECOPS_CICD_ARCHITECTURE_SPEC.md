# MEA Part 043 — Enterprise DevSecOps & CI/CD Pipeline Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Developer Platform Foundation(Part 041)+API Management(042)+Security Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**CI/CD·Security Automation(SAST/SCA/Secret Detection)·빌드/테스트 게이트·IaC seed는 강하게 실재**(GT①·`deploy.yml`·`security-scan.yml`·docker-compose)·본 Part는 형식 Canary/Blue-Green/DAST/Container Scan/Pipeline Orchestrator 계층만 추가(파이프라인 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 플랫폼 소스개발부터 빌드/테스트/보안/릴리스/배포/운영 전 과정 자동화·표준화. Developer Foundation/API/Kubernetes/Container/Security/Observability/AI Platform 연계 Enterprise DevSecOps Framework.

## §2 구현 범위
DevSecOps · CI · CD · Continuous Deployment · Security Pipeline · IaC · Release Management · Deployment Automation · Governance · AI DevSecOps Intelligence.

## §3 구현 목표 (10)
CI Engine · CD Engine · Pipeline Orchestrator · Security Scan Platform · Release Management Service · Deployment Automation Platform · DevSecOps Dashboard · Governance Manager · Audit Service · AI DevSecOps Advisor.

## §4 아키텍처 원칙 (10)
Everything as Code · Security Shift Left · Automation First · Immutable Infrastructure · Continuous Feedback · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PIPELINE · BUILD · BUILD_JOB · TEST_SUITE · TEST_RESULT · SECURITY_SCAN · RELEASE · DEPLOYMENT · ENVIRONMENT · INFRASTRUCTURE_TEMPLATE · PIPELINE_POLICY · PIPELINE_STATUS · PIPELINE_AUDIT · PIPELINE_TRIGGER · PIPELINE_ARTIFACT. → 상세 = `MEA_PART043_CANONICAL_ENTITIES.md`.

## §6 DevSecOps Domain (10)
Source Integration/Build/Test/Security/Release/Deployment/Infrastructure Automation/Monitoring Integration/Compliance Automation/Enterprise DevSecOps. Pipeline Registry 기준. → ★현행=Source=git·Build/Test=`deploy.yml`(GATE 1~4)·Security=`security-scan.yml`·Deployment=`deploy.yml`(Phase 3-5)·IaC=docker-compose/Dockerfile. ★형식 Pipeline Registry=부분.

## §7 Pipeline Lifecycle (10)
Source Commit→Build→Unit Test→Security Scan→Integration Test→Release→Deployment→Validation→Monitoring→Archive. 자동 실행·추적. → ★현행=Commit=git·Build=`deploy.yml`(GATE 4)·Security Scan=`security-scan.yml`·Test=`e2e`/`render.mjs`(266/281차)·Deployment=`deploy.yml`(Phase 3-5)·Validation=Phase 6 E2E smoke·Monitoring=`/health`. 실 파이프라인.

## §8 Continuous Integration (8)
Source Trigger/Incremental·Parallel Build/Dependency Resolution/Unit Test/Static Code Analysis/Artifact Generation/Build Validation. Commit 자동 Build. → ★★현행=Source Trigger=`deploy.yml`(push)·Dependency=npm install/composer·Static Analysis=`deploy.yml`(GATE 3 rules-of-hooks/no-undef·GATE 1 팬텀자산·GATE 2 라우트 정합+PHP 구문)·Artifact=vite build(dist)·Build Validation=GATE 4. Parallel/Incremental(형식)=부분.

## §9 Continuous Delivery & Deployment (8)
Environment Promotion/Approval Workflow/Canary/Blue-Green/Rolling Update/Rollback/Progressive Delivery/Zero Downtime. 환경 승인 정책. → ★현행=Deployment=`deploy.yml`(Phase 3-5 SCP/SSH·secrets gating)·Approval=배포 승인 필수([[feedback_deploy_approval_mandatory]])·Rollback=dist.bak(278차)·환경=운영/데모(동등 swap [[feedback_177_demo_prod_parity]]). ★Canary/Blue-Green/Progressive Delivery/Zero Downtime=부재.

## §10 Security Automation (8)
SAST/DAST/SCA/Secret Detection/IaC Scan/Container Scan/License Compliance/Vulnerability Assessment. 심각도 이상 배포 차단. → ★★현행=SAST=`security-scan.yml`(CodeQL·JS/TS·PHP는 미지원→composer audit)·SCA=`security-scan.yml`(npm audit+composer audit·Packagist CVE)·Secret Detection=`security-scan.yml`(B4·`tools/scan_secrets.sh` SSOT·pre-commit 동일 스크립트)·authz regression=G15(headerless getJson)·GT①. ★DAST/Container Scan(trivy)/IaC Scan/License Compliance=부재.

## §11 Infrastructure as Code (8)
Infrastructure Template/Provisioning/Configuration Management/Immutable Infrastructure/Drift Detection/Resource Validation/Template Versioning/Policy Enforcement. → ★현행=IaC seed=`docker-compose.yml`+`frontend/Dockerfile`+`infra/docker-compose.yml`·환경 설정=`.env`. ★형식 IaC(Terraform)/Drift Detection/Provisioning/Policy Enforcement=부재.

## §12 Release Management (8)
Release Planning/Versioning/Calendar/Approval/Rollback/Note Generation/Dependency Validation/Deployment History. → ★현행=Versioning=git commit/tag+버전 라우트(/v377~/v431)·Approval=배포 승인·Rollback=dist.bak·History=git log·Note Generation seed=커밋 메시지(NEXT_SESSION.md). ★Release Calendar/형식 Release Manager=부재.

## §13 Pipeline Governance (8)
Pipeline/Deployment/Security/Release/Branch/Approval Policy/Compliance/Audit. → ★현행=Deployment Policy=배포 승인 필수·Branch Policy=master 배포/main 별도([[reference_ci_deploy_inert]])·Security Policy=`security-scan.yml` 게이트·Change Gate=`CHANGE_GATE`·Audit=`SecurityAudit`/git. 형식 통합 Governance Manager=부분.

## §14 Data Security
Tenant Isolation · RBAC · Secret Vault Integration · Artifact Integrity · Code Signing · Audit. 시크릿 파이프라인 내부 저장 금지. → ★현행=Secret=CI secrets(HAS_SSH_SECRETS·gating·평문노출 회피 [[feedback_credentials_handling]])+`ChannelCreds`(AES-256-GCM)·★파이프라인 내부 미저장(secrets gating)·Audit=`SecurityAudit`/git. ★Secret Vault(Vault)/Code Signing/Artifact Integrity(형식)=부재.

## §15 Runtime 규칙
Pipeline Trigger · Build · Test · Security Scan · Deployment · Monitoring · Audit. → ★현행=Trigger=`deploy.yml`(push)·Build=GATE 4·Test=`e2e`·Security Scan=`security-scan.yml`·Deployment=Phase 3-5·Audit=git/`SecurityAudit`.

## §16 API 표준 (8)
Trigger Pipeline/Query Build Status/Execute Deployment/Rollback Release/Query Release History/Security Scan/Pipeline Metrics/Query Audit. → ★현행=Trigger/Deploy=GitHub Actions(push/수동)·History=git log·Query=GitHub UI. ★형식 Pipeline API(Trigger/Rollback)=부재. Part 001 API 표준 상속(신설 시).

## §17 Event 표준 (8)
PipelineTriggered/BuildCompleted/TestCompleted/SecurityScanCompleted/ReleaseApproved/DeploymentCompleted/RollbackExecuted/PipelineAudited. → ★현행=BuildCompleted/SecurityScanCompleted=GitHub Actions(`deploy.yml`/`security-scan.yml`)·Slack(HAS_SLACK_WEBHOOK) seed. Data Platform §15 정합.

## §18 AI Integration
Build 실패 원인/테스트 케이스 생성/배포 위험도/취약점 우선순위/파이프라인 병목/자동 Rollback/릴리스 품질/Explainable. **AI는 운영 배포 자동 승인/보안 정책 자동 변경 불가.** → ★현행=취약점=`security-scan.yml`+감사 세션·테스트 생성/실패 분석=Claude Code(본 세션·Part 041)·Explainability=헌법 V4·운영 배포 자동 승인 불가=배포 승인 필수+헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
Pipeline 시작 ≤10초 · Build Queue ≤5초 · Security Scan 시작 ≤30초 · Deployment 시작 ≤30초 · Dashboard ≤2초 · Availability ≥99.99%. (현행 GitHub Actions seed.)

## §20 Completion Criteria
CI Engine·CD Engine·Security Automation·IaC·Release Management·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족·강함**(CI 게이트·Security Automation(SAST/SCA/Secret)·빌드/테스트·IaC seed 실재·형식 Canary/Blue-Green/DAST/Container Scan/Pipeline Orchestrator=미완). 코드 0.

## 판정
**PARTIAL-strong / ABSENT-formal(Canary/Blue-Green/DAST/Container Scan/formal Orchestrator).** ★실재 강함=CI(`deploy.yml`·GATE 1 팬텀자산·GATE 2 라우트 정합+PHP 구문·GATE 3 hooks/no-undef·GATE 4 빌드·Phase 6 E2E)·Security Automation(`security-scan.yml`·★SAST=CodeQL·SCA=npm/composer audit·Secret Detection=B4 scan_secrets.sh SSOT·authz regression G15·283차 부재증명 후 신설)·Build(vite)·Test(`e2e`/`render.mjs` 266/281차)·IaC seed(docker-compose/Dockerfile)·Release(git/버전 라우트)·Rollback(dist.bak 278차)·배포 승인 정책·Audit(git/`SecurityAudit`). ★**부재(부재증명 완료)=Canary/Blue-Green/Progressive Delivery/Zero Downtime Deployment·DAST·Container Scan(trivy)·IaC Scan/License Compliance·형식 IaC(Terraform)/Drift Detection·형식 Pipeline Orchestrator·Secret Vault·Code Signing·Release Calendar.** ★핵심=**CI 게이트·Security Automation(SAST/SCA/Secret Detection)·빌드/테스트·IaC seed는 강하게 실재(deploy.yml/security-scan.yml·283차 다중 게이트)이나 형식 Canary/Blue-Green/DAST/Container Scan/Pipeline Orchestrator는 부재**(단일 GitHub Actions·수동 pscp/plink 배포·과대주장 금지·[[feedback_competitive_gap_verify]]). Developer/API Platform 상속(재정의 금지)·★중복 CI/CD·보안 스캔·배포 파이프라인 절대 금지(`deploy.yml`/`security-scan.yml`/scan_secrets.sh 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 운영 배포 자동 승인/보안 정책 자동 변경 불가(배포 승인 필수·V3+V5). 코드 변경 0.

## 다음
MEA Part 044 — Enterprise Container Platform & Kubernetes Architecture(본 DevSecOps 상속·★Docker seed 실재·K8s 부재).

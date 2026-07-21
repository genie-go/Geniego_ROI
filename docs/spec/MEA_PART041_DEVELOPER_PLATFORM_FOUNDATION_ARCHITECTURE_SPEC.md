# MEA Part 041 — Developer Platform Foundation Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**신규 계열(Developer Platform Foundation)**: 전 플랫폼(Data/ROI/Commerce/Logistics)+향후 플랫폼의 개발 표준 Baseline. 이후 Developer Part(042~)는 본 문서를 확장만 하고 중복 정의하지 않는다(Golden Rule=Extend). ★**CI/CD·DevSecOps 스캔·빌드·거버넌스·형상관리는 GeniegoROI 자체 개발 툴체인으로 실재이나 형식 Developer Portal/Artifact Repository/Container Platform/제품화 IDP는 부재**(GT①·부재증명 완료). ★비즈니스 모델: GeniegoROI는 e-커머스 ROI 애플리케이션이지 Internal Developer Platform 제품이 아님. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 애플리케이션/플랫폼 개발/테스트/배포/운영 표준 개발 플랫폼. DevSecOps/API Platform/CI/CD/Container/AI Coding/Developer Portal 기준 아키텍처.

## §2 구현 범위
Developer Platform · Development Lifecycle · DevSecOps · CI/CD · Source Management · Artifact Management · Developer Portal · Governance · Security · AI Developer Platform.

## §3 구현 목표 (10)
Developer Portal · DevSecOps Platform · CI/CD Pipeline · Source Repository Platform · Artifact Repository · Build Platform · Deployment Platform · Governance Manager · Audit Service · AI Developer Assistant.

## §4 아키텍처 원칙 (10)
Developer First · Everything as Code · DevSecOps by Default · API First · Cloud Native · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
DEVELOPER · DEVELOPMENT_PROJECT · SOURCE_REPOSITORY · BUILD_PIPELINE · DEPLOYMENT_PIPELINE · ARTIFACT · ENVIRONMENT · RELEASE · VERSION · API_PACKAGE · COMPONENT · PLATFORM_POLICY · DEVELOPER_AUDIT · BUILD_RESULT · DEPLOYMENT_RESULT. → 상세 = `MEA_PART041_CANONICAL_ENTITIES.md`.

## §6 Developer Platform Domain (10)
Source/Build/Test/Release/Deployment Management/API Development/Platform Engineering/Internal Developer Platform/DevSecOps/Enterprise Development. Development Project Registry 기준. → ★현행=Source=git·Build=`deploy.ps1`/vite·Test=`e2e`(smoke.mjs 266차)·Deployment=`deploy.yml`·DevSecOps=`security-scan.yml`(283차). ★형식 Internal Developer Platform(제품화)·Development Project Registry=부재.

## §7 Development Lifecycle (10)
Planning→Development→Build→Test→Security Scan→Release→Deployment→Monitoring→Improvement→Archive. 변경 추적. → ★현행=Build=`deploy.ps1`(vite build)·Test=`e2e`(266차)·Security Scan=`security-scan.yml`·Deployment=`deploy.yml`(master push)·변경 추적=git+`SecurityAudit`. Planning/Improvement(형식)=부분.

## §8 Source Management (8)
Git Repository/Branch Strategy/Merge Request/Code Review/Version Control/Repository Template/Backup/Audit. 형상관리 정책. → ★★현행=Git Repository(실 git repo)·Branch Strategy(master=deploy/dev·main 별도·no common ancestor·[[reference_ci_deploy_inert]])·Version Control(git). ★Merge Request/Code Review/Repository Template(형식 플랫폼)=부분(GitHub 기능 의존).

## §9 Build & Artifact Management (8)
Automated Build/Dependency/Artifact Repository/Package Registry/Cache/Versioning/Signing/Promotion. 변경 불가 버전. → ★현행=Automated Build=`deploy.yml`(npm install→vite build)·Dependency=npm/composer·Build Cache=vite(D:/cache/vite). ★Artifact Repository/Package Registry/Signing/Promotion(형식)=부재.

## §10 CI/CD Pipeline (8)
CI/CD/Continuous Deployment/Environment Promotion/Canary/Blue-Green/Rollback/Release Approval. 승인·환경 정책. → ★현행=CI/CD=`deploy.yml`(master push→build→SCP→smoke test·secrets gating HAS_SSH_SECRETS)·Rollback seed=dist.bak(278차)·배포 승인=수동(운영/데모 dist swap·[[feedback_deploy_approval_mandatory]]). ★Canary/Blue-Green/Environment Promotion(형식)=부재.

## §11 Developer Portal (8)
Project Dashboard/API Catalog/Component Catalog/Documentation/Template/SDK/Team Workspace/Self-Service Provisioning. → ★현행=Documentation=docs/(방대·CONSTITUTION/CHANGE_GATE/registry)·API Catalog seed=routes.php(2658 라우트·버전 레지스트리)·챗봇 지식(270차). ★형식 Developer Portal(Self-Service/SDK Distribution/Team Workspace)=부재.

## §12 Platform Governance (8)
Coding Standard/Repository/Branch/Release/Deployment/Dependency Policy/Compliance/Audit. → ★★현행=Coding Standard=CLAUDE.md/.clinerules·Change Gate=`CHANGE_GATE.md`+`CONSTITUTION.md`+`docs/registry/`·Deployment Policy=배포 승인 필수·Audit=`SecurityAudit`. 형식 통합 Governance Manager=부분(문서 기반 강함).

## §13 Data Security
Tenant Isolation · RBAC · Secret Management · Source Encryption · Artifact Integrity · Audit. 중앙 Secret Management. → ★현행=Secret=`.env`(repo-루트)+`ChannelCreds`(AES-256-GCM)+CI secrets gating(HAS_SSH_SECRETS·평문노출 회피 [[feedback_credentials_handling]])·RBAC=`index.php`·Audit=`SecurityAudit`. ★중앙 Secret Management(Vault 등 형식)=부분.

## §14 Runtime 규칙
Source Validation · Build 실행 · Security Scan · Artifact 생성 · Deployment · Monitoring 등록 · Audit. → ★현행=Build=`deploy.yml`·Security Scan=`security-scan.yml`·Deployment=`deploy.yml`(EN locale guard→build→SCP→smoke)·Audit=git/`SecurityAudit`. Artifact 생성(형식)=dist tarball.

## §15 API 표준 (8)
Create Project/Register Repository/Trigger Build/Deployment/Query Build Status/Release/Artifact/Query Audit. → ★현행=Build/Deploy Trigger=GitHub Actions(수동/push)·Query=GitHub UI. ★형식 Developer Platform API(Create Project/Trigger)=부재. Part 001 API 표준 상속(신설 시).

## §16 Event 표준 (8)
RepositoryCreated/BuildStarted/BuildCompleted/SecurityScanCompleted/ReleaseCreated/DeploymentCompleted/ArtifactPublished/DeveloperAudited. → ★현행=BuildStarted/Completed/SecurityScanCompleted=GitHub Actions(`deploy.yml`/`security-scan.yml`) seed·Slack webhook(HAS_SLACK_WEBHOOK). Data Platform §15 정합.

## §17 AI Integration
코드 생성 지원 · 코드 품질 분석 · 테스트 코드 생성 · 보안 취약점 탐지 · 리팩토링 추천 · API 문서 자동 생성 · 배포 위험 분석 · Explainable Development Insight. **AI는 소스코드 자동 병합/운영 자동 배포 불가.** → ★현행=★AI Developer Assistant=**Claude Code(본 세션 자체)**·보안 취약점 탐지=`security-scan.yml`+감사 세션·API 문서=챗봇 지식(270차)·Explainability=헌법 V4·자동 병합/배포 불가=배포 승인 필수([[feedback_deploy_approval_mandatory]])+헌법 V3+V5. ★마케팅 AI(`ClaudeAI`)≠개발 AI(오흡수 금지·KEEP_SEPARATE).

## §18 성능 요구사항
Build 시작 ≤10초 · Pipeline ≤5분 · Artifact ≤300ms · Deployment ≤30초 · Portal ≤2초 · Availability ≥99.99%. (현행 GitHub Actions·vite 빌드 seed.)

## §19 Completion Criteria
Developer Portal·DevSecOps·CI/CD·Source·Artifact Repository·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(CI/CD·DevSecOps 스캔·빌드·거버넌스·형상관리 실재·형식 Developer Portal/Artifact Repository/Container Platform=미완). 코드 0.

## 판정
**PARTIAL / ABSENT-formal(Developer Portal·Artifact Repository·Container Platform·제품화 IDP).** ★실재=CI/CD(`deploy.yml`·master push→build→SCP→smoke·secrets gating)·DevSecOps(`security-scan.yml`·283차 스캔CI)·Build(`deploy.ps1`/vite·npm/composer)·Test(`e2e`·smoke.mjs 266차)·Source Management(git·branch strategy)·Governance(`CHANGE_GATE.md`+`CONSTITUTION.md`+`docs/registry/`·문서 기반 강함)·Versioning(/v377-v431 routes·git)·Secret(`.env`/`ChannelCreds`/CI gating)·Documentation(docs 방대)·AI Developer Assistant(★Claude Code 본 세션)·Audit(`SecurityAudit`). ★**부재(부재증명 완료)=형식 Developer Portal(Self-Service Provisioning/API·Component Catalog/SDK Distribution/Team Workspace)·Artifact Repository/Package Registry/Signing·Container Platform·Canary/Blue-Green Deployment·Development Project Registry·제품화 Internal Developer Platform.** ★핵심=**GeniegoROI 자체 개발 툴체인(CI/CD·스캔·빌드·거버넌스·형상관리)은 실재이나 제품화 Internal Developer Platform(Developer Portal/Artifact Repository/Container Platform)은 부재**(GeniegoROI는 e-커머스 앱이지 IDP 제품 아님·과대주장 금지·[[feedback_competitive_gap_verify]]). Data/ROI/Commerce/Logistics Platform 상속(재정의 금지)·★중복 CI/CD·거버넌스·시크릿 관리 절대 금지(`deploy.yml`/`CHANGE_GATE`/`ChannelCreds` 정본 재구현 금지·★마케팅 AI≠개발 AI 오흡수 금지)·★AI 소스코드 자동 병합/운영 자동 배포 불가(배포 승인 필수·V3+V5). 코드 변경 0.

## 다음
MEA Part 042 — Enterprise API Management & API Gateway Architecture(본 Developer Foundation 상속·★API Gateway=`index.php` 실재·Part 001 상속).

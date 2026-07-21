# ADR — MEA Part 041 Developer Platform Foundation Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part041 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 041은 Developer Platform Foundation(신규 Developer 계열 Baseline). ★**GeniegoROI 자체 개발 툴체인(CI/CD·스캔·빌드·거버넌스·형상관리)은 실재이나 제품화 IDP는 부재**: 실재=`.github/workflows/deploy.yml`(CI/CD·master push→build→SCP→smoke·GT①)·`.github/workflows/security-scan.yml`(DevSecOps·283차 스캔CI·GT①)·`deploy.ps1`/vite(Build)·`e2e`(smoke.mjs 266차·GT①)·git(Source)·`docs/CHANGE_GATE.md`+`CONSTITUTION.md`+`docs/registry/`(Governance·GT①)·`.env`/`ChannelCreds`(Secret). 부재=Developer Portal/Artifact Repository/Container Platform(제품화). 본 Part는 Data/ROI/Commerce/Logistics Platform 상속(재정의 금지).

## 결정
- **D-1 (전 플랫폼/Data Platform 재정의 금지):** API Gateway(Part 001·`index.php`)·Metadata(Part 004)·전 플랫폼 개발 표준을 준수·인용. 중복 정의 금지.
- **D-2 (CI/CD = deploy.yml/security-scan.yml 승격·★중복 CI/CD 절대 금지):** CI/CD = `deploy.yml`(master push 배포·EN locale guard→npm build→SCP→smoke·secrets gating HAS_SSH_SECRETS)·DevSecOps=`security-scan.yml`(283차). ★CI는 시크릿 미등록 시 빌드만(inert·[[reference_ci_deploy_inert]])·push≠배포·수동 plink/pscp 필수·배포 승인 필수([[feedback_deploy_approval_mandatory]])=정본(재구현 금지). ★중복 CI/CD 파이프라인 신설 절대 금지. 형식 CI/CD Platform=`deploy.yml` 승격.
- **D-3 (Governance = CHANGE_GATE/registry 승격·Everything as Code):** Governance = `CHANGE_GATE.md`+`CONSTITUTION.md`+`docs/registry/`(문서 기반 강함·Everything as Code)·Coding Standard=CLAUDE.md/.clinerules·Deployment Policy=배포 승인 필수. ★거버넌스 정본(재구현 금지). 형식 통합 Governance Manager=순신설(문서 승격).
- **D-4 (Developer Portal/Artifact/Container = 부재·순신설·과대주장 금지):** ★형식 Developer Portal(Self-Service/API·Component Catalog/SDK/Team Workspace)·Artifact Repository/Package Registry/Signing·Container Platform·Canary/Blue-Green·Development Project Registry=**부재·순신설**(제품화 IDP·부재증명 완료). ★GeniegoROI는 e-커머스 앱이지 IDP 제품 아님(과대주장 금지). Documentation seed=docs(방대)·API Catalog seed=routes.php(버전 레지스트리).
- **D-5 (Security/AI = 헌법·자격증명 정합):** Secret=`.env`+`ChannelCreds`(AES-256-GCM)+CI gating(HAS_SSH_SECRETS·평문노출 회피 [[feedback_credentials_handling]])·RBAC=`index.php`·Audit=`SecurityAudit`. ★AI Developer Assistant=**Claude Code(본 세션 자체)**·보안 스캔=`security-scan.yml`·Explainability=헌법 V4·★마케팅 AI(`ClaudeAI`)≠개발 AI(오흡수 금지·KEEP_SEPARATE)·★AI 소스코드 자동 병합/운영 자동 배포 불가=배포 승인 필수+헌법 V3+V5+`CHANGE_GATE`.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Data/ROI/Commerce/Logistics Platform/헌법 상속·재정의 금지·CI/CD(`deploy.yml`)·DevSecOps(`security-scan.yml`)·Build(`deploy.ps1`/vite)·Test(`e2e`)·Source(git)·Governance(`CHANGE_GATE`/registry)·Secret(`.env`/`ChannelCreds`)·`SecurityAudit` 재사용(★중복 CI/CD·거버넌스·시크릿 관리 절대 금지·정본 재구현 금지·★마케팅 AI≠개발 AI 오흡수 금지)·형식 Developer Portal/Artifact Repository/Container Platform/제품화 IDP만 신설(부재·과대주장 금지·IDP 제품화 착수 시). 실행은 제품화 IDP 결정 종속. ★신규 Developer Platform 계열(Part 041~) 착수.

# DSAR — Platform Final Integration & Operational Readiness: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> 본 문서는 Part 3-25 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/bin/`·`deploy.*`·`.github/workflows/`·`docs/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: deploy/Health/SystemMetrics/Db/AdminPlans/migrate/Mapping/Alerting/SecurityAudit/Compliance/security-scan 정독 + integration_orchestrator/production_certification/cutover/hypercare grep. 2 Explore 스레드(41 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**Final Integration & Operational Readiness 거버넌스 프레임워크(integration orchestrator·production certification engine·operational readiness manager·cutover·hypercare·release governance·OAT·service transition)는 전면 부재(그린필드·grep 0·0 handler·0 route·0 table)다.** 재사용 가능 **primitive**만 존재: CODE deploy 파이프라인(deploy.ps1/sh/yml)·runtime health probe(Health/SystemMetrics)·compliance-readiness 대시보드·maker-checker approval·SecurityAudit 해시체인·env/config baseline·migration rollback·CI vuln scan. 이들은 인접 원자이지 readiness/certification/cutover 프레임워크 아님.

- **★§5/§6 Readiness baseline = Health/SystemMetrics**(`Health.php:27-45`·`SystemMetrics.php:60-83`·ok/degraded/down·readiness assessment 스코어링 없음).
- **★§10/§19 Approval = maker-checker**(`Mapping.php:238-291`·`Alerting.php:601-656`·release/go-live sign-off 아님).
- **★§19/§29 Evidence = SecurityAudit**(`SecurityAudit.php:25-31`·`:60-64`·Production Certificate 없음).
- **★§6 Compliance Validation = Compliance readiness**(`Compliance.php:50-128`·control-inventory·production readiness gate 아님).
- **★§9 Vuln scan PARTIAL·SBOM/signing ABSENT**(`security-scan.yml:126-144`·composer audit·SBOM grep 0).

## 2. 실존 substrate 카탈로그

### A. Deployment 파이프라인 (PRESENT — CODE deploy·거버넌스 아님)

| 파일:라인 | 심볼 | 설명 | Part3-25 매핑 |
|---|---|---|---|
| `deploy.ps1:14-34` · `:38` · `deploy.sh:18` | Windows 빌드 오케스트레이터(chatbot/i18n/npm build)·수동 업로드·rsync dist | CODE/asset 빌드·배포 | Deployment(§9·CODE·거버넌스 아님) |
| `.github/workflows/deploy.yml:37-75` · `:77-159` · `:126-144` · `:146-159` · `:161-168` | verify(GATE 1-5)·deploy(build→SCP→nginx reload→health check→asset verify)·Slack | CI 코드 배포·검증 | Release Governance(§10·CODE CI·RC/canary/blue-green 없음) |

### B. Health / Env / Version·Rollback (PARTIAL — baseline·단일노드)

| 파일:라인 | 심볼 | 설명 | Part3-25 매핑 |
|---|---|---|---|
| `Health.php:27-45` · `:41-42` · `:56-70` · `:72-97` · `:81-82` · `:99-110` · `SystemMetrics.php:25` · `:60-83` · `:127-351` · `:278` · `:323-351` | check(ok/degraded·HTTP 200/503)·deployMarker(composer.lock mtime=release proxy)·dbProbe·8 probe(ok/degraded/down) | 단일노드 health probe | Operational/Production Readiness(§5·§6·baseline) |
| `Db.php:43-48` · `:56-61` · `:71-87` · `:81-84` · `:93-110` · `AdminPlans.php:53-71` · `:157` · `:180` · `:209` · `:539` · `:717` | env(production/demo)·envLabel·pdoDemo 분리가드·loadEnvFile·mirrorPlanTablesToSibling(config baseline 미러) | env 해석·config 미러 | Environment Validation(§7)·Config Baseline(§8) |
| `Db.php:157-163` · `migrate.php:34-38` · `:63-73` · `:94-133` | v426 마이그레이션 락·--rollback[=N](-- @rollback SQL·schema_migrations 삭제·dry-run·prod+demo) | schema 롤백 | Rollback Readiness(§14·schema만)·Release Version |

### C. Approval / Evidence / Compliance / Vuln (PRESENT-adjacent / PARTIAL)

| 파일:라인 | 심볼 | 설명 | Part3-25 매핑 |
|---|---|---|---|
| `Mapping.php:31` · `:238-291` · `:244-248` · `:267-269` · `:287` · `Alerting.php:601-656` · `:601-604` · `:642-650` · `:684-686` · `AccessReview.php:177-243` · `:193` · `:220-238` | maker-checker approve(정족수·self-approval 차단·forged-actor 차단)·decision(justification+SecurityAudit) | 승인 machinery(mapping/alert/access·release sign-off 아님) | Release Approval(§10)·Operational Sign-off(§19) substrate |
| `SecurityAudit.php:8` · `:25-31` · `:35-45` · `:47-52` · `:60-64` | append-only 해시체인 log(sha256 prev\|tenant\|actor\|action\|details\|ts)·verify | tamper-evident evidence(Production Certificate 없음) | Integration Evidence(§19)·Immutable Certification History(§29) |
| `Compliance.php:3` · `:50-128` · `:120-124` | SOC2/ISO readiness 대시보드·posture·readiness_pct | control-inventory readiness(production readiness gate 아님) | Production Readiness Assessment(§6)·Compliance Validation |
| `security-scan.yml:72-82` · `:86-87` · `:90-123` · `:126-144` · `:147-177` · `:16` | repo-guards(secrets/authz)·npm/composer audit(report-only)·CodeQL(PHP 미지원) | CI 취약점 스캔(SBOM/signing 없음) | Deployment Readiness(§9·vuln scan PARTIAL·SBOM ABSENT) |
| `docs/DEPLOY_AWS_PRODUCTION.md` · `docs/V389_OPERATIONS_GUIDE_CHECKLIST.md` · `docs/onboarding/CHANNEL_ONBOARDING_CHECKLIST_TEMPLATE.md` · `NEXT_SESSION.md` | 배포 docs·운영 체크리스트·세션로그(RUNBOOK glob 0·go-live checklist 없음) | 배포 문서(runbook/go-live 미완) | Go-Live Checklist(§17)·Runbook(§25) PARTIAL |

## 3. 종합 판정

**Final Integration & Operational Readiness = ABSENT-greenfield(Platform Integration Registry·Enterprise Integration Orchestrator·E2E Integration Validator·Operational Readiness Manager·Production Readiness Assessment·Environment Validation Engine·Config Baseline Manager·Deployment Readiness Validator·Release Governance Engine·OAT Manager·Service Transition·Cutover Manager·Rollback Readiness Validator·Production Certification Engine·Hypercare Manager·Go-Live Checklist Manager·Integration Snapshot/Evidence(native)/Digest/Analytics·Operational Risk Manager·Final Revalidation·Runtime Guard/Static Lint 순신규·0 handler/route/table) / PARTIAL(deploy 파이프라인 CODE·Health/SystemMetrics probe·env/config baseline·migration rollback·maker-checker approval·SecurityAudit evidence·Compliance readiness·CI vuln scan) / ABSENT(SBOM/artifact signing·RUNBOOK·production certificate·hypercare).** 재활용(흡수 아님·확장): deploy 파이프라인→Deployment Readiness·Health/SystemMetrics→Readiness Assessment·env/config→Env Validation/Config Baseline·migration rollback→Rollback Readiness(schema→release)·maker-checker→Release Approval/Sign-off·SecurityAudit→Integration Evidence/Certification History·Compliance readiness→Production Readiness·security-scan→Deployment Readiness(vuln). ★code deploy·CI·죽은 terraform·마케팅 integration/readiness·LiveCommerce go-live·PM baseline(GT②)은 **흡수·오판 금지**.

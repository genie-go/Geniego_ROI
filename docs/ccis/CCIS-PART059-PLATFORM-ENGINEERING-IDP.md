# GeniegoROI Claude Code Implementation Specification

# CCIS Part059 — Enterprise Platform Engineering, Internal Developer Platform (IDP), Golden Paths & Developer Experience Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Platform Engineering·IDP·Golden Paths·Developer Experience(DX) 표준을 수립한다.

> ★**성격(단일 모놀리스·소규모 팀 — 형식 IDP/Backstage 부재·문서 규약+빌드 자동화 DX 실재)**: 이 저장소는
> **단일 모놀리스**(Part025·소규모 팀)이지 **형식 Internal Developer Platform 이 필요한 다중 팀/서비스 조직이
> 아니다**. 명세가 다루는 **형식 IDP(Backstage)·Service Catalog·Golden Paths(formal templates)·Self-Service
> Infrastructure(DB/Queue/namespace provisioning)·Developer Portal·Software Templates/Scaffolder·Platform
> Scorecards·Environment Provisioning(ephemeral)·Platform APIs**는 이 제품의 **사업 범위 밖(out of scope)**이라
> **부재**한다(grep 0·k8s/Terraform 없음·Part016). ★결함이 아니라 정직한 비적용(MEA 064 "out of scope"·
> Part035~058 어휘 재적용). ★**실재 축(문서 규약+빌드 자동화 DX)**: **`CLAUDE.md`**(코드베이스 가이던스·규약)·
> **`docs/CONSTITUTION.md`**(개발 헌법·Golden Rule=Replace가 아니라 Extend)·**`docs/CHANGE_GATE.md`+
> `docs/registry/`**(실행 게이트·레지스트리·거버넌스)·**`docs/WORK_PROCESS.md`**·**`deploy.ps1`**(빌드
> 오케스트레이터)·**CI/CD**(Part015)·**`check_cron_ssot.sh`**(cron SSOT 검증)·**`gen_chatbot_knowledge.mjs`**
> (270차·**"신규=라우트 추가로 챗봇 자동 인지"=golden-path 유사**)·**핸들러 패턴 표준**(routes.php 문자열
> 매핑·`ensureTables` self-healing·`/v{NNN}`·Part005/007)·**PHPStan 품질 게이트**(290차·baseline·Part014) 는
> 실재한다. ★★**오흡수 차단**: **`CHANGE_GATE`/registry=변경 실행 게이트이지 Service Catalog 아님** · **`docs`=
> 문서이지 Developer Portal(self-service) 아님** · **PHPStan=품질 게이트이지 정량 Scorecard 아님**. Part001 §4 에
> 따라 실측 → Backstage/Service Catalog/Golden Paths 부재증명 → CLAUDE.md+deploy.ps1+registry 성문화했다.
> ★정본=**Part003(환경)·015(CI/CD)·025(모놀리스)** 승계. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 DX/플랫폼 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Platform Architecture | Developer→Portal→IDP→Services→Infra→K8s | **부분(대응물)** — 개발자→`CLAUDE.md`/docs→핸들러 패턴→`deploy.ps1`→VPS. Portal/IDP/K8s 아님 |
| Platform Engineering | Platform Team/Shared Services/Abstraction | **부분** — 공통 인프라(`Db`/`Crypto`/`SecurityAudit`)·빌드 자동화. 형식 플랫폼 팀 아님(소규모) |
| Internal Developer Platform(IDP) | Self-Service Portal/Provisioning | **부재(out of scope)** — 셀프서비스 포털 없음(소규모 팀·수동) |
| Golden Paths | Standard Arch/CI-CD/Security/Deploy Template | ★**대응물** — `CONSTITUTION`(Golden Rule)·핸들러 패턴 표준·CI/CD·`deploy.ps1`. formal template 아님 |
| Developer Experience(DX) | Onboarding/Docs/Automation/Feedback | ★**부분 준수** — `CLAUDE.md`·`docs/*`·`gen_chatbot_knowledge.mjs` 자동화·NEXT_SESSION 로그 |
| Self-Service Infrastructure | DB/Queue/Storage/Namespace Provisioning | **부재(out of scope)** — 셀프서비스 프로비저닝 없음(단일 VPS·수동) |
| Developer Portal | Catalog/API Docs/Template/Dashboard | **부분(문서)** — `docs/V*`·`backend/README`·`CLAUDE.md`. 형식 Portal 아님 |
| Service Catalog | Registration/Metadata/Ownership/Dependency | **부분(대응물)** — `docs/registry/`(변경 레지스트리)·핸들러 목록(routes.php). 형식 Service Catalog 아님 |
| Software Templates | PHP/API/AI/Event Service Template | ★**대응물** — 핸들러 패턴(routes.php 문자열 매핑·`ensureTables`·`/v{NNN}`)·Shared 베이스. Scaffolder 아님 |
| Backstage Integration | Catalog/TechDocs/Scaffolder/Plugins | **부재(out of scope)** — Backstage 없음 |
| Platform Scorecards | Security/Quality/Performance/Compliance Score | **부분(대응물)** — **PHPStan(품질 게이트·290차)**·`make quality`·pre-commit 게이트. 정량 Scorecard 아님 |
| Platform APIs | Provision/Deployment/Catalog/Governance API | **부재** — 플랫폼 API 없음. `deploy.ps1`·수동 배포 |
| Environment Provisioning | Dev/Staging/Prod/Ephemeral | **부분** — prod(roi)·demo(roidemo)·MySQL/SQLite 폴백·`.env` 환경 분리. Ephemeral 부재 |
| Platform Governance | Policy/Arch Review/Approval/Compliance | ★**대응물** — `CHANGE_GATE`·`CONSTITUTION`·`action_request`·pre-commit 게이트 |
| Platform Analytics | Usage/Developer Activity/Deploy Trend | **부분** — git 이력·NEXT_SESSION 로그·CI. 형식 플랫폼 분석 부분 |
| Monitoring | Platform Health/Provision Success/DX Metrics | **부분** — `/health`·CI·`SystemMetrics`. DX Metrics 부분 |
| Logging | Platform/Service/Environment ID | **부분** — git·CI 로그·`SecurityAudit`. Platform/Env ID 부분 |
| Security(RBAC/API Auth/Secret/격리) | 플랫폼 리소스 접근 | ★**준수** — RBAC·`api_key`·`Crypto`(secret)·테넌트 격리 |
| Compliance(SOC2/CIS/Secure SDLC) | 플랫폼 표준 | **부분** — `SecurityAudit`·CHANGE_GATE(Secure SDLC 유사). 형식 인증 아님 |
| Disaster Recovery | Platform/Catalog/Template 복구 | **부분** — git(문서/코드)·DB 백업. 형식 Platform 복구 대상 없음 |
| Performance(Provisioning/Template Cache) | 대규모 개발 | **부분** — 빌드 캐시(vite)·CI. Provisioning 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Platform First/Self-Service/Everything as Code/Automation/Standardization/Reusability/Tenant Isolation/Governance) | **부분(문서/자동화축)** | ★Automation(deploy.ps1/gen_chatbot)·Standardization(핸들러 패턴)·Reusability(Extend 원칙)·Governance(CHANGE_GATE)·Tenant Isolation. Self-Service/Platform First=out of scope |
| §4 Platform Architecture | **부분(대응물)** | `CLAUDE.md`/docs→핸들러→`deploy.ps1`. Portal/IDP/K8s 아님 |
| §5 Platform Engineering | **부분** | 공통 인프라·빌드 자동화. 형식 팀 아님 |
| §6 IDP | **부재(out of scope)** | 셀프서비스 포털 없음 |
| §7 Golden Paths | **★대응물** | `CONSTITUTION`·핸들러 패턴·CI/CD·`deploy.ps1` |
| §8 Developer Experience | **부분 준수** | `CLAUDE.md`·docs·`gen_chatbot_knowledge.mjs`·NEXT_SESSION |
| §9 Self-Service Infra | **부재(out of scope)** | 프로비저닝 없음(단일 VPS) |
| §10 Developer Portal | **부분(문서)** | `docs/V*`·README·`CLAUDE.md`. Portal 아님 |
| §11 Service Catalog | **부분(대응물)** | `docs/registry/`·routes.php. 형식 Catalog 아님 |
| §12 Software Templates | **★대응물** | 핸들러 패턴·Shared 베이스. Scaffolder 아님 |
| §13 Backstage | **부재(out of scope)** | Backstage 없음 |
| §14 Platform Scorecards | **부분(대응물)** | PHPStan(290차)·`make quality`·pre-commit |
| §15 Platform APIs | **부재** | 플랫폼 API 없음(수동 배포) |
| §16 Environment Provisioning | **부분** | prod/demo·폴백·`.env` 분리. Ephemeral 부재 |
| §17 Platform Governance | **★대응물** | `CHANGE_GATE`·`CONSTITUTION`·`action_request` |
| §18 Platform Analytics | **부분** | git·NEXT_SESSION·CI |
| §19 Monitoring | **부분** | `/health`·CI·`SystemMetrics` |
| §20 Logging | **부분** | git·CI·`SecurityAudit` |
| §21 Security | **★준수** | RBAC·`api_key`·`Crypto`·테넌트 격리 |
| §22 Compliance | **부분** | `SecurityAudit`·CHANGE_GATE(Secure SDLC 유사) |
| §23 Disaster Recovery | **부분** | git·DB 백업 |
| §24 Performance | **부분** | 빌드 캐시·CI |
| §25~§26 PHP/Claude(Platform/Portal/Catalog/Provisioning Service) | **부분** | ★`CLAUDE.md`·핸들러 패턴·`deploy.ps1`·PHPStan·CHANGE_GATE. IDP/Portal/Provisioning/Backstage 부재 |
| §27~§28 검증(platform:health/catalog:status/provision:validate) | **대상 없음** | artisan 없음·IDP 없음. `/health`·PHPStan·`check_cron_ssot.sh` 로 대체 |

---

## 4. 확립된 표준 (신규 개발/플랫폼 코드가 따를 정본)

- ★**Golden Path 정본 = 핸들러 패턴 표준**(routes.php **문자열 매핑**·`ensureTables` self-healing·`/v{NNN}` 버전·테넌트 격리·`SecurityAudit`·Part005/007). 신규 핸들러는 이 패턴 준수(Software Template 대응). ★**신규=라우트 추가로 챗봇 자동 인지**(`gen_chatbot_knowledge.mjs`·270차·golden-path 자동화).
- ★★**거버넌스 정본 = `CONSTITUTION`(Golden Rule=Extend 아니라 Replace)+`CHANGE_GATE`+`docs/registry/`**. 변경 전 CHANGE_GATE 게이트·중복 금지(grep 전수)·pre-commit 게이트. ★**변경 게이트≠Service Catalog**(오흡수 금지).
- ★**품질 게이트 = PHPStan**(레벨5·baseline·290차)+`make quality`+pre-commit(자격증명 스캔·i18n sacred SHA). ★**품질 게이트≠정량 Scorecard**(오흡수 금지).
- ★**빌드/배포 = `deploy.ps1`(빌드 오케스트레이터)+CI/CD**(Part015). ★**빌드만·수동 배포**(push≠배포·plink/pscp·배포 승인 필수).
- ★**DX = `CLAUDE.md`+docs(`WORK_PROCESS`/`V*`/README)+NEXT_SESSION 로그**. 온보딩/문서/피드백. `check_cron_ssot.sh`(cron SSOT).
- ★★**오흡수 차단**: **`CHANGE_GATE`/registry(변경 게이트)≠Service Catalog** · **docs(문서)≠Developer Portal(self-service)** · **PHPStan(품질 게이트)≠Platform Scorecard(정량)** · **핸들러 패턴(문서 규약)≠Scaffolder(자동 생성)**.
- ★**사업범위 원칙**: **형식 IDP/Backstage/Service Catalog/Self-Service Provisioning/Ephemeral Env 는 단일 모놀리스·소규모 팀 범위 밖** — 다중 팀/서비스/k8s 도입 전 선이식 금지. 문서 규약+빌드 자동화만 확장.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 단일 모놀리스 out of scope)

1. **형식 IDP(Backstage)·Developer Portal(self-service)·Service Catalog** — 안 함. **단일 모놀리스·소규모 팀**(다중 팀/서비스 조직 아님·Part025). `CLAUDE.md`+docs+CHANGE_GATE 가 대응물.
2. **Self-Service Infrastructure(DB/Queue/namespace provisioning)·Environment Provisioning(ephemeral)** — 안 함. **단일 VPS·k8s/Terraform 없음**(Part016). prod/demo 수동 분리·MySQL/SQLite 폴백.
3. **Software Templates(Scaffolder)·Platform APIs** — 부분/부재. 핸들러 패턴(문서 규약)이 대응물. 자동 생성 Scaffolder 미도입.
4. **Platform Scorecards(정량 점수)** — 부분. PHPStan(품질 게이트)·`make quality`·pre-commit 이 대응물. 정량 Scorecard UI 부재.
5. **`CLAUDE.md`/`CHANGE_GATE`/PHPStan 을 Developer Portal/Service Catalog/Scorecard 로 오흡수 금지** — 문서/변경 게이트/품질 게이트이지 형식 플랫폼 도구 아님.
6. **artisan `platform:*`/`catalog:status`/`provision:validate` 명령** — 없음(Slim·IDP 없음). `/health`·PHPStan·`check_cron_ssot.sh`·CI 로 대체.

★**준수하는 실 원칙**: **Golden Path(핸들러 패턴·라우트 추가 자동 인지)·거버넌스(CONSTITUTION Golden Rule/CHANGE_GATE/registry·중복 금지)·품질 게이트(PHPStan/make quality/pre-commit)·빌드 자동화(deploy.ps1/CI)·DX 문서(CLAUDE.md/docs/NEXT_SESSION)·테넌트 격리**. ★**오흡수 차단**: 변경 게이트≠Service Catalog·docs≠Portal·PHPStan≠Scorecard. ★**out of scope 정직 선언**: IDP/Backstage/Self-Service 는 단일 모놀리스 범위 밖.

---

## 6. Claude Code 구현 규칙

1. 신규 서비스=핸들러 패턴(routes.php 문자열 매핑·`ensureTables`·`/v{NNN}`·테넌트 격리) 준수(Golden Path). ★라우트 추가로 챗봇 자동 인지(`gen_chatbot_knowledge.mjs`).
2. ★★거버넌스=`CONSTITUTION`(Extend 아니라 Replace 금지)+`CHANGE_GATE`(변경 전 게이트·중복 grep 전수)+`docs/registry/`. pre-commit 게이트 통과.
3. 품질=PHPStan(레벨5·baseline·290차)+`make quality`. 빌드=`deploy.ps1`(빌드만)·배포=수동 승인(push≠배포).
4. ★★**오흡수 금지**: `CHANGE_GATE`(변경 게이트)·docs(문서)·PHPStan(품질 게이트)을 Service Catalog/Developer Portal/Scorecard 로 표기하지 않는다.
5. ★**형식 IDP/Backstage/Self-Service Provisioning/Ephemeral Env 를 선이식하지 않는다** — 단일 모놀리스·소규모 팀 범위 밖(다중 팀/k8s 선행).
6. DX=`CLAUDE.md`/docs/NEXT_SESSION 업데이트. 환경/CI/CD 판정=Part003/015 정본.

---

## 7. Completion Criteria

- [x] DX/플랫폼 스택 **실측**(형식 IDP/Backstage/Service Catalog/Self-Service Provisioning/Scorecard 부재·`CLAUDE.md`·`CONSTITUTION`/`CHANGE_GATE`/registry·`deploy.ps1`·핸들러 패턴·PHPStan·`gen_chatbot_knowledge.mjs` 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 IDP/Backstage **out of scope**(단일 모놀리스) 증명·문서 규약+빌드 자동화 실재)
- [x] 실 DX(핸들러 패턴 Golden Path+CHANGE_GATE 거버넌스+PHPStan 품질+deploy.ps1+CLAUDE.md) 성문화(§4)
- [x] ★Golden Path(라우트 추가 자동 인지)·거버넌스(Extend 원칙)·품질 게이트·★★오흡수 차단(CHANGE_GATE≠Catalog·docs≠Portal·PHPStan≠Scorecard) 명시
- [x] 의도적 미적용 + 사유(§5) — IDP/Backstage/Service Catalog/Self-Service Provisioning/Scaffolder/Ephemeral Env(단일 모놀리스 out of scope)
- [x] Claude Code 규칙(§6) · `CLAUDE.md`·`CHANGE_GATE`·핸들러 패턴·PHPStan·`deploy.ps1` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **문서 규약 + 빌드 자동화 DX**(`CLAUDE.md` 가이던스 +
> `CONSTITUTION`/`CHANGE_GATE`/registry 거버넌스 + 핸들러 패턴 Golden Path + PHPStan 품질 게이트 + `deploy.ps1`)
> 의 성문화이지 Backstage/IDP/Service Catalog/Self-Service Provisioning 이식이 아니다. ★★**오흡수 차단**:
> **`CHANGE_GATE`는 Service Catalog 가 아니고, docs 는 Developer Portal 이 아니며, PHPStan 은 Platform Scorecard
> 가 아니다**. ★**out of scope 정직 선언**: 형식 IDP 는 단일 모놀리스·소규모 팀 범위 밖이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part060 — Enterprise FinAI, Revenue Intelligence, Pricing Optimization & Monetary Reward** — ★사전 실측 예고: ★**Part031(재무)·055(의사결정)와 중복** — 형식 FinAI 플랫폼은 별개이나, 수익 인텔리전스 실체는 **`Pnl`(실순이익·핵심 경쟁력)·`Mmm`(ROI frontier·예산 최적화·정직 미산출)·`PriceOpt`(AI 가격 최적화·Dynamic Pricing·po_simulations)·`AutoRecommend`/`Decisioning`(수익 추천)·리워드/쿠폰(`CouponEngine`/`Referral`/`Promotion`)·`DemandForecast`(매출 예측)·수수료(정산)**로 강하게 실재. Part060 도 실측→FinAI 플랫폼 판정→Pnl+Mmm+PriceOpt+리워드 성문화. ★강한 영역(손익/가격=핵심 경쟁력)·Part031/055 중복 명시·정직 미산출·high-value 게이트 승계.

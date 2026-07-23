# GeniegoROI Claude Code Implementation Specification

# CCIS Part068 — Enterprise Digital Immune System (DIS), Secure SDLC Automation, Software Supply Chain Security & Trusted Delivery Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise DIS·Secure SDLC Automation·Software Supply Chain Security·Trusted Delivery 표준을 수립한다.

> ★**성격(★Part014/015/040/059/063 중복 — Secure SDLC substrate 강함·형식 SBOM/SLSA/artifact signing/DIS 부재)**:
> 본 Part 는 **CCIS Part014(테스트)·015(CI/CD)·040(SecOps)·059(플랫폼)·063(컴플라이언스)와 중복**되며 그 판정을
> 승계한다. 명세가 다루는 **형식 SBOM 생성(CycloneDX/SPDX)·SLSA(provenance/build isolation/level)·Artifact
> Signing(Sigstore/Cosign/in-toto)·Build Provenance·형식 DIS 플랫폼·형식 CVSS 스코어링 대시보드**는 **부재**한다.
> ★**실재 축(Secure SDLC·shift-left)**: **pre-commit 게이트**(자격증명 스캔 SSOT `tools/scan_secrets.sh`·i18n
> sacred SHA)·**CI 보안 스캔(`security-scan.yml`·283/289차)** — **repo-guards**(B4 자격증명 SSOT·G15 인가 회귀
> 가드·**차단 게이트**)·**npm/composer audit**(의존성 CVE·Vulnerability Management)·**CodeQL**(JS/TS 정적분석·
> PHP 미지원→composer audit 커버)·**dependabot**(의존성 CVE)·**PHPStan**(290차 정적분석)·**`composer.lock`**
> (Dependency Lock)·**`CHANGE_GATE`**(Release Governance 유사)·**CI/CD `deploy.yml`**(Part015)·**E2E 스모크**
> (266차)·**SSRF/writeGuard/`SecurityAudit`**(Part040) 는 실재한다. ★★**핵심 문화자산(정직·`security-scan.yml`
> 주석)**: **"CI 가드가 있으니 안전하다"고 읽지 말 것 — 탐지(detection)이지 예방(prevention)이 아니다.
> 브랜치 보호·required check 가 없으면 master 직push 시 사후 통보만**(275차 오독으로 4층 오염된 교훈). ★★**AI
> Generated Code Verification 실재**: 이 저장소는 **Claude Code 로 AI 빌드**되며, 검증=pre-commit/CI 가드+PHPStan+
> CHANGE_GATE+**사람 승인(배포 승인 필수)**+감사 오탐 방지 문화(재증명). Part001 §4 에 따라 실측 → SBOM/SLSA/
> Sigstore 부재증명 → pre-commit+PHPStan+CHANGE_GATE+CI 성문화했다. ★정본=**Part014/015/040/059/063** 승계·
> "탐지≠예방·규칙 SSOT"·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 Secure SDLC 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| DIS Architecture | Source→SDLC→Validation→Build→Sign→Deploy→Monitor | **부분(대응물)** — 커밋→pre-commit/CI 가드→`deploy.ps1` 빌드→수동 배포→`SystemMetrics`. Sign/Provenance 계층 아님 |
| Digital Immune System(DIS) | Secure Dev/Validation/Protection/Runtime Feedback | **부분** — pre-commit/CI 가드·SSRF/writeGuard(런타임)·`SecurityAudit`. 형식 DIS 플랫폼 아님 |
| Secure SDLC Automation | Coding Validation/Static/Dynamic/Gate | ★**실재** — pre-commit 게이트·**PHPStan**(정적·290차)·**CodeQL**(JS/TS)·E2E 스모크(266차)·차단 게이트(repo-guards) |
| Software Supply Chain Security | Dependency/Package/Provenance/Risk | **부분** — **dependabot**·**composer/npm audit**(CVE)·`composer.lock`. Provenance/SLSA 부재 |
| SBOM | Component Inventory/License/Vuln Ref | **부재** — 형식 SBOM(CycloneDX/SPDX) 생성 없음. `composer.lock`/`package-lock`(의존성 목록)이 부분 대응 |
| SLSA | Build Integrity/Provenance/Isolation/Level | **부재** — SLSA provenance/level 없음. CI 빌드(격리 러너)는 부분 |
| Artifact Signing | Build/Container/Package Signing/Verify | **부재** — Sigstore/Cosign 서명 없음. 배포=수동 pscp(무결성=수동) |
| Build Provenance | Metadata/Source Verify/Builder Identity | **부재(대응물 아님)** — in-toto 없음. git 커밋·CI 이력이 부분(★provenance 아님) |
| Trusted Build Pipeline | Verification/Isolation/Reproducible/Runner | **부분** — CI(GitHub Actions 격리 러너)·`deploy.ps1`. Reproducible Build 부분 |
| Dependency Security | Lock/Trusted Repo/Integrity/Risk | ★**실재** — `composer.lock`·**dependabot**·**composer/npm audit**(Packagist/npm CVE) |
| AI Generated Code Verification | AI Review/Security/Standard/Human Approval | ★**실재(문화자산)** — pre-commit/CI 가드·PHPStan·CHANGE_GATE·**사람 승인(배포 승인 필수)**·감사 오탐 방지 |
| Secret Scanning | API Key/Token/Password/Cert Detection | ★**실재** — pre-commit B4(`tools/scan_secrets.sh`)·**CI repo-guards B4**(같은 SSOT·차단 게이트) |
| Vulnerability Management | CVE/CVSS/Priority/Patch | **부분** — dependabot·composer/npm audit(CVE·리포트 전용). 형식 CVSS 대시보드/patch 우선순위 부분 |
| Trusted Delivery | Release/Approval/Integrity/Audit | ★**부분 준수** — **배포 승인 필수**(사전 승인·CLAUDE.md)·수동 배포·`SecurityAudit`. 형식 무결성 검증(서명) 부분 |
| Release Governance | Policy/Approval/Rollback/Compliance | ★**대응물** — `CHANGE_GATE`·`CONSTITUTION`·배포 승인·dist.bak 롤백·`SecurityAudit` |
| Monitoring | Build/Supply Chain/Vuln Trend/Integrity | **부분** — CI 상태·dependabot·`SystemMetrics`. 형식 Security Score 부분 |
| Logging | Build/Artifact/Release ID | **부분** — git·CI 로그·`SecurityAudit`. Build/Artifact ID 부분 |
| Security(RBAC/Artifact Encrypt/Immutable Build Log/격리) | 산출물 보호 | ★**부분 준수** — RBAC·`SecurityAudit` 불변·`Crypto`·테넌트 격리. Artifact 서명/암호화 부분 |
| Compliance(NIST SSDF/SLSA/OWASP SAMM) | Secure SDLC 표준 | **부분** — pre-commit/PHPStan/CodeQL/audit(SSDF 일부). SLSA/SAMM 형식 아님 |
| Disaster Recovery | Build/Artifact/Repository/Release 복구 | **부분** — git(코드)·dist.bak(롤백)·DB 백업 |
| Performance(Incremental Build/Dep Cache/Parallel Scan) | 빌드 성능 | **부분** — vite 캐시·PHPStan baseline·CI 병렬 잡 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Secure by Design/Shift Left Security/Zero Trust Delivery/Immutable Build/Provenance First/Continuous Verification) | **부분(shift-left축)** | ★Shift Left(pre-commit/CI 가드)·Continuous Verification(dependabot/schedule)·Least Privilege(CI permissions). Provenance First/Immutable Build/Signing 부재 |
| §4~§5 DIS Architecture | **부분(대응물)** | pre-commit/CI 가드·SSRF/writeGuard·`SecurityAudit`. 형식 DIS 아님 |
| §6 Secure SDLC Automation | **★실재** | pre-commit·PHPStan·CodeQL·E2E·차단 게이트 |
| §7 Supply Chain Security | **부분** | dependabot·composer/npm audit·`composer.lock`. Provenance 부재 |
| §8 SBOM | **부재** | 형식 SBOM 없음. lockfile 부분 대응 |
| §9 SLSA | **부재** | provenance/level 없음. CI 격리 부분 |
| §10 Artifact Signing | **부재** | Sigstore/Cosign 없음. 수동 배포 |
| §11 Build Provenance | **부재** | in-toto 없음. git/CI 이력≠provenance |
| §12 Trusted Build Pipeline | **부분** | CI 격리 러너·`deploy.ps1`. Reproducible 부분 |
| §13 Dependency Security | **★실재** | `composer.lock`·dependabot·composer/npm audit |
| §14 AI Generated Code Verification | **★실재(문화자산)** | pre-commit/CI 가드·PHPStan·CHANGE_GATE·사람 승인·감사 오탐 방지 |
| §15 Secret Scanning | **★실재** | pre-commit B4·CI repo-guards B4(SSOT·차단) |
| §16 Vulnerability Management | **부분** | dependabot·composer/npm audit(CVE·리포트 전용) |
| §17 Trusted Delivery | **부분 준수** | 배포 승인 필수·수동·`SecurityAudit`. 서명 검증 부분 |
| §18 Release Governance | **★대응물** | `CHANGE_GATE`·`CONSTITUTION`·배포 승인·dist.bak 롤백 |
| §19 Monitoring | **부분** | CI 상태·dependabot·`SystemMetrics` |
| §20 Logging | **부분** | git·CI·`SecurityAudit` |
| §21 Security | **부분 준수** | RBAC·불변 감사·`Crypto`·격리. Artifact 서명 부분 |
| §22 Compliance | **부분** | pre-commit/PHPStan/CodeQL/audit(SSDF 일부). SLSA/SAMM 형식 아님 |
| §23 Disaster Recovery | **부분** | git·dist.bak·DB 백업 |
| §24 Performance | **부분** | vite 캐시·PHPStan baseline·CI 병렬 |
| §25~§26 PHP/Claude(Secure SDLC/Supply Chain/SBOM/Artifact Signing/Trusted Delivery Service·Sigstore/Cosign/in-toto Adapter) | **부분** | ★pre-commit·PHPStan·CodeQL·audit·dependabot·`CHANGE_GATE`·CI. SBOM/SLSA/Signing/Provenance Service 부재 |
| §27~§28 검증(sdlc:health/sbom:generate/artifact:verify) | **대상 없음** | artisan 없음. pre-commit·PHPStan·`security-scan.yml`·composer audit 로 대체 |

---

## 4. 확립된 표준 (신규 Secure SDLC 코드가 따를 정본)

- ★★**정직 문화자산(최우선·`security-scan.yml` 주석)**: **"CI 가드가 있으니 안전하다"고 읽지 말 것 — 탐지(detection)이지 예방(prevention)이 아니다**. 브랜치 보호·required check 가 없으면 **master 직push 시 사후 통보만**(275차 오독으로 4층 오염). ★진짜 차단은 **브랜치 보호+required check**(GitHub 설정·사용자 결정사항).
- ★**Secret Scanning 정본 = `tools/scan_secrets.sh`(B4·규칙 SSOT)**. pre-commit 과 CI repo-guards 가 **같은 스크립트**(규칙 두 벌 갈라짐 방지·289차 '351 5벌' 클래스). ★**Secret 포함 코드 커밋 금지**.
- ★**정적분석 = PHPStan(레벨5·baseline·290차)+CodeQL(JS/TS)**. ★**PHP는 CodeQL 미지원→composer audit 커버**(미지원 언어 매트릭스 넣으면 상시 실패·추측 선구현 금지).
- ★**의존성 보안 = `composer.lock`+dependabot+composer/npm audit**(CVE·Packagist/npm). ★리포트 전용(백로그 즉시 차단 방지)·백로그 정리 후 차단 게이트 승격.
- ★**AI Generated Code Verification = pre-commit/CI 가드+PHPStan+CHANGE_GATE+사람 승인(배포 승인 필수)+감사 오탐 방지**(재증명·FP 레지스트리). 이 저장소는 AI 빌드라 이 검증이 핵심.
- ★**Release Governance/Trusted Delivery = `CHANGE_GATE`+배포 승인 필수+dist.bak 롤백+`SecurityAudit`**. ★**배포는 수동 pscp·push≠배포**(deploy.yml master push=운영 트리거·`security-scan.yml`은 배포 무간섭).
- ★★**오흡수 차단**: **pre-commit/CI 가드=탐지이지 예방/차단 게이트 아님**(브랜치 보호 부재) · **`composer.lock`=dependency lock이지 SBOM 아님** · **`CHANGE_GATE`=변경 게이트이지 SLSA provenance 아님** · **git/CI 이력≠Build Provenance(in-toto)** · **`SecurityAudit`=런타임 감사이지 build provenance 아님**.
- ★★**Part014/015/040/059/063 중복·재판정 금지**: 테스트=Part014·CI/CD=Part015·SecOps=Part040·플랫폼=Part059·컴플라이언스=Part063 정본. 본 Part 는 DIS/Supply Chain/SBOM/SLSA 관점 보강.
- ★**사업범위 원칙**: **형식 SBOM/SLSA/Artifact Signing(Sigstore)/DIS 플랫폼 은 단일 모놀리스·수동 배포 범위 밖** — 컨테이너/공급망 성숙 요구 전 선이식 금지. dependency audit + pre-commit + PHPStan + CHANGE_GATE 확장.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 다중 Part 중복 + SBOM/SLSA/Signing 부재)

1. **형식 SBOM(CycloneDX/SPDX)·SLSA(provenance/level)·Artifact Signing(Sigstore/Cosign/in-toto)·Build Provenance** — 안 함. 단일 모놀리스·수동 pscp 배포(컨테이너/서명 파이프라인 없음). `composer.lock`/dependabot/audit 가 공급망 대응물.
2. **형식 DIS 플랫폼·형식 CVSS 스코어링 대시보드/patch 우선순위** — 부분. pre-commit/CI 가드·dependabot·composer/npm audit(CVE 리포트)가 대응물.
3. **Reproducible Build·Container Signing** — 부분. CI 격리 러너·`deploy.ps1`. 컨테이너 없음(Part016).
4. **`composer.lock`/`CHANGE_GATE`/`SecurityAudit`/git 이력 을 SBOM/SLSA/Build Provenance 로 오흡수 금지** — dependency lock/변경 게이트/런타임 감사/커밋 이력이지 형식 공급망 증적 아님.
5. **Part014/015/040/059/063 와 중복되는 테스트/CI/감사/플랫폼/컴플라이언스** — 각 Part 정본(재판정 금지). 본 Part 는 DIS/Supply Chain 관점만.
6. **artisan `sdlc:*`/`sbom:generate`/`artifact:verify` 명령** — 없음(Slim). pre-commit·PHPStan·`security-scan.yml`·composer audit 로 대체.

★**준수하는 실 원칙(강함)**: **pre-commit/CI 가드(자격증명 SSOT·인가 회귀·차단)·정적분석(PHPStan/CodeQL)·의존성 보안(composer.lock/dependabot/audit·CVE)·AI 생성코드 검증(가드+PHPStan+CHANGE_GATE+사람 승인)·Release Governance(CHANGE_GATE/배포 승인/dist.bak)·SecurityAudit·테넌트 격리**. ★★**정직**: **CI 가드는 탐지이지 예방 아님**(브랜치 보호 부재)·규칙 SSOT(두 벌 금지). ★**Part014/015/040/059/063 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. ★★**정직**: pre-commit/CI 가드는 **탐지이지 예방 아님**(브랜치 보호·required check 없으면 사후 통보). "가드 있으니 안전"으로 읽지 않는다(275차).
2. Secret Scanning=`tools/scan_secrets.sh`(pre-commit/CI 같은 SSOT·규칙 두 벌 금지). Secret 포함 커밋 금지. 정적분석=PHPStan(290차)+CodeQL(JS/TS·PHP는 composer audit).
3. 의존성=`composer.lock`+dependabot+composer/npm audit(CVE·리포트 전용→백로그 정리 후 차단 승격). AI 생성코드=가드+PHPStan+CHANGE_GATE+사람 승인(배포 승인).
4. Release=`CHANGE_GATE`+배포 승인 필수+dist.bak 롤백+`SecurityAudit`. ★배포=수동 pscp(push≠배포·`security-scan.yml`은 배포 무간섭).
5. ★★오흡수 금지: pre-commit/CI 가드(≠예방/차단)·`composer.lock`(≠SBOM)·`CHANGE_GATE`(≠SLSA)·git/CI 이력(≠Build Provenance)·`SecurityAudit`(≠build provenance).
6. ★★형식 SBOM/SLSA/Artifact Signing(Sigstore)/DIS 플랫폼 을 선이식하지 않는다 — 단일 모놀리스·수동 배포 범위 밖. 테스트/CI/감사/플랫폼/컴플라이언스 판정=Part014/015/040/059/063 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] Secure SDLC 스택 **실측**(SBOM/SLSA/Artifact Signing/Sigstore/DIS 플랫폼 부재·pre-commit 게이트·CI `security-scan.yml`(repo-guards/audit/CodeQL)·dependabot·PHPStan·`composer.lock`·`CHANGE_GATE`·E2E 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 SBOM/SLSA/Signing/DIS 부재 증명·Secure SDLC/shift-left 강함·Part014/015/040/059/063 중복)
- [x] 실 Secure SDLC(pre-commit+PHPStan+CodeQL+dependabot+audit+CHANGE_GATE+배포 승인) 성문화(§4)
- [x] ★★정직 문화자산(CI 가드=탐지≠예방·브랜치 보호 부재·규칙 SSOT)·AI 생성코드 검증·★★오흡수 차단(가드≠예방·lock≠SBOM·CHANGE_GATE≠SLSA·git≠Provenance) 명시
- [x] 의도적 미적용 + 사유(§5) — SBOM/SLSA/Artifact Signing/Build Provenance/DIS 플랫폼/CVSS 대시보드(+Part014/015/040/059/063 중복)
- [x] Claude Code 규칙(§6) · pre-commit·`security-scan.yml`·PHPStan·dependabot·`CHANGE_GATE` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part014/015/040/059/063 중복 + Secure SDLC substrate**(pre-commit
> 게이트 + CI `security-scan.yml`(repo-guards 자격증명 SSOT·인가 회귀·차단·npm/composer audit·CodeQL) +
> dependabot + PHPStan + `composer.lock` + `CHANGE_GATE` + 배포 승인)의 성문화이지 형식 SBOM/SLSA/Artifact
> Signing/DIS 플랫폼 이식이 아니다. ★★**정직 문화자산**: **CI 가드는 탐지이지 예방이 아니다**(브랜치 보호·required
> check 없으면 사후 통보·275차 오독 교훈). ★★**오흡수 차단**: **`composer.lock`은 SBOM 이 아니고, `CHANGE_GATE`는
> SLSA 가 아니며, git/CI 이력은 Build Provenance 가 아니다**. 테스트/CI/감사/플랫폼/컴플라이언스=Part014/015/040/
> 059/063 정본(재판정 금지).

---

## 다음 Part

**CCIS Part069 — Enterprise Autonomous Data Intelligence, Unified Semantic Data Layer, Active Metadata & AI-Native Data Platform** — ★사전 실측 예고: ★**Part026/034/041/049/050(데이터 계열)와 강한 중복** — 형식 Active Metadata·AI-Native Data Platform·Data Contracts·Data Observability 도구는 **부재**이나, 데이터 실체는 **`EventNorm`/Unified Data Model(semantic layer)·rollup 집계·V3 Data Trust(품질/신뢰)·출처 lineage·`DataPlatform`(Registry)·`GeniegoGlossary`(용어)·cron sync**로 부분 실재(데이터 계열 정본 승계). Part069 도 실측→Active Metadata/Data Contracts/Data Observability 부재증명→EventNorm+rollup+V3 Trust+lineage 성문화. ★★핵심: 데이터 계열 5개 Part(026/034/041/049/050) 중복 명시·"단일 Intelligence Layer(헌법 V4 §16)"·"수집≠사용"·MEA 065 메타계층 부재 승계·재판정 금지.

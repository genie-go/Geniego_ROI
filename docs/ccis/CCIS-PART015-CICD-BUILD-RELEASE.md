# GeniegoROI Claude Code Implementation Specification

# CCIS Part015 — CI/CD Pipeline, Build & Release Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

CI/CD·빌드·릴리스 표준을 수립한다.

> ★**성격(Part001~014 과 동일)**: 사용자가 Part015 명세(Semantic Versioning·Docker Multi-stage·
> Container Registry·Blue-Green/Canary·Helm/Terraform IaC·Environment Promotion 5단계)를 제공했으나
> **그대로 따르지 않았다.** 실측 결과 이 저장소는 **GitHub Actions verify 게이트 + 빌드 + 수동
> pscp/plink 배포(CI SCP 는 secret-gated·inert)** 가 정본이며, semver 태그·Docker 배포·k8s·Blue-Green·
> Canary 는 부재다. Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재 CI/CD·배포 규약 성문화**했다.
> ★본 세션(290차후속)에 **SHA 검증 수동배포·rollback 백업을 직접 수행**했고 그 교훈을 §5 에 코드화한다.
> (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 CI/CD 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Git Workflow/Branch | GitHub Flow·`main` 기본 | **Trunk = `master`**(★`origin/main` 과 **공통조상 없음**·별개 계보). feature/fix 브랜치. GitHub 기본=main(전환 보류·P7) |
| Commit Convention | Conventional Commits | ★**준수**(`feat/fix/docs/chore/refactor(scope):`) |
| CI verify | 정적분석·테스트 | ★**`deploy.yml` verify job**(전 push/PR): GATE1 팬텀자산·GATE2 라우트등록+php-l·GATE3 rules-of-hooks·GATE4 프로덕션빌드·GATE5 E2E smoke(데모·test secret 有) |
| CI deploy | 자동 배포 | **`deploy` job**(master push·`needs: verify`): 빌드 + SFTP scp. ★**SCP 는 `HAS_SSH_SECRETS` gated → 시크릿 미등록 시 skip = inert** → **실배포는 수동**(reference_ci_deploy_inert) |
| 실 배포 | Blue-Green/Canary/Rolling | ★**수동 pscp/plink**: dist tarball 업로드 → **서버측 SHA256 대조** → dist swap(timestamped 백업) → chown www:www → php-fpm reload. 운영+데모 동등 |
| Semantic Versioning | `MAJOR.MINOR.PATCH`·태그 | **git tag 0** — semver 미사용. 버전=**차수(272·290차) + API `/v{NNN}` 접두** |
| Release Note | 자동 생성 | **`NEXT_SESSION.md`**(세션별 인계서·B3 500KB 상한) |
| Artifact | Immutable·Registry | **dist tarball**(빌드산출물). Registry 없음. Docker Image 배포 아님 |
| Docker/Registry | Multi-stage·ECR 등 | `docker-compose.yml`·`frontend/Dockerfile` **존재하나 배포 미사용**(infra=Python/FastAPI 스텁·Part003) |
| k8s/Helm/Terraform IaC | Manifest·Chart | **부재** |
| Rollback | Image/Flag | ★**timestamped 백업 디렉터리**(`dist.rollback_<TS>`·`backend.filebak_<TS>`)·이전 dist swap |
| DB Migration 배포 | Backward-compatible·순서 | `php backend/bin/migrate.php`(★**원격 실행**·Db.php 기본 127.0.0.1). 172 이후 `ensureTables` 자가치유 |
| Deployment Approval | 승인 절차 | ★**필수**(`.clinerules` "승인 없이 배포 절대 금지"·매 dist swap/fpm reload 승인) |
| Feature Flag | 관리 | 부분(`VITE_DEMO_MODE`·`GENIE_ENV`·`false /*was demo*/`) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §4~§5 Git Workflow/Branch | **상이** | Trunk=`master`(main 아님·origin/main 공통조상 없음). GitHub 기본 전환=P7 보류 |
| §6 Commit Convention | **★준수** | Conventional Commits |
| §7~§8 PR/Code Review | **부분** | PR 시 verify 게이트. 리뷰=사용자(1인) 승인·`/code-review ultra` 옵션 |
| §9 CI Pipeline(Fail Fast) | **부분 준수** | verify job=Fail Fast 게이트. 단 Unit/Integration Test 단계 없음(Part014) |
| §10 Composer Install | **부분** | 배포는 프론트 dist(npm). backend=원격 `composer install`(build-backend) |
| §11 Static Analysis(CI) | **부분 갭** | CI verify=GATE1~4. ★PHPStan/ESLint baseline·composer audit 은 CI 미포함(로컬/pre-commit·Part014 §6) |
| §12 Code Style(Pint) | **미적용** | 포매터 부재(Part005) |
| §13 Test Pipeline | **부분** | E2E smoke(GATE5). Unit/Integration/Contract 부재 |
| §14 Composer Audit(CI) | **부분** | 로컬 `make quality` §7 편입(Part012). CI 미편입(권고) |
| §15~§17 Docker Build/Registry/Artifact | **미적용** | Docker 배포 미사용. dist tarball(Registry 없음) |
| §18~§20 Semver/Tag/Release Note | **상이** | git tag 0. 차수+`/v{NNN}`. Release Note=NEXT_SESSION.md |
| §21 Environment Promotion(5단계) | **상이** | Local→운영/데모(2축·동일 코드베이스·GENIE_ENV/DB `_demo`). staging 부재 |
| §22~§24 Blue-Green/Canary/Rolling | **미적용** | ★**timestamped 백업 + dist swap**(무중단은 nginx 정적 교체·즉시). 단계적 트래픽 분배 없음 |
| §25 Rollback | **★대응물** | `dist.rollback_<TS>`·`backend.filebak_<TS>` 백업 → 이전 dist 로 mv. DB=forward fix 우선 |
| §26 DB Migration 배포 | **부분** | 원격 `migrate.php` + `ensureTables`. Backward-compatible 지향(이미 실행 마이그레이션 수정 금지) |
| §27 Feature Flag | **부분** | 환경/데모 플래그. 명시적 FF 시스템 아님 |
| §28 Deployment Approval | **★준수(엄격)** | 승인 없이 배포 금지. 운영/데모 swap·fpm reload 매번 승인 |
| §29 CI/CD 보안 | **부분 준수** | 시크릿 Masking·secret-gated 스텝·자격증명 스캔(pre-commit). OIDC 아님 |
| §30 IaC(Docker/k8s/Helm/Terraform) | **미적용** | 부재(수동 배포·서버 직접 관리) |
| §31~§32 PHP/Claude(Multi-stage/Health Check) | **부분** | `/healthz`·`/health` 실재. Multi-stage Docker 배포 미사용 |

---

## 4. 확립된 표준 (신규 CI/CD·배포가 따를 정본)

- **브랜치**: **`master` 트렁크**(배포/개발). ★`git rebase origin/main` **금지**(공통조상 없어 전 커밋 충돌). feature/fix 브랜치 → master 병합.
- **커밋**: Conventional Commits(`feat/fix/docs/chore(scope):`). 한국어 본문 관례.
- **CI(`deploy.yml`)**: verify job(GATE1~5·전 push/PR) → deploy job(master push·`needs: verify`·SCP secret-gated). ★**팬텀 콜 금지**(존재하지 않는 스크립트 호출 = 무음 CI 실패·CLAUDE.md).
- **버전**: 차수(NNN차) + API `/v{NNN}` 접두. semver 태그 미사용. Release Note=`NEXT_SESSION.md`(인계 승인 후 작성·B3 500KB 상한).
- **배포**: ★**수동 pscp/plink·매번 승인**. dist tarball → **서버측 SHA256 대조**(§5) → dist swap → chown www:www → **php-fpm reload**(백엔드 변경 시·opcache). 운영+데모 동등.
- **Rollback**: swap 전 **timestamped 백업**(`dist.rollback_<TS>`·`backend.filebak_<TS>`). 문제 시 이전 dist 로 mv. DB=forward fix 우선.
- **DB**: 마이그레이션은 **원격 실행**(`migrate.php`·로컬은 dev DB). 이미 실행 마이그레이션 수정 금지·`ensureTables` 병행 명시.

---

## 5. ★배포 안전 런북 (본 세션 290차후속 실측·교훈)

★**SHA 검증 없는 배포는 무음 실패한다** — 본 세션에 사용자 실행 swap 이 `PROD_OK` 를 출력하고도 **구 번들이 그대로**였다(업로드된 tarball 이 새 빌드가 아니었음·서버 stale `/tmp` 재사용 추정). 원인 규명 후 **SHA 검증 배포**로 해소했다. 정본 절차:

1. **빌드 무결성**: 운영=plain build(데모플래그 없음)·데모=`--mode demo`(★번들에 `VITE_DEMO_MODE:"true"` 존재로 판정·오염 트랩). ★grep 판정은 `grep -qrF ... && echo A || echo B`(`| head && echo` 는 head 항상 exit0 = 거짓 PASS).
2. **업로드**: **fresh 파일명**(`_290b` 등·stale `/tmp` 충돌 회피). 로컬 SHA256 계산.
3. **서버측 검증**: `sha256sum` 재계산 → **로컬과 일치 확인(불일치 시 중단)** → 추출 `dist.new` → **index.html 이 기대 번들 해시 참조 확인**.
4. **원자적 swap**: `mv dist dist.rollback_<TS>` → `mv dist.new dist` → `chown -R www:www dist`. 백엔드 파일 교체 시 **파일별 백업 + `systemctl reload php8.1-fpm`(opcache)**.
5. **라이브 검증**: ★**캐시버스터**(`?cb=...`·브라우저가 구 index.html 캐시)로 playwright 재검증 — 라이브 번들 해시·거동(예 401 폭풍 해소)·clean 방문자 무후퇴.
6. **정리**: `/tmp` tarball 제거. 백업 dir 누적(FS 100% 트랩·278차) 주의 — 주기적 prune.

★**환경 실측(서버)**: 활성 프론트 docroot=`/home/wwwroot/roi.geniego.com/frontend/dist`(데모=`roidemo.geniego.com`) · 활성 백엔드=`.../backend/src`(≠`backend.bak283`) · php-fpm=**php8.1-fpm.service** · 서버 `root@1.201.177.46`.

---

## 6. 의도적 미적용 + 사유 (정직 보고)

1. **Semantic Versioning 태그·Release 자동생성** — 안 함. 차수+`/v{NNN}`·NEXT_SESSION.md 정본.
2. **Docker Image 배포·Container Registry·Multi-stage** — 안 함. dist tarball 수동 swap. Docker 파일은 미사용 스텁.
3. **Kubernetes/Helm/Terraform IaC·Blue-Green/Canary/Rolling** — 안 함. 서버 직접 관리·nginx 정적 교체(즉시). 인프라 재설계 필요.
4. **CI 에 `make quality` baseline 게이트(PHPStan/ESLint/composer audit) 편입** — ★미실행(Part014 §6 권고). deploy.yml 수정 민감 → 별도 `quality.yml`(deploy 격리·PR 트리거) 향후.
5. **자동 배포(CI SCP 활성화)** — 안 함. **승인 필수 + 수동**이 정본(운영 파괴 방지·`.clinerules`).

★**준수하는 실 원칙**: 게이트 통과 후 배포(needs:verify)·승인 필수·운영/데모 동등·SHA 검증·rollback 백업·팬텀 콜 금지·이미 실행 마이그레이션 불변.

---

## 7. Claude Code 구현 규칙

1. ★**배포는 승인 후·수동 pscp/plink**. master push 는 CI verify 를 돌리지만 실배포는 별개(승인).
2. ★**SHA256 검증 필수**(§5) — 업로드본이 로컬과 일치·index 번들 해시 확인 후 swap. 무검증 swap 금지.
3. swap 전 **timestamped 백업**. 백엔드 교체는 파일별 백업 + php-fpm reload. 백업 dir 누적 주의.
4. 커밋=Conventional Commits. 브랜치=master 트렁크(`rebase origin/main` 금지·공통조상 없음).
5. CI 는 **팬텀 콜 금지**(존재·커밋 이력 확인 후 참조). 마이그레이션은 원격·이미 실행분 수정 금지.
6. Docker/k8s/Helm/semver/Blue-Green 을 "명세에 있다"는 이유로 이식하지 않는다(수동 배포 유지).

---

## 8. Completion Criteria

- [x] CI/CD **실측**(verify GATE1~5·deploy secret-gated inert·수동 배포·git tag 0·master 트렁크)
- [x] 명세 §4~§32 **섹션별 매핑·판정**(semver/Docker/k8s/Blue-Green/Canary 부재 증명)
- [x] 실 CI/CD·배포 규약(master·Conventional·수동 pscp·rollback 백업·원격 migrate) 성문화(§4)
- [x] ★**SHA 검증 배포 안전 런북**(본 세션 실측·교훈)(§5)
- [x] Deployment Approval(§28)·팬텀 콜 금지·운영/데모 동등 준수 명시
- [x] 의도적 미적용 + 사유(§6) · Claude Code 규칙(§7)

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 CI verify + 수동 SHA검증 배포 + rollback 백업 규약의 성문화이지 Docker/k8s/Blue-Green 이식이 아니다.

---

## 다음 Part

**CCIS Part016 — Docker, Container & Kubernetes** — ★사전 경고: Docker 배포 미사용(`docker-compose.yml`·`frontend/Dockerfile` 존재하나 infra=Python/FastAPI **미사용 스텁**·Part003). Kubernetes/Helm/HPA/StatefulSet **전부 부재**. 배포=서버 직접(nginx+php-fpm). Part016 도 실측→부재증명→기존 수동/서버직접 운영 성문화(컨테이너 이식 금지).

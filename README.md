# GeniegoROI

멀티테넌트 ROI 분석 대시보드 (CRM · KPI · Operations · P&L). 운영: https://www.genieroi.com

하나의 저장소에 **독립적으로 빌드되는 두 앱**이 들어 있다.

| 모듈 | 경로 | 스택 |
|------|------|------|
| 웹 클라이언트 | [`frontend/`](frontend/README.md) | React 18.3 + Vite 5.4 SPA + Capacitor 6 (Android/iOS) · 15개 언어 |
| REST API | [`backend/`](backend/README.md) | PHP 8.1 + Slim 4 (PSR-4 `Genie\`) · MySQL 주 + SQLite 폴백 |

---

## 빠른 시작

```bash
# 프론트엔드
cd frontend && npm install && npm run dev          # http://localhost:5173

# 백엔드
cd backend && composer install
php -S 0.0.0.0:8000 -t public

# 로컬 백엔드로 프록시하려면 (기본 프록시 타깃은 운영 서버다)
cd frontend && VITE_PROXY_TARGET=http://localhost:8000 npx vite
```

환경변수는 **저장소 루트의 `.env`** 에 둔다(`backend/src/Db.php:98` 이 직접 파싱).
템플릿은 [`.env.example`](.env.example) — 키 이름은 `GENIE_*` 다. 미설정 시 오류가 아니라 **SQLite 로 조용히 폴백**한다.

---

## 빌드와 배포

```bash
cd frontend && npm run build        # → frontend/dist/
```

**★ 저장소 루트에서 빌드하지 말 것.** 루트에도 `vite.config.js` 와 vite 7 이 있지만 어떤 배포 경로도 사용하지 않으며,
루트 빌드는 다른 vite major·다른 청크 전략 산출물을 만든다. 자세한 근거는 [CLAUDE.md](CLAUDE.md).

배포는 **수동 파일 카피**다. `deploy.ps1`(Windows)은 빌드까지만 수행하고 업로드하지 않는다.
dist 타르볼을 `pscp`/`plink` 로 docroot 에 올린 뒤 `chown www:www` → `php-fpm reload` 한다.
CI 의 배포 단계는 시크릿 미등록으로 skip 되므로 **push 만으로 운영에 반영되지 않는다.**

DB 마이그레이션은 **원격 서버에서** 실행한다 — `php backend/bin/migrate.php current`.

---

## 검증

```bash
make validate        # 저장소 레이아웃 · 모듈 경계 · 생성물 · 대용량/시크릿 파일
make lint            # frontend ESLint + backend php -l
npm run e2e          # E2E 스모크 (배포 전후 회귀 게이트)
```

Windows 에서는 **Git Bash 로 실행**한다. PowerShell 의 `bash` 는 WSL 스텁이라 동작하지 않는다(Makefile 이 선제 차단한다).

별도의 단위테스트 스위트(`npm test` · PHPUnit)는 없다. 검증은 위 게이트 + 수동/배포 확인이다.

---

## 문서

| 진입점 | 내용 |
|--------|------|
| [CLAUDE.md](CLAUDE.md) | 저장소 작업 규칙 · 아키텍처 · 함정 모음 (작업 전 필독) |
| [docs/README.md](docs/README.md) | 전체 문서 인덱스 |
| [docs/CONSTITUTION.md](docs/CONSTITUTION.md) | 개발 헌법 — 충돌 시 최상위 |
| [docs/repository/](docs/repository/REPOSITORY-STRUCTURE.md) | 저장소 구조 · 모듈 소유권 · 브랜치 전략 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 가이드 |

---

## 알아둘 것

- **통합 트렁크는 `master`** 다. `main` 은 `master` 와 공통 조상이 없는 단절된 레거시 라인이므로
  `main` 을 대상으로 rebase/PR 하지 않는다 ([BRANCHING-STRATEGY.md](docs/repository/BRANCHING-STRATEGY.md) §2.0).
- `clean_src/` 는 **읽기 전용 과거 미러**다. 편집하지 않는다.
- 저장소 루트에는 이미 실행된 일회성 패치 스크립트가 다수 남아 있다. 추측으로 실행하지 않는다.
- [`infra/`](infra/README.md) 의 컨테이너·IaC 구성은 **현재 시스템과 일치하지 않는 스텁**이다. 근거로 삼지 않는다.

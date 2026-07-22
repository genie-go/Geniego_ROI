# infra/ — 인프라 코드 (★현재 미사용 스텁)

**이 디렉터리의 컨테이너/IaC 구성은 실제로 돌아가는 시스템과 일치하지 않는다.**
운영 배포 경로가 아니며, 그대로 실행하면 실패한다. 2026-07-22 실측 결과를 아래에 남긴다.

---

## 1. 실측 — 왜 스텁인가

| 파일 | 기술된 스택 | 실제 시스템 |
|------|-------------|-------------|
| `Dockerfile.api` | `python:3.11-slim` · `pip install -e backend` · `uvicorn app.main:app` | 백엔드는 **PHP 8.1 + Slim 4**. `backend/app/main.py`·`setup.py`·`pyproject.toml`·`requirements.txt` 모두 **부재** |
| `Dockerfile.worker` | `python -m app.jobs.worker` | 동일 — 해당 모듈 없음 |
| `docker-compose.yml` | `postgres:15` + `redis:7` | DB는 **MySQL**(`backend/src/Db.php:127`), 실패 시 **SQLite** 폴백(`:149`). 코드베이스에 postgres/psycopg 참조 **0건** |
| `aws/README.md`, `azure/README.md` | 문서 스스로 "스텁"이라 명시 · RDS/Azure Database **for PostgreSQL** 권장 | 동일하게 미적용 |

저장소 루트의 `docker-compose.yml` 도 같은 문제를 갖는다 — `./backend/Dockerfile` 을 빌드 컨텍스트로 잡는데
**`backend/Dockerfile` 이 존재하지 않으며**, `DATABASE_URL` 이 `postgresql+psycopg2://...`(Python SQLAlchemy DSN)다.
즉 `docker compose up` 은 즉시 실패한다. `Makefile` 의 `compose-up`/`compose-down` 타깃도 같은 이유로 동작하지 않는다.

예외적으로 `frontend/Dockerfile`(node:20 빌드 → nginx:1.27 서빙)만 현재 프론트엔드 구조와 정합한다.

---

## 2. 실제 배포 경로

컨테이너가 아니라 **수동 파일 카피**다.

```text
deploy.ps1            빌드만 수행 (챗봇 지식 재생성 → i18n autofill ×4 → cd frontend → npm run build)
   ↓
pscp / plink          dist 타르볼을 docroot 로 업로드 → chown www:www → php-fpm reload
   ↓
운영 roi.geniego.com · 데모 roidemo.geniego.com
```

- CI(`.github/workflows/deploy.yml`)의 `deploy` job 은 `master` push 에서만 돌고,
  SCP/SSH 단계는 시크릿 미등록으로 skip 된다(inert). **push 만으로 운영에 반영되지 않는다.**
- DB 마이그레이션은 **원격 서버에서** `php backend/bin/migrate.php current` 로 실행한다.
  로컬 실행 시 `Db.php` 가 `GENIE_DB_HOST` 기본값 `127.0.0.1` 을 잡아 로컬 DB 를 건드린다.

---

## 3. 디렉터리 구성

```text
infra/
├── Dockerfile.api        [스텁] Python/FastAPI 전제 — 미사용
├── Dockerfile.worker     [스텁] 동일
├── docker-compose.yml    [스텁] postgres+redis 전제 — 미사용
├── aws/                  [스텁] terraform/ · lambda/ (README 가 스텁임을 명시)
├── azure/                [스텁] bicep/ (동일)
└── media/                srs.conf · Caddyfile · docker-compose.yml — 미디어 서버 설정
```

---

## 4. 취급 지침

- **삭제하지 않는다.** 향후 컨테이너 전환 시의 출발점이자, 과거 설계 의도의 기록이다.
- **참조 근거로 삼지 않는다.** 이 파일들을 근거로 "Postgres 를 쓴다"·"워커가 있다"고 판단하면 오진이다.
- 컨테이너화를 실제로 진행한다면 별도 ADR 승인 후, PHP-FPM 기반으로 `Dockerfile.api` 부터 다시 쓴다.

---

*CCIS Part002 — Repository & Monorepo Architecture / 실측 2026-07-22*

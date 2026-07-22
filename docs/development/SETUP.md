# 개발환경 구축 (SETUP)

CCIS Part003 | 실측 2026-07-22

---

## 0. 한 줄 요약

```bash
git clone https://github.com/genie-go/Geniego_ROI.git
cd Geniego_ROI
bash scripts/bootstrap/bootstrap.sh          # Windows: powershell -File scripts\bootstrap\bootstrap.ps1
```

`bootstrap` 은 **환경 검증 → 의존성 설치 → `.env` 템플릿 복사 → git hooks 설정** 순으로 진행하며,
필수 도구가 없으면 그 자리에서 멈추고 무엇이 없는지 출력한다. 반복 실행해도 안전하다(idempotent).

---

## 1. 필요한 것 / 필요 없는 것

이 저장소는 **PHP + Node** 두 런타임만 있으면 개발할 수 있다.

| 구분 | 도구 | 비고 |
|------|------|------|
| **필수** | Node.js + npm | 프론트엔드 빌드. CI 는 node 18 을 쓴다 |
| **필수** | PHP >= 8.1 (CLI) | `backend/composer.json` 의 `require.php` |
| **필수** | Git, Bash | Windows 는 **Git Bash** |
| 권장 | Composer | 백엔드 의존성 추가/갱신 시. `backend/vendor` 가 이미 있으면 당장은 없어도 실행된다 |
| 권장 | GNU Make | 검증 게이트(`make validate`). Windows: `winget install ezwinports.make` |
| 선택 | Python | `scripts/*.py` 6개(i18n 보조)에만 쓰인다. 빌드/배포와 무관 |
| **불요** | Docker | 배포 경로가 아니다. 저장소의 compose 구성은 스텁이다 → [infra/README.md](../../infra/README.md) |
| **불요** | Java / Gradle / Maven | 이 저장소에 존재하지 않는다 |
| **불요** | PostgreSQL / Redis / Kafka | DB 는 MySQL(+SQLite 폴백). 캐시/이벤트 브로커는 쓰지 않는다 |

> CCIS Part003 §4 의 Reference Stack(Java 21 · Spring Boot · Postgres · Kafka · pnpm · Next.js)은
> 이 저장소에 적용되지 않는다. Part001 §4 의 "기존 프로젝트 기술 최우선 유지" 원칙에 따라
> 실제 스택을 기준으로 삼는다. 상세 매핑은 [CCIS-PART003](../ccis/CCIS-PART003-DEVELOPMENT-ENVIRONMENT.md) §4.

---

## 2. PHP 확장

`bootstrap` 이 자동으로 확인한다. 다음 5개는 **필수**다.

| 확장 | 없으면 |
|------|--------|
| `pdo`, `pdo_mysql` | 주 DB 접속 불가 (`backend/src/Db.php:127`) |
| `pdo_sqlite` | 폴백 DB 사용 불가 (`:149`) |
| `mbstring` | 한글 문자열 처리 깨짐 |
| `json` | 전 API 응답 불가 |

다음 2개는 빌드에는 무관하지만 **로컬에서 해당 경로가 Fatal 로 죽는다**.

| 확장 | 영향 범위 |
|------|-----------|
| `openssl` | `openssl_encrypt/decrypt/sign/verify/pkey_*` 9종 — 암복호화·서명 |
| `curl` | 외부 API 호출 34개 파일 |

활성화 방법 — `php --ini` 로 로드된 `php.ini` 경로를 찾아 해당 줄의 `;` 를 제거한다.

```ini
extension=openssl
extension=curl
```

---

## 3. 환경변수

`.env` 는 **저장소 루트**에 둔다. `backend/src/Db.php:98` 이 `__DIR__.'/../../.env'` 를 직접 파싱한다
(PHP-FPM 이 환경변수를 전달하지 않는 배포 환경 대응).

```bash
cp .env.example .env      # bootstrap 이 자동으로 해준다(기존 .env 는 덮어쓰지 않는다)
```

키 이름은 `GENIE_*` 다. 실제로 코드가 읽는 키만 템플릿에 있다.

> ★ **미설정은 오류가 아니라 무음 폴백이다.** DB 접속정보가 비어 있으면 예외가 아니라
> SQLite(`data/genie.sqlite`)로 조용히 넘어간다. "돌아가는데 데이터가 없다" 면 이걸 먼저 의심한다.

Secret 은 저장소에 넣지 않는다. `bootstrap` 도 **Secret 을 생성하지 않는다** — 템플릿 복사까지만 한다.

---

## 4. 실행

```bash
# 프론트엔드 개발 서버 (5173)
cd frontend && npm run dev

# 백엔드 개발 서버 (8000)
cd backend && php -S 0.0.0.0:8000 -t public
```

> ★ **개발 프록시의 기본 타깃은 운영 서버(`https://www.genieroi.com`)다.**
> 로컬 백엔드를 붙이려면 명시해야 한다. 모르고 개발하면 로컬 코드 수정이
> 화면에 반영되지 않는 것처럼 보인다.
>
> ```bash
> cd frontend && VITE_PROXY_TARGET=http://localhost:8000 npx vite
> ```

---

## 5. 빌드

```bash
cd frontend && npm run build      # → frontend/dist/
```

**저장소 루트에서 빌드하지 않는다.** 루트에도 `vite.config.js` 와 vite 7 이 있으나 어떤 배포 경로도
사용하지 않으며, 루트 빌드는 다른 vite major·다른 청크 전략 산출물을 만든다.
운영(`deploy.ps1:30`)과 CI(`deploy.yml:61,97`) 모두 `cd frontend` 후 빌드한다.

---

## 6. 검증

```bash
make validate-env      # 개발환경 도구 (node·php·확장·git·composer·docker·python)
make validate          # 저장소 레이아웃·모듈 경계·생성물·대용량/시크릿
make lint              # frontend ESLint + backend php -l
npm run e2e            # E2E 스모크
```

`make` 는 **Git Bash 에서 실행**한다. PowerShell 의 `bash` 는 WSL 스텁이라 동작하지 않으며,
Makefile 이 이를 감지해 안내 후 중단한다.

단위테스트 스위트(`npm test` · PHPUnit)는 존재하지 않는다. 검증은 위 게이트와 수동 확인이다.

---

## 7. DB 마이그레이션

**원격 서버에서** 실행한다.

```bash
php backend/bin/migrate.php current
```

로컬에서 돌리면 `Db.php` 의 `GENIE_DB_HOST` 기본값 `127.0.0.1` 때문에 운영이 아니라
로컬 DB 가 대상이 된다. 또한 `backend/migrations/` 는 172차 이후 갱신이 멈춰 있고,
그 이후 스키마 변경은 핸들러별 자가치유(`ensureTables`)로 적용된다.

---

## 8. 다음 문서

- [IDE.md](IDE.md) — 에디터 설정과 저장소 규약
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — 실제로 겪은 함정 모음
- [CLAUDE.md](../../CLAUDE.md) — 저장소 작업 규칙 전반

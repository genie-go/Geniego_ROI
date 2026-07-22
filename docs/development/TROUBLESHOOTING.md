# 문제 해결 (TROUBLESHOOTING)

CCIS Part003 | 실측 2026-07-22

증상 → 원인 → 조치 순으로 적는다. 모두 이 저장소에서 **실제로 발생한** 사례다.

---

## 1. 환경 · 실행

### 화면이 뜨는데 내가 고친 코드가 반영되지 않는다

**원인**: `frontend/vite.config.js` 의 개발 프록시 기본 타깃이 **운영 서버**(`https://www.genieroi.com`)다.
로컬 백엔드를 띄워도 API 요청은 운영으로 나간다.

```bash
cd frontend && VITE_PROXY_TARGET=http://localhost:8000 npx vite
```

---

### 앱은 도는데 데이터가 비어 있다 / 저장이 사라진다

**원인**: `.env` 미설정. `Db.php` 는 MySQL 접속 실패 시 **예외를 던지지 않고** SQLite
(`data/genie.sqlite` 또는 `/tmp/genie_roi.sqlite`)로 조용히 폴백한다. 오류 로그도 남지 않는다.

**조치**: 루트에 `.env` 를 만들고 `GENIE_DB_*` 를 채운다(`cp .env.example .env`).
키 이름이 `GENIEGOROI_*` 로 적힌 옛 문서를 따라가면 안 된다 — 코드가 읽는 건 `GENIE_*` 다.

---

### PHP 실행 시 `Call to undefined function openssl_encrypt()` / `curl_init()`

**원인**: 로컬 `php.ini` 에서 해당 확장이 비활성.

**조치**: `php --ini` 로 경로 확인 후 `extension=openssl` · `extension=curl` 주석 해제.
`bash scripts/validation/check-environment.sh --only php` 로 재확인.

---

### `make` 가 "The system cannot find the path specified" 로 죽는다

**원인**: PowerShell/cmd 에서 실행. `bash` 가 `C:\Windows\System32\bash.exe`(WSL 스텁)로 잡히고,
배포판이 없어 실패한다. 오류 메시지가 깨진 한글로 나와 원인 추적이 어렵다.

**조치**: **Git Bash 에서 실행한다.** Makefile 이 이 상황을 감지해 안내 후 중단하도록 돼 있다.

```bash
"C:/Program Files/Git/bin/bash.exe" -lc "cd /e/project/GeniegoROI && make validate"
```

---

### `docker compose up` 이 실패한다

**원인**: 실패가 정상이다. 루트 `docker-compose.yml` 은 존재하지 않는 `./backend/Dockerfile` 을
빌드 컨텍스트로 잡고, `infra/` 의 Dockerfile 은 이 저장소에 없는 Python/FastAPI 앱을 전제한다.

**조치**: 컨테이너는 배포 경로가 아니다. [infra/README.md](../../infra/README.md) 참조.
배포는 `deploy.ps1` 빌드 → `pscp`/`plink` 수동 업로드다.

---

## 2. 빌드

### 빌드는 되는데 운영과 산출물이 다르다

**원인**: 저장소 **루트**에서 `npm run build` 를 돌렸다. 루트에는 별도의 `vite.config.js` 와
vite 7 이 있고, `frontend/` 에는 vite 5.4 와 다른 청크 전략이 있다.

**조치**: 항상 `cd frontend && npm run build`.

---

### 빌드는 통과했는데 배포 후 흰 화면

**원인 후보**:
1. `manualChunks` 에 페이지 그룹을 추가했다 → 청크 간 React 초기화 순서 경합.
   171차에 화이트스크린 6회를 일으켜 제거된 구성이다. **되살리지 않는다.**
2. 미임포트 식별자(`useMemo` 등). `vite build` 는 이걸 잡지 못한다 →
   CI 의 `check_rules_of_hooks` 가드가 잡는다.

**조치**: `npm run e2e:render` 로 실제 렌더를 확인한다. 빌드 성공은 동작 보증이 아니다.

---

### 로컬 빌드와 CI 빌드 결과가 다를까 걱정된다

**현재 상태**: node 버전이 세 곳에서 다르다 — 로컬 24 · CI 18 · `frontend/Dockerfile` 20.
`engines` 선언도 `.nvmrc` 도 없다. `check-environment.sh` 가 로컬↔CI major 불일치를 경고한다.
통일 여부는 미결(→ [CCIS-PART003](../ccis/CCIS-PART003-DEVELOPMENT-ENVIRONMENT.md) §8).

---

## 3. i18n

### 새 문구가 한국어로만 나온다 / 콘솔에 폴백 경고

**원인**: 신규 키를 `ko.js` 에만 추가했다. 15개 로케일 전부에 있어야 한다.

**조치**: `ko.js` 가 원본이다. 나머지 14개에 동일 키를 추가한다.
`deploy.ps1` 이 `i18n_autofill.mjs` 를 4모드로 돌려 자동 채움을 시도하지만, 키 미설정 시 갭 리포트만 남긴다.

---

### 로케일 파일을 열었더니 diff 가 수천 줄이다

**원인**: 에디터가 저장 시 공백 정리/최종 개행을 적용했다.

**조치**: `.vscode/settings.json` 이 이를 막고 있다(의도된 설정 — [IDE.md](IDE.md) §3).
설정을 되돌리지 말고, 이미 발생했다면 해당 파일을 `git checkout` 후 다시 편집한다.

---

## 4. Git · 커밋

### `git rebase origin/main` 이 전 파일 충돌을 낸다

**원인**: `main` 은 `master` 와 **공통 조상이 없는** 별개 히스토리다.

**조치**: `git rebase origin/master`. `main` 대상 rebase/PR 을 하지 않는다.
GitHub 기본 브랜치가 `main` 으로 잡혀 있어 UI 에서 PR 을 열면 base 가 자동으로 `main` 이 된다 — 주의.

---

### pre-commit 훅이 안 돈다

**조치**: `git config core.hooksPath .githooks` (bootstrap 이 자동 설정한다).

---

### 커밋했더니 한글이 깨졌다

**원인**: PowerShell 파이프라인(`Get-Content | Set-Content`)으로 편집했다.

**조치**: `[System.IO.File]::ReadAllText/WriteAllText` + UTF-8(BOM 없음) 사용.
`.ps1` 파일만 예외로 **BOM 포함** 저장한다([IDE.md](IDE.md) §5).

---

## 5. 검증 스크립트

### `make validate` 가 오래 걸리거나 멈춘 것처럼 보인다

**현재는 5초 내에 끝난다.** 과거 `check-large-files.sh` 가 파일당 프로세스를 띄우고
`node_modules` 를 전수 순회해 5분을 넘겼으나, git 명령 기반으로 교체됐다.
그보다 오래 걸린다면 작업트리에 거대한 untracked 디렉터리가 생겼는지 확인한다.

---

### `check-environment.sh` 가 WARN 을 여러 개 낸다

**정상일 수 있다.** docker·python·composer 부재는 이 저장소에서 **선택/권장** 항목이며
`exit 0` 이다. `exit 1` 은 필수 항목(node·npm·php·git·bash)이 빠졌을 때만 발생한다.

---

## 6. 더 볼 곳

- [SETUP.md](SETUP.md) — 환경 구축 절차
- [IDE.md](IDE.md) — 에디터 설정과 인코딩 규약
- [CLAUDE.md](../../CLAUDE.md) — PowerShell 함정 표 등 저장소 전반 규칙
- [infra/README.md](../../infra/README.md) — 컨테이너 구성이 스텁인 이유

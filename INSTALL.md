# GeniegoROI — 로컬 설치 가이드 (협업자용)

클론 후 **한 번의 명령**으로 웹(프론트엔드 + 백엔드)과 DB까지 로컬에서 구동합니다.
MySQL이 없어도 **SQLite로 자동 폴백 + 스키마 자동 생성**되어 즉시 동작합니다.

---

## 1. 사전 요구사항

| 도구 | 버전 | 비고 |
|------|------|------|
| Node.js | 18+ | https://nodejs.org |
| PHP | 8.1+ | `pdo_sqlite`, `pdo_mysql`, `mbstring`, `curl`, `openssl` 확장 권장 |
| Composer | 2.x | https://getcomposer.org |
| (선택) MySQL | 8.0+ | 없으면 SQLite 자동 사용 |

> Windows에서 PHP 확장 활성화: `php.ini`에서 `extension=pdo_sqlite`, `extension=openssl`, `extension=curl` 주석 해제.

---

## 2. 설치

```bash
# Linux / macOS
git clone <repo-url> GeniegoROI && cd GeniegoROI
bash install.sh
```

```powershell
# Windows (PowerShell)
git clone <repo-url> GeniegoROI; cd GeniegoROI
powershell -ExecutionPolicy Bypass -File install.ps1
```

설치 스크립트가 수행하는 것:
1. 사전 요구사항 점검(Node/PHP/Composer 버전)
2. 프론트엔드 의존성 `npm install` (frontend + 루트)
3. 백엔드 의존성 `composer install`
4. `backend/.env` 생성 + `APP_KEY` 자동 발급 (없을 때만)
5. `frontend/.env.local` 생성 (API 상대경로 → vite 프록시)
6. `data/` 디렉터리 준비 (SQLite 저장 위치)

---

## 3. 실행

```bash
bash start-dev.sh          # Linux / macOS
```
```powershell
./start-dev.ps1            # Windows
```

- 백엔드: `http://localhost:8080` (PHP 내장 서버, `backend/public`)
- 프론트: `http://localhost:5173` → 모든 `/api`·`/auth`·`/v{NNN}` 요청을 백엔드로 프록시
- 브라우저에서 **http://localhost:5173** 접속

### 수동 실행 (스크립트 대신)
```bash
# 터미널 1 — 백엔드
php -S localhost:8080 -t backend/public
# 터미널 2 — 프론트 (백엔드로 프록시)
cd frontend
VITE_PROXY_TARGET=http://localhost:8080 npx vite        # PowerShell: $env:VITE_PROXY_TARGET='http://localhost:8080'; npx vite
```

---

## 4. 데이터베이스

- **기본(무설정)**: MySQL 연결 실패 → `data/genie_genie­go_roi.sqlite` 자동 생성. 첫 요청 시 전체 스키마가 멱등 마이그레이션됩니다.
- **데이터 초기화**: `data/genie_*.sqlite` 파일과 임시 마이그레이션 락(`<temp>/genie_roi_v426_migrated_*.lock`)을 삭제 후 재실행.
- **MySQL 사용 시**: `backend/.env`의 `GENIE_DB_*` 값을 맞추고 `geniego_roi` 데이터베이스를 생성하면 자동으로 MySQL을 사용합니다.

---

## 5. 빌드(프로덕션 번들 확인)

```bash
npm run build          # frontend/dist 생성 (vite.config의 root=frontend)
```

---

## 6. 자주 묻는 문제

| 증상 | 해결 |
|------|------|
| 흰 화면 / API 401·404 | `start-dev`로 백엔드가 :8080에 떠 있는지 확인. 프론트는 반드시 `VITE_PROXY_TARGET` 설정된 상태로 기동(`start-dev` 사용). |
| `pdo_sqlite not found` | PHP 확장 활성화(php.ini). MySQL을 쓰면 불필요. |
| `composer install` 실패 | PHP 버전/확장 확인. `composer install --ignore-platform-reqs`는 최후수단. |
| 포트 충돌 | 8080/5173 사용 중이면 종료 후 재실행. |
| CORS 오류 | 백엔드 `index.php`가 `http://localhost:5173`을 기본 허용. 프록시 경유(상대경로)면 CORS 자체가 발생하지 않음. |

---

## 7. 보안 주의

- `backend/.env`, `*.sqlite`, `frontend/.env.local`은 **커밋 금지**(`.gitignore` 등록됨).
- `PADDLE_SKIP_VERIFY=true`는 **로컬 전용**입니다. 운영 배포에 사용하지 마세요.
- 실제 채널/AI 키는 각자 로컬 `.env`에만 등록하고 공유하지 마세요.

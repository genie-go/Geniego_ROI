#!/usr/bin/env bash
# ==============================================================================
# GeniegoROI 로컬 인스톨러 (Linux / macOS)
# 협업자가 클론 후 `./install.sh` 한 번으로 웹(프론트+백엔드)+DB(SQLite 자동) 구성.
# 사용:  bash install.sh
# ==============================================================================
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
err() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

say "GeniegoROI 로컬 설치 시작 — $ROOT"

# ── 1. 사전 요구사항 점검 ───────────────────────────────────────────────
need() { command -v "$1" >/dev/null 2>&1 || { err "$1 미설치 — $2"; MISSING=1; }; }
MISSING=0
need node "Node.js 18+ 필요 (https://nodejs.org)"
need npm  "npm 필요 (Node.js 동봉)"
need php  "PHP 8.1+ 필요 (https://php.net)"
need composer "Composer 필요 (https://getcomposer.org)"
[ "$MISSING" = "1" ] && { err "필수 도구를 설치한 뒤 다시 실행하세요."; exit 1; }

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -lt 18 ] && { err "Node 18+ 필요 (현재 $(node -v))"; exit 1; }
PHP_OK=$(php -r 'echo version_compare(PHP_VERSION,"8.1.0",">=")?"1":"0";')
[ "$PHP_OK" = "1" ] || { err "PHP 8.1+ 필요 (현재 $(php -r 'echo PHP_VERSION;'))"; exit 1; }
# SQLite PDO 확장 점검(없으면 안내)
php -m | grep -qi pdo_sqlite || err "경고: php pdo_sqlite 확장 없음 — SQLite 폴백 불가(MySQL 필요)"
ok "사전 요구사항 충족 (node $(node -v), php $(php -r 'echo PHP_VERSION;'))"

# ── 2. 프론트엔드 의존성 ────────────────────────────────────────────────
say "프론트엔드 의존성 설치 (npm install)…"
( cd frontend && npm install --no-audit --no-fund )
npm install --no-audit --no-fund   # 루트(빌드 도구)
ok "프론트엔드 의존성 완료"

# ── 3. 백엔드 의존성 ────────────────────────────────────────────────────
say "백엔드 의존성 설치 (composer install)…"
( cd backend && composer install --no-interaction --prefer-dist )
ok "백엔드 의존성 완료"

# ── 4. 환경설정(.env) 생성 + APP_KEY ───────────────────────────────────
if [ ! -f backend/.env ]; then
  cp backend/.env.local.example backend/.env
  KEY=$(openssl rand -base64 32 2>/dev/null || php -r 'echo base64_encode(random_bytes(32));')
  # APP_KEY= 라인에 키 주입(빈 값만 치환)
  php -r '$f="backend/.env";$c=file_get_contents($f);$c=preg_replace("/^APP_KEY=\s*$/m","APP_KEY=".getenv("KEY"),$c,1);file_put_contents($f,$c);' KEY="$KEY" 2>/dev/null \
    || sed -i.bak "s|^APP_KEY=\s*$|APP_KEY=${KEY}|" backend/.env && rm -f backend/.env.bak
  ok "backend/.env 생성 + APP_KEY 발급 (MySQL 없으면 SQLite 자동)"
else
  ok "backend/.env 이미 존재 — 보존"
fi

# ── 5. 프론트 로컬 env(상대경로 → 프록시 경유) ──────────────────────────
if [ ! -f frontend/.env.local ]; then
  printf 'VITE_API_BASE=\nVITE_DEMO_MODE=false\n' > frontend/.env.local
  ok "frontend/.env.local 생성 (API 상대경로 → vite 프록시 → 로컬 백엔드)"
fi

# ── 6. SQLite 데이터 디렉터리 ───────────────────────────────────────────
mkdir -p data
ok "data/ 디렉터리 준비 (SQLite 저장 위치)"

printf '\n\033[1;32m════════ 설치 완료 ════════\033[0m\n'
cat <<'NEXT'
실행:  bash start-dev.sh      (백엔드 :8080 + 프론트 :5173 동시 구동)
  또는 수동:
    1) 백엔드:  php -S localhost:8080 -t backend/public
    2) 프론트:  cd frontend && VITE_PROXY_TARGET=http://localhost:8080 npx vite
브라우저:  http://localhost:5173
DB:  MySQL 미설치 시 자동으로 data/genie_*.sqlite (스키마 자동 생성). 데이터 초기화는 그 파일 삭제.
NEXT

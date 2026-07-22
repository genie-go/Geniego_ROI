#!/usr/bin/env bash
# scripts/bootstrap/bootstrap.sh
# GeniegoROI 개발환경 초기화
# CCIS Part003 — Development Environment
#
# 원칙(Part003 §7.2):
#   · 반복 실행 가능(idempotent)   · 실패 시 즉시 종료
#   · 설치 여부/버전 확인 후 진행  · 로그 출력
#   · **Secret 을 생성하지 않는다** — .env 는 템플릿 복사까지만 하고 값은 사람이 채운다
#
# 사용법:
#   bash scripts/bootstrap/bootstrap.sh            # 전체
#   bash scripts/bootstrap/bootstrap.sh --check    # 검증만(설치 없음)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  exit 1
}
cd "$REPO_ROOT"

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

log()  { echo "[bootstrap] $*"; }
step() { echo ""; echo "── $* ──────────────────────────────"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Bootstrap  |  CCIS Part003"
echo "  repo: $REPO_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────────────────────
step "1. 환경 검증 (필수 도구가 없으면 여기서 중단)"
# ─────────────────────────────────────────────────────────────
bash scripts/validation/check-environment.sh || {
  echo ""
  echo "[bootstrap] 필수 도구가 누락되어 중단합니다. 위 [FAIL] 항목을 먼저 해결하십시오." >&2
  exit 1
}

if [ "$CHECK_ONLY" -eq 1 ]; then
  log "--check 모드 — 설치 단계를 건너뜁니다."
  exit 0
fi

# ─────────────────────────────────────────────────────────────
step "2. 프론트엔드 의존성"
# ─────────────────────────────────────────────────────────────
if [ -d frontend/node_modules ]; then
  log "frontend/node_modules 존재 — npm install 로 잠금파일과 동기화만 수행"
else
  log "frontend/node_modules 없음 — 최초 설치"
fi
( cd frontend && npm install )
log "프론트엔드 의존성 완료"

# ─────────────────────────────────────────────────────────────
step "3. 백엔드 의존성"
# ─────────────────────────────────────────────────────────────
if command -v composer >/dev/null 2>&1; then
  ( cd backend && composer install )
  log "백엔드 의존성 완료"
elif [ -d backend/vendor ]; then
  log "composer 없음 — backend/vendor 가 이미 있어 건너뜁니다(의존성 갱신 시 composer 필요)"
else
  echo "[bootstrap] composer 도 backend/vendor 도 없습니다 — 백엔드를 실행할 수 없습니다." >&2
  echo "[bootstrap] https://getcomposer.org 설치 후 다시 실행하십시오." >&2
  exit 1
fi

# ─────────────────────────────────────────────────────────────
step "4. 환경변수 템플릿"
# ─────────────────────────────────────────────────────────────
# ★ Secret 을 생성하지 않는다. 템플릿만 놓고 값은 사람이 채운다.
if [ -f .env ]; then
  log ".env 존재 — 덮어쓰지 않습니다"
else
  cp .env.example .env
  log ".env.example → .env 복사 완료"
  log "★ 값이 전부 플레이스홀더입니다. DB 접속정보를 채우기 전에는 SQLite 로 무음 폴백합니다."
fi

# ─────────────────────────────────────────────────────────────
step "5. Git hooks"
# ─────────────────────────────────────────────────────────────
CURRENT_HOOKS="$(git config --get core.hooksPath || echo '')"
if [ "$CURRENT_HOOKS" = ".githooks" ]; then
  log "core.hooksPath = .githooks (설정됨)"
else
  git config core.hooksPath .githooks
  log "core.hooksPath 를 .githooks 로 설정했습니다(커밋 전 시크릿 스캔 활성화)"
fi

# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bootstrap 완료"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'NEXT'

다음 단계:

  개발 서버      cd frontend && npm run dev
                 (프록시 기본 타깃은 운영이다. 로컬 백엔드는
                  VITE_PROXY_TARGET=http://localhost:8000 npx vite)

  백엔드 서버    cd backend && php -S 0.0.0.0:8000 -t public

  검증 게이트    make validate     (레이아웃·경계·생성물·대용량/시크릿)
                 make lint         (ESLint + php -l)

  문서           docs/development/SETUP.md · TROUBLESHOOTING.md

NEXT

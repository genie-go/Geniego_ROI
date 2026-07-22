#!/usr/bin/env bash
# scripts/validation/check-environment.sh
# GeniegoROI 개발환경 검증 스크립트
# CCIS Part001 신설 → CCIS Part003 에서 실검증 로직으로 확장
#
# ★ CCIS Part003 §6 은 check-development-environment.sh / check-java.sh /
#   check-node.sh / check-python.sh / check-docker.sh 를 별도 파일로 나열하지만,
#   이 저장소는 다음과 같이 매핑한다(중복 구현 금지 — 헌법 Golden Rule "Extend, Don't Replace"):
#     · check-development-environment.sh → 이 파일 (Part001 산출물을 확장)
#     · check-node.sh / check-python.sh / check-docker.sh → `--only node|python|docker`
#     · check-java.sh → **생성하지 않음**. 이 저장소에 Java/Gradle/Maven 은 존재하지 않는다
#       (backend = PHP 8.1 + Slim 4). 없는 런타임의 검사기를 만들면 그 자체가 허구다.
#
# 사용법:
#   bash scripts/validation/check-environment.sh
#   bash scripts/validation/check-environment.sh --only php
#
# Exit Code:
#   0 = 필수 도구 모두 충족 (권장/선택 항목은 경고만)
#   1 = 필수 도구 누락 또는 버전 미달

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  exit 1
}
cd "$REPO_ROOT"

ONLY=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --only) ONLY="${2:-}"; shift 2 ;;
    *) echo "[ERROR] 알 수 없는 인자: $1" >&2; exit 1 ;;
  esac
done

# 기준값 — 근거를 함께 적는다(임의 숫자 금지)
MIN_PHP="8.1"          # backend/composer.json  "php": ">=8.1"
CI_NODE_MAJOR="18"     # .github/workflows/deploy.yml  node-version: '18'

PASS=0; WARN=0; FAIL=0
pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }
want() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]; }

# a >= b (점 구분 버전 비교)
ver_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Development Environment Validation"
echo "  CCIS Part003 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo '?')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────────────────────
# 1. 필수 — 이게 없으면 빌드가 되지 않는다
# ─────────────────────────────────────────────────────────────
if want node; then
section "1. Node.js / npm (필수 — 프론트엔드 빌드)"
if command -v node >/dev/null 2>&1; then
  NODE_V="$(node -v | sed 's/^v//')"
  NODE_MAJOR="${NODE_V%%.*}"
  pass "node $NODE_V"
  if [ "$NODE_MAJOR" != "$CI_NODE_MAJOR" ]; then
    warn "로컬 node major($NODE_MAJOR) ≠ CI node major($CI_NODE_MAJOR) — 빌드 산출물이 CI 와 달라질 수 있다"
  fi
else
  fail "node 없음" "https://nodejs.org 에서 LTS 설치. CI 는 node ${CI_NODE_MAJOR} 를 쓴다."
fi
if command -v npm >/dev/null 2>&1; then
  pass "npm $(npm -v)"
else
  fail "npm 없음" "Node.js 설치 시 함께 설치된다."
fi
fi

if want php; then
section "2. PHP (필수 — 백엔드 런타임)"
if command -v php >/dev/null 2>&1; then
  PHP_V="$(php -r 'echo PHP_VERSION;' 2>/dev/null)"
  if ver_ge "$PHP_V" "$MIN_PHP"; then
    pass "php $PHP_V (요구 >= $MIN_PHP)"
  else
    fail "php $PHP_V — 요구 버전 미달(>= $MIN_PHP)" "backend/composer.json 의 require.php 기준."
  fi

  # Db.php / Crypto.php / 외부 API 호출이 실제로 요구하는 확장
  #   pdo_mysql : Db.php:127  주 DB
  #   pdo_sqlite: Db.php:149  폴백 DB
  #   openssl   : Crypto 계열 openssl_encrypt/sign/pkey_* 9종
  #   curl      : 외부 API 호출 34개 파일
  for ext in pdo pdo_mysql pdo_sqlite mbstring json; do
    if php -m 2>/dev/null | grep -qix "$ext"; then
      pass "php 확장 $ext"
    else
      fail "php 확장 $ext 비활성" "php.ini 에서 extension=$ext 주석을 해제하라. 위치: $(php --ini 2>/dev/null | sed -n 's/.*Loaded Configuration File: *//p')"
    fi
  done
  for ext in openssl curl; do
    if php -m 2>/dev/null | grep -qix "$ext"; then
      pass "php 확장 $ext"
    else
      warn "php 확장 $ext 비활성 — 로컬에서 암복호화/외부 API 경로가 Fatal 로 죽는다(빌드에는 무관)"
    fi
  done
else
  fail "php 없음" "PHP >= $MIN_PHP CLI 설치 필요."
fi
fi

if want git; then
section "3. Git / Bash / Make (필수 — 저장소 작업과 검증 게이트)"
command -v git >/dev/null 2>&1 && pass "git $(git --version | awk '{print $3}')" \
  || fail "git 없음" "https://git-scm.com"
command -v bash >/dev/null 2>&1 && pass "bash $(bash --version | head -1 | awk '{print $4}')" \
  || fail "bash 없음" "Windows 는 Git Bash 를 쓴다."
if command -v make >/dev/null 2>&1; then
  pass "make $(make --version | head -1 | awk '{print $3}')"
else
  warn "make 없음 — 'make validate' 게이트를 쓸 수 없다(스크립트 직접 실행은 가능). Windows: winget install ezwinports.make"
fi
fi

# ─────────────────────────────────────────────────────────────
# 2. 권장 — 없어도 프론트 빌드는 되지만 백엔드 의존성 갱신이 막힌다
# ─────────────────────────────────────────────────────────────
if want composer; then
section "4. Composer (권장 — 백엔드 의존성)"
if command -v composer >/dev/null 2>&1; then
  pass "composer $(composer --version 2>/dev/null | awk '{print $3}')"
elif [ -d backend/vendor ]; then
  warn "composer 없음 — 다만 backend/vendor 가 이미 있어 실행은 가능. 의존성 추가/갱신 시 필요"
else
  fail "composer 없음 + backend/vendor 없음" "https://getcomposer.org 설치 후 'cd backend && composer install'."
fi
fi

# ─────────────────────────────────────────────────────────────
# 3. 선택 — 이 저장소의 어떤 배포 경로도 요구하지 않는다
# ─────────────────────────────────────────────────────────────
if want docker; then
section "5. Docker (선택 — 현재 배포 경로가 아님)"
if command -v docker >/dev/null 2>&1; then
  pass "docker $(docker --version 2>/dev/null | awk '{print $3}' | tr -d ,)"
  warn "★ 저장소의 compose 구성은 스텁이다(infra/README.md) — docker compose up 은 실패한다"
else
  warn "docker 없음 — 정상이다. 배포는 수동 pscp/plink 이며 compose 구성은 미사용 스텁이다"
fi
fi

if want python; then
section "6. Python (선택 — 레거시 i18n 스크립트 전용)"
PY_BIN=""
command -v python3 >/dev/null 2>&1 && PY_BIN=python3
[ -z "$PY_BIN" ] && command -v python >/dev/null 2>&1 && PY_BIN=python
if [ -n "$PY_BIN" ] && $PY_BIN --version >/dev/null 2>&1; then
  pass "$($PY_BIN --version 2>&1)"
else
  warn "python 없음 — 빌드/배포에는 불필요. scripts/*.py 6개(i18n 보조)만 실행 불가"
fi
fi

# ─────────────────────────────────────────────────────────────
# 4. 의존성 설치 상태
# ─────────────────────────────────────────────────────────────
if [ -z "$ONLY" ]; then
section "7. 의존성 설치 상태"
[ -d frontend/node_modules ] && pass "frontend/node_modules 설치됨" \
  || warn "frontend/node_modules 없음 — 'cd frontend && npm install'"
[ -d backend/vendor ] && pass "backend/vendor 설치됨" \
  || warn "backend/vendor 없음 — 'cd backend && composer install'"
[ -f .env ] && pass ".env 존재" \
  || warn ".env 없음 — .env.example 복사 후 값 채우기. 미설정 시 DB 는 SQLite 로 무음 폴백한다"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS"
echo "  WARN: $WARN"
echo "  FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  [RESULT] FAIL — 필수 항목 ${FAIL}건을 해결하십시오."
  echo ""
  exit 1
fi
if [ "$WARN" -gt 0 ]; then
  echo "  [RESULT] WARN — 필수 항목은 충족. 경고 ${WARN}건 확인 권장."
  echo ""
  exit 0
fi
echo "  [RESULT] PASS — 개발환경 검증 완료."
echo ""
exit 0

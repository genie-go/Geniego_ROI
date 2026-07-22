#!/usr/bin/env bash
# scripts/validation/check-module-boundaries.sh
# GeniegoROI Module Boundary 검증 스크립트
# CCIS Part002 — Repository & Monorepo Architecture
# Version 1.0 | 2026-07-22
#
# 사용법:
#   bash scripts/validation/check-module-boundaries.sh
#
# Exit Code:
#   0 = Success
#   1 = Validation Failure

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  exit 1
}

PASS=0
FAIL=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Module Boundary Validation"
echo "  CCIS Part002 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────
# 1. Frontend → Backend 직접 파일 참조 금지
# ─────────────────────────────────────────────────────────────
section "1. Frontend에서 Backend 직접 참조 금지"

if [ -d "frontend/src" ]; then
  # ../backend 상대 경로 참조 탐지
  VIOLATIONS=$(grep -r '\.\./backend' frontend/src/ \
    --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    -l 2>/dev/null || true)

  if [ -z "$VIOLATIONS" ]; then
    pass "frontend/src/에서 ../backend 참조 없음"
  else
    while IFS= read -r f; do
      fail "frontend/src/ → backend 직접 참조: $f" \
           "REST API 호출로 대체하십시오."
    done <<< "$VIOLATIONS"
  fi
else
  pass "frontend/src/ 미존재 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 2. Backend → Frontend 직접 참조 금지
# ─────────────────────────────────────────────────────────────
section "2. Backend에서 Frontend 직접 참조 금지"

if [ -d "backend/src" ]; then
  VIOLATIONS=$(grep -r '\.\./frontend\|require.*frontend\|include.*frontend' \
    backend/src/ --include="*.php" -l 2>/dev/null || true)

  if [ -z "$VIOLATIONS" ]; then
    pass "backend/src/에서 frontend 직접 참조 없음"
  else
    while IFS= read -r f; do
      fail "backend/src/ → frontend 직접 참조: $f" \
           "서비스 간 직접 파일 참조를 제거하십시오."
    done <<< "$VIOLATIONS"
  fi
else
  pass "backend/src/ 미존재 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 3. Frontend에서 node_modules 절대 경로 참조 금지
# ─────────────────────────────────────────────────────────────
section "3. node_modules 절대 경로 참조 금지"

if [ -d "frontend/src" ]; then
  VIOLATIONS=$(grep -r 'node_modules/' frontend/src/ \
    --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    -l 2>/dev/null || true)

  if [ -z "$VIOLATIONS" ]; then
    pass "frontend/src/에서 node_modules 절대 경로 참조 없음"
  else
    while IFS= read -r f; do
      fail "node_modules 절대 경로 참조: $f" \
           "패키지 이름으로 import하십시오."
    done <<< "$VIOLATIONS"
  fi
else
  pass "frontend/src/ 미존재 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 4. Backend vendor 절대 경로 사용 검증
# ─────────────────────────────────────────────────────────────
section "4. Backend vendor 참조 방식"

if [ -d "backend/src" ]; then
  # vendor/autoload.php 참조는 허용, 다른 vendor 직접 참조는 경고
  VIOLATIONS=$(grep -r "require.*vendor/" backend/src/ \
    --include="*.php" 2>/dev/null | grep -v "autoload.php" || true)

  if [ -z "$VIOLATIONS" ]; then
    pass "backend/src/에서 vendor 직접 참조 없음 (autoload.php 제외)"
  else
    echo "  [WARN] vendor 직접 참조 (검토 필요):"
    echo "$VIOLATIONS" | while IFS= read -r line; do
      echo "         $line"
    done
  fi
else
  pass "backend/src/ 미존재 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 5. infra/에서 직접 소스 코드 참조 금지
# ─────────────────────────────────────────────────────────────
section "5. Infrastructure에서 소스 코드 직접 참조"

if [ -d "infra" ]; then
  # Dockerfile, docker-compose에서 COPY ../frontend/src 등 탐지
  VIOLATIONS=$(grep -r 'COPY.*\.\./frontend/src\|COPY.*\.\./backend/src' \
    infra/ 2>/dev/null | grep -v "^Binary" || true)

  if [ -z "$VIOLATIONS" ]; then
    pass "infra/에서 소스 디렉터리 직접 COPY 없음"
  else
    echo "  [WARN] infra/에서 소스 디렉터리 직접 참조 (검토 필요):"
    echo "$VIOLATIONS"
  fi
else
  pass "infra/ 미존재 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 결과 요약
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  [RESULT] FAIL — $FAIL개 모듈 경계 위반을 수정하십시오."
  echo ""
  exit 1
else
  echo "  [RESULT] PASS — Module Boundary 검증 완료."
  echo ""
  exit 0
fi

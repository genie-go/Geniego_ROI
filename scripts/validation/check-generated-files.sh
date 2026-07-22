#!/usr/bin/env bash
# scripts/validation/check-generated-files.sh
# GeniegoROI Generated File 검증 스크립트
# CCIS Part002 — Repository & Monorepo Architecture
# Version 1.0 | 2026-07-22
#
# 사용법:
#   bash scripts/validation/check-generated-files.sh
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
WARN=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Generated Files Validation"
echo "  CCIS Part002 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────
# 1. Generated 디렉터리가 Git에 추적되지 않는지 확인
# ─────────────────────────────────────────────────────────────
section "1. Generated 디렉터리 Git 추적 확인"

GENERATED_DIRS=(
  "frontend/node_modules"
  "frontend/dist"
  "frontend/dist-demo"
  "frontend/dist_new"
  "backend/vendor"
)

for dir in "${GENERATED_DIRS[@]}"; do
  TRACKED_COUNT=$(git ls-files "$dir" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TRACKED_COUNT" -eq 0 ]; then
    pass "Git 미추적 (정상): $dir/"
  else
    fail "Generated 디렉터리가 Git에 추적됨: $dir/ ($TRACKED_COUNT개 파일)" \
         "git rm -r --cached $dir/ 로 추적 해제하고 .gitignore에 추가하십시오."
  fi
done

# ─────────────────────────────────────────────────────────────
# 2. Lock 파일이 Git에 추적되는지 확인 (반드시 추적되어야 함)
# ─────────────────────────────────────────────────────────────
section "2. Lock 파일 Git 추적 확인 (필수)"

LOCK_FILES=(
  "frontend/package-lock.json"
  "backend/composer.lock"
)

for lock in "${LOCK_FILES[@]}"; do
  if [ -f "$lock" ]; then
    TRACKED=$(git ls-files "$lock" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$TRACKED" -gt 0 ]; then
      pass "Lock 파일 추적 중 (정상): $lock"
    else
      warn "Lock 파일이 Git에 추적되지 않음: $lock (재현 가능한 빌드를 위해 추적 권장)"
    fi
  else
    warn "Lock 파일 없음: $lock"
  fi
done

# ─────────────────────────────────────────────────────────────
# 3. Composer.json과 composer.lock 기본 일치 확인
# ─────────────────────────────────────────────────────────────
section "3. Backend Composer 일치 확인"

if [ -f "backend/composer.json" ] && [ -f "backend/composer.lock" ]; then
  # composer.lock의 content-hash 기반 기본 검증
  if grep -q '"content-hash"' backend/composer.lock; then
    pass "composer.lock에 content-hash 존재 (기본 검증)"
  else
    warn "composer.lock 형식 확인 필요"
  fi
else
  warn "backend/composer.json 또는 backend/composer.lock 없음 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 4. package.json과 package-lock.json 기본 일치 확인
# ─────────────────────────────────────────────────────────────
section "4. Frontend npm 일치 확인"

if [ -f "frontend/package.json" ] && [ -f "frontend/package-lock.json" ]; then
  # package.json의 name이 package-lock.json에 존재하는지 확인
  PKG_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' frontend/package.json | head -1 | sed 's/.*: *"//' | sed 's/"//')
  if grep -q "\"$PKG_NAME\"" frontend/package-lock.json; then
    pass "package-lock.json 기본 일치 (name: $PKG_NAME)"
  else
    warn "package-lock.json 재생성을 검토하십시오: cd frontend && npm install"
  fi
else
  warn "frontend/package.json 또는 frontend/package-lock.json 없음 (스킵)"
fi

# ─────────────────────────────────────────────────────────────
# 5. Capacitor Generated Assets 확인
# ─────────────────────────────────────────────────────────────
section "5. Capacitor Generated Assets"

CAP_DIRS=(
  "frontend/android/app/src/main/assets/public"
  "frontend/ios/App/App/public"
)

for cap_dir in "${CAP_DIRS[@]}"; do
  if [ -d "$cap_dir" ]; then
    TRACKED_COUNT=$(git ls-files "$cap_dir" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$TRACKED_COUNT" -eq 0 ]; then
      pass "Capacitor Assets Git 미추적 (정상): $cap_dir/"
    else
      fail "Capacitor Assets가 Git에 추적됨: $cap_dir/ ($TRACKED_COUNT개 파일)" \
           "git rm -r --cached $cap_dir/ 로 추적 해제하십시오."
    fi
  else
    pass "Capacitor Assets 디렉터리 없음 (미빌드 상태): $cap_dir/"
  fi
done

# ─────────────────────────────────────────────────────────────
# 결과 요약
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS"
echo "  WARN: $WARN"
echo "  FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  [RESULT] FAIL — $FAIL개 Generated Code 정책 위반을 수정하십시오."
  echo ""
  exit 1
else
  echo "  [RESULT] PASS — Generated Files 검증 완료."
  echo ""
  exit 0
fi

#!/usr/bin/env bash
# scripts/validation/check-repository-layout.sh
# GeniegoROI Repository Layout 검증 스크립트
# CCIS Part002 — Repository & Monorepo Architecture
# Version 1.0 | 2026-07-22
#
# 사용법:
#   bash scripts/validation/check-repository-layout.sh
#
# Exit Code:
#   0 = Success
#   1 = Validation Failure
#   2 = Missing Tool
#   3 = Invalid Repository State
#   4 = Security Violation

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  echo "  현재 디렉터리: $(pwd)" >&2
  echo "  해결 방법: Git Repository 내에서 실행하십시오." >&2
  exit 3
}

PASS=0
FAIL=0
WARN=0

# ─────────────────────────────────────────────────────────────
# 헬퍼 함수
# ─────────────────────────────────────────────────────────────
pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }

# ─────────────────────────────────────────────────────────────
# 검증 시작
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Repository Layout Validation"
echo "  CCIS Part002 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Root: $REPO_ROOT"

cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────
# 1. 필수 디렉터리 존재 확인
# ─────────────────────────────────────────────────────────────
section "1. 필수 디렉터리"

REQUIRED_DIRS=(
  "frontend"
  "backend"
  "infra"
  "docs"
  "docs/ccis"
  "docs/repository"
  "docs/architecture"
  ".github"
  ".github/workflows"
  ".githooks"
  "scripts/validation"
  "tools"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    pass "디렉터리 존재: $dir/"
  else
    fail "디렉터리 없음: $dir/" \
         "mkdir -p $dir 으로 생성하십시오."
  fi
done

# ─────────────────────────────────────────────────────────────
# 2. 필수 Root 파일 존재 확인
# ─────────────────────────────────────────────────────────────
section "2. 필수 Root 파일"

REQUIRED_FILES=(
  ".gitignore"
  ".gitattributes"
  ".editorconfig"
  "CODEOWNERS"
  "Makefile"
  "docker-compose.yml"
  "CONTRIBUTING.md"
  "README.md"
  "frontend/package.json"
  "backend/composer.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "파일 존재: $file"
  else
    warn "파일 없음: $file (권장)"
  fi
done

# ─────────────────────────────────────────────────────────────
# 3. 중첩 Git Repository 확인
# ─────────────────────────────────────────────────────────────
section "3. 중첩 Git Repository"

NESTED_REPOS=$(find . -mindepth 2 -maxdepth 5 -type d -name ".git" \
  ! -path "./.git" \
  ! -path "./node_modules/*" \
  ! -path "./frontend/node_modules/*" \
  ! -path "./backend/vendor/*" \
  2>/dev/null)

if [ -z "$NESTED_REPOS" ]; then
  pass "중첩 Git Repository 없음"
else
  while IFS= read -r repo; do
    fail "중첩 Git Repository 발견: $repo" \
         "중첩 Repository를 제거하거나 Git Submodule로 관리하십시오."
  done <<< "$NESTED_REPOS"
fi

# ─────────────────────────────────────────────────────────────
# 4. 금지된 Root 파일 패턴 확인
# ─────────────────────────────────────────────────────────────
section "4. Root 오염 파일 (추적 중인 파일만)"

# Git에 추적 중인 금지 파일 패턴
TRACKED_FILES=$(git ls-files 2>/dev/null | grep -E '^\.(tgz|tar\.gz|zip)$' || true)

if [ -n "$TRACKED_FILES" ]; then
  while IFS= read -r f; do
    fail "빌드 산출물이 추적됨: $f" \
         ".gitignore에 패턴을 추가하고 git rm --cached $f 를 실행하십시오."
  done <<< "$TRACKED_FILES"
else
  pass "Root에 추적 중인 빌드 산출물 없음"
fi

# ─────────────────────────────────────────────────────────────
# 5. 필수 문서 README 확인
# ─────────────────────────────────────────────────────────────
section "5. 모듈 README"

MODULE_DIRS=("frontend" "backend" "infra" "docs")

for dir in "${MODULE_DIRS[@]}"; do
  if [ -f "$dir/README.md" ]; then
    pass "README 존재: $dir/README.md"
  else
    warn "README 없음: $dir/README.md (권장)"
  fi
done

# ─────────────────────────────────────────────────────────────
# 6. Backend Migration 위치 확인
# ─────────────────────────────────────────────────────────────
section "6. Database Migration"

if [ -d "backend/migrations" ]; then
  MIGRATION_COUNT=$(find backend/migrations -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
  pass "Migration 디렉터리 존재: backend/migrations/ ($MIGRATION_COUNT개 SQL 파일)"
else
  warn "Migration 디렉터리 없음: backend/migrations/"
fi

# ─────────────────────────────────────────────────────────────
# 7. CI/CD Workflow 확인
# ─────────────────────────────────────────────────────────────
section "7. CI/CD Workflow"

if [ -f ".github/workflows/deploy.yml" ]; then
  pass "배포 Workflow 존재: .github/workflows/deploy.yml"
else
  warn "배포 Workflow 없음: .github/workflows/deploy.yml"
fi

if [ -f ".github/workflows/security-scan.yml" ]; then
  pass "보안 Workflow 존재: .github/workflows/security-scan.yml"
else
  warn "보안 Workflow 없음: .github/workflows/security-scan.yml"
fi

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
  echo "  [RESULT] FAIL — $FAIL개 위반 항목을 수정하십시오."
  echo ""
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo "  [RESULT] WARN — $WARN개 권장 항목을 검토하십시오."
  echo ""
  exit 0
else
  echo "  [RESULT] PASS — Repository Layout 검증 완료."
  echo ""
  exit 0
fi

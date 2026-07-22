#!/usr/bin/env bash
# scripts/validation/check-large-files.sh
# GeniegoROI 대용량 파일 검증 스크립트
# CCIS Part002 — Repository & Monorepo Architecture
# Version 1.0 | 2026-07-22
#
# 사용법:
#   bash scripts/validation/check-large-files.sh [--threshold-mb N]
#
# 기본 임계값: 20MB
#
# Exit Code:
#   0 = Success
#   1 = Validation Failure (대용량 파일 발견)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  exit 1
}

# 기본 임계값 20MB (바이트)
THRESHOLD_MB=20
THRESHOLD_BYTES=$((THRESHOLD_MB * 1024 * 1024))

# 인자 파싱
while [[ $# -gt 0 ]]; do
  case $1 in
    --threshold-mb)
      THRESHOLD_MB="$2"
      THRESHOLD_BYTES=$((THRESHOLD_MB * 1024 * 1024))
      shift 2
      ;;
    *)
      echo "[ERROR] 알 수 없는 인자: $1" >&2
      exit 1
      ;;
  esac
done

PASS=0
FAIL=0
WARN=0

# glob 패턴 → 경로 앵커가 붙은 정규식.
#   점을 먼저 이스케이프한 뒤 와일드카드를 확장하고, (^|/) ... $ 로 앵커를 건다.
#   앵커가 없으면 `.env` 패턴이 `.env.example`(Part002 §8 상 추적이 정상)까지 잡는다.
glob_to_regex() {
  local g="$1"
  g="${g//./\\.}"
  g="${g//\*/[^/]*}"
  printf '(^|/)%s$' "$g"
}

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Large File Validation"
echo "  CCIS Part002 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "  임계값: ${THRESHOLD_MB}MB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────
# 1. Git에 추적 중인 대용량 파일 탐지
# ─────────────────────────────────────────────────────────────
section "1. Git 추적 중인 대용량 파일 (>${THRESHOLD_MB}MB)"

# 파일당 wc -c 를 호출하면 추적 파일 수(1만+)만큼 프로세스가 뜬다.
# Windows/Git Bash 실측 5분 초과 → git 인덱스의 blob 크기를 단일 프로세스로 읽는다.
# `git ls-tree -r -l HEAD` 출력: "<mode> <type> <sha> <size>\t<path>"
LARGE_TRACKED=()
while IFS=$'\t' read -r file_size tracked_file; do
  [ -n "$tracked_file" ] || continue
  FILE_SIZE_MB=$(awk -v s="$file_size" 'BEGIN { printf "%.1f", s / 1048576 }')
  LARGE_TRACKED+=("$tracked_file (${FILE_SIZE_MB}MB)")
done < <(git ls-tree -r -l HEAD 2>/dev/null | awk -F'\t' -v t="$THRESHOLD_BYTES" '
  { split($1, meta, " ");
    if (meta[4] ~ /^[0-9]+$/ && meta[4] + 0 > t) printf "%s\t%s\n", meta[4], $2 }' || true)

if [ "${#LARGE_TRACKED[@]}" -eq 0 ]; then
  pass "추적 중인 대용량 파일 없음 (>${THRESHOLD_MB}MB)"
else
  for f in "${LARGE_TRACKED[@]}"; do
    fail "대용량 파일이 Git에 추적됨: $f" \
         "git rm --cached {파일} 로 추적 해제하고 .gitignore에 추가하십시오. 또는 Git LFS를 사용하십시오."
  done
fi

# ─────────────────────────────────────────────────────────────
# 2. Untracked 대용량 파일 탐지 (경고)
# ─────────────────────────────────────────────────────────────
section "2. Untracked 대용량 파일 (>${THRESHOLD_MB}MB) — 경고"

# find 은 -not -path 로 걸러도 node_modules 를 그대로 순회한다(실측 3분 31초).
# `git ls-files -o --exclude-standard` 는 .gitignore 를 git 이 직접 적용하므로
# gitignored 디렉터리를 애초에 내려가지 않고, 추적 파일도 자동 제외된다(실측 0.45초).
LARGE_FILES=$(git ls-files -o --exclude-standard -z 2>/dev/null \
  | xargs -0 -r stat --printf='%s\t%n\n' 2>/dev/null \
  | awk -F'\t' -v t="$THRESHOLD_BYTES" '$1 + 0 > t' \
  | sort -k2 || true)

if [ -z "$LARGE_FILES" ]; then
  pass "Untracked 대용량 파일 없음 (>${THRESHOLD_MB}MB)"
else
  while IFS=$'\t' read -r file_size f; do
    [ -n "$f" ] || continue
    FILE_SIZE_MB=$(awk -v s="$file_size" 'BEGIN { printf "%.1f", s / 1048576 }')
    warn "대용량 Untracked 파일: $f (${FILE_SIZE_MB}MB) — .gitignore 확인 권장"
  done <<< "$LARGE_FILES"
fi

# ─────────────────────────────────────────────────────────────
# 3. Secret 후보 파일 탐지 (보안)
# ─────────────────────────────────────────────────────────────
section "3. Secret 후보 파일 (Git 추적 중)"

SECRET_PATTERNS=(
  "*.pem"
  "*.key"
  "*.p12"
  "*.jks"
  ".env"
  "*.env"
  "id_rsa"
  "id_dsa"
  "id_ecdsa"
  "id_ed25519"
)

SECRET_FOUND=false
for pattern in "${SECRET_PATTERNS[@]}"; do
  FOUND=$(git ls-files 2>/dev/null | grep -E "$(glob_to_regex "$pattern")" || true)
  if [ -n "$FOUND" ]; then
    while IFS= read -r f; do
      fail "Secret 후보 파일이 Git에 추적됨: $f (패턴: $pattern)" \
           "git rm --cached $f 후 .gitignore에 추가하십시오. 키/인증서는 Secret Manager를 사용하십시오."
      SECRET_FOUND=true
    done <<< "$FOUND"
  fi
done

if [ "$SECRET_FOUND" = "false" ]; then
  pass "Secret 후보 파일 Git 미추적 (정상)"
fi

# ─────────────────────────────────────────────────────────────
# 4. 금지 파일 형식 확인 (빌드 산출물)
# ─────────────────────────────────────────────────────────────
section "4. 빌드 산출물 Git 추적 확인"

BUILD_PATTERNS=("*.tgz" "*.tar.gz" "*.zip" "*.class" "*.pyc")
BUILD_FOUND=false

for pattern in "${BUILD_PATTERNS[@]}"; do
  FOUND=$(git ls-files 2>/dev/null | grep -E "$(glob_to_regex "$pattern")" || true)
  if [ -n "$FOUND" ]; then
    while IFS= read -r f; do
      fail "빌드 산출물이 Git에 추적됨: $f" \
           ".gitignore에 $pattern 패턴을 추가하고 추적 해제하십시오."
      BUILD_FOUND=true
    done <<< "$FOUND"
  fi
done

if [ "$BUILD_FOUND" = "false" ]; then
  pass "빌드 산출물 Git 미추적 (정상)"
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
  echo "  [RESULT] FAIL — $FAIL개 대용량/보안 파일 위반을 수정하십시오."
  echo ""
  exit 1
else
  echo "  [RESULT] PASS — Large File 검증 완료."
  echo ""
  exit 0
fi

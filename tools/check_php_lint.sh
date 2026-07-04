#!/usr/bin/env bash
# [265차] 백엔드 PHP 구문 가드 — php -l 로 배포 전 구문오류 차단(CI 는 프론트만 빌드해 백엔드 구문가드 부재였음).
#   CI(ubuntu 내장 php)=전체 backend/src · pre-commit=staged php 만(php 있을 때만·없으면 non-blocking 스킵).
#
# 사용: tools/check_php_lint.sh [파일...]   (미지정=backend/src 전체 *.php)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v php >/dev/null 2>&1; then
  echo "[skip] php 미설치 — php -l 가드 스킵(CI 는 php 내장)"
  exit 0
fi

FILES=("$@")
if [ ${#FILES[@]} -eq 0 ]; then
  # vendor 제외 backend 전체 — ★진입점 public/index.php + cron bin/*.php 포함(src 만 보면 API진입/크론 구문오류 미검출).
  while IFS= read -r f; do FILES+=("$f"); done < <(find backend -name '*.php' -not -path '*/vendor/*' 2>/dev/null)
fi

FAIL=0
CHECKED=0
for f in "${FILES[@]}"; do
  case "$f" in *.php) ;; *) continue ;; esac
  [ -f "$f" ] || continue
  CHECKED=$((CHECKED+1))
  if ! php -l "$f" >/dev/null 2>&1; then
    echo "[FAIL] php -l 구문오류: $f"
    php -l "$f" 2>&1 | grep -iE 'error|parse' | head -2
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "[FAIL] 백엔드 PHP 구문오류 — 배포 차단."
  exit 1
fi
echo "[OK] php -l clean ($CHECKED files)"

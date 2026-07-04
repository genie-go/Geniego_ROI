#!/usr/bin/env bash
# [265차] React rules-of-hooks 가드 — 조건부/early-return-후/try-catch 훅(화이트스크린 크래시 261/263 클래스) 검출.
#   기존 frontend eslint + .eslintrc.json(plugin:react-hooks/recommended) 재사용(신규 도구 0).
#   의도적 예외는 소스에 // eslint-disable-next-line react-hooks/rules-of-hooks + 근거주석으로 명시.
#
# 사용: tools/check_rules_of_hooks.sh [파일...]   (파일 미지정=frontend/src 전체)
#   CI(deploy.yml)=전체 · pre-commit=staged jsx 파일만(고속).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

ESLINT="node_modules/.bin/eslint"
if [ ! -x "$ESLINT" ]; then
  # 로컬 devtool 미설치 시 non-blocking 스킵(CI 는 npm install 후라 존재). pre-commit 이 커밋을 막지 않도록.
  echo "[skip] eslint 미설치(node_modules) — rules-of-hooks 가드 스킵"
  exit 0
fi

TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("src")

OUT="$("$ESLINT" "${TARGETS[@]}" --ext .js,.jsx --format unix 2>&1 || true)"
HITS="$(echo "$OUT" | grep 'rules-of-hooks' || true)"
if [ -n "$HITS" ]; then
  echo "[FAIL] react-hooks/rules-of-hooks 위반(화이트스크린 크래시 위험):"
  echo "$HITS"
  echo ""
  echo "→ 조건부/early-return 뒤 훅을 상단으로 이동하거나, 의도적 예외면 해당 줄에"
  echo "  // eslint-disable-next-line react-hooks/rules-of-hooks  + 근거주석을 명시하십시오."
  exit 1
fi
echo "[OK] react-hooks/rules-of-hooks clean (${TARGETS[*]})"

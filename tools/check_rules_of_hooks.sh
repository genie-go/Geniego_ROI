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

# [280차] no-undef 게이트 추가 — eslint:recommended 가 이미 검출하고 있었는데 위 grep 이 rules-of-hooks 만
#   집어내고 나머지를 버려서, 미임포트/스코프밖 식별자가 무제한 통과했다. vite build 도 이걸 못 잡는다
#   (번들은 성공하고 런타임에 ReferenceError 로 터진다) → 화이트스크린의 실제 주범.
#   280차 실적발:
#     - PixelTracking.jsx  useMemo 미임포트   → 픽셀 관리 페이지가 276차부터 계속 사망(스니펫 복사 불가)
#     - OperationsHub.jsx  map 스코프밖 c     → 상품 행 존재 시 페이지 전체 사망
#     - Topbar.jsx         부모에서 setTab    → 관리자 프로필 메뉴 클릭 시 사망
#     - AuthPage.jsx       lang 미정의        → 약관 요금안내 무음실패
#   의도적 예외는 해당 줄에 // eslint-disable-next-line no-undef + 근거주석.
UNDEF="$(echo "$OUT" | grep 'no-undef' || true)"
if [ -n "$UNDEF" ]; then
  echo "[FAIL] no-undef(미정의 식별자) — 런타임 ReferenceError = 화이트스크린:"
  echo "$UNDEF"
  echo ""
  echo "→ import 를 추가하거나 스코프를 바로잡으십시오(빌드는 통과하지만 실행 시 페이지가 죽습니다)."
  exit 1
fi
echo "[OK] react-hooks/rules-of-hooks + no-undef clean (${TARGETS[*]})"

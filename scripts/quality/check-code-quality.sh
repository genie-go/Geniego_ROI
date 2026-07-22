#!/usr/bin/env bash
# scripts/quality/check-code-quality.sh
# GeniegoROI 통합 코드 품질 게이트
# CCIS Part004 — Coding Standards
#
# 설계 원칙:
#   · 기존 위반(958 error / 133 warning)을 "0 으로 만들 때까지 게이트를 끄지 않는다".
#     대신 베이스라인으로 고정하고 **증가분만 차단**한다(명세 §23 "Baseline 또는 단계적 개선").
#   · 규칙을 비활성화해 통과시키지 않는다. 해제한 규칙은 이 코드베이스에
#     **적용 자체가 불가능한 것뿐**이며 근거는 docs/development/CODING-STANDARDS.md 에 있다.
#   · 검사 대상과 제외 대상을 명시한다(생성물·백업·아카이브는 소스가 아니다).
#
# 사용법:
#   bash scripts/quality/check-code-quality.sh
#   bash scripts/quality/check-code-quality.sh --update-baseline   # 위반을 줄인 뒤 기준 갱신
#
# Exit Code:
#   0 = 게이트 통과 (기존 위반 이하)
#   1 = 신규 위반 증가 또는 필수 게이트 실패

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] Git repository root를 찾을 수 없습니다." >&2
  exit 1
}
cd "$REPO_ROOT"

BASELINE_FILE="config/quality/eslint-baseline.json"
UPDATE_BASELINE=0
[ "${1:-}" = "--update-baseline" ] && UPDATE_BASELINE=1

PASS=0; FAIL=0; WARN=0
pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
fail() { echo "  [FAIL] $1" >&2; echo "         → $2" >&2; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "── $1 ──────────────────────────────"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GeniegoROI Code Quality Gate"
echo "  CCIS Part004 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────────────────────
section "1. JavaScript / JSX — ESLint (베이스라인 대비)"
# ─────────────────────────────────────────────────────────────
ESLINT_JSON="$(mktemp)"
trap 'rm -f "$ESLINT_JSON"' EXIT

( cd frontend && npx --no-install eslint src --ext .js,.jsx -f json ) > "$ESLINT_JSON" 2>/dev/null
if [ ! -s "$ESLINT_JSON" ]; then
  fail "ESLint 를 실행하지 못했습니다" "cd frontend && npm install 후 다시 시도하십시오."
else
  COUNTS="$(node -e '
    const fs=require("fs");
    const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    let e=0,w=0; for(const f of r){e+=f.errorCount;w+=f.warningCount;}
    process.stdout.write(e+" "+w);
  ' "$ESLINT_JSON")"
  CUR_ERR="${COUNTS%% *}"
  CUR_WARN="${COUNTS##* }"

  if [ "$UPDATE_BASELINE" -eq 1 ]; then
    mkdir -p "$(dirname "$BASELINE_FILE")"
    cat > "$BASELINE_FILE" <<JSON
{
  "_comment": "CCIS Part004 ESLint 베이스라인. 기존 위반을 고정하고 증가분만 차단한다. 위반을 줄인 뒤 --update-baseline 으로 갱신할 것(늘리는 방향으로 갱신 금지).",
  "errors": $CUR_ERR,
  "warnings": $CUR_WARN,
  "scope": "frontend/src (.js,.jsx) — .eslintignore 제외분 반영"
}
JSON
    pass "베이스라인 갱신: error=$CUR_ERR warning=$CUR_WARN → $BASELINE_FILE"
  elif [ ! -f "$BASELINE_FILE" ]; then
    warn "베이스라인 파일 없음($BASELINE_FILE) — 현재 error=$CUR_ERR warning=$CUR_WARN. --update-baseline 으로 생성하십시오"
  else
    BASE_ERR="$(node -p "require('./$BASELINE_FILE').errors")"
    BASE_WARN="$(node -p "require('./$BASELINE_FILE').warnings")"
    if [ "$CUR_ERR" -gt "$BASE_ERR" ]; then
      fail "ESLint error 증가: $BASE_ERR → $CUR_ERR (+$((CUR_ERR - BASE_ERR)))" \
           "신규 코드의 위반을 수정하십시오. 규칙 비활성화나 베이스라인 상향으로 통과시키지 마십시오."
    elif [ "$CUR_ERR" -lt "$BASE_ERR" ]; then
      pass "ESLint error 감소: $BASE_ERR → $CUR_ERR (-$((BASE_ERR - CUR_ERR))) — --update-baseline 으로 기준을 낮추십시오"
    else
      pass "ESLint error $CUR_ERR (베이스라인 유지)"
    fi
    if [ "$CUR_WARN" -gt "$BASE_WARN" ]; then
      warn "ESLint warning 증가: $BASE_WARN → $CUR_WARN (+$((CUR_WARN - BASE_WARN)))"
    else
      pass "ESLint warning $CUR_WARN (베이스라인 $BASE_WARN 이하)"
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────
section "2. PHP — 구문 검사 전수 (php -l)"
# ─────────────────────────────────────────────────────────────
if command -v php >/dev/null 2>&1; then
  PHP_ERR=0; PHP_TOT=0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    PHP_TOT=$((PHP_TOT + 1))
    if ! php -l "$f" >/dev/null 2>&1; then
      PHP_ERR=$((PHP_ERR + 1))
      echo "         구문 오류: $f" >&2
    fi
  done < <(git ls-files 'backend/**/*.php' 'tools/*.php')
  if [ "$PHP_ERR" -eq 0 ]; then
    pass "PHP $PHP_TOT 개 파일 구문 오류 0"
  else
    fail "PHP 구문 오류 ${PHP_ERR}건 / ${PHP_TOT}개" "위 파일을 수정하십시오. PHP 는 베이스라인 없이 항상 0 이어야 한다."
  fi
else
  warn "php 미설치 — PHP 게이트 건너뜀"
fi

# ─────────────────────────────────────────────────────────────
section "3. Shell — 구문 검사 (bash -n)"
# ─────────────────────────────────────────────────────────────
SH_ERR=0; SH_TOT=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  SH_TOT=$((SH_TOT + 1))
  if ! bash -n "$f" 2>/dev/null; then
    SH_ERR=$((SH_ERR + 1))
    echo "         구문 오류: $f" >&2
  fi
done < <(git ls-files 'scripts/**/*.sh' 'tools/*.sh' 'backend/bin/*.sh')
if [ "$SH_ERR" -eq 0 ]; then
  pass "Shell $SH_TOT 개 파일 구문 오류 0"
else
  fail "Shell 구문 오류 ${SH_ERR}건" "위 파일을 수정하십시오."
fi

# ─────────────────────────────────────────────────────────────
section "4. JSON — 파싱 검사 (설정·계약 파일)"
# ─────────────────────────────────────────────────────────────
JSON_ERR=0; JSON_TOT=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  JSON_TOT=$((JSON_TOT + 1))
  if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$f" 2>/dev/null; then
    JSON_ERR=$((JSON_ERR + 1))
    echo "         파싱 실패: $f" >&2
  fi
done < <(git ls-files '*.json' | grep -vE '^(legacy_v338_pkg|clean_src|backup)/' | grep -v 'locales_backup')
if [ "$JSON_ERR" -eq 0 ]; then
  pass "JSON $JSON_TOT 개 파일 파싱 오류 0"
else
  fail "JSON 파싱 오류 ${JSON_ERR}건" "위 파일을 수정하십시오."
fi

# ─────────────────────────────────────────────────────────────
section "5. Git — 공백 오류 · 충돌 표식"
# ─────────────────────────────────────────────────────────────
if git diff --check >/dev/null 2>&1; then
  pass "git diff --check 통과"
else
  warn "git diff --check 지적 있음 — 아래 출력 확인"
  git diff --check | head -10
fi
if git grep -nE '^(<<<<<<<|>>>>>>>) ' -- '*.js' '*.jsx' '*.php' '*.sh' >/dev/null 2>&1; then
  fail "병합 충돌 표식이 소스에 남아 있습니다" "git grep '<<<<<<<' 로 확인 후 정리하십시오."
else
  pass "병합 충돌 표식 없음"
fi

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
  echo "  [RESULT] FAIL — ${FAIL}건을 수정하십시오."
  echo ""
  exit 1
fi
echo "  [RESULT] PASS — 품질 게이트 통과."
echo ""
exit 0

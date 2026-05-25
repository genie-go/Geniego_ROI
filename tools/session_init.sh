#!/usr/bin/env bash
# tools/session_init.sh — Session 154 W8 — session boot-strapper
#
# Automates the per-session opening sequence:
#   1. .gitignore: add session{NN}_*.{mjs,csv,json,md,txt} pattern (idempotent)
#   2. Run reconnaissance: HEAD / sacred SHA / ko.js leaf count / quarantine / untracked
#   3. Emit a reviewer-friendly markdown snippet to stdout
#
# Does NOT:
#   - Commit, push, or modify locale files
#   - Update baseline.json sacred SHA (manual decision per N-145-G)
#
# Dependencies : bash, node, git, sha256sum (Git Bash mingw64 builtins)
# Companion    : CONTRIBUTING.md §3 (naming convention), .githooks/pre-commit
#
# Usage
#   tools/session_init.sh                  # auto-infer from NEXT_SESSION.md
#   tools/session_init.sh --session 155    # explicit
#   tools/session_init.sh --dry-run        # report only, no .gitignore patch
#   tools/session_init.sh --self-test      # P3 regression invariants 검증 (옵션, ~40s)
#   tools/session_init.sh --help
#
# Exit codes
#   0  success (or dry-run completed)
#   1  invalid arg / bad session number
#   2  git error
#   3  baseline.json missing or unreadable

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "❌ not in a git repo"; exit 2;
}
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
SESSION=""
DRY_RUN=0
RUN_SELFTEST=0
while [ $# -gt 0 ]; do
  case "$1" in
    --session) shift; SESSION="$1" ;;
    --dry-run) DRY_RUN=1 ;;
    --self-test) RUN_SELFTEST=1 ;;
    --help|-h)
      sed -n '2,26p' "$0"; exit 0 ;;
    -*) echo "❌ unknown flag: $1"; exit 1 ;;
    *)  echo "❌ unexpected arg: $1"; exit 1 ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# Auto-infer session number from NEXT_SESSION.md if not given
# ---------------------------------------------------------------------------
if [ -z "$SESSION" ]; then
  if [ -f NEXT_SESSION.md ]; then
    # look for "다음 세션**: 155차" or "Session 155" or "155차 세션"
    SESSION=$(grep -oE '(다음 세션[^:]*:\*?\*?\s*|Session\s+|세션\s+)[0-9]+' NEXT_SESSION.md \
              | head -1 | grep -oE '[0-9]+' || true)
  fi
fi
if [ -z "$SESSION" ] || ! [[ "$SESSION" =~ ^[0-9]+$ ]]; then
  echo "❌ could not determine session number (use --session NN)"
  exit 1
fi
SESSION_PADDED=$(printf '%03d' "$SESSION")  # 155 → 155, 99 → 099

echo "═════════════════════════════════════════════════════════════════════"
echo " Session ${SESSION} boot-strap   (dry-run=$([ $DRY_RUN -eq 1 ] && echo on || echo off))"
echo "═════════════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# Step 1 — .gitignore patch (idempotent)
# ---------------------------------------------------------------------------
PATTERN_BLOCK="# Session ${SESSION} — analysis artifacts (session-scoped, gitignored at next session close per CONTRIBUTING.md §3)
session${SESSION}_*.mjs
session${SESSION}_*.csv
session${SESSION}_*.json
session${SESSION}_*.md
session${SESSION}_*.txt
session${SESSION}_*.sh"

if grep -qF "# Session ${SESSION} — analysis artifacts" .gitignore 2>/dev/null; then
  echo "✓ .gitignore already has Session ${SESSION} block (idempotent skip)"
else
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "→ (dry-run) would append Session ${SESSION} block to .gitignore"
  else
    {
      echo ""
      echo "$PATTERN_BLOCK"
    } >> .gitignore
    echo "✓ appended Session ${SESSION} block to .gitignore (7 lines)"
  fi
fi

# ---------------------------------------------------------------------------
# Step 2 — Reconnaissance
# ---------------------------------------------------------------------------
echo ""
echo "→ reconnaissance…"

HEAD_SHA=$(git rev-parse --short HEAD)
HEAD_SUB=$(git log -1 --pretty=%s)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

KO_SIZE=$(wc -c < frontend/src/i18n/locales/ko.js)
JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')

# leaf_count.mjs 사용 (cross-tool consistency, 158 commit 0d1b0f6)
KO_LEAVES=$(node tools/leaf_count.mjs frontend/src/i18n/locales/ko.js 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')

# Baseline comparison
BASELINE=".githooks/baseline.json"
BL_JA=""
BL_ZH=""
BL_LEAVES=""
BL_VERSION=""
if [ -f "$BASELINE" ]; then
  BL_JA=$(node -e "console.log(require('./$BASELINE').sacred_sha['ja.js'])")
  BL_ZH=$(node -e "console.log(require('./$BASELINE').sacred_sha['zh.js'])")
  BL_LEAVES=$(node -e "console.log(require('./$BASELINE').ko_leaf_count)")
  BL_VERSION=$(node -e "console.log(require('./$BASELINE').version)")
fi

JA_MATCH=$([ "$JA_SHA" = "$BL_JA" ] && echo '✓' || echo '⚠ DRIFT')
ZH_MATCH=$([ "$ZH_SHA" = "$BL_ZH" ] && echo '✓' || echo '⚠ DRIFT')
LEAF_DELTA=$((KO_LEAVES - BL_LEAVES))

# Quarantine
QUAR_DIRS=$(ls -d frontend/_quarantine/*/ 2>/dev/null | wc -l)
QUAR_LIST=$(ls -d frontend/_quarantine/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null | head -10)

# Untracked count
UNTRACKED=$(git status --short | grep -c '^??' || true)

# ---------------------------------------------------------------------------
# Optional: P3 regression invariants (158 N-157-A Tier 2)
# ---------------------------------------------------------------------------
SELFTEST_STATUS="skipped"
SELFTEST_EXIT=0
if [ "$RUN_SELFTEST" = "1" ]; then
  echo ""
  echo "─────────────────────────────────────────────────────────────────────"
  echo " Optional: triage_apply self-test (13 invariants)"
  echo "─────────────────────────────────────────────────────────────────────"
  set +e
  bash tools/triage_apply_self_test.sh > /tmp/session_init_selftest_$$.log 2>&1
  SELFTEST_EXIT=$?
  set -e
  if [ "$SELFTEST_EXIT" = "0" ]; then
    SELFTEST_STATUS="PASS (13/13)"
    echo "  ✓ all 13 invariants pass"
  else
    SELFTEST_STATUS="FAIL (exit $SELFTEST_EXIT)"
    echo "  ✗ self-test failed (exit $SELFTEST_EXIT) — see /tmp/session_init_selftest_$$.log"
    tail -10 /tmp/session_init_selftest_$$.log | sed 's/^/    /'
  fi
fi

# ---------------------------------------------------------------------------
# Step 3 — Emit reviewer-friendly snippet
# ---------------------------------------------------------------------------
cat <<EOF

─────────────────────────────────────────────────────────────────────
 Reconnaissance snapshot
─────────────────────────────────────────────────────────────────────
branch       : ${BRANCH}
HEAD         : ${HEAD_SHA}  ${HEAD_SUB}
ko.js size   : ${KO_SIZE} bytes
ko.js leaves : ${KO_LEAVES}  (baseline ${BL_LEAVES}; Δ=${LEAF_DELTA})
ja.js SHA    : ${JA_SHA:0:16}…  ${JA_MATCH}
zh.js SHA    : ${ZH_SHA:0:16}…  ${ZH_MATCH}
baseline ver : ${BL_VERSION}
quarantine   : ${QUAR_DIRS} dirs
untracked    : ${UNTRACKED} files
self-test    : ${SELFTEST_STATUS}

─────────────────────────────────────────────────────────────────────
 Markdown snippet (paste into reviewer chat, optional)
─────────────────────────────────────────────────────────────────────
\`\`\`
Session ${SESSION} reconnaissance:
- HEAD ${HEAD_SHA} ($(echo "${HEAD_SUB}" | head -c 60))
- ko.js ${KO_SIZE} B, leaves ${KO_LEAVES} (baseline ${BL_LEAVES}, Δ=${LEAF_DELTA})
- ja SHA ${JA_SHA:0:16}… ${JA_MATCH}
- zh SHA ${ZH_SHA:0:16}… ${ZH_MATCH}
- quarantine: ${QUAR_DIRS} dirs
- untracked: ${UNTRACKED}
- self-test: ${SELFTEST_STATUS}
\`\`\`
─────────────────────────────────────────────────────────────────────
EOF

if [ "$LEAF_DELTA" != "0" ] && [ -n "$BL_LEAVES" ]; then
  echo "⚠ ko.js leaf count drift from baseline — investigate or update baseline"
fi
if [ "$JA_MATCH" != "✓" ] || [ "$ZH_MATCH" != "✓" ]; then
  echo "⚠ sacred SHA drift — N-79 review required"
fi

echo ""
echo "✓ session_init complete (session ${SESSION})"
exit 0

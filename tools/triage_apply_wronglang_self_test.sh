#!/usr/bin/env bash
# tools/triage_apply_wronglang_self_test.sh
#
# patch06 §8.2 — wrong-language apply path 회귀 검증.
# ed3c4a0~1 ko orderHub.tabShipped/statusShipped (배송中 2건) sandbox 로
# 8 W-invariants (W1~W8) 를 검증.
#
# Usage: bash tools/triage_apply_wronglang_self_test.sh
# Exit : 0 = 8/8 PASS, 1 = any W-invariant failed
#
# Refs: docs/spec/triage_apply_v1_patch06_wrong_language_apply.md §8

set -u

BASELINE_COMMIT="ed3c4a0~1"
LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"
WL_CSV_SRC="session157_wronglang/${LOCALE}.csv"

# Invariants (158차 ed3c4a0~1 baseline ko)
EXPECTED_WL_DETECTIONS=2
EXPECTED_SUBSTITUTE=2
EXPECTED_POST_WL=0

# Sandbox (PID-suffixed)
SANDBOX="/tmp/triage_apply_wl_selftest_$$.js"
CSV="/tmp/triage_apply_wl_selftest_$$.csv"
PLAN="/tmp/triage_apply_wl_selftest_$$.json"
APPLY_LOG="/tmp/triage_apply_wl_selftest_$$_apply.log"
POST_CSV="/tmp/triage_apply_wl_selftest_$$_post.csv"

SANDBOX_WIN=$(cygpath -m "$SANDBOX" 2>/dev/null || echo "$SANDBOX")
CSV_WIN=$(cygpath -m "$CSV" 2>/dev/null || echo "$CSV")
PLAN_WIN=$(cygpath -m "$PLAN" 2>/dev/null || echo "$PLAN")

FAILED=()
INFO=()

pass() { echo "  ✓ $1"; INFO+=("PASS: $1"); }
fail() { echo "  ✗ $1"; FAILED+=("$1"); }
check() {
  local name="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then pass "$name (got $actual)"
  else fail "$name (expected $expected, got $actual)"; fi
}

cleanup() { rm -f "$SANDBOX" "$CSV" "$PLAN" "$APPLY_LOG" "$POST_CSV"; }
trap cleanup EXIT

echo "═══════════════════════════════════════════════════════════════════════"
echo " triage_apply wrong-language self-test — baseline ${BASELINE_COMMIT}"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "[0/9] pre-flight"

for tool in tools/triage.mjs tools/triage_apply.mjs tools/wrong_language_replacement_map.json; do
  if [ ! -f "$tool" ]; then fail "missing: $tool"; else pass "found: $tool"; fi
done
if [ ! -f "$WL_CSV_SRC" ]; then fail "missing baseline CSV: $WL_CSV_SRC"; else pass "found: $WL_CSV_SRC"; fi
if ! git rev-parse "$BASELINE_COMMIT" >/dev/null 2>&1; then
  fail "baseline commit not in repo: $BASELINE_COMMIT"
fi
if [ ${#FAILED[@]} -gt 0 ]; then echo ""; echo "✗ pre-flight failed."; exit 1; fi

# ─────────────────────────────────────────────────────────────────────
# Snapshot
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[1/9] snapshot extraction"
git show "${BASELINE_COMMIT}:${LOCALE_PATH}" > "$SANDBOX" 2>/dev/null
SANDBOX_SIZE=$(stat -c '%s' "$SANDBOX" 2>/dev/null || wc -c < "$SANDBOX")
pass "sandbox size: ${SANDBOX_SIZE} B"

# ─────────────────────────────────────────────────────────────────────
# W1: detector finds expected wrong-language entries
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[2/9] detector run"
node tools/triage.mjs --locale "$LOCALE" --mode wrong-language --src "$SANDBOX" --csv "$CSV" --quiet
RC=$?
if [ "$RC" != "0" ] && [ "$RC" != "1" ]; then
  fail "detector unexpected exit code $RC"
fi
WL_DETECTIONS=$(awk 'NR>1' "$CSV" | wc -l | tr -d ' ')
check "W1: detector wrong-language count" "$WL_DETECTIONS" "$EXPECTED_WL_DETECTIONS"

# ─────────────────────────────────────────────────────────────────────
# W2: plan substitute count
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[3/9] plan generation (dry-run)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector wrong-language \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" >/dev/null

SUBSTITUTE_COUNT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.summary.substitute);")
check "W2: plan substitute count" "$SUBSTITUTE_COUNT" "$EXPECTED_SUBSTITUTE"

# ─────────────────────────────────────────────────────────────────────
# W3: apply exit 0
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[4/9] apply (--yes)"
PRE_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
PRE_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
PRE_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')

node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector wrong-language \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" \
  --apply --yes 2>&1 | tee "$APPLY_LOG"
APPLY_RC=${PIPESTATUS[0]}
check "W3: apply exit code" "$APPLY_RC" "0"

# ─────────────────────────────────────────────────────────────────────
# W4: leaf count unchanged
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[5/9] post leaf count"
POST_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
check "W4: leaf count unchanged" "$POST_LEAVES" "$PRE_LEAVES"

# ─────────────────────────────────────────────────────────────────────
# W5: post detector wrong-language count == 0
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[6/9] post detector"
node tools/triage.mjs --locale "$LOCALE" --mode wrong-language --src "$SANDBOX" --csv "$POST_CSV" --quiet >/dev/null
POST_WL=$(awk 'NR>1' "$POST_CSV" | wc -l | tr -d ' ')
check "W5: post wrong-language count" "$POST_WL" "$EXPECTED_POST_WL"

# ─────────────────────────────────────────────────────────────────────
# W6: substituted lines contain 중 and no 中
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[7/9] value-content (line 3071 + 3091)"
LINE_3071=$(sed -n '3071p' "$SANDBOX")
LINE_3091=$(sed -n '3091p' "$SANDBOX")
if echo "$LINE_3071" | grep -q '중' && ! echo "$LINE_3071" | grep -q '中'; then
  pass "W6a: line 3071 has 중, no 中"
else
  fail "W6a: line 3071 unexpected content: $LINE_3071"
fi
if echo "$LINE_3091" | grep -q '중' && ! echo "$LINE_3091" | grep -q '中'; then
  pass "W6b: line 3091 has 중, no 中"
else
  fail "W6b: line 3091 unexpected content: $LINE_3091"
fi

# ─────────────────────────────────────────────────────────────────────
# W7: sacred SHA unchanged
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[8/9] sacred SHA invariance"
POST_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
POST_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')
check "W7a: ja.js SHA" "$POST_JA_SHA" "$PRE_JA_SHA"
check "W7b: zh.js SHA" "$POST_ZH_SHA" "$PRE_ZH_SHA"

# ─────────────────────────────────────────────────────────────────────
# W8: success log presents G6 + G5 wrong-language
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[9/9] success log gate labels"
SUCCESS_LINE=$(grep -E 'All gates passed' "$APPLY_LOG" | head -1)
if echo "$SUCCESS_LINE" | grep -q 'G6 value-content' && echo "$SUCCESS_LINE" | grep -q 'G5 wrong-language'; then
  pass "W8: G6+G5 wrong-language labels present"
else
  fail "W8: missing gate labels in success log: $SUCCESS_LINE"
fi

# ─────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
W_CHECK_PASS=$(printf '%s\n' "${INFO[@]}" | grep -c '^PASS: W')
W_DISTINCT=$(printf '%s\n' "${INFO[@]}" | grep -oE '^PASS: W[0-9]+' | sort -u | wc -l | tr -d ' ')
SETUP_PASS=$((${#INFO[@]} - W_CHECK_PASS))
if [ ${#FAILED[@]} -eq 0 ]; then
  echo " ✓ ALL ${W_DISTINCT}/8 W-INVARIANTS PASS (${W_CHECK_PASS} sub-checks, ${SETUP_PASS} pre-flight)"
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 0
else
  echo " ✗ ${#FAILED[@]} CHECK(S) FAILED:"
  for f in "${FAILED[@]}"; do echo "    - $f"; done
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 1
fi

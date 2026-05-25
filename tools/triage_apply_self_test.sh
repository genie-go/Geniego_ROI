#!/usr/bin/env bash
# tools/triage_apply_self_test.sh
#
# 158차 N-157-A Tier 2 (regression validation) 영구 회귀 검증.
# triage.mjs + triage_apply.mjs 의 ed3c4a0~1 시점 21-collision baseline
# 시나리오를 invariant 로 검증.
#
# Usage: bash tools/triage_apply_self_test.sh
# Exit:  0 = all invariants pass, 1 = any invariant failed
#
# Refs: docs/spec/triage_apply_v1.md §8
# Baseline commit: ed3c4a0~1 (158차 P2 live test 시점)

set -u  # set -e 는 안 씀 (triage exit 1 이 detection 성공)

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
BASELINE_COMMIT="ed3c4a0~1"
LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"

# Invariants (158 ed3c4a0~1 baseline)
EXPECTED_PRE_LEAVES=32070
EXPECTED_COLLISIONS=21
EXPECTED_DELETE=5
EXPECTED_DEMOTED=16
EXPECTED_POST_LEAVES=32070  # loss 0 (all 5 deletes were shadow cleanup)
EXPECTED_POST_COLLISIONS=0
EXPECTED_GRAPH_KEYS=16

# Sandbox paths (PID-suffixed, parallel-safe)
SANDBOX="/tmp/triage_apply_selftest_$$.js"
CSV="/tmp/triage_apply_selftest_$$.csv"
PLAN="/tmp/triage_apply_selftest_$$.json"

# MSYS path translation: bare args get translated, but string literals
# inside node -e do NOT. Pre-translate via cygpath -m for cross-platform
# safety (cygpath unavailable on Linux/Mac → falls back to POSIX path).
SANDBOX_WIN=$(cygpath -m "$SANDBOX" 2>/dev/null || echo "$SANDBOX")
CSV_WIN=$(cygpath -m "$CSV" 2>/dev/null || echo "$CSV")
PLAN_WIN=$(cygpath -m "$PLAN" 2>/dev/null || echo "$PLAN")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
FAILED=()
INFO=()

pass() { echo "  ✓ $1"; INFO+=("PASS: $1"); }
fail() { echo "  ✗ $1"; FAILED+=("$1"); }
check() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$name (got $actual)"
  else
    fail "$name (expected $expected, got $actual)"
  fi
}

cleanup() {
  rm -f "$SANDBOX" "$CSV" "$PLAN"
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight: required artifacts present
# ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════"
echo " triage_apply self-test — baseline ${BASELINE_COMMIT}"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "[0/9] pre-flight"

for tool in tools/triage.mjs tools/triage_apply.mjs tools/leaf_count.mjs; do
  if [ ! -f "$tool" ]; then
    fail "missing: $tool"
  else
    pass "found: $tool"
  fi
done

if ! git rev-parse "$BASELINE_COMMIT" >/dev/null 2>&1; then
  fail "baseline commit not in repo: $BASELINE_COMMIT"
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "✗ pre-flight failed. aborting."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# I1: snapshot leaf count
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[1/9] snapshot extraction"
git show "${BASELINE_COMMIT}:${LOCALE_PATH}" > "$SANDBOX" 2>/dev/null
PRE_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
check "I1: snapshot leaf count" "$PRE_LEAVES" "$EXPECTED_PRE_LEAVES"

# ─────────────────────────────────────────────────────────────────────────────
# I2: detector finds expected collision count
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[2/9] detector run"
node tools/triage.mjs --locale "$LOCALE" --mode collision --src "$SANDBOX" --csv "$CSV" --quiet
RC=$?
if [ "$RC" != "0" ] && [ "$RC" != "1" ]; then
  fail "I2: detector unexpected exit code $RC"
fi
COLLISIONS=$(awk -F',' 'NR>1 {gsub(/"/,"",$2); print $2}' "$CSV" | sort -u | wc -l)
check "I2: detector collision count" "$COLLISIONS" "$EXPECTED_COLLISIONS"

# ─────────────────────────────────────────────────────────────────────────────
# I3, I4: plan delete + demoted count
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[3/9] plan generation (dry-run)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector collision \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" >/dev/null

DELETE_COUNT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.decisions.filter(d=>d.action==='delete').length);")
DEMOTED_COUNT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.decisions.filter(d=>d.action==='skip' && d.rationale.startsWith('demoted')).length);")
check "I3: plan delete count" "$DELETE_COUNT" "$EXPECTED_DELETE"
check "I4: plan demoted count" "$DEMOTED_COUNT" "$EXPECTED_DEMOTED"

# ─────────────────────────────────────────────────────────────────────────────
# I5: apply executes cleanly
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[4/9] apply (--yes)"
PRE_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
PRE_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')

node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector collision \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" \
  --apply --yes
APPLY_RC=$?
check "I5: apply exit code" "$APPLY_RC" "0"

# ─────────────────────────────────────────────────────────────────────────────
# I6: post leaf count (no data loss)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[5/10] post leaf count"
POST_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
check "I6: post leaf count (loss 0)" "$POST_LEAVES" "$EXPECTED_POST_LEAVES"

# ─────────────────────────────────────────────────────────────────────────────
# I14: precise estimator equality (patch03 §5.1)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[6/10] precise estimator equality"
ESTIMATED_DELTA=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.summary.estimated_leaf_delta);")
ACTUAL_DELTA=$((POST_LEAVES - PRE_LEAVES))
check "I14: estimator equality (Δ=$ESTIMATED_DELTA, post-pre=$ACTUAL_DELTA)" "$ESTIMATED_DELTA" "$ACTUAL_DELTA"

# ─────────────────────────────────────────────────────────────────────────────
# I7: post detector — collisions resolved
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[7/10] post detector"
node tools/triage.mjs --locale "$LOCALE" --mode collision --src "$SANDBOX" --csv "/tmp/triage_apply_selftest_$$_post.csv" --quiet >/dev/null
POST_RC=$?
POST_COLLISIONS=$(($(wc -l < "/tmp/triage_apply_selftest_$$_post.csv") - 1))
[ $POST_COLLISIONS -lt 0 ] && POST_COLLISIONS=0
check "I7: post collision count" "$POST_COLLISIONS" "$EXPECTED_POST_COLLISIONS"
rm -f "/tmp/triage_apply_selftest_$$_post.csv"

# ─────────────────────────────────────────────────────────────────────────────
# I8: sacred SHA unchanged
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[8/10] sacred SHA invariance"
POST_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
POST_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')
check "I8a: ja.js SHA" "$POST_JA_SHA" "$PRE_JA_SHA"
check "I8b: zh.js SHA" "$POST_ZH_SHA" "$PRE_ZH_SHA"

# ─────────────────────────────────────────────────────────────────────────────
# I9: graph subtree intact (16 keys)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[9/10] graph subtree preservation"
GRAPH_KEYS=$(node --input-type=module -e "
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const url = pathToFileURL('$SANDBOX_WIN').href + '?v=' + Date.now();
const m = await import(url);
const root = m.default ?? m;
console.log(Object.keys(root.graph || {}).length);
" 2>/dev/null)
check "I9: graph subtree keys" "$GRAPH_KEYS" "$EXPECTED_GRAPH_KEYS"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[10/10] summary"
echo "═══════════════════════════════════════════════════════════════════════"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo " ✓ ALL ${#INFO[@]} INVARIANTS PASS"
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 0
else
  echo " ✗ ${#FAILED[@]} INVARIANTS FAILED:"
  for f in "${FAILED[@]}"; do
    echo "    - $f"
  done
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 1
fi
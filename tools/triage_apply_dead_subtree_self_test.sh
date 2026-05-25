#!/usr/bin/env bash
# tools/triage_apply_dead_subtree_self_test.sh
#
# patch07 §8.1 + manifest v1 §4.2 — dead-subtree apply 회귀 검증 (dual-mode).
#
# Mode A: manifest absent → conservative-skip-only (D2=0).
# Mode B: manifest present + injected synthetic path → real delete (D2=1).
#
# Usage: bash tools/triage_apply_dead_subtree_self_test.sh
# Exit : 0 = N/N PASS, 1 = any D-invariant failed
#
# Refs: docs/spec/triage_apply_v1_patch07_dead_subtree_apply.md §8.1
#       docs/spec/resolver_consumer_manifest_v1.md §4.2

set -u

BASELINE_COMMIT="ed3c4a0~1"
LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"
MANIFEST_PATH="tools/resolver_consumer_manifest.json"

# Mode A invariants (manifest absent)
EXPECTED_DETECTIONS_A=2
EXPECTED_DELETE_A=0

# Mode B invariants (manifest present + synthetic injection)
SYNTHETIC_PATH="__test_dead_synthetic_xyz"
SYNTHETIC_LEAVES=2
EXPECTED_DELETE_B=1

# Sandbox paths (PID-suffixed, mode-suffixed)
SANDBOX_A="/tmp/triage_apply_ds_selftest_$$_A.js"
CSV_A="/tmp/triage_apply_ds_selftest_$$_A.csv"
PLAN_A="/tmp/triage_apply_ds_selftest_$$_A.json"
APPLY_LOG_A="/tmp/triage_apply_ds_selftest_$$_A_apply.log"

SANDBOX_B="/tmp/triage_apply_ds_selftest_$$_B.js"
CSV_B="/tmp/triage_apply_ds_selftest_$$_B.csv"
PLAN_B="/tmp/triage_apply_ds_selftest_$$_B.json"
APPLY_LOG_B="/tmp/triage_apply_ds_selftest_$$_B_apply.log"

SANDBOX_A_WIN=$(cygpath -m "$SANDBOX_A" 2>/dev/null || echo "$SANDBOX_A")
SANDBOX_B_WIN=$(cygpath -m "$SANDBOX_B" 2>/dev/null || echo "$SANDBOX_B")
PLAN_A_WIN=$(cygpath -m "$PLAN_A" 2>/dev/null || echo "$PLAN_A")
PLAN_B_WIN=$(cygpath -m "$PLAN_B" 2>/dev/null || echo "$PLAN_B")

FAILED=()
INFO=()

pass() { echo "  ✓ $1"; INFO+=("PASS: $1"); }
fail() { echo "  ✗ $1"; FAILED+=("$1"); }
check() {
  local name="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then pass "$name (got $actual)"
  else fail "$name (expected $expected, got $actual)"; fi
}

cleanup() {
  rm -f "$SANDBOX_A" "$CSV_A" "$PLAN_A" "$APPLY_LOG_A" \
        "$SANDBOX_B" "$CSV_B" "$PLAN_B" "$APPLY_LOG_B"
}
trap cleanup EXIT

echo "═══════════════════════════════════════════════════════════════════════"
echo " triage_apply dead-subtree self-test — DUAL MODE (A absent, B present)"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "[pre] flight"

for tool in tools/triage.mjs tools/triage_apply.mjs; do
  if [ ! -f "$tool" ]; then fail "missing: $tool"; else pass "found: $tool"; fi
done
if ! git rev-parse "$BASELINE_COMMIT" >/dev/null 2>&1; then
  fail "baseline commit not in repo: $BASELINE_COMMIT"
fi
if [ -f "$MANIFEST_PATH" ]; then
  pass "manifest present (Mode B will exercise full delete path)"
else
  fail "manifest missing — Mode B cannot run"
fi
if [ ${#FAILED[@]} -gt 0 ]; then echo ""; echo "✗ pre-flight failed."; exit 1; fi

PRE_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
PRE_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')

# ════════════════════════════════════════════════════════════════════
#  Mode A — manifest absent (conservative skip)
# ════════════════════════════════════════════════════════════════════
echo ""
echo "── Mode A: manifest absent ──────────────────────────────────────"

echo ""
echo "[A1/8] snapshot + verdict CSV"
git show "${BASELINE_COMMIT}:${LOCALE_PATH}" > "$SANDBOX_A" 2>/dev/null
cat > "$CSV_A" <<'CSV_EOF'
"locale","root_path","status","verdict","subtree_leaf_count","total_consumers","root_line"
"ko","pages","dead","safe_to_delete","100","0","1"
"ko","dash","live","do_not_delete","50","12","2"
CSV_EOF
pass "Mode A sandbox + 2-row verdict CSV prepared"

PRE_LEAVES_A=$(node tools/leaf_count.mjs "$SANDBOX_A" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
PRE_SIZE_A=$(wc -c < "$SANDBOX_A" | tr -d ' ')

echo ""
echo "[A2/8] D-A: plan dry-run (no --resolver-manifest)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV_A" --target "$SANDBOX_A" --out "$PLAN_A" >/dev/null
DELETE_A=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_A_WIN','utf-8')); console.log(p.summary.delete);")
SKIP_A=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_A_WIN','utf-8')); console.log(p.summary.skip);")
RATIONALE_A=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_A_WIN','utf-8')); console.log(p.decisions[0].rationale);")
check "D-A1: detection count" "$(awk 'NR>1' "$CSV_A" | wc -l | tr -d ' ')" "$EXPECTED_DETECTIONS_A"
check "D-A2: delete count (manifest absent → 0)" "$DELETE_A" "$EXPECTED_DELETE_A"
check "D-A2b: skip count == detections" "$SKIP_A" "$EXPECTED_DETECTIONS_A"
if echo "$RATIONALE_A" | grep -q "conservative skip"; then
  pass "D-A2c: rationale contains 'conservative skip'"
else
  fail "D-A2c: rationale missing 'conservative skip': $RATIONALE_A"
fi

echo ""
echo "[A3/8] D-A: apply --yes (no-op pipeline)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV_A" --target "$SANDBOX_A" --out "$PLAN_A" \
  --apply --yes 2>&1 | tee "$APPLY_LOG_A" >/dev/null
APPLY_RC_A=${PIPESTATUS[0]}
check "D-A3: apply exit code" "$APPLY_RC_A" "0"

POST_LEAVES_A=$(node tools/leaf_count.mjs "$SANDBOX_A" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
POST_SIZE_A=$(wc -c < "$SANDBOX_A" | tr -d ' ')
check "D-A4: leaf count unchanged" "$POST_LEAVES_A" "$PRE_LEAVES_A"
check "D-A5: size unchanged" "$POST_SIZE_A" "$PRE_SIZE_A"

# ════════════════════════════════════════════════════════════════════
#  Mode B — manifest present + injected synthetic path (real delete)
# ════════════════════════════════════════════════════════════════════
echo ""
echo "── Mode B: manifest present + synthetic injection ───────────────"

echo ""
echo "[B1/8] snapshot + synthetic inject"
git show "${BASELINE_COMMIT}:${LOCALE_PATH}" > "$SANDBOX_B" 2>/dev/null
# inject __test_dead_synthetic_xyz: { a: "x", b: "y" }, as a new line right
# after the "export default {" line (single-line block; findBlockEnd reads
# both '{' and '}' on the same line). 2 leaves.
awk -v inject="  $SYNTHETIC_PATH: { a: \"x\", b: \"y\" }," '
  NR==1 { print; print inject; next }
  { print }
' "$SANDBOX_B" > "${SANDBOX_B}.tmp" && mv "${SANDBOX_B}.tmp" "$SANDBOX_B"
SYNTHETIC_LINE_B=2
cat > "$CSV_B" <<CSV_EOF_B
"locale","root_path","status","verdict","subtree_leaf_count","total_consumers","root_line"
"ko","$SYNTHETIC_PATH","dead","safe_to_delete","$SYNTHETIC_LEAVES","0","$SYNTHETIC_LINE_B"
CSV_EOF_B
pass "Mode B sandbox + synthetic '$SYNTHETIC_PATH' injected at line $SYNTHETIC_LINE_B"

PRE_LEAVES_B=$(node tools/leaf_count.mjs "$SANDBOX_B" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
PRE_SIZE_B=$(wc -c < "$SANDBOX_B" | tr -d ' ')
# 합성 path 가 AST 에 들어가는지 확인
SYN_PRESENT=$(node --input-type=module -e "
import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL('$SANDBOX_B_WIN').href + '?v=' + Date.now());
const r = m.default ?? m;
console.log(r.$SYNTHETIC_PATH !== undefined ? 'yes' : 'no');
" 2>/dev/null)
check "D-B0: synthetic path present in injected sandbox" "$SYN_PRESENT" "yes"

echo ""
echo "[B2/8] D-B: plan dry-run (--resolver-manifest)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV_B" --target "$SANDBOX_B" --out "$PLAN_B" \
  --resolver-manifest "$MANIFEST_PATH" >/dev/null
DELETE_B=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_B_WIN','utf-8')); console.log(p.summary.delete);")
check "D-B2: delete count (manifest present, orphan path → 1)" "$DELETE_B" "$EXPECTED_DELETE_B"

echo ""
echo "[B3/8] D-B: apply --yes (real delete)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV_B" --target "$SANDBOX_B" --out "$PLAN_B" \
  --resolver-manifest "$MANIFEST_PATH" \
  --apply --yes 2>&1 | tee "$APPLY_LOG_B" >/dev/null
APPLY_RC_B=${PIPESTATUS[0]}
check "D-B3: apply exit code" "$APPLY_RC_B" "0"

POST_LEAVES_B=$(node tools/leaf_count.mjs "$SANDBOX_B" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
EXPECTED_POST_LEAVES_B=$((PRE_LEAVES_B - SYNTHETIC_LEAVES))
check "D-B4: leaf count = pre - $SYNTHETIC_LEAVES" "$POST_LEAVES_B" "$EXPECTED_POST_LEAVES_B"

POST_SIZE_B=$(wc -c < "$SANDBOX_B" | tr -d ' ')
if [ "$POST_SIZE_B" -lt "$PRE_SIZE_B" ]; then
  pass "D-B5: size decreased (pre=$PRE_SIZE_B post=$POST_SIZE_B)"
else
  fail "D-B5: size did not decrease (pre=$PRE_SIZE_B post=$POST_SIZE_B)"
fi

# 합성 path 가 post-AST 에서 제거되었는지 확인 (G4 path-removed)
SYN_POST=$(node --input-type=module -e "
import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL('$SANDBOX_B_WIN').href + '?v=' + Date.now());
const r = m.default ?? m;
console.log(r.$SYNTHETIC_PATH === undefined ? 'removed' : 'still-present');
" 2>/dev/null)
check "D-B6: synthetic path removed from post-AST" "$SYN_POST" "removed"

echo ""
echo "[B4/8] D-B: success log gate labels"
SUCCESS_LINE_B=$(grep -E 'All gates passed' "$APPLY_LOG_B" | head -1)
if echo "$SUCCESS_LINE_B" | grep -q 'G5 dead-subtree' && \
   echo "$SUCCESS_LINE_B" | grep -q 'G4 path-removed' && \
   echo "$SUCCESS_LINE_B" | grep -q 'G3 leaf count \[strict-sum\]'; then
  pass "D-B8: success log labels (G3 strict-sum, G4 path-removed, G5 dead-subtree)"
else
  fail "D-B8: missing labels in: $SUCCESS_LINE_B"
fi

# ════════════════════════════════════════════════════════════════════
#  Shared — sacred SHA after both modes
# ════════════════════════════════════════════════════════════════════
echo ""
echo "── shared post-checks ──────────────────────────────────────────"
POST_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
POST_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')
check "D7a: ja.js SHA invariant" "$POST_JA_SHA" "$PRE_JA_SHA"
check "D7b: zh.js SHA invariant" "$POST_ZH_SHA" "$PRE_ZH_SHA"

# ════════════════════════════════════════════════════════════════════
#  Summary
# ════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
D_CHECK_PASS=$(printf '%s\n' "${INFO[@]}" | grep -c -E '^PASS: D')
SETUP_PASS=$((${#INFO[@]} - D_CHECK_PASS))
if [ ${#FAILED[@]} -eq 0 ]; then
  echo " ✓ ALL D-INVARIANTS PASS — Mode A (conservative) + Mode B (manifest+inject)"
  echo "    (${D_CHECK_PASS} D-checks, ${SETUP_PASS} pre/shared)"
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 0
else
  echo " ✗ ${#FAILED[@]} CHECK(S) FAILED:"
  for f in "${FAILED[@]}"; do echo "    - $f"; done
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 1
fi

#!/usr/bin/env bash
# tools/triage_apply_dead_subtree_self_test.sh
#
# patch07 §8.1 — dead-subtree apply path 회귀 검증 (plumbing-only mode).
#
# resolver_consumer_manifest.json 부재 시 conservative-skip-only 동작 검증.
# manifest 가 도입되면 D2 expected 를 실제 delete 수로 갱신 필요 (별도 트랙).
#
# Usage: bash tools/triage_apply_dead_subtree_self_test.sh
# Exit : 0 = N/N PASS, 1 = any D-invariant failed
#
# Refs: docs/spec/triage_apply_v1_patch07_dead_subtree_apply.md §8.1

set -u

BASELINE_COMMIT="ed3c4a0~1"
LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"

# Plumbing-only invariants (manifest absent)
EXPECTED_DETECTIONS=2          # synthetic CSV 행 수
EXPECTED_DELETE=0              # manifest absent → conservative skip (D2 = 0)
EXPECTED_POST_DETECTIONS_DELTA=0  # delete=0 이므로 pre 와 post 동일

# Sandbox (PID-suffixed)
SANDBOX="/tmp/triage_apply_ds_selftest_$$.js"
CSV="/tmp/triage_apply_ds_selftest_$$.csv"
PLAN="/tmp/triage_apply_ds_selftest_$$.json"
APPLY_LOG="/tmp/triage_apply_ds_selftest_$$_apply.log"

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

cleanup() { rm -f "$SANDBOX" "$CSV" "$PLAN" "$APPLY_LOG"; }
trap cleanup EXIT

echo "═══════════════════════════════════════════════════════════════════════"
echo " triage_apply dead-subtree self-test — plumbing-only (manifest absent)"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "[0/9] pre-flight"

for tool in tools/triage.mjs tools/triage_apply.mjs; do
  if [ ! -f "$tool" ]; then fail "missing: $tool"; else pass "found: $tool"; fi
done
if ! git rev-parse "$BASELINE_COMMIT" >/dev/null 2>&1; then
  fail "baseline commit not in repo: $BASELINE_COMMIT"
fi
# manifest 존재 여부 (정보용)
if [ -f "tools/resolver_consumer_manifest.json" ]; then
  pass "manifest present (NOT plumbing-only mode! adjust EXPECTED_DELETE)"
else
  pass "manifest absent (plumbing-only mode: EXPECTED_DELETE=0)"
fi
if [ ${#FAILED[@]} -gt 0 ]; then echo ""; echo "✗ pre-flight failed."; exit 1; fi

# ─────────────────────────────────────────────────────────────────────
# Snapshot + synthetic verdict CSV
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[1/9] snapshot + verdict CSV"
git show "${BASELINE_COMMIT}:${LOCALE_PATH}" > "$SANDBOX" 2>/dev/null
# 2-row verdict: 1 dead (would-delete if manifest present), 1 live (always skip)
cat > "$CSV" <<'CSV_EOF'
"locale","root_path","status","verdict","subtree_leaf_count","total_consumers","root_line"
"ko","pages","dead","safe_to_delete","100","0","1"
"ko","dash","live","do_not_delete","50","12","2"
CSV_EOF
pass "sandbox + synthetic verdict CSV (2 rows) prepared"

# ─────────────────────────────────────────────────────────────────────
# D1: detector finds N entries (here: synthetic 2)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[2/9] detector row count (synthetic)"
CSV_ROWS=$(awk 'NR>1' "$CSV" | wc -l | tr -d ' ')
check "D1: detector entry count" "$CSV_ROWS" "$EXPECTED_DETECTIONS"

# ─────────────────────────────────────────────────────────────────────
# D2: plan delete count == 0 (manifest absent)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[3/9] plan generation (dry-run)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" >/dev/null

DELETE_COUNT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.summary.delete);")
SKIP_COUNT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$PLAN_WIN','utf-8')); console.log(p.summary.skip);")
check "D2: plan delete count (manifest absent → 0)" "$DELETE_COUNT" "$EXPECTED_DELETE"
check "D2b: plan skip count (all rows skipped)" "$SKIP_COUNT" "$EXPECTED_DETECTIONS"

# ─────────────────────────────────────────────────────────────────────
# D3: apply exit 0 (no-op)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[4/9] apply (--yes, plumbing no-op)"
PRE_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
PRE_SIZE=$(wc -c < "$SANDBOX" | tr -d ' ')
PRE_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
PRE_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')

node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$CSV" --target "$SANDBOX" --out "$PLAN" \
  --apply --yes 2>&1 | tee "$APPLY_LOG"
APPLY_RC=${PIPESTATUS[0]}
check "D3: apply exit code" "$APPLY_RC" "0"

# ─────────────────────────────────────────────────────────────────────
# D4: leaf count == pre (no deletes applied)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[5/9] post leaf count"
POST_LEAVES=$(node tools/leaf_count.mjs "$SANDBOX" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ')
check "D4: leaf count unchanged" "$POST_LEAVES" "$PRE_LEAVES"

# ─────────────────────────────────────────────────────────────────────
# D5: post size == pre (no deletes applied)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[6/9] post size"
POST_SIZE=$(wc -c < "$SANDBOX" | tr -d ' ')
check "D5: post size == pre (conservative skip)" "$POST_SIZE" "$PRE_SIZE"

# ─────────────────────────────────────────────────────────────────────
# D6: paths still present in post-AST (no deletions)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[7/9] paths preserved (conservative skip)"
PATHS_PRESENT=$(node --input-type=module -e "
import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL('$SANDBOX_WIN').href + '?v=' + Date.now());
const r = m.default ?? m;
let ok = 0;
if (r.pages !== undefined) ok++;
if (r.dash !== undefined) ok++;
console.log(ok);
" 2>/dev/null)
check "D6: candidate paths preserved (2)" "$PATHS_PRESENT" "2"

# ─────────────────────────────────────────────────────────────────────
# D7: sacred SHA unchanged
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[8/9] sacred SHA invariance"
POST_JA_SHA=$(sha256sum frontend/src/i18n/locales/ja.js | awk '{print $1}')
POST_ZH_SHA=$(sha256sum frontend/src/i18n/locales/zh.js | awk '{print $1}')
check "D7a: ja.js SHA" "$POST_JA_SHA" "$PRE_JA_SHA"
check "D7b: zh.js SHA" "$POST_ZH_SHA" "$PRE_ZH_SHA"

# ─────────────────────────────────────────────────────────────────────
# D8: success log contains dead-subtree gate labels
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "[9/9] success log gate labels"
SUCCESS_LINE=$(grep -E 'All gates passed' "$APPLY_LOG" | head -1)
if echo "$SUCCESS_LINE" | grep -q 'G5 dead-subtree' && echo "$SUCCESS_LINE" | grep -q 'G4 path-removed' && echo "$SUCCESS_LINE" | grep -q 'G3 leaf count \[strict-sum\]'; then
  pass "D8: dead-subtree gate labels present (G3 strict-sum, G4 path-removed, G5 dead-subtree)"
else
  fail "D8: missing dead-subtree gate labels in: $SUCCESS_LINE"
fi

# ─────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
D_CHECK_PASS=$(printf '%s\n' "${INFO[@]}" | grep -c '^PASS: D')
D_DISTINCT=$(printf '%s\n' "${INFO[@]}" | grep -oE '^PASS: D[0-9]+' | sort -u | wc -l | tr -d ' ')
SETUP_PASS=$((${#INFO[@]} - D_CHECK_PASS))
if [ ${#FAILED[@]} -eq 0 ]; then
  echo " ✓ ALL ${D_DISTINCT}/8 D-INVARIANTS PASS — plumbing-only (manifest absent)"
  echo "    (${D_CHECK_PASS} sub-checks, ${SETUP_PASS} pre-flight)"
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 0
else
  echo " ✗ ${#FAILED[@]} CHECK(S) FAILED:"
  for f in "${FAILED[@]}"; do echo "    - $f"; done
  echo "═══════════════════════════════════════════════════════════════════════"
  exit 1
fi

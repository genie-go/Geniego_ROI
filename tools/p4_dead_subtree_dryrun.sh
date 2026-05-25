#!/usr/bin/env bash
# tools/p4_dead_subtree_dryrun.sh
#
# Session 159 P4 — ko top-level root 전체 대상 dead-subtree dry-run.
#   1. p4_root_enumerator.mjs → object-typed top-level keys 추출
#   2. per-root: triage.mjs --mode dead-subtree --root <r> --json verdict_NNN.json
#   3. p4_verdict_aggregator.mjs → ko_all_verdicts.csv (patch07 §3.2 schema)
#   4. triage_apply.mjs --detector dead-subtree --resolver-manifest 으로 dry-run plan
#   5. p4_summary.mjs → SUMMARY.md
#
# --apply 절대 없음. ko.js 절대 불변. Spec §1, §3.1.
#
# Usage: bash tools/p4_dead_subtree_dryrun.sh

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"
OUT_DIR="session159_dead_subtree"
MANIFEST="tools/resolver_consumer_manifest.json"
mkdir -p "$OUT_DIR"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: missing manifest: $MANIFEST" >&2
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════════════"
echo " P4 ko dead-subtree dry-run"
echo "═══════════════════════════════════════════════════════════════════════"

# Step 1: enumerate roots
echo ""
echo "[1/5] enumerate top-level roots"
ROOTS=$(node tools/p4_root_enumerator.mjs "$LOCALE_PATH")
ROOT_COUNT=$(echo "$ROOTS" | wc -l | tr -d ' ')
echo "  → ${ROOT_COUNT} object-typed roots"

# Step 2: per-root detector → JSON
echo ""
echo "[2/5] per-root detector (verdict JSON)"
i=0
FAILED_ROOTS=()
# clean previous JSON outputs
rm -f "$OUT_DIR"/verdict_*.json
while IFS= read -r root; do
  [ -z "$root" ] && continue
  i=$((i+1))
  IDX=$(printf "%03d" "$i")
  JSON="$OUT_DIR/verdict_${IDX}.json"
  # detector exits 1 when total_consumers===0 (potential dead) — that's OK.
  # exit 0 = consumers found (live). exit 2 = error.
  set +e
  node tools/triage.mjs --locale "$LOCALE" --mode dead-subtree \
    --root "$root" --json "$JSON" --quiet >/dev/null 2>&1
  RC=$?
  set -e
  if [ "$RC" != "0" ] && [ "$RC" != "1" ]; then
    FAILED_ROOTS+=("$root(rc=$RC)")
    rm -f "$JSON"
    continue
  fi
  # 진행 인디케이터: 매 20개마다 한 줄
  if [ $((i % 20)) -eq 0 ]; then
    echo "  ... $i / $ROOT_COUNT"
  fi
done <<< "$ROOTS"

PRODUCED=$(ls "$OUT_DIR"/verdict_*.json 2>/dev/null | wc -l | tr -d ' ')
echo "  → produced ${PRODUCED} verdict JSON(s), failed ${#FAILED_ROOTS[@]}"
if [ ${#FAILED_ROOTS[@]} -gt 0 ]; then
  echo "  failed roots (first 5): ${FAILED_ROOTS[@]:0:5}"
fi

# Step 3: aggregate to verdict CSV
echo ""
echo "[3/5] aggregate → ko_all_verdicts.csv"
node tools/p4_verdict_aggregator.mjs "$OUT_DIR" "$LOCALE_PATH" > "$OUT_DIR/ko_all_verdicts.csv"
CSV_ROWS=$(awk 'NR>1' "$OUT_DIR/ko_all_verdicts.csv" | wc -l | tr -d ' ')
echo "  → ${CSV_ROWS} verdict rows"

# Step 4: dry-run plan
echo ""
echo "[4/5] triage_apply dry-run plan (--resolver-manifest, no --apply)"
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$OUT_DIR/ko_all_verdicts.csv" \
  --target "$LOCALE_PATH" \
  --resolver-manifest "$MANIFEST" \
  --out "$OUT_DIR/ko_plan.json" >/dev/null
PLAN_DELETE=$(node -e "const p=JSON.parse(require('fs').readFileSync('$OUT_DIR/ko_plan.json','utf-8')); console.log(p.summary.delete);")
PLAN_SKIP=$(node -e "const p=JSON.parse(require('fs').readFileSync('$OUT_DIR/ko_plan.json','utf-8')); console.log(p.summary.skip);")
echo "  → plan: delete=${PLAN_DELETE}, skip=${PLAN_SKIP}"

# Step 5: summary
echo ""
echo "[5/5] SUMMARY.md generation"
node tools/p4_summary.mjs "$OUT_DIR" > "$OUT_DIR/SUMMARY.md"
echo "  ✓ ${OUT_DIR}/SUMMARY.md"
echo ""
echo "Done. ko.js unchanged (dry-run only). Review SUMMARY.md before any --apply track."

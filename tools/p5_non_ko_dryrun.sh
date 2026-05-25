#!/usr/bin/env bash
# tools/p5_non_ko_dryrun.sh
#
# Session 159 P5 — non-ko 14 (actual: 12) locale collision dry-run
# 일괄 plan 생성 + 집계 보고서 (사용자 review 용)
#
# Usage: bash tools/p5_non_ko_dryrun.sh
# Spec : docs/spec/session159_p5_non_ko_dryrun.md §4.1
# Note : --apply 없음. dry-run only. ja/zh/ko 명시 skip.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES_DIR="frontend/src/i18n/locales"
CSV_DIR="session157_collisions"
OUT_DIR="session159_plans"
mkdir -p "$OUT_DIR"

if [ ! -d "$CSV_DIR" ]; then
  echo "ERROR: $CSV_DIR not found"
  exit 1
fi

count=0
skipped=0
echo "═══════════════════════════════════════════════════════════════════════"
echo " P5 non-ko dry-run — input=$CSV_DIR  output=$OUT_DIR"
echo "═══════════════════════════════════════════════════════════════════════"

for csv in "$CSV_DIR"/*.csv; do
  locale=$(basename "$csv" .csv)
  if [ "$locale" = "ko" ] || [ "$locale" = "ja" ] || [ "$locale" = "zh" ]; then
    echo "  · SKIP $locale (sacred or ko reserved)"
    skipped=$((skipped+1))
    continue
  fi
  target="$LOCALES_DIR/$locale.js"
  if [ ! -f "$target" ]; then
    echo "  · SKIP $locale (no target file: $target)"
    skipped=$((skipped+1))
    continue
  fi
  echo "  → $locale"
  node tools/triage_apply.mjs \
    --locale "$locale" --detector collision \
    --input "$csv" --target "$target" \
    --out "$OUT_DIR/${locale}_plan.json" >/dev/null
  count=$((count+1))
done

echo ""
echo "Generated $count plan(s), skipped $skipped"
echo ""
echo "→ Aggregating to $OUT_DIR/SUMMARY.md ..."
node tools/p5_summary.mjs "$OUT_DIR" > "$OUT_DIR/SUMMARY.md"
echo "✓ Summary: $OUT_DIR/SUMMARY.md"

#!/usr/bin/env bash
# Aggregate self-test runner — 160 patch08
# Runs collision (16 G-invariants) + wronglang (8 W-invariants) + dead-subtree dual-mode (16 D-checks).
# Exits 0 only if all PASS. Designed for pre-commit hook + CI 통합.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

declare -i PASS=0 FAIL=0
declare -a FAILED=()

run_test() {
  local name="$1" path="$2"
  echo "--- ${name} ---"
  if bash "${path}"; then
    PASS+=1
    echo "[PASS] ${name}"
  else
    FAIL+=1
    FAILED+=("${name}")
    echo "[FAIL] ${name}"
  fi
}

run_test "collision"     "tools/triage_apply_self_test.sh"
run_test "wronglang"     "tools/triage_apply_wronglang_self_test.sh"
run_test "dead_subtree"  "tools/triage_apply_dead_subtree_self_test.sh"

echo ""
echo "==================================="
echo "self-test aggregate: ${PASS} PASS / ${FAIL} FAIL"
if (( FAIL > 0 )); then
  printf '  failed: %s\n' "${FAILED[@]}"
  exit 1
fi
exit 0

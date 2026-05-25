#!/usr/bin/env bash
# Production smoke — standalone HTTP/lang/path 검증
# Usage:
#   tools/production_smoke.sh                       # 단일 snapshot (root)
#   tools/production_smoke.sh --snapshot before     # before snapshot 저장
#   tools/production_smoke.sh --snapshot after      # after snapshot + diff vs before
#   tools/production_smoke.sh --paths "/ /api/health /login"  # 다중 path
#   tools/production_smoke.sh --soft-lang                    # lang fail 시 WARN + exit 0 (ci_watch 호환)
# Exit codes: 0=PASS, 1=HTTP fail, 2=lang fail, 3=diff fail, 4=usage error

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

DOMAIN="${PRODUCTION_DOMAIN:-https://roi.genie-go.com}"
SNAPSHOT_DIR=".smoke_snapshots"
MODE="single"
PATHS="/"
SOFT_LANG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot) MODE="$2"; shift 2 ;;
    --paths)    PATHS="$2"; shift 2 ;;
    --domain)   DOMAIN="$2"; shift 2 ;;
    --soft-lang) SOFT_LANG=1; shift ;;
    --help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *) echo "[ERROR] unknown arg: $1" >&2; exit 4 ;;
  esac
done

mkdir -p "${SNAPSHOT_DIR}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
declare -i FAIL_HTTP=0 FAIL_LANG=0
declare -A RESULTS

probe_path() {
  local path="$1"
  local url="${DOMAIN}${path}"
  local code timing lang

  read -r code timing < <(curl -sI -o /dev/null -w '%{http_code} %{time_total}\n' "$url" 2>/dev/null || echo "000 0")

  if [[ "$path" == "/" ]]; then
    lang=$(curl -s "$url" 2>/dev/null | grep -oE 'lang="[a-z]+"' | head -1 | tr -d '"' | sed 's/lang=//' || echo "")
  else
    lang="-"
  fi

  RESULTS["$path"]="${code}|${timing}|${lang}"

  [[ "$code" != "200" ]] && FAIL_HTTP+=1
  [[ "$path" == "/" && "$lang" != "ko" && "$lang" != "" ]] && FAIL_LANG+=1
  return 0
}

echo "=== Production smoke @ ${DOMAIN} (${TIMESTAMP}) ==="
echo "Mode: ${MODE}, Paths: ${PATHS}"
echo ""

for p in $PATHS; do
  probe_path "$p"
  IFS='|' read -r code timing lang <<< "${RESULTS[$p]}"
  printf "%-30s HTTP=%s  time=%ss  lang=%s\n" "$p" "$code" "$timing" "$lang"
done
echo ""

case "$MODE" in
  before|after)
    SNAP_FILE="${SNAPSHOT_DIR}/${MODE}.json"
    {
      echo "{"
      echo "  \"timestamp\": \"${TIMESTAMP}\","
      echo "  \"domain\": \"${DOMAIN}\","
      echo "  \"paths\": {"
      first=1
      for p in $PATHS; do
        [[ $first -eq 0 ]] && echo ","
        first=0
        IFS='|' read -r code timing lang <<< "${RESULTS[$p]}"
        printf '    "%s": {"http": "%s", "time": "%s", "lang": "%s"}' "$p" "$code" "$timing" "$lang"
      done
      echo ""
      echo "  }"
      echo "}"
    } > "${SNAP_FILE}"
    echo "[OK] snapshot saved: ${SNAP_FILE}"

    if [[ "$MODE" == "after" && -f "${SNAPSHOT_DIR}/before.json" ]]; then
      echo ""
      echo "=== Diff vs before snapshot ==="
      if diff <(grep -E '"http"|"lang"' "${SNAPSHOT_DIR}/before.json" | sed 's/"time": "[^"]*", //g') <(grep -E '"http"|"lang"' "${SNAP_FILE}" | sed 's/"time": "[^"]*", //g'); then
        echo "[OK] no diff in HTTP/lang"
      else
        echo "[FAIL] http/lang diff detected"
        exit 3
      fi
    fi
    ;;
esac

if (( FAIL_HTTP > 0 )); then
  echo "[FAIL] ${FAIL_HTTP} path(s) non-200"
  exit 1
fi
if (( FAIL_LANG > 0 )); then
  if (( SOFT_LANG == 1 )); then
    echo "[WARN] ${FAIL_LANG} lang mismatch (soft mode, exit 0)"
  else
    echo "[FAIL] ${FAIL_LANG} lang mismatch"
    exit 2
  fi
fi

echo "[PASS] smoke green"
exit 0

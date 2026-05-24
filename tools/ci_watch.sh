#!/usr/bin/env bash
# tools/ci_watch.sh — Session 154 CI/CD observability gate
#
# Polls GitHub Actions for the workflow run matching HEAD SHA, reports
# status / conclusion, tails failing logs, and runs an optional
# production smoke test on success.
#
# Dependencies : curl (mingw64/git-bash builtin), node (already in repo deps)
# Auth         : optional GITHUB_TOKEN env var (raises rate limit 60→5000/h)
# Public repos work unauthenticated; private repos require GITHUB_TOKEN.
#
# Usage
#   tools/ci_watch.sh                    # watch HEAD's run
#   tools/ci_watch.sh <SHA>              # watch specific commit
#   tools/ci_watch.sh --no-smoke         # skip production smoke
#   tools/ci_watch.sh --timeout 600      # custom timeout in seconds
#
# Exit codes
#   0  workflow succeeded (and smoke passed if enabled)
#   1  workflow failed / cancelled / smoke failed
#   2  timed out waiting
#   3  no workflow run found (paths-ignored commit, etc.)
#   4  prerequisite failure (no curl / no node / no remote)

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "❌ not in a git repo"; exit 4;
}
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
SHA=""
SMOKE=1
TIMEOUT=300
POLL=10
while [ $# -gt 0 ]; do
  case "$1" in
    --no-smoke)  SMOKE=0 ;;
    --timeout)   shift; TIMEOUT="$1" ;;
    --poll)      shift; POLL="$1" ;;
    --help|-h)
      sed -n '2,25p' "$0"; exit 0 ;;
    -*) echo "❌ unknown flag: $1"; exit 4 ;;
    *)  SHA="$1" ;;
  esac
  shift
done

[ -z "$SHA" ] && SHA=$(git rev-parse HEAD)
SHA_SHORT="${SHA:0:7}"

# ---------------------------------------------------------------------------
# Owner / repo from origin
# ---------------------------------------------------------------------------
ORIGIN=$(git remote get-url origin 2>/dev/null) || {
  echo "❌ no 'origin' remote configured"; exit 4;
}
# Accept https://github.com/{o}/{r}.git and git@github.com:{o}/{r}.git
OWNER_REPO=$(echo "$ORIGIN" \
  | sed -E 's#^.*github\.com[:/](.+/.+)(\.git)?$#\1#' \
  | sed 's#\.git$##')
if ! echo "$OWNER_REPO" | grep -qE '^[^/]+/[^/]+$'; then
  echo "❌ could not parse owner/repo from origin: $ORIGIN"; exit 4
fi

API="https://api.github.com/repos/${OWNER_REPO}"
WEB="https://github.com/${OWNER_REPO}"

# Auth header (optional)
AUTH_ARGS=()
if [ -n "$GITHUB_TOKEN" ]; then
  AUTH_ARGS=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

echo "═════════════════════════════════════════════════════════════════════"
echo " CI watch — ${OWNER_REPO} @ ${SHA_SHORT}"
echo " timeout=${TIMEOUT}s  poll=${POLL}s  smoke=$([ $SMOKE -eq 1 ] && echo on || echo off)"
echo "═════════════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# JSON helpers (node — no jq)
# ---------------------------------------------------------------------------
jget() {
  # $1 = json blob, $2 = JS dot-path (e.g. workflow_runs[0].status)
  node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        const v = (new Function('j','return j.'+process.argv[1]))(j);
        process.stdout.write(v == null ? '' : String(v));
      } catch(e) { process.stdout.write(''); }
    });
  " "$2" <<< "$1"
}

api_get() {
  # $1 = path  → echo body, return 0 on http<400
  local url="${API}$1"
  local resp; local code
  resp=$(curl -sS -w '\n__HTTP__%{http_code}' "${AUTH_ARGS[@]}" \
    -H 'Accept: application/vnd.github+json' "$url") || return 1
  code=$(echo "$resp" | sed -n 's/^__HTTP__//p')
  resp=$(echo "$resp" | sed '$d')
  if [ "$code" -ge 400 ]; then
    echo "❌ API $url → HTTP $code" >&2
    return 1
  fi
  printf '%s' "$resp"
}

# ---------------------------------------------------------------------------
# Find run for SHA
# ---------------------------------------------------------------------------
echo "→ resolving workflow run for ${SHA_SHORT}…"
RUN_ID=""
RUN_NAME=""
RUN_URL=""

START=$(date +%s)
while :; do
  body=$(api_get "/actions/runs?head_sha=${SHA}&per_page=10") || exit 4
  count=$(jget "$body" 'workflow_runs.length')
  if [ "${count:-0}" -gt 0 ]; then
    RUN_ID=$(jget "$body" 'workflow_runs[0].id')
    RUN_NAME=$(jget "$body" 'workflow_runs[0].name')
    RUN_URL=$(jget "$body" 'workflow_runs[0].html_url')
    echo "✓ found run #${RUN_ID} (${RUN_NAME})"
    echo "  ${RUN_URL}"
    break
  fi
  now=$(date +%s)
  if [ $((now - START)) -ge 30 ]; then
    echo "⚠️  no workflow run found within 30s for ${SHA_SHORT}"
    echo "    (commit may be paths-ignored or workflow not triggered)"
    exit 3
  fi
  printf '.'
  sleep 3
done

# ---------------------------------------------------------------------------
# Poll status
# ---------------------------------------------------------------------------
echo ""
echo "→ polling status…"
STATUS=""
CONCLUSION=""
while :; do
  body=$(api_get "/actions/runs/${RUN_ID}") || exit 4
  STATUS=$(jget "$body" 'status')
  CONCLUSION=$(jget "$body" 'conclusion')
  ts=$(date +%H:%M:%S)
  if [ "$STATUS" = "completed" ]; then
    echo "[$ts] status=${STATUS} conclusion=${CONCLUSION}"
    break
  fi
  echo "[$ts] status=${STATUS}…"
  now=$(date +%s)
  if [ $((now - START)) -ge "$TIMEOUT" ]; then
    echo "⏱️  timeout after ${TIMEOUT}s"
    echo "    view: ${RUN_URL}"
    exit 2
  fi
  sleep "$POLL"
done

# ---------------------------------------------------------------------------
# Handle failure: tail job logs
# ---------------------------------------------------------------------------
if [ "$CONCLUSION" != "success" ]; then
  echo ""
  echo "═════════════════════════════════════════════════════════════════════"
  echo " ❌ workflow concluded: ${CONCLUSION}"
  echo "═════════════════════════════════════════════════════════════════════"
  jobs=$(api_get "/actions/runs/${RUN_ID}/jobs") || exit 1
  failed_idx=$(jget "$jobs" "jobs.findIndex(j=>j.conclusion==='failure')")
  if [ -n "$failed_idx" ] && [ "$failed_idx" -ge 0 ]; then
    failed_name=$(jget "$jobs" "jobs[$failed_idx].name")
    failed_step_idx=$(jget "$jobs" "jobs[$failed_idx].steps.findIndex(s=>s.conclusion==='failure')")
    failed_step=$(jget "$jobs" "jobs[$failed_idx].steps[$failed_step_idx].name")
    echo "failed job: ${failed_name}"
    echo "failed step: ${failed_step}"
    echo ""
    echo "view: ${RUN_URL}"
  fi
  exit 1
fi

# ---------------------------------------------------------------------------
# Success — optional production smoke
# ---------------------------------------------------------------------------
echo ""
echo "✅ workflow succeeded"

if [ "$SMOKE" -eq 1 ]; then
  echo ""
  echo "→ production smoke test…"
  HTTP=$(curl -s -o /dev/null -w '%{http_code} %{time_total}s' https://roi.genie-go.com/) || HTTP="(curl-fail)"
  LANG_ATTR=$(curl -s https://roi.genie-go.com/ | grep -oE 'lang="[^"]*"' | head -1 || true)
  echo "  HTTP=${HTTP}  ${LANG_ATTR}"
  echo "$HTTP" | grep -qE '^200 ' || { echo "❌ smoke: non-200"; exit 1; }
  echo "$LANG_ATTR" | grep -q 'lang="ko"' || { echo "⚠️  smoke: lang attr not ko (i18n drift?)"; }
  echo "✅ smoke pass"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════════"
echo " ✓ all checks pass — ${SHA_SHORT} live"
echo "═════════════════════════════════════════════════════════════════════"
exit 0

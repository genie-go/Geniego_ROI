# patch09 — G7 production smoke 자동화 (apply 전후 행동 비교)

> **세션**: 160
> **트랙**: 보강 메모 #28
> **외부 의존**: 0
> **i18n 데이터 변경**: 0 (도구 신규 + ci_watch 리팩터)
> **사전 상태**: HEAD `f90e938`, ko.js 30,656 leaves, ja/zh sacred SHA 156 baseline 유지

---

## 1. 목적

**G7 production smoke 도구** — apply 작업 (특히 P4 dead-subtree 실 apply) 전후 production 행동을 자동 비교하여 회귀를 즉시 검출. ci_watch.sh 의 embedded smoke 를 standalone 화 + before/after diff 모드 추가.

### 1.1 G7 의미 (gate 누적표 갱신)

| Gate | 위치 | 트리거 | 신규 |
|---|---|---|---|
| G2 | pre-commit | sacred SHA mismatch | -- |
| G5 | pre-commit | leaf drift >5% | -- |
| B1-B4 | pre-commit | backup/quarantine staged | -- |
| G6 | pre-commit | locale staged + collision | -- |
| G7 (de-facto) | pre-commit | ko.js staged → self-test (patch08) | 160 신규 |
| **G7-smoke (신규)** | **post-apply manual / CI** | **production HTTP / lang / 핵심 path 200 비교** | **patch09 신규** |

## 2. 사전 조건 (CC 가 진입 전 grep 확인)

```bash
# 2.1 production domain 표준 (160 학습 #35)
grep -E 'roi\.genie-go\.com' .github/workflows/deploy.yml CLAUDE.md | head -5
# 기대: roi.genie-go.com 일관 (canonical)

# 2.2 ci_watch.sh smoke 부분 (extraction 대상)
sed -n '195,210p' tools/ci_watch.sh
# 기대: HTTP code + timing curl, lang attr grep, 200 hard-fail / lang soft warn

# 2.3 기존 smoke 도구 (없음 확인)
ls tools/smoke* tools/production_smoke* 2>&1
# 기대: cannot access (없음)
```

## 3. 변경 사항

### 3.1 신규 `tools/production_smoke.sh`

ci_watch.sh embedded smoke 를 standalone 화 + 3 mode 추가:

```bash
#!/usr/bin/env bash
# Production smoke — standalone HTTP/lang/path 검증
# Usage:
#   tools/production_smoke.sh                       # 단일 snapshot (root)
#   tools/production_smoke.sh --snapshot before     # before snapshot 저장
#   tools/production_smoke.sh --snapshot after      # after snapshot + diff vs before
#   tools/production_smoke.sh --paths "/ /api/health /login"  # 다중 path
# Exit codes: 0=PASS, 1=HTTP fail, 2=lang fail, 3=diff fail, 4=usage error

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

DOMAIN="${PRODUCTION_DOMAIN:-https://roi.genie-go.com}"
SNAPSHOT_DIR=".smoke_snapshots"
MODE="single"
PATHS="/"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot) MODE="$2"; shift 2 ;;
    --paths)    PATHS="$2"; shift 2 ;;
    --domain)   DOMAIN="$2"; shift 2 ;;
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
  
  # HTTP code + timing
  read -r code timing < <(curl -sI -o /dev/null -w '%{http_code} %{time_total}\n' "$url" 2>/dev/null || echo "000 0")
  
  # lang attr (root path 만)
  if [[ "$path" == "/" ]]; then
    lang=$(curl -s "$url" 2>/dev/null | grep -oE 'lang="[a-z]+"' | head -1 | tr -d '"' | sed 's/lang=//')
  else
    lang="-"
  fi
  
  RESULTS["$path"]="${code}|${timing}|${lang}"
  
  [[ "$code" != "200" ]] && FAIL_HTTP+=1
  [[ "$path" == "/" && "$lang" != "ko" && "$lang" != "" ]] && FAIL_LANG+=1
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

# Snapshot 저장
case "$MODE" in
  before|after)
    SNAP_FILE="${SNAPSHOT_DIR}/${MODE}.json"
    {
      echo "{"
      echo "  \"timestamp\": \"${TIMESTAMP}\","
      echo "  \"domain\": \"${DOMAIN}\","
      echo "  \"paths\": {"
      local first=1
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
    
    # after 모드: before 와 diff
    if [[ "$MODE" == "after" && -f "${SNAPSHOT_DIR}/before.json" ]]; then
      echo ""
      echo "=== Diff vs before snapshot ==="
      if diff <(grep -E '"http"|"lang"' "${SNAPSHOT_DIR}/before.json") <(grep -E '"http"|"lang"' "${SNAP_FILE}"); then
        echo "[OK] no diff in HTTP/lang"
      else
        echo "[FAIL] http/lang diff detected"
        exit 3
      fi
    fi
    ;;
esac

# 종합 판정
if (( FAIL_HTTP > 0 )); then
  echo "[FAIL] ${FAIL_HTTP} path(s) non-200"
  exit 1
fi
if (( FAIL_LANG > 0 )); then
  echo "[FAIL] ${FAIL_LANG} lang mismatch"
  exit 2
fi

echo "[PASS] smoke green"
exit 0
```

### 3.2 ci_watch.sh refactor (선택, 회귀 0 보장)

기존 embedded smoke (line 195-208) 를 production_smoke.sh 호출로 대체. **회귀 위험 회피 위해 본 patch 에서는 ci_watch.sh 미터치** — production_smoke.sh 만 신규 추가. 다음 세션에서 ci_watch 통합 검토.

### 3.3 .gitignore 갱신

```
.smoke_snapshots/
```

snapshot JSON 은 gitignore (timestamp 마다 변경, repo pollution 회피).

## 4. 회귀 검증

| # | 검증 | 기대 |
|---|---|---|
| S1 | `bash tools/production_smoke.sh` | HTTP 200 / time / lang=ko / `[PASS] smoke green` / exit 0 |
| S2 | `bash tools/production_smoke.sh --snapshot before` | snapshot before.json 저장 + PASS |
| S3 | `bash tools/production_smoke.sh --snapshot after` | snapshot after.json + diff PASS (변경 없음 → no diff) |
| S4 | `bash tools/production_smoke.sh --paths "/ /login /api/health"` | 3 path 모두 probe |
| S5 | `bash tools/production_smoke.sh --domain https://invalid.example.com` | HTTP 000 → FAIL_HTTP / exit 1 |
| S6 | `bash -n tools/production_smoke.sh` | syntax OK |
| S7 | Sacred SHA + ko leaves | 변동 0 |

## 5. Commit

```
feat(tools): production_smoke.sh — standalone G7-smoke + snapshot diff (#28)

- ci_watch.sh embedded smoke 를 standalone 화
- before/after snapshot mode + JSON diff (HTTP/lang 회귀 검출)
- --paths multi-probe, --domain override
- exit codes 0/1/2/3/4 (PASS/HTTP-fail/lang-fail/diff-fail/usage)
- .gitignore: .smoke_snapshots/
- ci_watch.sh 본 patch 미터치 (회귀 위험 회피, 다음 세션 통합)

P4 dead-subtree 실 apply 진입 전 안전 강화
```

## 6. 종결 조건

- S1~S7 PASS
- 1 commit push
- production smoke PASS (자기검증)

---

**spec 종결.**
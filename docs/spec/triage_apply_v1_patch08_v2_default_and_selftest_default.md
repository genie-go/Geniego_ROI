# patch08 — manifest v2 default 승격 + self-test default-on

> **세션**: 160
> **트랙**: 159 잔여 영구화 1순위 묶음 (보강 메모 #24, #27)
> **외부 의존**: 0
> **i18n 데이터 변경**: 0 (도구 default 만 변경)
> **사전 상태**: HEAD `698440d`, ko.js 30,656 leaves, ja/zh sacred SHA 156 baseline 유지

---

## 1. 목적

1. **manifest v2 default 승격** — `triage_apply.mjs` 의 `--resolver-manifest` 미지정 시 conservative-skip 대신 `tools/resolver_consumer_manifest_v2.json` 자동 적용. 159차에서 v2 ⊊ v1, P4 outcome 동일 (시나리오 C) 검증 완료.
2. **self-test default-on** — 3개 self-test 셸 스크립트가 `triage_apply.mjs` 의 모든 mode 진입 전 자동 회귀 검증. CI / pre-commit hook 연동 없이도 로컬 sandbox 에서 PASS 보장.

## 2. 사전 조건 (CC 가 spec 진입 전 grep 으로 확인)

```bash
# 2.1 default-resolver 미지정 분기 위치 확인
grep -n "resolver_manifest\|resolverManifest\|conservative.*skip\|RESOLVER_MANIFEST_DEFAULT" tools/triage_apply.mjs

# 2.2 manifest 파일 존재 확인
ls -la tools/resolver_consumer_manifest_v2.json
test -s tools/resolver_consumer_manifest_v2.json && echo "OK: non-empty"

# 2.3 self-test 스크립트 3개 진입 인자 패턴 확인
head -30 tools/triage_apply_self_test.sh tools/triage_apply_wronglang_self_test.sh tools/triage_apply_dead_subtree_self_test.sh

# 2.4 현재 dead-subtree dry-run 가 v2 default 로 재실행 시 동일 결과 확인용 baseline
ls -la session159_dead_subtree_depth3_v2/SUMMARY.md
```

**기대 출력**:
- 2.1: `opts.resolver_manifest` 참조 위치 ≥3 (파싱 / dispatch / dead-subtree gate)
- 2.2: 파일 존재 + 157 KB (v2)
- 2.3: 셸 스크립트 모두 `node tools/triage_apply.mjs ...` 외부 invoke 패턴
- 2.4: v2 재실행 SUMMARY 존재 (depth=3 115 dead 동일)

## 3. 변경 사항

### 3.1 `tools/triage_apply.mjs` 수정

#### 3.1.1 default 상수 추가 (파일 상단 const 블록)

기존 dispatch / parsing 직전 위치에 다음 const 1줄 추가:

```javascript
const RESOLVER_MANIFEST_DEFAULT = "tools/resolver_consumer_manifest_v2.json";
```

#### 3.1.2 `--resolver-manifest` 미지정 분기 변경

`opts.resolver_manifest` 가 undefined / null / "" 인 경우 기존: conservative-skip mode.
변경 후: `RESOLVER_MANIFEST_DEFAULT` 자동 적용, 단 파일 부재 시 conservative-skip 폴백 + WARN 출력.

```javascript
// dead-subtree dispatch 직전 보강
if (!opts.resolver_manifest) {
  const defaultPath = RESOLVER_MANIFEST_DEFAULT;
  if (fs.existsSync(defaultPath)) {
    opts.resolver_manifest = defaultPath;
    console.log(`[INFO] --resolver-manifest 미지정. default v2 적용: ${defaultPath}`);
  } else {
    console.warn(`[WARN] default manifest 부재: ${defaultPath}. conservative-skip 진입.`);
  }
}
```

#### 3.1.3 usage 헤더 갱신 (line 70 근처)

```
--resolver-manifest <path>  i18n consumer manifest JSON. 미지정 시 자동: tools/resolver_consumer_manifest_v2.json (v2 AST default).
                            부재 시 conservative-skip (manifest absent mode).
```

### 3.2 self-test default-on (3 스크립트 통합)

#### 3.2.1 신규 wrapper 스크립트 `tools/triage_apply_self_test_all.sh`

3개 self-test 를 순서대로 invoke, 하나라도 FAIL 시 exit 1. CI / pre-commit hook 에서 단일 진입점.

```bash
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
  echo "─── ${name} ───"
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
echo "═══════════════════════════════════"
echo "self-test aggregate: ${PASS} PASS / ${FAIL} FAIL"
if (( FAIL > 0 )); then
  printf '  failed: %s\n' "${FAILED[@]}"
  exit 1
fi
exit 0
```

#### 3.2.2 pre-commit hook 진입점 추가 (선택, default-on 의미)

`.githooks/pre-commit` 에 다음 라인 추가 (locale 파일 staged 시점에만 invoke, 환경변수 bypass 지원):

```bash
# patch08: self-test default-on (locale 변경 시 강제)
if [ -z "${TRIAGE_SELFTEST_SKIP:-}" ]; then
  if git diff --cached --name-only | grep -qE '^src/locale/(ko|ja|zh)\.js$'; then
    echo "[pre-commit] locale staged → self-test all 자동 실행 (bypass: TRIAGE_SELFTEST_SKIP=1)"
    if ! bash tools/triage_apply_self_test_all.sh; then
      echo "[abort] self-test FAIL. commit 차단."
      exit 1
    fi
  fi
fi
```

**rationale**: 158/159 다회 PASS 안정성 입증. ko / ja / zh staged 시점에 자동 회귀 → drift 감지 즉시 차단. 비상 bypass 는 `TRIAGE_SELFTEST_SKIP=1`.

## 4. 회귀 검증

### 4.1 회귀 invariants

| # | 검증 | 기대 |
|---|---|---|
| R1 | `node tools/triage_apply.mjs --mode dead-subtree --dry-run --plan session159_dead_subtree_depth3/plan.json` (manifest 인자 없이) | `[INFO] --resolver-manifest 미지정. default v2 적용` 출력 + 결과: depth=3 115 dead candidates (v2 SUMMARY 와 정합) |
| R2 | `bash tools/triage_apply_self_test_all.sh` | `3 PASS / 0 FAIL`, exit 0 |
| R3 | `bash tools/triage_apply_self_test.sh` 단독 | 16 G-invariants PASS |
| R4 | `bash tools/triage_apply_wronglang_self_test.sh` 단독 | 8 W-invariants PASS |
| R5 | `bash tools/triage_apply_dead_subtree_self_test.sh` 단독 | dual-mode 16 D-checks PASS |
| R6 | Sacred SHA invariant | ja `67ca0865...` / zh `a4b72633...` 변동 0 |
| R7 | ko.js leaves | 30,656 (변동 0) |
| R8 | pre-commit hook 동작 검증: `echo "" >> src/locale/ko.js && git add src/locale/ko.js && git commit -m "test"` | self-test 자동 invoke 확인 후 즉시 `git reset HEAD~1 && git checkout src/locale/ko.js` 로 원복 |

### 4.2 회귀 명령 (CC 일괄)

```bash
t bash -c "cd /e/project/GeniegoROI && node tools/triage_apply.mjs --mode dead-subtree --dry-run --plan session159_dead_subtree_depth3/plan.json 2>&1 | tee /tmp/patch08_R1.log | tail -20"
t bash -c "cd /e/project/GeniegoROI && bash tools/triage_apply_self_test_all.sh 2>&1 | tail -10"
t bash -c "cd /e/project/GeniegoROI && sha256sum src/locale/ja.js src/locale/zh.js && node tools/leaf_count.mjs src/locale/ko.js"
```

## 5. Commit 분리

| commit | 내용 |
|---|---|
| 1 | `feat(triage_apply): manifest v2 default 자동 적용 (보강 메모 #27)` |
| 2 | `feat(tools): triage_apply_self_test_all.sh aggregate runner (보강 메모 #24)` |
| 3 | `feat(hooks): pre-commit self-test default-on (locale staged 시 자동 invoke, TRIAGE_SELFTEST_SKIP bypass)` |

각 commit 후 push, R1~R8 회귀 1회 일괄.

## 6. 롤백

- v2 default 회귀 발견 시: `--resolver-manifest tools/resolver_consumer_manifest.json` 명시로 v1 일시 복귀 가능 (코드 변경 불필요).
- self-test default-on 회귀 시: `TRIAGE_SELFTEST_SKIP=1 git commit ...` 비상 bypass.
- 영구 롤백: 3 commit revert (`git revert <sha1>..<sha3>`).

## 7. 종결 조건

- R1~R8 전부 PASS
- 3 commit push 완료
- production smoke HTTP 200 / lang="ko" 확인
- NEXT_SESSION 인계서 §4.1 도구 표에 `triage_apply_self_test_all.sh` 추가, §2.3 학습 항목에 v2 default 진입 명시

---

**spec 종결.**

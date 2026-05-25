# G8-manifest-clean pre-commit hook spec — Session 162

> **목적**: 161 manifest v2 정밀도 100% (parse_errors == 0) 영구화. ko.js 또는 manifest 빌더 변경 시 자동 검증.
> **트랙**: 162차 2순위 (U-161-E)
> **선결조건**: 161차 patch12 + TierPricingTab fix 종결 후 parse_errors == 0 baseline 확보됨
> **저장 경로**: `E:\project\GeniegoROI\docs\spec\g8_manifest_clean_hook.md`
> **저장 후 검증** (§7 #37 161 강화 적용):
> ```
> t bash -c "cd /e/project/GeniegoROI && find docs/spec -name 'g8_manifest_clean_hook.md' -type f"
> ```
> 단일 라인 출력 확인 의무. 중첩 시 STOP.

---

## §1. 배경

161차 트랙 #29 종결로 `tools/resolver_consumer_manifest_v2.json` 의 `parse_errors == 0` 달성. 그러나 영구화 메커니즘 부재 — 향후 ko.js 변경 또는 manifest 빌더 수정 시 회귀 가능.

**회귀 시나리오**:
- ko.js 신규 entry 추가 시 JS syntax 오류 누락 → parse_errors > 0 silent regression
- SKIP_DIRS 미동기 (신규 backup 디렉터리 추가) → parse_errors 폭증
- frontend/src 신규 syntax 오류 (TierPricingTab 류) → parse_errors > 0

**Mitigation**: pre-commit G8 gate 가 ko.js 또는 manifest 빌더 staged 시 자동으로 manifest 재빌드 + parse_errors == 0 검증.

---

## §2. Hook 동작 명세

### §2.1 Trigger 조건

다음 중 1건이라도 staged 시 G8 활성:
1. `frontend/src/i18n/locales/ko.js`
2. `tools/build_resolver_manifest_v2.mjs`

**Skip 조건**: 위 두 파일 모두 미staged → silent SKIP (echo 도 회피, hook 출력 최소화).

### §2.2 G8 활성 시 동작

1. `node tools/build_resolver_manifest_v2.mjs --emit-parse-errors --parse-errors-out /tmp/g8_parse_errors.json` 실행
2. `tools/resolver_consumer_manifest_v2.json` 의 `parse_errors` 길이 확인
3. `parse_errors == 0` → PASS
4. `parse_errors > 0` → FAIL, 상세 메시지 + parse_errors 목록 (최대 10건) 출력 + abort (exit 1)

### §2.3 출력 형식

PASS:
```
[G8] manifest-clean: parse_errors=0 ✓
```

FAIL:
```
[G8] manifest-clean: parse_errors=<N> ✗
[G8] FAIL — manifest v2 정밀도 회귀. 첫 10건:
  - <file>:<line> <message>
  ...
[G8] Mitigation:
  1. parse_errors 파일 syntax 수정 후 재staged
  2. 의도적 backup/legacy 디렉터리이면 SKIP_DIRS 동기 갱신
  3. 우회 필요 시 SKIP=g8 git commit ... (비권장)
```

### §2.4 우회 메커니즘

환경변수 `SKIP=g8` 시 G8 skip. 다른 G* gate 동일 패턴.

---

## §3. 구현 spec

### §3.1 .githooks/pre-commit 수정

**Anchor 확인 (CC 사전 명령)**:

```
t bash -c "cd /e/project/GeniegoROI && cat .githooks/pre-commit | head -80"
```

기존 G2~G7 gate 마지막 (또는 G6/G7 사이) 에 G8 block 삽입.

### §3.2 G8 block 본문 (bash, set -euo pipefail 환경)

```bash
# ─────────────────────────────────────────────────────────────
# G8-manifest-clean — Session 162
# ─────────────────────────────────────────────────────────────
# Trigger: ko.js or manifest builder staged
# Action: rebuild manifest v2 + verify parse_errors == 0
# Skip: SKIP=g8 (env), or neither trigger file staged
# ─────────────────────────────────────────────────────────────

if [[ "${SKIP:-}" == *"g8"* ]]; then
  echo "[G8] manifest-clean: SKIP (SKIP=g8)"
else
  G8_TRIGGER=""
  if git diff --cached --name-only | grep -qE '^(frontend/src/i18n/locales/ko\.js|tools/build_resolver_manifest_v2\.mjs)$'; then
    G8_TRIGGER="1"
  fi

  if [[ -n "$G8_TRIGGER" ]]; then
    # Rebuild manifest v2 (silent unless error)
    if ! node tools/build_resolver_manifest_v2.mjs --emit-parse-errors --parse-errors-out /tmp/g8_parse_errors.json >/dev/null 2>&1; then
      echo "[G8] manifest-clean: builder FAILED ✗"
      echo "[G8] 재현 명령: node tools/build_resolver_manifest_v2.mjs --emit-parse-errors --parse-errors-out /tmp/g8_parse_errors.json"
      exit 1
    fi

    # Verify parse_errors == 0 via node (jq 미설치 환경 대응 — §6 #38)
    G8_PE_COUNT=$(node -e "const m=require('./tools/resolver_consumer_manifest_v2.json'); console.log((m.parse_errors||[]).length);" 2>/dev/null || echo "-1")

    if [[ "$G8_PE_COUNT" == "0" ]]; then
      echo "[G8] manifest-clean: parse_errors=0 ✓"
    else
      echo "[G8] manifest-clean: parse_errors=${G8_PE_COUNT} ✗"
      echo "[G8] FAIL — manifest v2 정밀도 회귀. 첫 10건:"
      node -e "
        const m=require('./tools/resolver_consumer_manifest_v2.json');
        (m.parse_errors||[]).slice(0,10).forEach(e => {
          console.log('  - ' + (e.file||'?') + ':' + (e.line||'?') + ' ' + (e.message||e.error||''));
        });
      " 2>/dev/null || cat /tmp/g8_parse_errors.json 2>/dev/null | head -20
      echo "[G8] Mitigation:"
      echo "  1. parse_errors 파일 syntax 수정 후 재staged"
      echo "  2. 의도적 backup/legacy 디렉터리이면 SKIP_DIRS 동기 갱신"
      echo "  3. 우회 필요 시 SKIP=g8 git commit ... (비권장)"
      exit 1
    fi
  fi
fi
```

### §3.3 ko_leaf_count baseline 영구화 (옵션, 권장)

`.githooks/baseline.json` 의 `parse_errors_baseline: 0` 추가 — version bump 156→**157**. CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && cat .githooks/baseline.json"
```

baseline drift 추적 위해 권장. 미실시 시 hook 만 적용해도 무방.

---

## §4. Self-test 통합

`tools/session_init.sh --self-test` 13/13 invariants 에 G8 추가 → 14/14.

CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n 'invariant\\|13/13\\|self-test' tools/session_init.sh | head -20"
```

self-test 패턴에 G8 invariant 추가:

```bash
# G8 invariant: manifest v2 parse_errors == 0
G8_PE=$(node -e "const m=require('./tools/resolver_consumer_manifest_v2.json'); console.log((m.parse_errors||[]).length);" 2>/dev/null || echo "-1")
if [[ "$G8_PE" == "0" ]]; then
  echo "  ✓ G8 manifest-clean: parse_errors=0"
  ((PASS++))
else
  echo "  ✗ G8 manifest-clean: parse_errors=${G8_PE}"
  ((FAIL++))
fi
```

**Note**: self-test integration 은 분량 큼. 162차에서는 **hook 만** 우선 적용 + self-test 통합은 carry-over 후보로 SKIP 권장. 사용자 결정.

---

## §5. Dogfood 절차 (§6 #38 의무 — spec 검증식 dogfood)

### §5.1 검증식 사전 dogfood (검수자 spec 작성 단계)

**검증 1 — node -e parse_errors count**:
```
t bash -c "cd /e/project/GeniegoROI && node -e \"const m=require('./tools/resolver_consumer_manifest_v2.json'); console.log((m.parse_errors||[]).length);\""
```
**기대값**: `0` (161 baseline)

**검증 2 — git diff --cached pattern**:
```
t bash -c "cd /e/project/GeniegoROI && echo 'frontend/src/i18n/locales/ko.js' | grep -qE '^(frontend/src/i18n/locales/ko\.js|tools/build_resolver_manifest_v2\.mjs)$' && echo MATCH || echo NOMATCH"
```
**기대값**: `MATCH`

**검증 3 — manifest builder dogfood**:
```
t bash -c "cd /e/project/GeniegoROI && node tools/build_resolver_manifest_v2.mjs --emit-parse-errors --parse-errors-out /tmp/g8_test.json >/dev/null 2>&1 && echo PASS || echo FAIL"
```
**기대값**: `PASS`

**3건 모두 PASS 후 hook 적용 진행**. 1건이라도 FAIL 시 spec 수정.

### §5.2 Hook 적용 후 dogfood

1. **No-trigger case** (G8 SKIP 확인):
   ```
   t bash -c "cd /e/project/GeniegoROI && touch README.md && git add README.md && git commit -m 'test g8 skip' --dry-run 2>&1 | grep -E 'G8' || echo 'G8 silent SKIP OK'"
   ```
   기대: `G8 silent SKIP OK` (G8 출력 없어야 함). dry-run 후 `git restore --staged README.md && git restore README.md` 로 정리.

2. **Trigger case PASS** (ko.js 무의미 변경):
   ```
   t bash -c "cd /e/project/GeniegoROI && git diff frontend/src/i18n/locales/ko.js && cp frontend/src/i18n/locales/ko.js /tmp/ko.js.bak && echo '// G8 test' >> frontend/src/i18n/locales/ko.js && git add frontend/src/i18n/locales/ko.js && git commit -m 'g8 dogfood' --dry-run 2>&1 | grep G8"
   ```
   기대: `[G8] manifest-clean: parse_errors=0 ✓`. 후 `mv /tmp/ko.js.bak frontend/src/i18n/locales/ko.js && git restore --staged frontend/src/i18n/locales/ko.js` 로 정리.

3. **Trigger case FAIL** (intentional syntax error — abort 동작 확인):
   ```
   t bash -c "cd /e/project/GeniegoROI && cp frontend/src/i18n/locales/ko.js /tmp/ko.js.bak && echo 'INVALID_JS_SYNTAX(' >> frontend/src/i18n/locales/ko.js && git add frontend/src/i18n/locales/ko.js && git commit -m 'g8 fail test' 2>&1 | tail -20"
   ```
   기대: G8 FAIL 메시지 + exit 1. 후 `mv /tmp/ko.js.bak frontend/src/i18n/locales/ko.js && git restore --staged frontend/src/i18n/locales/ko.js` 로 정리.

**Abort 조건**: dogfood 1/2 FAIL 시 STOP. dogfood 3 PASS 못 하면 hook 효용 없음 — 재설계.

---

## §6. Commit 명령

dogfood 3건 전부 PASS 후:

```
t bash -c "cd /e/project/GeniegoROI && git status --short"
```

기대: `.githooks/pre-commit` modified 만 (baseline.json 옵션 적용 시 추가).

**Abort 조건**: 다른 파일 staged 또는 modified 출력 시 STOP, 원인 분석.

```
t bash -c "cd /e/project/GeniegoROI && git add .githooks/pre-commit && git diff --cached --stat"
```

diff stat 확인 후 사용자 승인:

```
t bash -c "cd /e/project/GeniegoROI && git commit -m 'feat(hooks): G8-manifest-clean pre-commit gate (parse_errors=0 회귀 방지)'"
```

**Abort 조건**: pre-commit gate 자체 FAIL 시 STOP (G8 가 자기 자신 검증 시 무한 회귀 가능성 — `.githooks/pre-commit` 은 trigger 파일 아님이므로 G8 silent SKIP 되어야 정상).

---

## §7. Push

```
t bash -c "cd /e/project/GeniegoROI && git log origin/master..HEAD --oneline"
```

162차 누적 commit 확인 (Patch suite `647db56` + G8 commit 2건 예상).

**Abort 조건**: 누적 commit 0건 시 STOP (이미 push 됨).

사용자 승인 후:

```
t bash -c "cd /e/project/GeniegoROI && git push origin master"
```

`.githooks/` 변경 — `paths-ignore` 적용. CI 트리거 안 됨 (158 인계서 paths-ignore 명세 참조).

---

## §8. Rollback

문제 발생 시:
```
t bash -c "cd /e/project/GeniegoROI && git revert <commit-sha> --no-edit"
```

또는 hook 만 임시 비활성:
```
t bash -c "cd /e/project/GeniegoROI && SKIP=g8 git commit ..."
```

---

## §9. 종결 조건

- [ ] G8 block `.githooks/pre-commit` 에 삽입
- [ ] Dogfood 3건 PASS (no-trigger SKIP / trigger PASS / trigger FAIL abort)
- [ ] Commit + push 완결
- [ ] 162차 인계서 (NEXT_SESSION.md) 에 G8 추가 반영

전 항목 완료 시 162차 1+2 순위 트랙 완전 종결.
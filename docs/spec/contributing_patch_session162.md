# CONTRIBUTING.md patch — Session 162

> **목적**: 161차 학습 6건 영구화 (§6 #38 신규, §7 #37 강화, §7 신규 trap 3건, §2 U-161-A~H 영구화)
> **적용 대상**: `CONTRIBUTING.md` (LF + UTF-8, 399 lines @ HEAD `f7d1d85`)
> **적용 방식**: CC `str_replace` (N-154-B). anchor byte-exact 매칭
> **검증**: 적용 후 `wc -l CONTRIBUTING.md` ≥ 430 (+30 lines 이상), `grep -c '^- \*\*#3[8-9]' CONTRIBUTING.md` ≥ 1, `grep -c 'U-161-' CONTRIBUTING.md` ≥ 8
> **rollback**: `git checkout HEAD -- CONTRIBUTING.md` (commit 전이면 즉시 복구)

---

## Patch 1 — §6 말미에 #38 신규 항목 추가

**Anchor (line 222 직전, §6 종결 `---` 직전 마지막 bullet 의 줄)**:

검수자가 CC에 지시:

```
str_replace 의 old_str / new_str 형식으로 아래 적용.
대상 파일: CONTRIBUTING.md
```

### old_str

```
- **Production domain sanity check** (160 patch08 학습 #35): before writing any URL into a spec or smoke command, reviewer confirms the production domain by `grep` of `.github/workflows/deploy.yml` or `CLAUDE.md`. Session 160 patch08 §smoke wrote `geniegoroi.app` but the canonical domain is `roi.genie-go.com` — CC caught it during execution.
```

### new_str

```
- **Production domain sanity check** (160 patch08 학습 #35): before writing any URL into a spec or smoke command, reviewer confirms the production domain by `grep` of `.github/workflows/deploy.yml` or `CLAUDE.md`. Session 160 patch08 §smoke wrote `geniegoroi.app` but the canonical domain is `roi.genie-go.com` — CC caught it during execution.
- **#38 Spec verification-snippet dogfood** (161 patch11 학습): every verification command embedded in a spec (`jq`, `sha256sum`, `node -e`, `grep`, `find`, etc.) must be executed once in the target environment before the spec is committed. 161 patch11 shipped four broken snippets — `jq` absent on the bash env (node -e needed), `sha256sum` of `tools/resolver_consumer_manifest_v2.json` always FAILs because `generated_at` re-stamps each build (content-SHA comparison needed), `node -e "require('/tmp/...')"` MSYS-translates argv but not JS-literal paths inside the script body, `grep parse-error` matches the "unknown flag" message and needs prefix-anchor (`grep -E '^parse-error'`). All four surfaced during CC dogfood after spec commit. Mitigation: reviewer runs every snippet locally (or instructs CC to dogfood) before the spec is saved.
- **#38 Tool CLI option spec** (161 production_smoke.sh 학습): before issuing any tool invocation, reviewer confirms the exact flag form by `tools/<tool>.sh --help` or `grep -E "while.*\-\-" tools/<tool>.sh`. 161차 검수자 guessed `--snapshot-before` and `--out`, both failed; correct form was `--snapshot before|after` (space-separated). Never construct flag names by analogy.
```

---

## Patch 2 — §7 #37 (IDE spec save-path nesting) 강화

**Anchor**: 현행 §7 #37 entry block. 161차 4회째 재발 — 절대경로 강제 + find 검증 자동 포함 + dropdown 주의 추가.

먼저 CC가 정확한 #37 block 추출:

```
t bash -c "cd /e/project/GeniegoROI && grep -n -A 20 'IDE spec save-path' CONTRIBUTING.md"
```

(검수자: 결과 받은 후 #37 block 의 old_str/new_str 확정. **이 patch 의 Patch 2 본문은 위 grep 결과 받은 후 162차 검수자가 CC 에 직접 명령으로 작성**. 사용자는 일단 Patch 1, 3, 4 만 저장하고 Patch 2 는 grep 결과 받은 후 추가 명령으로 진행.)

---

## Patch 3 — §7 말미에 신규 trap 3건 추가

**Anchor**: §7 종결 `---` (line 356 추정) 직전.

### old_str

```
**Recovery**: 즉시 정상 경로로 재저장 + 잘못 저장된 파일 삭제 + 사용자 측 IDE save-dialog default 경로 확인 권유.

---
```

### new_str

```
**Recovery**: 즉시 정상 경로로 재저장 + 잘못 저장된 파일 삭제 + 사용자 측 IDE save-dialog default 경로 확인 권유.

### 161 patch11/12 학습 (신규 trap 3건 영구화)

**Trap A — Spec verification snippet not dogfooded** (#38 영구화, 본문은 §6 #38 참조).

**Trap B — Tool CLI option guessed by analogy** (#38 확장 영구화, 본문은 §6 #38 두 번째 bullet 참조).

**Trap C — Manifest scanner false-positive on backup directories** (161 patch12 학습): `build_resolver_manifest_v2.mjs` 의 `SKIP_DIRS` 가 `node_modules`, `.git`, `dist`, `build` 만 포함하던 시점에 `pages_backup/` 42 files 가 parse_errors 로 집계됨. 신규 backup/legacy 디렉터리 도입 시 `SKIP_DIRS` 동기 갱신 의무. 일반화: 모든 scanner-style 도구는 SKIP_DIRS 변경 시 baseline 효과 (scan_files / parse_errors / consumer counts) 명시 측정 후 영구화.

**Trap D — Commit command lacking abort condition** (U-161-H 영구화): 다단계 명령 (e.g., `git add → diff → commit → push`) 에서 각 step abort 조건 미명시 시 사용자 미승인 commit 발생 위험. 161차 1회 발생 (`066bb80`). Mitigation: 검수자 다단계 명령 시 각 step 에 `if diff == 0 then STOP` / `if test FAIL then STOP` 등 abort 조건 명시.

---
```

---

## Patch 4 — §2 (Operating principles) 에 U-161-A~H 영구화

**Anchor**: §2 의 N-prefix 누적 표 또는 N-157-A 다음 line. CC 가 정확한 anchor 추출:

```
t bash -c "cd /e/project/GeniegoROI && grep -n 'N-157-A\\|N-156-A\\|## 2\\.' CONTRIBUTING.md"
```

(검수자: 결과 받은 후 U-161-A~H 8건 영구화 block 의 old_str/new_str 확정. Patch 2 와 동일하게 grep 결과 후 진행.)

**예상 본문 (참고)**:

```markdown
### U-161 시리즈 (사용자 명시 지시, 161차 도출, 162 영구화)

- **U-161-A**: 검수자 응답 핵심만 짧게. CC 가 답변할 시간을 보장 (중복 보고 회피).
- **U-161-B**: CC 직접 수정 우선. 사용자 직접 수정은 예외 (sacred 파일, 사양 저장 등).
- **U-161-C**: `t` prefix CC 명령 패턴 유지.
- **U-161-D**: 검수자 수정 문서 작성 → 사용자 저장 → 검수자가 CC 에 반영 명령 흐름.
- **U-161-E**: 작업 여력 잔존 시 추가 진행 (부분 종결 포함). 핵심 목표 달성 후 작업 여력 명시 확인 + 추가 트랙 후보 제시 의무.
- **U-161-F**: 초엔터프라이즈급 품질.
- **U-161-G**: 검수자 명령은 명시 명령 블록 형태. CC 가 받을 명령을 평문 설명 없이 정확한 도구 호출 형식으로 전달.
- **U-161-H**: 다단계 명령 시 각 step abort 조건 명시 (`diff 0 이면 STOP` 등).
```

---

## 적용 후 검증 (CC 자동 실행)

```
t bash -c "cd /e/project/GeniegoROI && wc -l CONTRIBUTING.md && grep -c '#38' CONTRIBUTING.md && grep -c 'U-161-' CONTRIBUTING.md && grep -c 'Trap C\\|Trap D' CONTRIBUTING.md"
```

**기대값**:
- `wc -l`: ≥ 430 (현행 399 + 30 이상)
- `grep -c '#38'`: ≥ 3 (§6 본문 2회 + §7 referrer 1회 이상)
- `grep -c 'U-161-'`: ≥ 8 (A~H 각 1회)
- `grep -c 'Trap C\|Trap D'`: ≥ 2

전 항목 PASS 시 commit 진행. FAIL 시 STOP, anchor 재확인.

---

## Commit 명령 (Patch 1~4 일괄 commit)

```
t bash -c "cd /e/project/GeniegoROI && git diff --stat CONTRIBUTING.md"
```

**Abort 조건** (U-161-H): diff stat 출력 없으면 STOP (patch 미적용 상태).

diff 확인 후 사용자 승인 받으면:

```
t bash -c "cd /e/project/GeniegoROI && git add CONTRIBUTING.md && git commit -m 'docs(contributing): patch §6 #38 + §7 trap C/D + §2 U-161 series (161 learning permanence)'"
```

**Abort 조건**: pre-commit hook FAIL 시 STOP, 원인 분석.

---

## 종결

본 patch 적용 완료 시 162차 1순위 트랙 종결. 작업 여력 잔존 시 (U-161-E) 2순위 G8 hook (parse_errors 회귀 방지) 진행.
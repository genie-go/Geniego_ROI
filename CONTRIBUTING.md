# CONTRIBUTING — GeniegoROI

> Permanent operating reference for the GeniegoROI repository.
> Authored Session 154 (2026-05-24) from 6 years / 154 sessions of accumulated practice.
> Companion documents: `NEXT_SESSION.md` (volatile per-session handover) and `N-152-A_BANK_GRADE_SECURITY.md` (security baseline).

---

## 1. Three-party collaboration model

This repository is maintained through a structured three-way workflow:

| Role | Capability | Channel |
|---|---|---|
| **CC** (Claude Code) | Executes commands, edits files, runs builds | Terminal in the operator's IDE |
| **Reviewer** (Claude chat) | Designs tools, drafts diagnostics, recommends decisions, performs security review | Chat (this file is one of its products) |
| **Operator** (user) | Cross-validates, saves files, gives explicit approval for commit/push, makes session-end decisions | Owns the working tree on disk |

**Cardinal rules:**

- The reviewer **never executes commands directly**. It prepares tools and CC instructions.
- CC **never decides to commit or push** without operator's explicit approval (see N-145-G).
- The operator **owns the decision boundary**: session start/end, sacred-file changes, tool selection.

---

## 2. Operating principles (N-numbered, cumulative)

These are referenced throughout the codebase and handover documents. They are immutable unless a future session explicitly supersedes them.

### Sacred and safety (Sessions 79, 145)

| ID | Principle |
|---|---|
| **N-79** | `ja.js` and `zh.js` are sacred. SHA-256 changes require explicit operator approval and baseline update. Session 154 Decision A added "code-unreachable orphan sub-trees may be removed even from sacred files; sacred-ness protects reachable translation quality, not unreachable bytes." |
| **N-145-B** | Seven safety gates apply to all bulk-data tools: G1 backup / G2 sacred SHA / G3 leaf-count delta / G4 leaf-shape integrity / G5 syntax verification / G6 auto-revert on G5 fail / G7 line-delta sanity (added Session 154 v2). |
| **N-145-G** | Commit and push require operator's explicit input. Never automatic, never inferred. `git commit --no-verify` likewise requires explicit per-instance approval. |
| **N-15** | PM-reported issues must be verified against raw data before action. PM documents drift; raw data is canonical. |

### Collaboration and operations (Session 150)

| ID | Principle |
|---|---|
| **N-150-A** | When CC stdout truncates or encoding corrupts, the reviewer provides an absolute path (e.g. `E:\project\GeniegoROI\<file>`); the operator opens the file directly and attaches it to chat. |

### Session 152

| ID | Principle |
|---|---|
| **N-152-A** | Bank-grade enterprise security baseline applies to all work. Details in `N-152-A_BANK_GRADE_SECURITY.md`. |
| **N-152-B** | When presenting choices, the reviewer must name one recommendation with rationale. No neutral menus. |
| **N-152-C** | New i18n labels added from Session 152 onward must include all 15 locales simultaneously, except for ko/en/ja-exclusive namespaces. |
| **N-152-D** | While capacity remains, continue. Push or partial completion is not a session-end signal. |
| **N-152-E** | The handover document is written only at the moment of session end. Never in advance. Single-file consolidated output. |
| **N-152-F** | One step at a time. Never queue the next CC command or next tool before CC's reply on the current one. When this conflicts with N-152-D, N-152-F wins. |
| **N-152-G** | Session end happens only on the operator's explicit decision. |
| **N-152-H** | "Do you have capacity?" means "proceed with the next item." It is not a handover signal. |

### Session 153

| ID | Principle |
|---|---|
| **N-153-A** | Prefix `cd /e/project/GeniegoROI &&` is required for every `t bash -c` command to avoid Bash-tool working-directory persistence. Absolute paths or variable-defined paths are preferred for chained commands. |
| **N-153-B** | Reviewer-authored tools default to dry-run + quarantine-only. Active-data mutation must be a separately-staged tool, never bundled with the first version. |
| **N-153-C** | Before cleanup, four usage patterns must be verified at zero references: (1) literal grep, (2) template t-backtick, (3) `useTranslation('namespace')` keyPrefix, (4) `withTranslation()` HOC. All four must be zero for safe removal. |
| **N-153-D** | Bulk data changes (1,000+ entries) must split into a verification commit and a cleanup commit. The operator approves patch size before each. |

### Session 154 (new)

| ID | Principle |
|---|---|
| **N-154-A** | AST stringification (e.g. `astring.generate`) re-serializes whitespace and quoting; the resulting diff is unreviewable. For surgical removals, use offset-based source slicing (`acorn` with `locations: true`, then string slice on byte offsets). Format preservation is a security property — reviewers must be able to confirm "only what was intended was removed." |
| **N-154-B** | Reviewer-authored tool patches use CC's Edit tool directly when feasible. The "operator saves file → CC re-reads" pattern adds risk (working-tree-vs-index drift, as seen in commit `da6b9b0`'s B4 self-recursion bug). Always `git add` after editing and before committing. |
| **N-154-C** | Tools (`.mjs`, `.sh`, `.py`) belong in `tools/`. Session-specific analysis artifacts (`session{NN}_*.mjs`, `*_scan.csv`, `*_summary.md`) belong at repo root and are added to `.gitignore` at session close. The pre-commit hook treats backup files (`*.bak*`) and `_quarantine/` paths as blockers. |
| **N-154-D** | Self-policing tools (security scanners, the pre-commit hook itself) must exclude their own source via pathspec (`':!.githooks/'`) — regex definitions self-match. Auditing the auditor requires this. |

### Session 155 (new)

| ID | Principle |
|---|---|
| **N-155-A** | Mojibake-aware locale edits MUST use line-number + regex value-substitution scripts, not the Edit tool's string-anchor matching. The Edit tool does NOT guarantee byte preservation of CJK Compatibility Ideographs (U+F900-U+FAFF) or C1 control characters (U+0080-U+009F). Its `\uXXXX` auto-swap covers single-codepoint variants only, not combined variant + invisible-char damage. Session 155 step 7 first attempt: 22 Edits → 15 failed due to compat CJK (紐 U+F9CF, 留 U+F9CD, 吏 U+F9DE) + hidden U+0080. Resolution: rollback (Option R) + `session{NN}_vi_mojibake_apply.mjs` script (commits f68117d, 9c18640). |

### Session 156 (new)

| ID | Principle |
|---|---|
| **N-156-A** | After completing the primary track of a session, if additional work capacity remains, proceed with as much additional work as possible — even at the cost of intermediate partial closures. When external dependency is zero AND the additional track is structurally cohesive, the reviewer recommends without waiting for user prompt; the user decides go/no-go and entry is immediate. Partial closure is NOT incomplete closure: each commit unit must guarantee cohesion, validation, and deploy completeness, but the count is unbounded. This principle is compatible with N-152-F (track separation): never bundle non-cohesive work, but always pursue cohesive additional tracks. **Session 156 demonstration**: primary track (18 dotted-keypath collisions) closed after 2 commits → discovered dash.operations dead subtree → entered 3 additional tracks (ko.js single-locale / 12 non-sacred locales / ja+zh sacred under N-79 addendum) → 5 commits total, -20,902 leaves removed across 15 locales, ~1.06 MB i18n reduction. |

- **N-157-A**: **세션 내 반복 검출/수정 패턴은 영구 도구화하고 hook gate 로 자동 차단한다**. 한 세션에서 동일 패턴의 ad-hoc detection script 가 2회 이상 작성되거나, 향후 4+ 세션 재사용이 예상되면 `tools/` 영구 자산으로 productionise. 자산화 시 다음 4-tier 구조 준수:
  1. **Detector** (`tools/<name>.mjs`): AST-based, read-only, mode 분기 (단일 도구 다중 모드 권장), CSV/JSON emitter, 외부 데이터는 JSON 으로 분리 (`tools/<map>.json`)
  2. **Regression validation**: detector 가 과거 commit history 와 invariant (e.g., `ed3c4a0~1` 시점 측정값 ⊇ commit 보고 수치). detector 가 strictly more conservative 임을 commit body 에 명시
  3. **Hook gate** (`.githooks/pre-commit` G<N>): detector exit code 를 gate 로 변환. trigger 는 staged file pattern 매치로 한정 (zero overhead). reproduction command 를 fail message 에 포함
  4. **Bypass env var** (`<TOOL>_SKIP=1`): G<N> 단독 bypass 제공. `--no-verify` 대비 G2 sacred / G5 leaf / B1-B4 보호 유지 (recon-only commit / detector 검증 단계용)
  
  **157차 실증**: triage.mjs (5 mode: collision/mojibake/wrong-language/dead-subtree/all) + mojibake_map.json + locale_script_profile.json + G6 hook gate + TRIAGE_SKIP bypass. 155+156 의 5 ad-hoc detection script (session155_*, session156_*) 가 1개 영구 도구로 통합. 8 commit, 모두 deploy 완결성 보장.
  
본 원칙은 N-156-A 와 양립: 응집 가능한 추가 트랙은 적극 진행하되, **detector pattern 이 반복되면 첫 발견 시 ad-hoc 후 두번째에서 즉시 productionise** (4+ 세션 재사용 예상 시).

### Session 161 (사용자 명시 지시 영구화)

161차 사용자 명시 지시 8건 — N-prefix 와 동급 운영 원칙으로 162 이후 모든 세션 계승.

- **U-161-A**: 검수자 응답 핵심만 짧게. CC 가 답변할 시간을 보장 (중복 보고 회피).
- **U-161-B**: CC 직접 수정 우선. 사용자 직접 수정은 예외 (sacred 파일, 사양 저장 등).
- **U-161-C**: `t` prefix CC 명령 패턴 유지.
- **U-161-D**: 검수자 수정 문서 작성 → 사용자 저장 → 검수자가 CC 에 반영 명령 흐름.
- **U-161-E**: 작업 여력 잔존 시 추가 진행 (부분 종결 포함). 핵심 목표 달성 후 작업 여력 명시 확인 + 추가 트랙 후보 제시 의무.
- **U-161-F**: 초엔터프라이즈급 품질 기준 유지.
- **U-161-G**: 검수자 명령은 명시 명령 블록 형태. CC 가 받을 명령을 평문 설명 없이 정확한 도구 호출 형식으로 전달.
- **U-161-H**: 다단계 명령 시 각 step abort 조건 명시 (`diff 0 이면 STOP`, `test FAIL 이면 STOP` 등).

---

## 3. Naming convention

### Files

| Pattern | Location | Purpose |
|---|---|---|
| `session{NN}_<topic>.mjs` | repo root | Session-specific analysis or migration script. Added to `.gitignore` at session close. |
| `session{NN}_<topic>.csv` | repo root | Session-specific data extract. Same gitignore policy. |
| `session{NN}_<topic>_v{N}.mjs` | repo root | Iterated versions. Keep `v1` even after `v2` ships, for audit trail. |
| `tools/<topic>.sh` | `tools/` | Reusable operator tool (CI watch, deploy verifiers, etc.). Tracked. |
| `tools/<topic>.mjs` | `tools/` | Reusable Node-based tool. Tracked. |
| `frontend/_quarantine/<topic>_s{NN}/` | gitignored | Backup or extracted-orphan storage. Never tracked. |
| `NEXT_SESSION.md` | repo root | Current handover. Single file. Replaced each session. |
| `NEXT_SESSION_ARCHIVE_<N>_<M>.md` | repo root | Multi-session rollup archives. Tracked. |

### Commit messages

```
<type>(<scope>): <one-line summary>

<paragraph 1: what and why>

<paragraph 2: technical detail — tool name, locales touched, diff size>

<paragraph 3: safety gates and verification — G1-G7, sacred SHA, build, smoke>

<paragraph 4: handover notes — what this enables for the next session>
```

`<type>` is one of: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.
`<scope>` examples: `i18n`, `hooks`, `tools`, `gitignore`, `audit`, `security`, `pm`.

### Branches

Master is the only long-lived branch. Feature work is committed directly to master after operator approval (single-operator repo, no PR flow).

---

## 4. Safety gates (active, Session 154 baseline)

The pre-commit hook (`.githooks/pre-commit`) enforces:

| Gate | Check |
|---|---|
| **G2** | `ja.js` and `zh.js` SHA-256 match `.githooks/baseline.json`. Drift requires either a baseline update or `--no-verify` per N-145-G. |
| **G5** | `ko.js` leaf count within `leaf_tolerance_pct` (currently 5%) of baseline. |
| **B1** | Any `*.bak*` file refused (Session 153 sacred-backup incident). |
| **B2** | Any `_quarantine/` path refused. |
| **B3** | `NEXT_SESSION.md` size 1 KB–500 KB sanity. |
| **B4** | Secret-shaped patterns in additions (`password=`, `api_key=`, private-key headers, certificates). Excludes `.githooks/` and lockfiles per N-154-D. |

**Activation**: `git config core.hooksPath .githooks` (one-time per clone).

**Bypass**: `git commit --no-verify` (N-145-G operator approval required).

**Baseline file**: `.githooks/baseline.json`. Update when sacred SHA or `ko.js` leaf count intentionally changes.

---

## 5. Tool catalog

### Repository observability

| Tool | Purpose |
|---|---|
| `tools/ci_watch.sh` | Polls GitHub Actions for the HEAD SHA's workflow run, reports status/conclusion, runs production smoke (HTTP 200 + i18n `lang="ko"`) on success. jq-free, gh-CLI-free. |
| `tools/session_init.sh` | Per-session boot-strapper. Idempotent `.gitignore` patch for `session{NN}_*.{mjs,csv,json,md,txt,sh}` per §3. Runs reconnaissance (HEAD, sacred SHA, ko.js leaf count, quarantine, untracked) with baseline drift warnings. Auto-infers session number from `NEXT_SESSION.md`. `--session NN` and `--dry-run` flags. |
| `.githooks/pre-commit` | Bank-grade pre-commit safety gate. See section 4. |

### Session 154 (analysis, gitignored at session close)

| Tool | Purpose |
|---|---|
| `session154_selfnest_cleanup.mjs` | v1 self-nest removal (AST+astring; reverted, kept for audit). |
| `session154_selfnest_cleanup_v2.mjs` | v2 surgical offset-based removal (applied). |
| `session154_placeholder_triage.mjs` | v1 placeholder scan. |
| `session154_placeholder_triage_v2.mjs` | v3 — expanded acronym whitelist (~130 entries: ACOS/TACOS/CDP/DMP/SKU/etc.) + 7-pattern auto-label (PAT_A guide-copy / PAT_B mechanical-translate / PAT_C ko-source-missing / PAT_D parity-drift / PAT_E ko-regression / PAT_F degenerate-keys / PAT_X residual). Commits: 6ee9c54 v2 → f841594 v3. |

### Session 154 (data artifacts, gitignored at session close)

| Artifact | Purpose |
|---|---|
| `session154_placeholder_scan.csv` | v1 placeholder scan (7,043 rows × 30+ cols). Superseded by v2. |
| `session154_placeholder_scan_v2.csv` | v3 scan with 7-pattern auto-labels. 155 phase input. |
| `session154_placeholder_summary.md` | Human-readable digest of action distribution + per-pattern × action breakdown + 7-phase next-session plan. |
| `session154_selfnest_cleanup_v2_report.csv` | Per-locale apply report for self-nest removal (19,599 entries, 15 locales, surgical excision). |

### Locale layout

| Path | Status |
|---|---|
| `frontend/src/i18n/locales/{15 locales}.js` | Active translation source. |
| `frontend/src/i18n/locales/ja.js`, `zh.js` | **Sacred** (N-79). |
| `frontend/_quarantine/*` | Backup/orphan storage. Gitignored. Local-only. |

---

## 6. Reviewer response patterns

- **Concise**: core only, no preambles, no recaps unless asked. The operator reads on mobile; verbosity is hostile.
- **One recommendation**: every multi-choice question names a recommended option with rationale (N-152-B).
- **One step at a time**: never queue the next command before CC's reply (N-152-F).
- **`t bash -c` prefix**: every command begins `cd /e/project/GeniegoROI &&` (N-153-A).
- **Self-criticism without self-abasement**: when the reviewer errs (e.g. the astring re-serialization or B4 self-recursion in Session 154), state the lesson as a new N-principle and move on. No protracted apology.
- **Tool-first, ask-second**: when CC can do the work (Edit, sed, direct file rewrite), prefer that path over asking the operator to save a file (N-154-B).

### Spec drafting standards (160 학습)

When the reviewer writes a spec (patch document, recovery plan, refactor proposal), the following pre-checks are mandatory before the spec is handed to the user for saving. These are not optional — every one was learned by direct cost in session 160.

- **Repo path canonical verification** (160 patch08 학습 #33): before writing any path string into a spec (`src/locale/...`, `frontend/src/...`, regex anchors), reviewer instructs CC to `grep` or `ls` the actual repo to confirm the canonical path. Session 160 patch08 §3.2.2 was written with `src/locale/ko.js` but the real path is `frontend/src/i18n/locales/ko.js` — CC caught it pre-apply, but the spec itself was wrong.
- **#33 v2 Codebase pattern mirror** (162 G8 spec 학습): new 도구의 regex/path/option 형식은 codebase 기존 패턴 검색 후 mirror 의무. 162 G8 spec 의 ko.js trigger regex 가 codebase 기존 패턴 (`.githooks/pre-commit:130`) 의 strict `\.` form 과 불일치 (`ko.js` loose) 했음 — CC dogfood 에서 발견. Mitigation: 신규 spec 작성 전 `grep -rn "<유사 pattern>" .githooks/ tools/` 로 기존 form 확인 의무. **analogy 작성 금지** (§6 #38 Tool CLI option spec 와 동일 원칙 확장).

- **Import pattern sanity check** (160 patch08 학습 #34): before writing any code example in a spec (function calls, library usage, module access), reviewer instructs CC to `grep -n "^import\|require"` the target file to confirm the actual import pattern. Session 160 patch08 wrote `fs.existsSync(...)` but the real file uses named import `existsSync` directly — CC caught it pre-apply.

- **Production domain sanity check** (160 patch08 학습 #35): before writing any URL into a spec or smoke command, reviewer confirms the production domain by `grep` of `.github/workflows/deploy.yml` or `CLAUDE.md`. Session 160 patch08 §smoke wrote `geniegoroi.app` but the canonical domain is `roi.genie-go.com` — CC caught it during execution.
- **#38 Spec verification-snippet dogfood** (161 patch11 학습): every verification command embedded in a spec (`jq`, `sha256sum`, `node -e`, `grep`, `find`, etc.) must be executed once in the target environment before the spec is committed. 161 patch11 shipped four broken snippets — `jq` absent on the bash env (node -e needed), `sha256sum` of `tools/resolver_consumer_manifest_v2.json` always FAILs because `generated_at` re-stamps each build (content-SHA comparison needed), `node -e "require('/tmp/...')"` MSYS-translates argv but not JS-literal paths inside the script body, `grep parse-error` matches the "unknown flag" message and needs prefix-anchor (`grep -E '^parse-error'`). All four surfaced during CC dogfood after spec commit. Mitigation: reviewer runs every snippet locally (or instructs CC to dogfood) before the spec is saved.
- **#38 Tool CLI option spec** (161 production_smoke.sh 학습): before issuing any tool invocation, reviewer confirms the exact flag form by `tools/<tool>.sh --help` or `grep -E "while.*\-\-" tools/<tool>.sh`. 161차 검수자 guessed `--snapshot-before` and `--out`, both failed; correct form was `--snapshot before|after` (space-separated). Never construct flag names by analogy.
- **#38 v2 Dogfood self-consistency trap** (162 G8 spec + G8 hook 학습): dogfood 의 test input 과 production source 가 **같은 검수자 가정**에서 도출되면 dogfood PASS 하지만 production broken-by-design. 162 G8 spec 의 dogfood echo `'frontend/src/locales/ko.js'` 와 production regex `^(frontend/src/locales/ko\.js|...)$` 모두 동일 wrong path. 162 G8 hook (commit `d2c4315`→`62621e8` fix) 의 count read `m.parse_errors` 와 dogfood `m.parse_errors` 모두 동일 wrong field (실은 `m.summary.parse_errors`). 양건 모두 dogfood self-consistent PASS, 실 codebase 적용 시 broken. Mitigation: (a) test input 은 **실 production source** (`git diff --cached --name-only` 실 출력 / `ls <dir>` 실 결과 / `grep -rn` 의 codebase 기존 패턴) 에서 도출, (b) **JSON schema verification**: `node -e "console.log(Object.keys(m));"` 으로 nested key 위치 확인 의무, (c) **dogfood 의 의도적 FAIL case 포함**: PASS-only dogfood 무효, FAIL case 로 abort 실증 의무. 검수자 가정으로 작성 금지.
- **#41 추론→실측 (163 #42 트랙 학습)**: scanner/manifest/hook 가설은 실측 명령 (Δ 측정) 없이 결론 금지. grep hit ≠ manifest scan hit. 가설 수립 시 부정 실측 명령 동시 작성. (반박 사례: `pages_backup` 의 `useT` 7 hits → consumer count inflated 가설 → `SKIP_PATH_SUBSTRINGS` patch Δ=0 으로 반박, 실 원인은 `tools/build_resolver_manifest_v2.mjs:56` 의 `SKIP_DIRS` 사전 prune.)
- **#41 v2 가설 brake 강화 (163 orphan 트랙 학습 — 1 세션 §6 #41 재발 3회)**: v1 의 "실측 명령 동시 작성" 만으로 검수자 추론 brake 부족 (실측 명령이 가설 방향에 편향). v2 mitigation: (a) 가설 수립 시 **null hypothesis 명시 의무** — "가설 X 이면 실측 Y, 가설 ¬X 이면 실측 Z" 양방향 검증, (b) 1 세션 내 §6 #41 재발 2회 이상 시 **자동 carry-over** (본 트랙 종결, 별도 세션 재진입), (c) CC 가 검수자 추론을 반박/정정 시 **§6 #41 카운트 명시** (자기-추적 강화). 163 재발 3건: (1) pages_backup useT inflated → SKIP_DIRS 사전 prune 으로 반박, (2) orphan prefix-covered = false alarm → prefix consumer 와 ko 존재 별개로 반박, (3) pnl↔performance rename 가설 → 247 중 3건 (1.2%) 매칭으로 반박.
- **#43 dead-key cleanup strict-pattern 의무 (163 #43 트랙 학습)**: P4 / 후속 dead-key cleanup spec 작성 시 단순 substring grep 금지 (segDesc 류 collision 18% FP 위험). 의무 pattern: `grep -rnE "t\(["']<key>["']\)" frontend/src/`. random sample N≥20 검증 + FP rate < 5% 확인 후 apply.

- **`set -e` / `pipefail` shell idiom audit** (160 patch09 학습): before specifying any shell script with `set -euo pipefail`, reviewer reviews each function for (a) last-statement `[[ ]] && X` patterns and (b) `$(cmd | pipe | ...)` command substitutions where any stage could legitimately fail. Add `return 0` or `|| echo ""` fallbacks proactively in the spec — see §7 traps.
- **#39 Reviewer pre-flight self-check** (162 §7 #37 6회 재발 학습): 검수자가 spec 저장 안내 명령 발송 **직전**, 본인 명령에 다음 3건 자체 포함 여부 확인 의무:
  1. 절대경로 (`E:\project\GeniegoROI\docs\spec\<filename>.md`) 명시
  2. IDE save dialog dropdown 주의 ("textbox 추가 입력 금지" + sticky nested path 회피)
  3. 저장 직후 find 검증 명령 동봉

3건 중 1건이라도 누락 시 메시지 발송 전 보강. 162차 1순위 patch (161 강화 영구화) 적용 **직후** 본인이 G8 spec + mini-patch spec 안내 시 양건 누락 → 6회 재발 발생. self-check 영구화 + IDE-side intervention (§7 #37 v3) 병행으로 차단.

- **#40 Hook fix real-commit dogfood** (162 G8 fix 학습): pre-commit hook (또는 다른 git hook) 변경 시 다음 3-stage dogfood 의무:
  1. **PASS dogfood**: 정상 입력으로 hook 실행 → 의도 통과 메시지 확인
  2. **FAIL dogfood**: intentional 결함 입력 (broken ko.js / broken external file 등) 으로 hook 실행 → FAIL 메시지 + details 출력 확인
  3. **Real-commit abort dogfood**: FAIL 입력을 actual staged 상태로 `git commit` 시도 → exit 1 + HEAD 미변경 확인 → reset/restore

  PASS-only dogfood 는 §6 #38 v2 trap 발생 위험. abort verification 까지 완료 후 commit. 162 G8 hook (commit `d2c4315`) 가 PASS dogfood 만으로 commit 된 결과 broken-by-design no-op gate 가 origin/master 에 4 commit 동안 live 상태였음.

- **#42 영구화 직후 재발 명시 재확인 (163 #42 트랙 학습)**: step 진입 시 직전 영구화 항목 명시 재확인. 영구화 commit 자체가 적용 보장 못함 — 162 §6 #38 v2 영구화 commit (`8965cdb`) 후 163 #42 트랙에서 검수자가 동일 패턴 재발 실증. 검수자 첫 응답의 운영 원칙 인지와 별개로, step 진입마다 관련 #-prefix/trap-letter 재인용 의무. §7 trap H 와 연계.

- **#46 trap L 근본 해소 + paths-ignore 확장 (164차)** — .gitignore 패턴은 file-end append 방식의 negation 무력화에 취약 (line 순서 race). 해소: 패턴 자체를 `/session{N}_*.{ext}` anchored 화하여 negation 의존 제거. 부가: housekeeping commit (.gitignore / tools/** / .githooks/**) 이 paths-ignore 미커버 시 production deploy 트리거 → 동일 패턴 영구 차단. 교훈: gitignore exception (negation) 보다 anchored 패턴이 견고; paths-ignore 는 build artifact 무관 경로 모두 명시 의무.

- **#47 frontend i18n 패턴 분기 정합 검증 (164차)** — frontend/src/pages 117 files 전수 조사 결과 i18n 통합 6 패턴 공존: (1) useT/context 표준 111건, (2) inline T 1건 (BudgetTracker, ko.js ns 미정의 → 전 키 영어 default 폴백 = 한국어 미번역), (3) sidecar 2건 (PriceOpt poI18n.js / ReturnsPortal rpI18n.js, 15 langs × 135 keys), (4) hybrid 1건 (SupplyChain scI18n + inline T, triple-source), (5) k_helper 1건 (CampaignManager `_k=k=>'campMgr.'+k`), (6) DICT_named 1건 (public/Landing). 인라인 `t(key, default)` callsite 705건 — 영어 default 폴백 의존 광범위. 발견: BudgetTracker 한국어 미번역 확정 / PriceOpt dual-source (ko.js priceOpt + sidecar 동시) 우선순위 미확인 / CampaignManager `_k` 정의 in-file vs 공유 미확인. 교훈: i18n 통합 검증은 (a) ns vs ko.js 정합 (b) sidecar dual-source 충돌 (c) helper 공유 정의 위치 — 3축 동시 측정 의무. 본 트랙은 P5 carry (BudgetTracker 수정 / PriceOpt 우선순위 / `_k` 정의 측정 / 705 default vs ko.js 정합률).

The pattern: every reviewer error in session 160 was avoidable by 1 CC grep before the spec was finalized. The cost of the missing grep was 1-2 round-trips and a transient regression. CC's grep is free; reviewer assumption is expensive.

---

## 7. Known technical traps (cumulative)

| Trap | Mitigation |
|---|---|
| **PowerShell mojibake** (148) | Force UTF-8 (`chcp 65001`), avoid PS pipes to Bash. |
| **PS→Bash pipe encoding** (149) | Use temp files, not pipes. |
| **PS-in-Bash escape collisions** (149) | Use temp `.mjs` files, not inline regex/JSON in commands. |
| **CRLF/LF** (152) | Reviewer outputs LF; CC's Edit tool preserves repo CRLF. Trust CC. |
| **execSync ENOBUFS** (149) | `maxBuffer: 16*1024*1024`. |
| **bash -c quoting collisions** (149) | Temp `.sh` files. |
| **Console output truncation** (150) | N-150-A absolute-path attach pattern. |
| **`cd` persistence in Bash tool** (153) | N-153-A `cd /e/project/GeniegoROI &&` prefix. |
| **Python stub on Windows** (153) | Use Node.js. Python is unreliable in this environment. |
| **`gh` CLI missing** (153) | Use `curl` + GitHub REST API (see `tools/ci_watch.sh`). |
| **PUA codepoint filenames** (153) | Node `fs.readdirSync` + substring filter, never shell glob. |
| **`awk` quoted-CSV** (153) | Use Node + quote-aware parser. |
| **AST stringify reformatting** (154) | N-154-A: offset-based source slicing for surgical changes. |
| **Working-tree-vs-index drift** (154) | N-154-B: `git add` after every edit, verify with `git diff --cached`. |
| **Self-policing regex matches itself** (154) | N-154-D: pathspec-exclude the policy file from its own scanner. |
| **Edit tool byte-anchor for compat CJK / C1** (155) | N-155-A: switch to line-number + regex value-substitution script. |
| **NFKC partial application** (155) | NFKC must apply to BOTH value AND map keys; one-side breaks longest-match substring lookup (session 155 detector bug #4). |
| **ripgrep blind-spot for compat CJK + C1** (155) | grep patterns using canonical CJK miss compatibility variants (U+F9xx). For residue verification, use AST + NFKC normalization (re-run scan), not grep. |

### MSYS path-translation 비대칭 (158차)

Git Bash / MSYS / Antigravity bash 환경에서 POSIX path 가 native 도구에
전달될 때 처리 방식이 인자 유형에 따라 다르다:
- **bare CLI args** (`cp /tmp/foo dest`): MSYS 가 자동 변환 (`C:/Users/.../Temp/foo`)
- **string literal inside `node -e`**: MSYS 변환 안 됨 → Node 가 drive-relative 로 해석 (`E:\tmp\foo`) → `ENOENT` 또는 `ERR_INVALID_FILE_URL_PATH`

**Mitigation**: `cygpath -m "$PATH" 2>/dev/null || echo "$PATH"` 로 사전 변환
후 string literal 사용. Linux/Mac 에선 cygpath 부재 → POSIX path 그대로 사용
(fallback). 158차 `triage_apply_self_test.sh` 의 `SANDBOX_WIN`/`CSV_WIN`/`PLAN_WIN` 패턴 참조.

### Node ESM dynamic-import 캐시 (158차)

`await import(url)` 은 URL 기준으로 module 을 캐시. 같은 파일을 write 후
재import 시 stale cache 반환 → leaf count 등 검증값이 pre-state 와 동일하게
나옴 (G3 strict false-negative).

**Mitigation**: URL 끝에 `?v=${Date.now()}` query 추가 → 매번 cache miss.
158차 `tools/triage_apply.mjs` 의 `countLeaves`, `tools/leaf_count.mjs` 패턴 참조.

### Heredoc backslash double-escape (158차)

`t bash -c "cat > file << 'EOF' ... EOF"` 패턴에서 single-quote heredoc
delimiter 사용해도 outer bash + Bash tool wrap 의 2-layer 처리로 backslash
가 한 번 더 collapse. `\\\\` (4개) 가 최종 `\` (1개) 로 도착 → regex 손상.

**Mitigation**: 다중 라인 파일 생성 시 heredoc 대신 **CC 의 Create file 또는
Write tool 사용**. tool 은 string content 를 그대로 disk 에 write 하므로
escape layer 없음. 158차 `/tmp/leaf_count.mjs` 작성 시 heredoc → tool 전환 사례.

### Detector CSV columns ≠ spec 추정 (159 patch06/07 학습)

**Symptom**: spec §3 "데이터 입력" 에 detector 의 CSV 컬럼 가정 (e.g. `ch_orig`, `ch_replace`, `resolver_refs`) 작성 후 실 detector 출력이 다른 컬럼 (`verdict`, `ref_count`, `from_locale_only`) 만 산출. apply 진입 시 컬럼 미스매치로 즉시 중단.

**Root cause**: detector 산출 schema 와 spec 작성자의 추측이 분기. 159 patch06 (wronglang) / patch07 (dead-subtree) 양쪽 동일 패턴 발생.

**Mitigation**:
- 모든 detector 트랙 spec 의 §3 (또는 등가 절) 에 다음 명시 의무: "CC 가 spec 진입 전 `head -5 <detector_output.csv>` 로 실제 columns 확인".
- 검수자는 spec draft 작성 후 사용자 저장 전 CC 에게 detector 출력 sample grep 1회 명령 발행.
- spec ↔ 출력 불일치 발견 시 즉시 spec 재설계, commit 전 사용자 재확인.

**Recovery**: 159 patch06 은 외부 매핑 JSON (`wrong_language_replacement_map.json`) 도입으로, patch07 은 7-col verdict + conservative skip 모드로 우회. spec 재설계 후 진입 즉시 PASS.

### paths-ignore 정상 동작 인지 (159 학습)

**Symptom**: docs/* + tools/* + *.md 만 변경된 commit push 후 GitHub Actions CI workflow 가 트리거되지 않음. 159 후반 다수 commit (manifest v2 spec / SUMMARY 등) 가 CI status 미노출.

**Root cause**: `.github/workflows/deploy.yml` 의 `paths-ignore` 가 `**.md`, `**.txt`, `docs/**`, `.claude/**` 매칭 → workflow 자체 skip. **production 영향 0** (정상 의도된 동작).

**Mitigation**:
- paths-ignore 매칭 commit 의 CI status check 은 최대 1회 curl. 미노출 시 즉시 정상 처리, 60s polling loop 금지.
- workflow 트리거 필요 시 (e.g. `src/**` 또는 `package.json` 변경 포함) 동일 commit 에 묶거나 별도 commit.

**Recovery**: 불필요. paths-ignore commit 은 의도된 CI skip. paranoia 금지.

### Default-resolution 도입 시 self-test 의미 침범 (160 patch08 학습)

**Symptom**: `--resolver-manifest` 미지정 시 v2 자동 fallback 도입 후, dead-subtree self-test Mode A ("manifest absent → conservative-skip") 가 default v2 를 강제 주입받아 6/16 D-check 실패. expected delete=0, got 1.

**Root cause**: production 편의 (default-on) 와 self-test 의미 (특정 absent 상태 재현) 가 동일 옵션 분기를 공유 → 한쪽 변경이 다른 쪽 의미를 침범.

**Mitigation**:
- default-resolution 기능 도입 시 self-test 측 의도된 absent / null / disable 시나리오 사전 식별 의무.
- env var escape hatch (e.g. `TRIAGE_NO_DEFAULT_MANIFEST=1`) 로 self-test 만 default 우회.
- 신규 default 분기 spec 에 §"Self-test impact" 절 추가 의무.

**Recovery**: env var escape hatch 1줄 (mjs) + self-test invocation 2건 prefix 추가. 즉시 3 PASS / 0 FAIL 복귀.

### bash `set -e` + 함수 마지막 `[[ ]] && X` 패턴 silent abort (160 patch09 학습)

**Symptom**: `set -euo pipefail` 환경의 셸 함수에서 마지막 명령이 `[[ condition ]] && counter+=1` 형태이고 condition 이 false 면, 함수 전체가 exit code 1 로 종료. 호출 측의 `for` 루프 / `||` 분기 없이 즉시 스크립트 abort. 160 patch09 S1~S5 에서 production smoke 가 정상 입력에도 silent exit 1 발생.

**Root cause**: `[[ ]] && X` 는 condition false 시 `false` 반환 (X 미실행). 셸 함수의 last command return 이 false 면 `set -e` 가 발동.

**Mitigation**:
- 셸 함수 마지막 statement 가 conditional 일 때 `return 0` 명시 의무.
- 또는 `[[ ]] && X` → `if [[ ]]; then X; fi` 패턴으로 교체.
- 또는 `[[ ]] && X || true` 명시적 ignore.

**Recovery**: 160 patch09 의 `probe_path` 함수 끝에 `return 0` 1줄 추가로 S1-S4 정상화. spec 작성 시 `set -e` 환경 함수의 last conditional 점검 의무.

### `pipefail` + `$(cmd | grep | ...)` silent abort (160 patch09 학습)

**Symptom**: `set -o pipefail` 환경에서 `lang=$(curl ... | grep -oE '...' | head -1)` 형태의 명령 substitution 이 curl 실패 (네트워크/도메인 오류) 또는 grep 미매치 시 파이프 전체 exit code 비0 → assignment 실패 → `set -e` 발동 → 함수 abort. probe 결과 출력 0건, silent exit 1. 160 patch09 S5 (invalid 도메인) 에서 발현.

**Root cause**: pipefail 은 파이프 중 하나라도 비0 종료 시 전체 비0. curl 실패 / grep 미매치는 정상 시나리오인데 assignment 단계에서 `set -e` 가 abort.

**Mitigation**:
- 명령 substitution 의 마지막에 `|| echo ""` 또는 `|| true` 폴백 의무.
- 또는 해당 함수만 `set +e` 임시 비활성화.
- 또는 의도된 실패 가능 명령은 `if cmd; then var=$(...); fi` 패턴으로 격리.

**Recovery**: 160 patch09 의 `lang=$(curl ... | sed 's/lang=//')` 라인 끝에 `|| echo ""` 1구문 추가로 S5 정상화. spec 작성 시 pipefail 환경 명령 substitution 의 실패 가능성 점검 의무.

### Spec 파일 저장 경로 중첩 재발 (160 patch08/09/10 학습)

**Symptom**: 사용자가 검수자 산출 spec 파일을 IDE save dialog 로 저장할 때 `docs/spec/docs/spec/<filename>.md` 형태의 중첩 경로가 생성됨. 160 세션에서 patch08 / patch09 / patch10 모두 동일 패턴 재발. CC 가 매번 cleanup (mv + rmdir) 으로 정상화하지만 spec drafting standards (§6) 의 콘텐츠 검증과 별개 카테고리 — IDE 동작 측 원인.

**Root cause**: VSCode (Antigravity / 유사 환경) 의 save dialog default 가 마지막 저장 디렉터리를 기억하면서, 사용자가 directory dropdown 의 `docs/spec/` 을 두 번 선택 (또는 textbox 에 추가) → 중첩 경로 생성. 검수자가 절대경로 안내해도 IDE 자체 default 가 우선.

**Mitigation**:
- 검수자가 spec 파일 안내 시 반드시 다음 3건 명시 의무:
  1. 절대경로: `E:\project\GeniegoROI\docs\spec\<filename>.md`
  2. dropdown 주의: "directory dropdown 에서 `docs/spec/` 한 번만 선택, textbox 에 추가 입력 금지"
  3. 저장 후 즉시 CC 가 `find . -maxdepth 5 -name '<filename>'` 으로 위치 검증
- 중첩 검출 시 CC 가 즉시 `mv` + `rmdir docs/spec/docs/spec docs/spec/docs` 정리.
- 본 회귀가 4회 이상 재발 시 IDE 측 설정 변경 또는 spec 저장 자동화 도구 검토.

**Recovery**: 160 patch08/09/10 모두 CC 자체 정리로 즉시 복구. 평균 1 round-trip cost. 사용자 incident 0건.

**161 강화** (161차 4회째 재발 후 mitigation 추가): 검수자가 사용자에게 spec 저장 안내 시 다음 3건 **묶음 의무**:
1. **절대경로 명시**: `E:\project\GeniegoROI\docs\spec\<filename>.md` 형태로 전체 경로 제시 (상대경로 금지).
2. **IDE save dialog 주의 문구**: "directory dropdown 에서 `docs/spec/` 한 번만 선택, textbox 에 추가 경로 입력 금지" 명시.
3. **저장 직후 find 검증 명령 자동 동봉**: `t bash -c "cd /e/project/GeniegoROI && find docs/spec -name '<filename>' -type f"` — 단일 라인 출력 확인 의무. 중첩 출력 시 STOP.

위 3건 중 1건이라도 누락 시 §7 #37 재발 위험. 162차 patch 적용 시점 누적 재발 **6회** (160 ×3 + 161 ×1 + **162 ×2 — G8 spec + mini-patch spec 양건 재발**). 검수자 영구화/self-check 의무로 차단 불가 확정 — **IDE 환경 자체 문제**. 162차 강화: §6 #39 (검수자 pre-flight self-check) 영구화 **+ IDE-side intervention 의무화** (사용자 save dialog 의 directory dropdown 의 sticky nested path 제거 + Recent locations 의 `docs/spec/docs/spec/` 항목 명시 제거 + manual directory clear 후 `docs/spec` 단일 입력). 추가 재발 시 IDE 설정 reset 또는 save dialog 우회 (CC 가 spec 파일 직접 생성) 검토.

### 161 patch11/12 학습 (신규 trap 3건 영구화)

**Trap A — Spec verification snippet not dogfooded**: §6 #38 첫 번째 bullet 참조 (본문 영구화).

**Trap B — Tool CLI option guessed by analogy**: §6 #38 두 번째 bullet 참조 (본문 영구화).

**Trap C — Manifest scanner false-positive on backup directories** (161 patch12 학습): `build_resolver_manifest_v2.mjs` 의 `SKIP_DIRS` 가 `node_modules`, `.git`, `dist`, `build` 만 포함하던 시점에 `pages_backup/` 42 files 가 parse_errors 로 집계됨. 신규 backup/legacy 디렉터리 도입 시 `SKIP_DIRS` 동기 갱신 의무. 일반화: 모든 scanner-style 도구는 SKIP_DIRS 변경 시 baseline 효과 (scan_files / parse_errors / consumer counts) 명시 측정 후 영구화.

**Trap D — Commit command lacking abort condition** (U-161-H 영구화 근거): 다단계 명령 (e.g., `git add → diff → commit → push`) 에서 각 step abort 조건 미명시 시 사용자 미승인 commit 발생 위험. 161차 1회 발생 (`066bb80`). Mitigation: 검수자 다단계 명령 시 각 step 에 `if diff == 0 then STOP` / `if test FAIL then STOP` 등 abort 조건 명시.

### 162 G8 hook 학습 (신규 trap 2건 영구화)

**Trap E — Hook field-name self-consistency** (162 commit `d2c4315` → `62621e8` fix): G8-manifest-clean hook 의 count read 가 `m.parse_errors` (top-level, schema 에 미존재) 를 읽어 항상 0 반환 → false-negative no-op gate. 실 schema 는 `m.summary.parse_errors` (nested). dogfood 도 같은 wrong field 사용 → self-consistent PASS. §6 #38 v2 (162 mini-patch 영구화) 의 구체 사례 — 영구화 commit (`8965cdb`) 직후 본인이 위반.

**Mitigation**:
1. spec 작성 시 `node -e "const m=require('./<manifest>'); console.log(Object.keys(m));"` 으로 실 schema 확인 의무
2. nested key 사용 시 `m.X && typeof m.X.Y === 'number') ? m.X.Y : -1` strict type guard 패턴 적용
3. dogfood 의 test input source 와 production check source 가 **다른 layer** 에서 도출 (test input 은 `git diff --cached`, check 는 manifest schema)
4. **수치 검증**: dogfood 시 의도적 parse_errors > 0 케이스 (`/tmp/g8_parse_errors.json` 존재 확인) → real commit 시도 → abort 검증. PASS-only dogfood 무효

**Trap F — Hook self-modification blind** (162 commit `62621e8` 적용 시점 발견): hook 이 자기 자신 (`.githooks/pre-commit`) 만 staged 상태에서 commit 시도 시, hook 의 trigger 패턴이 자기 자신 file path 포함 안 함 → self-trigger 안 됨 → hook 결함 commit 차단 불가. defense-in-depth 의 본질적 한계.

**Mitigation**:
1. hook 변경 시 **별도 real-commit dogfood 의무**: intentional 결함 ko.js + broken external file → real `git commit` 시도 → exit 1 + HEAD 미변경 확인 → reset/restore (§6 #40 영구화)
2. hook spec 의 dogfood 절차에 "real commit 시도" 단계 명시 의무 (PASS path + FAIL path + abort verification 3건)
3. hook commit message 에 dogfood 결과 SHA 포함 권장 (`refs: <fix-commit-sha>` 식)

**§7 #37 v4 영구화** (162 7회 재발 학습): IDE save dialog 의 nested path stickiness 가 검수자/사용자 의지로 차단 불가 확정 (162차 단독 3회 재발). **워크플로 변경 의무** — 검수자 outputs/ 산출물을 사용자가 저장하는 대신 **CC 가 spec 본문 inline 받아 직접 `cat > docs/spec/<name>.md << 'EOF' ... EOF` 로 생성** (save dialog 우회). spec 본문 크기 < 200 line 시 적용 가능. 200 line 초과 시 multi-heredoc 또는 사용자 저장 + 즉시 find 검증 + nested 발견 시 CC 자체 cleanup.

### 163 #42 트랙 학습 (신규 trap 3건 영구화)

**Trap G — Scanner 변경 전 전수 읽기 의무** (163 #42 B1/F1 학습): `tools/build_resolver_manifest_v2.mjs` 의 `SKIP_PATH_SUBSTRINGS` (line 58) 만 grep → `SKIP_DIRS` (line 56) 놓침. 단발 grep 으로 scanner 동작 변경 안전성 결론 금지. Mitigation: scanner/walker/manifest builder 변경 전 **전체 파일 view** 또는 통합 패턴 다중 grep (`grep -nE 'SKIP|walk|filter|readdir|EXTS'`) 의무. F1 의 4-step 분할 grep 도 부족 — 단일 grep 으로 SKIP 계열 키워드 일괄 수집.

**Trap H — 영구화 직후 재발 trap** (163 #42 학습): 162 §6 #38 v2 영구화 commit (`8965cdb`) 후 163 #42 트랙에서 검수자가 동일 dogfood self-consistency 위반 (pages_backup inflated 가설을 실측 없이 결론). 기존 §7 #37 v4 (162 trap41) 는 spec save dialog 우회 만 다룸 — 추론 trap 미커버. Mitigation: §6 #42 (영구화 직후 재확인) 와 연계, step 진입 시 직전 영구화 항목 명시 재인용 의무. 영구화 항목 누적이 영구화 효력 보장 못함 인지.

**Trap I — Baseline commit 누락** (163 #42 B6 학습): HEAD `881ea06` 의 `tools/resolver_consumer_manifest_v2.json` 은 247/43 (낡음), working-tree 는 205/0 (161 baseline regen 결과). 161 baseline regen 산출이 stage 됐다가 commit 안 됨 — 162 인계서 §1.1 baseline 진술 ("scan_files 205 / parse_errors 0") 은 HEAD 가 아닌 working-tree 기준. Mitigation: (a) baseline 변경 commit 시 `git show HEAD --stat` 으로 변경 파일 포함 검증, (b) 인계서 baseline 진술은 HEAD 기준 (`git show HEAD:<file>`) 명시, (c) baseline 변경 commit 위생 자동화는 §6 후속 G9 hook 후보.

### 163 #43 트랙 학습 (신규 trap 3건 영구화)

**Trap J — Node-on-Windows `/tmp/` drive-root resolution** (163 #43 학습): Node 가 Windows 에서 leading `/` 를 drive root 로 해석 → `/tmp/foo` = `E:\tmp\foo` (Git Bash MSYS `/tmp` 와 별개). 163 #43 트랙 2회 재발 (P5 manifest baseline diff, J2-3 leaf dump). 158 MSYS path-translation trap 의 Node 측 변종. Mitigation: Node 가 쓰는 파일은 `os.tmpdir()` (Windows `C:\Users\<u>\AppData\Local\Temp\` 자동 해석), bash 가 쓰는 파일은 `/tmp/` 가능 (MSYS 정상). 둘 사이 데이터 전달 시 path 변환 명시.

**Trap K — leaf-count counting semantics 불일치** (163 #43 학습): `tools/leaf_count.mjs` (30,656) vs J2-2 inline walk (30,692), Δ +36 = ko.js array literal 내부 string 의 초과분. `leaf_count.mjs` 는 array 를 terminal unit 으로 처리 (1 leaf each), inline walk 는 array 에 recurse + 각 string 별개 leaf. canonical = 30,656 (`leaf_count.mjs` 권위 since 158 commit `0d1b0f6`, consumer JSX 가 `t("nav.items")` 형태로 array 전체 참조 → 1-leaf semantic 정합). Mitigation: leaf count 진술 시 counting method 명시 의무 (인계서 §1.1, 후속 분석 spec 모두), 별도 walk 사용 시 `leaf_count.mjs` 와의 Δ 명시.

**Trap L — .gitignore unanchored basename pattern** (163 #43 Commit C 학습): `tools/session_init.sh` 가 `.gitignore` 에 추가하는 `session<N>_*.{md,mjs,csv,json}` 패턴은 unanchored basename glob — 디렉터리 무관 매칭. 의도는 top-level ephemeral 산출물 (`session<N>_audit.csv` 등) 이지만 실제는 `docs/spec/` 등 영구 파일도 ignore 처리. 163 Commit C 진행 시 `docs/spec/session163_dead_key_quantification.md` 가 ignore → `git add` 실패, `contributing_patch_session163_dead_key.md` 로 rename 우회. Mitigation: (a) spec/문서 파일명 leading `session<N>_` 회피, 권장 prefix `contributing_patch_session<N>_<topic>.md` 또는 `<topic>_<N>.md`, (b) #46 영구화 완료 (164차 `c1d5bd4` anchored 전환 + `6d19387` paths-ignore 확장): `.gitignore` `session1[5-9][0-9]_*.{md,mjs,csv,json,txt,sh}` 60 라인 + `tools/session_init.sh` PATTERN_BLOCK 6 확장자 모두 `/` prefix; `deploy.yml` paths-ignore 에 `.gitignore`/`tools/**`/`.githooks/**` 추가. negation race 회피.

**Trap M — i18n inline default 폴백의 한국어 미번역 hidden 위험** (164 #47 학습): `t(key, default)` 형태의 inline default 패턴은 ko.js 키 누락 시 default(영어) 반환 → 빌드 success / runtime warning 없이 한국어 사용자에게 영어 표시. missingKey warning 은 console only (production silent). 164 전수 조사: 705 callsites / BudgetTracker 98 keys 전수 미번역 확정. Mitigation: (a) inline default 사용 시 ko.js 신규 ns 추가 동시 의무 (검토 PR 체크리스트), (b) i18n 패턴 분기 시 manifest scanner 가 ns_defined_in_ko 컬럼 추가 (#48 후보), (c) 신규 페이지 i18n 통합 PR template 에 "ko.js ns 정합 확인" 체크박스. §6 #43 dead-key 와 대척점 — dead-key 는 over-translation, trap M 은 under-translation.

---

## 8. Session lifecycle

1. **Open**: operator attaches `NEXT_SESSION.md`. Reviewer runs the reconnaissance command from §1.3 of the handover (status + HEAD + sacred SHA + locale sizes + quarantine).
2. **Plan**: reviewer recommends one track with rationale. Operator approves or selects an alternative.
3. **Execute**: per-step CC commands. Reviewer drafts, operator approves, CC runs. Repeat until track completion.
4. **Commit**: operator's explicit approval (N-145-G). Reviewer drafts multi-paragraph message per §3.
5. **Verify**: `tools/ci_watch.sh` for any push that touches production paths.
6. **Continue**: per N-152-D, continue with the next track while capacity remains.
7. **Close**: operator explicitly signals session end (N-152-G). Reviewer writes a new `NEXT_SESSION.md` from scratch (N-152-E). Operator saves it, attaches to next session.

---

## 9. Anti-patterns (do not repeat)

| # | Anti-pattern | First seen | Lesson |
|---|---|---|---|
| 1 | Writing handover early "to save the operator time" | 152 | N-152-E |
| 2 | Queueing the next command before CC's reply | 152 | N-152-F |
| 3 | Reviewer ending the session unilaterally | 152 | N-152-G |
| 4 | Reading "capacity?" as "end the session?" | 152 | N-152-H |
| 5 | Tool's first version mutates active data | 153 | N-153-B |
| 6 | Cleanup without 4-pattern usage check | 153 | N-153-C |
| 7 | Handover delivered as a code block (copy-paste breaks nesting) | 153 | Use `create_file` |
| 8 | AST stringify with `astring` for surgical changes (379k-line diff) | 154 | N-154-A |
| 9 | Edit-after-stage without re-staging (committed pre-edit version) | 154 | N-154-B |
| 10 | Security regex matches its own definition | 154 | N-154-D |
| 11 | Asking the operator to save when CC can edit directly | 154 | N-154-B |
| 12 | Detector iteration without unit-tests (5 bugs surfaced via real-data iteration) | 155 | N-155-A precondition: detector must self-test for compat CJK + C1 + NFKC interaction before catalog-driven workflow |
| 13 | Assuming Edit tool string anchors preserve all Unicode variants | 155 | N-155-A |

---

## 10. Companion documents

- `NEXT_SESSION.md` — current per-session handover (volatile).
- `N-152-A_BANK_GRADE_SECURITY.md` — bank-grade security baseline detail.
- `.githooks/baseline.json` — sacred SHA + leaf count baseline.
- `NEXT_SESSION_ARCHIVE_*.md` — historical rollups.

---

*This file is the immutable reference. When operating principles change, add a new N-principle here; never delete one. The principles are the institutional memory.*

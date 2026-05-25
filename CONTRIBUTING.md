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

- **Import pattern sanity check** (160 patch08 학습 #34): before writing any code example in a spec (function calls, library usage, module access), reviewer instructs CC to `grep -n "^import\|require"` the target file to confirm the actual import pattern. Session 160 patch08 wrote `fs.existsSync(...)` but the real file uses named import `existsSync` directly — CC caught it pre-apply.

- **Production domain sanity check** (160 patch08 학습 #35): before writing any URL into a spec or smoke command, reviewer confirms the production domain by `grep` of `.github/workflows/deploy.yml` or `CLAUDE.md`. Session 160 patch08 §smoke wrote `geniegoroi.app` but the canonical domain is `roi.genie-go.com` — CC caught it during execution.

- **`set -e` / `pipefail` shell idiom audit** (160 patch09 학습): before specifying any shell script with `set -euo pipefail`, reviewer reviews each function for (a) last-statement `[[ ]] && X` patterns and (b) `$(cmd | pipe | ...)` command substitutions where any stage could legitimately fail. Add `return 0` or `|| echo ""` fallbacks proactively in the spec — see §7 traps.

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

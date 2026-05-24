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

---

## 10. Companion documents

- `NEXT_SESSION.md` — current per-session handover (volatile).
- `N-152-A_BANK_GRADE_SECURITY.md` — bank-grade security baseline detail.
- `.githooks/baseline.json` — sacred SHA + leaf count baseline.
- `NEXT_SESSION_ARCHIVE_*.md` — historical rollups.

---

*This file is the immutable reference. When operating principles change, add a new N-principle here; never delete one. The principles are the institutional memory.*

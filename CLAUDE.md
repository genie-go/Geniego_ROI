# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **최상위 개발 헌법**: [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) — 사명·Golden Rule(Replace가 아니라 Extend)·절대금지·완료의 정의. 실행 게이트/레지스트리 정본은 그 문서 §11에서 [`docs/CHANGE_GATE.md`](docs/CHANGE_GATE.md)·[`docs/registry/`](docs/registry/README.md)로 연결된다.
>
> **최상위 데이터 헌법**: [`docs/DATA_INTELLIGENCE_CONSTITUTION.md`](docs/DATA_INTELLIGENCE_CONSTITUTION.md) — 모든 데이터 수집·검증·통합·분석·AI 추천·마케팅 자동화의 최상위 원칙. **핵심: 데이터는 '많이'가 아니라 '정확·신뢰·최신·가치·활용가능'하게. 수집≠사용(Trust First — 신뢰도 미달은 자동화/AI에서 제외). 목/더미/샘플/미검증 데이터는 운영 분석 배제. 모든 데이터는 출처(Source/Credential/Sync/Quality/Trust) 기록. 테넌트 격리 절대. 채널 나열 금지 — 표준모델 정규화·통합(Unified Intelligence). 중복 인텔리전스 금지.** 데이터 영역 변경 시 본 헌법 우선. 구현 정본=[`docs/data/DATA_ARCHITECTURE.md`](docs/data/DATA_ARCHITECTURE.md).
> — **Volume 2**: [`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md`](docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md) — 데이터소스 12분류(Commerce/Advertising/Analytics/CRM/Marketing/Social/Creator/Payment/Logistics/ERP/Search·Market Intelligence)·커넥터 표준(인증/증분수집/정규화/Quality Gate/Trust Score)·Unified Data Model. **신규 커넥터/소스 추가 시 Connector Registry 등록·Quality Gate·Trust Score·회귀테스트까지 완료해야 완료(§14). 동일 Connector/API/Object/Schema 중복 구현 금지 — 기존 확장.**
> — **Volume 3**: [`docs/DATA_TRUST_QUALITY_CONSTITUTION.md`](docs/DATA_TRUST_QUALITY_CONSTITUTION.md) — ★핵심경쟁력=Data Trust Intelligence Engine. **수집≠사용: Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 통과 + Quality/Trust/Confidence Score 후에만 분석·AI·자동화 사용. Cross Validation(단일채널 불신·다소스 교차) 필수. Intelligence Readiness=READY/WARNING/BLOCKED. 품질 낮으면 AI 추천 금지·자동화 안전장치(ROAS실패→광고중지금지 등). 기존 DataPlatform/AnomalyDetection/ModelMonitor 확장(엔진 난립 금지). 부록=Compliance/XAI/Lineage/ModelMonitoring.**
> — **Volume 4**: [`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`](docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md) — AI Marketing Intelligence OS. **채널이 아니라 비즈니스 엔티티 중심 이해(Unified Entity Model·Customer360). Product/Channel/Campaign/Creator/Content/Attribution Intelligence + AI Insight/Recommendation/Decision Engine. AI는 V3 신뢰검증(READY) 통과 데이터만 사용·모든 추천에 근거/신뢰도 표시(Explainable AI)·근거없는 결론 금지. Decision 자동집행은 사용자 승인정책 존중. Intelligence Layer는 하나(중복엔진 금지)·무후퇴 필수. 기존 AttributionEngine/CRM/CustomerAI/Decisioning/Insights/Mmm/AutoCampaign/ClaudeAI 확장.**
> — **Volume 5**: [`docs/MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`](docs/MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md) — Enterprise AI Marketing OS. **목표(Business Goal)중심 추천 우선순위 · 채널/캠페인 추천 · 예산최적화(Mmm frontier) · Audience/Creative Intelligence · 안전한 자동화(검증데이터+승인정책+로그+롤백, 외부채널 변경은 명시적 권한내에서만) · Safety Rule(신뢰도/권한/동기화/통계신뢰 부족 시 자동집행 금지→경고) · Health Score · Opportunity Detection · 무후퇴·단일엔진. 기존 AutoCampaign/AutoRecommend/Decisioning/Mmm/CRM/CreativeStudio/Alerting/AdAdapters 확장.** (Volume 1~5 적용; Volume 6 — AI Decision & Predictive 예정.)

## Project overview

GeniegoROI is a multi-tenant ROI analytics dashboard (CRM, KPI, Operations, P&L domains) deployed to https://www.genieroi.com. The repo is a **monorepo** with two independently-built apps that share a directory tree:

- `frontend/` — React 18 + Vite 7 SPA, ~116 lazy-loaded pages, 15-language i18n
- `backend/` — PHP 8.1+ / Slim 4 REST API, PSR-4 namespace `Genie\`, MySQL primary + SQLite fallback

`clean_src/` is a **read-only historical mirror** — do not edit anything inside it (it is in `.clineignore`).

## Common commands

All commands assume the working directory is the repo root.

| Task | Command |
|------|---------|
| Frontend build (production) | `npm install` (root) → `npm run build` |
| Frontend dev server | `cd frontend && npx vite` (port 5173, proxies `/api`, `/auth`, `/v3`–`/v419` → `localhost:8080`) |
| Backend install | `cd backend && composer install` |
| Backend dev server | `cd backend && php -S 0.0.0.0:8000 -t public` (vite.config proxies expect 8080 — adjust port to match your local Apache/XAMPP setup) |
| Build for deploy (Windows) | `.\deploy.ps1` (runs `gen_chatbot_knowledge.mjs` → `i18n_autofill.mjs` ×4 modes → `vite build`). **Build only — does not upload.** |
| Manual deploy (Linux/Mac) | `./deploy.sh` (rsync `frontend/dist/` → `root@1.201.177.46:/home/wwwroot/roi.geniego.com/frontend/dist`) |

**Actual deploys are manual `pscp`/`plink` file copies** (dist tarball → docroot, `chown www:www`, `php-fpm reload`) against production `roi.geniego.com` and demo `roidemo.geniego.com`. `deploy.ps1` stops after the build; there is no working Windows upload script.

DB migrations (`php backend/bin/migrate.php [both|production|demo|current]`) must be run **on the remote server**. `Db.php:120` defaults `GENIE_DB_HOST` to `127.0.0.1`, so running the migrator locally targets your local dev DB, not production. `backend/migrations/` stops at session 172; every schema change since is applied by per-handler self-healing `ensureTables`.

There are **no configured lint or test scripts** in this repo (no `npm test`, no PHPUnit suite). Verification is manual / by deploying.

The root `package.json` only declares `build`. Vite's `root` is set to `frontend/` in `vite.config.js`, so running `vite build` from the repo root is correct — do **not** add a `cd frontend` to the root build script.

## CI/CD

`.github/workflows/deploy.yml` deploys on push to **`master`** (not `main`). Pipeline phases:

1. EN locale syntax guard (`node -e require('fs').readFileSync(...)`)
2. `cd frontend && npm install && npm run build`
3. SCP `frontend/dist/*` → remote `/home/wwwroot/roi.geniego.com/frontend`
4. SSH chown + `nginx -s reload`
5. Login API smoke test against `https://www.genieroi.com/api/auth/login`

All SSH/test/Slack steps are **gated on secrets being present** (`HAS_SSH_SECRETS`, `HAS_TEST_SECRETS`, `HAS_SLACK_WEBHOOK`) — the workflow runs in any fork without failing on missing secrets.

**Branch quirk**: `master` and `origin/main` have **no common ancestor** in this repo's git history (verified during the 12th–13th session). `master` is the deploy/dev branch; `main` exists separately. Default to `master` unless explicitly told otherwise.

## Backend architecture

- Entry: `backend/public/index.php` — bootstraps Slim, applies CORS + API-key middleware, then loads `backend/src/routes.php` (1636 lines).
- Routes are **heavily versioned** (`/v377` … `/v424+`). New endpoints generally go under the latest version prefix; old versions remain stubbed for backwards compatibility.
- Two URL shapes coexist: `/v{NNN}/...` (versioned API) and `/api/...` (CRM, email, etc.). When deployed behind Apache with an `Alias /api`, `index.php` auto-detects the prefix and calls `$app->setBasePath('/api')`.
- Handlers live in `backend/src/Handlers/` (~41 classes). Routes file maps `'METHOD /path' => 'Genie\Handlers\Class::method'` strings; not all handlers are autodiscovered — adding a new handler requires registering it in `routes.php`.
- DB: `backend/src/Db.php` is a PDO singleton. It parses `backend/.env` directly (does not rely on PHP-FPM env vars), connects to MySQL (`geniego_roi` by default), and **transparently falls back to SQLite** at `data/genie.sqlite` or `/tmp/genie_roi.sqlite` if MySQL is unreachable. Both backends share schema via the migration logic in `Db.php`.

### API authentication (v421)

Inlined directly into `index.php` middleware (not a separate file):

- Public paths bypass auth: `/`, `/health[z]`, `/auth/*`, `/v423/rollup/*`, `/v420/price/*`, `/v420/channel-mix/*`, `/v422/ai/*`, `/v423/creds`, `/v423/popups/*`, all `/v423/paddle/{webhook,plans,config,migrate}`, `/v423/admin/*` (session-based), `/creatives` (JWT in handler).
- All other routes require `Authorization: Bearer <key>` or `?api_key=<key>`. The key is SHA-256 hashed and looked up in `api_key` table.
- **RBAC**: roles `viewer < connector < analyst < admin` plus scopes (`write:*`, `write:ingest`, `admin:keys`). Writes (POST/PUT/PATCH/DELETE) require `analyst+` or `write:*`; ingest endpoints accept `connector+` or `write:ingest`; `/v421/keys/*` requires `admin:keys` or `admin`.
- After auth, the request gets attributes `auth_key`, `auth_role`, `auth_tenant` and `X-Tenant-Id` is injected if absent.

When adding new public endpoints, the bypass list in `index.php:60-89` must be updated **and** any `/api/...` alias variant must also be listed.

## Frontend architecture

- Vite root is `frontend/` (set in `vite.config.js`). Vite cache is **redirected to `D:/cache/vite`** — Windows-specific path; will need to be edited for non-Windows environments.
- Entry: `frontend/src/main.jsx` → `App.jsx`. App is wrapped in nested providers: `AuthProvider` → `GlobalDataProvider` → `CurrencyProvider` → `MobileSidebarProvider` → `ConnectorSyncProvider` → `ToastProvider`. Two context directories exist (`context/` and `contexts/`) — both are real and used; check both before creating a new context.
- All ~116 pages in `frontend/src/pages/` are loaded via `React.lazy()` in `App.jsx`. Adding a new page requires both an import line and a `<Route>` registration.
- API calls go through `frontend/src/services/apiClient.js`. The base URL is `import.meta.env.VITE_API_BASE` (default `http://localhost:8000`). Token is stored under `genie_token` (or `demo_genie_token` when `VITE_DEMO_MODE=true`); `X-Tenant-ID` is set from `localStorage.tenantId` (or `"demo"`).

### Vite manual chunk strategy

`vite.config.js` defines an extensive `manualChunks(id)` strategy that groups pages by domain (`pages-analytics`, `pages-commerce`, `pages-data`, `pages-ops`, `pages-ai`, `pages-marketing2`, `pages-subscription`, `pages-admin`, etc.) and isolates `vendor-react`, `vendor-router`, and `i18n-locales`. When adding a new heavy page, check whether it should join an existing chunk or get its own — leaving it ungrouped pushes it into the catch-all and inflates initial load.

### i18n

- 15 locale files in `frontend/src/i18n/locales/`: `ko, en, ja, zh, zh-TW, de, th, vi, id, ar, es, fr, hi, pt, ru`.
- **These files are large** (`ko.js` ≈ 1 MB). They are listed in `.clineignore` for a reason — never load them in full. Use targeted Grep/Read with line offsets when editing.
- New translation keys must be added to **all 15 files** to avoid runtime fallback warnings. Korean (`ko.js`) is the source of truth; mirror to other languages.
- Key naming convention: `{page}.{feature}.{item}` (e.g., `dashboard.kpi.revenue`).
- The locale files use `export default { ... }` ES module syntax. CI Phase 1 only does an existence check (a previous CI used `vm.createScript` which fails on ES modules — do not reintroduce that).

## Known repo conventions and traps

- **Korean is the primary working language** for commit messages, code comments, and chat (per `.clinerules`). PR titles can be either, but the repo's existing commit style is Korean.
- **Root is full of one-off scripts** (`fix_*.js`, `patch_*.js`, `_*.cjs`, `inject_*.cjs`, dozens of `catalog_fix*.cjs`, etc.). Most are historical patches that have already run; do not execute them speculatively. They have been progressively archived over multiple cleanup sessions documented in `NEXT_SESSION.md`.
- **Deploy approval is required**. Per `.clinerules`, all deploys (CI, demo, production) require explicit user approval before triggering. Do not push to `master` autonomously, since that auto-fires the production deploy workflow.
- **Scope lock**: all work must stay within `D:\project\GeniegoROI`. Do not modify files outside this tree.
- **No PII storage**: design decisions around aggregation-only data (e.g., v418.1 decisioning) are intentional — segments are aggregate cohorts, not buyer records. Maintain this when adding new ingest endpoints.

## PowerShell pitfalls (verified through 14+ sessions)

The repo is developed primarily on Windows + PowerShell. The following traps have been confirmed by repeated incidents — prefer the listed alternatives.

| Trap | Symptom | Workaround |
|------|---------|------------|
| `Get-Content \| Where-Object \| Set-Content` | UTF-8 Korean files silently corrupted (encoding round-trip via system default) | `[System.IO.File]::ReadAllText/WriteAllText` with explicit UTF-8 (no BOM); or use the `Edit` tool / VS Code |
| `Select-Object` on git output | Re-encodes git output stream | Pipe git output to a file first (`git diff <f> > tmp.txt`), then read |
| `git diff --stat \|` | PowerShell parsing error on the pipe | Same — write to file, read back |
| VS Code Find/Replace All | Silently fails on some files (no error, no replacement) | Use `.NET API` script or edit lines directly |
| VS Code Quick Open | Cannot find `.gitignore` (dotfiles) | Open by full path |
| `√` and similar Unicode in single-quoted strings | `.Replace()` and `-replace` regex both fail to match | Edit the line directly in VS Code; verify with `[System.IO.File]::ReadAllLines()[idx]` |
| `Start-Job` working directory | New PS session starts in `$HOME` (often OneDrive folder), not the caller's `cd` | Call `Set-Location` inside the `ScriptBlock`, or use absolute paths |
| `cd` residue across commands | Working directory persists between commands and surprises later commands | `Push-Location` / `Pop-Location`, or always pass absolute paths |
| Output residue | A bare `0` output can render as `0S D:\...` (next prompt's `P` clipped) — looks like garbage but isn't | Visually ignore; check actual files with `Test-Path` and `Get-Content` |
| `2>$null` in Bash tool | `/usr/bin/bash: $null: ambiguous redirect` — Bash tool routes to Antigravity bundled bash, not PowerShell | Use `2>/dev/null` in Bash tool; reserve `2>$null` for PowerShell tool only |
| `Get-Command name1, name2, ...` (comma list) | Output silently swallowed in PS 5.1 Desktop | Query one command per `Get-Command` call |
| Bash tool shell identity | Bash tool always routes to Antigravity internal `/usr/bin/bash` regardless of system PATH; `$SHELL` env var is absent | Treat Bash tool as Linux bash; treat PowerShell tool as Windows PS 5.1 — never mix redirect syntax |
| Auto-recommend command spoofing (39th #19, 40th 11×) | Auto-recommend mimics reviewer commands incl. echo blockers, Korean intent, Linux cmds, persistent retry across echo overwrites | Always echo-overwrite first; never trust auto-suggested next step; vary echo messages to defeat persistence |
| Auto-recommend completion-decision spoofing (39th #21, 40th 10×) | Auto-recommend mimics reviewer's session-end / push / priority-transition decisions (Claude Code self-routing) | Always echo-overwrite first; reviewer command t-prefix mandatory; never trust auto-suggested completion or transition |
| Claude Code self-retry + command auto-modification (38th #14) | Claude Code self-diagnoses failure + splits/retries command without user intervention; reproduced 6× cumulative through 38-40th sessions | Reviewer must verify each command output; treat self-retry as new command requiring fresh review approval |
| Reviewer analysis assertion (30th #27, 73rd, 86th, 40th 3x) | Reviewer asserts conclusion before objective verification (file save state, AI auto-completion outcome, command result) without read-back evidence | Reviewer must always require objective verification (Get-Content / git log / status read-back) before stating conclusions; never assert based on screenshot UI signals alone |
| Auto-recommend per-command emergence | 41st #19-evo7 (19×) — every command shows auto-suggestion, echo block ineffective | Use `t` prefix Korean override; never press Enter on auto-text |
| Reviewer report keyword spoofing | 41st #19-evo8 (4× verified) — auto-recommend mimics reviewer report keywords | Always cross-check against reviewer instructions only |
| Auto-recommend deletion refusal | 41st #19-evo9 — Ctrl+A Delete ineffective; overwrite-only works | Type new command directly to overwrite buffer |
| Dialog option 2 wildcard expansion | 41st #28-var — option 2 grants wildcard like `npm *` permanently | Always select option 1 (Yes); option 2 strictly forbidden |
| `</parameter>` internal tool metadata leak | 41st #28-var2 — `</parameter>` tag exposes internal tool metadata in output | Sanitize or quote-escape `</parameter>` in commands |

### `.NET API` safe text-replacement pattern (the one that works)

```powershell
$path = "<target_file>"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
$cleaned = $content -replace '<pattern>', '<replacement>'
[System.IO.File]::WriteAllText($path, $cleaned, $utf8NoBom)
```

Bypasses the PS pipeline entirely (no encoding conversions). Used for all multi-replace edits to `.yml`, `.md`, `.jsx` files in this repo.

## Deploy script preservation matrix

The repo's root contains many `deploy_*` scripts. Most have been archived; a small set is **operationally critical** and must not be touched. Verified across sessions 9–11.

| File | Status | Notes |
|------|--------|-------|
| `deploy.ps1` | **Keep** | Windows **build** orchestrator: `gen_chatbot_knowledge.mjs` → `i18n_autofill.mjs` ×4 → `vite build`. Session 276 removed 3 calls (`inject_journey_ko.cjs`, `package_deploy.py`, `deploy_paramiko.py`) that never existed in git history and killed the script at line 1. Save as **UTF-8 with BOM** — PS 5.1 reads BOM-less `.ps1` as ANSI and mangles the Korean strings. |
| `deploy.sh` | **Keep** | Linux rsync to `roi.geniego.com:/home/wwwroot/.../frontend/dist` |
| `deploy_gitbash.sh` | **Keep** | Git Bash deploy with SSH key auth (plaintext password was scrubbed in session 11) |
| `deploy_demo.cjs` | **Keep** | Referenced by `docs/JOURNEY_BUILDER_KPI_FIX.md`, `docs/BUG-013_*` |
| `deploy_node.cjs` | **Keep** | Referenced by `docs/BUG-013_DEPLOY_ENCODING_FIX.md` |
| `deploy_ssh2.cjs` | **Keep** | Referenced by `docs/WORK_PROCESS.md` |
| `.github/workflows/deploy.yml` | **Keep** | CI pipeline (deploys on push to `master`) |
| `deploy_all.cjs` … `deploy_win.js` (9 files) | Archived | Variant scripts with zero external references |
| `deploy_*.txt` (3 files) | git-untracked + `.gitignore`'d | Old deploy logs |
| `deploy*.zip` | `.gitignore`'d | Build artifacts |

Validation pattern when assessing a new deploy variant — **5-stage external-reference check** (run from repo root):

```powershell
$pattern = "<filename_stem_regex>"
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count
$infraFiles = @(".github/workflows/deploy.yml","frontend/Dockerfile","infra/docker-compose.yml","docker-compose.yml","deploy.sh","deploy_gitbash.sh","deploy.ps1") | Where-Object { Test-Path $_ }
Select-String -Path $infraFiles -Pattern $pattern
Get-ChildItem -Path "docs" -Filter "*.md" | Select-String -Pattern $pattern
```

If all five return 0, the script is archive-safe.

## Diagnostic patterns

### Fantasy-call detection (CI debugging)

When CI fails on `node` calls in deploy.yml, verify the script actually exists and was ever committed before debugging the runner:

```powershell
Test-Path "<target_file>"
git ls-files "<target_file>"
Get-ChildItem -Path . -Recurse -Filter "<filename>" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|clean_src|\.git\\" }
git log --all --oneline -- "**/<filename>"
```

If all four return empty, the call is a **fantasy** — never existed. Remove from the workflow rather than trying to repair. (Session 14: `gen_locales.mjs` and `patch_ko_locales.js` were such calls and had been silently failing CI for weeks.)

### YAML special characters requiring quotes

In GitHub Actions `name:` values, the following must be quoted (preferably with `"…"`) because YAML otherwise parses them as flow constructs:

`[ ]` (flow sequence), `{ }` (flow mapping), `&` (anchor), `*` (alias), `!` (tag), `| >` (block scalar), `:` (mapping separator), `#` (comment).

The classic mistake here: `- name: [PHASE 1] Syntax Guard` — YAML treats `[PHASE 1]` as a list, GitHub UI reports a confusing line-18 error, and the workflow fails silently. Fix: `- name: "[PHASE 1] Syntax Guard"`.

### `.clineignore` summary (what the assistant should never load in full)

- `frontend/src/i18n/locales/**/*.js` (15 locale files, `ko.js` ≈ 1 MB)
- `frontend/src/i18n/locales_backup/`, `clean_src/`, `backup/`, `$BACKUP_DIR/`, `legacy_v338_pkg/`
- `fix_*`, `nuke_*`, `smart_trans_*`, `supreme_deploy.js`, `dict_*.json` (historical patches)
- `node_modules/`, `dist/`, `build/`, `logs/`, `*.log`
- `.env`, `*.pem`, `*.key`

## Working with the session log

`NEXT_SESSION.md` is the running session-by-session work log (currently 38 KB, 20+ sessions). When picking up where a previous session left off, read the most recent few sessions there for context — it captures CI failures, file-encoding traps, and which scripts have already been archived. Update it at the end of substantive sessions; do not delete prior entries.

## Useful reference docs

- `docs/PM_CURRENT_STATUS.md`, `docs/PM_PRIORITY_PLAN.md` — current bug priorities and sprint plan
- `docs/BUGS_TRACKING.md` — bug tracker
- `docs/V{NNN}_*.md` (V382 through V406) — per-version functional specs and merge reports
- `docs/DEPLOY_*.md` — AWS / Azure / Docker deployment guides
- `backend/README.md` — backend quick-start and v418.1 decisioning endpoint reference

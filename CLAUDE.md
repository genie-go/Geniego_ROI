# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GeniegoROI is a multi-tenant ROI analytics dashboard (CRM, KPI, Operations, P&L domains) deployed to https://roi.genie-go.com. The repo is a **monorepo** with two independently-built apps that share a directory tree:

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
| Manual deploy (Windows) | `.\deploy.ps1` (runs `inject_journey_ko.cjs` → `vite build` → `package_deploy.py` → `deploy_paramiko.py`) |
| Manual deploy (Linux/Mac) | `./deploy.sh` (rsync `frontend/dist/` → `root@1.201.177.46:/home/wwwroot/roi.geniego.com/frontend/dist`) |

There are **no configured lint or test scripts** in this repo (no `npm test`, no PHPUnit suite). Verification is manual / by deploying.

The root `package.json` only declares `build`. Vite's `root` is set to `frontend/` in `vite.config.js`, so running `vite build` from the repo root is correct — do **not** add a `cd frontend` to the root build script.

## CI/CD

`.github/workflows/deploy.yml` deploys on push to **`master`** (not `main`). Pipeline phases:

1. EN locale syntax guard (`node -e require('fs').readFileSync(...)`)
2. `cd frontend && npm install && npm run build`
3. SCP `frontend/dist/*` → remote `/home/wwwroot/roi.geniego.com/frontend`
4. SSH chown + `nginx -s reload`
5. Login API smoke test against `https://roi.genie-go.com/api/auth/login`

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

- **PowerShell environment**: the repo is developed primarily on Windows + PowerShell. `Get-Content | Where-Object | Set-Content` patterns will silently corrupt files due to encoding round-trips — prefer `[System.IO.File]::ReadAllText` / `WriteAllText` with explicit UTF-8 encoding, or edit via VS Code / the `Edit` tool. Hard-won lessons are recorded in `NEXT_SESSION.md`.
- **Korean is the primary working language** for commit messages, code comments, and chat (per `.clinerules`). PR titles can be either, but the repo's existing commit style is Korean.
- **Root is full of one-off scripts** (`fix_*.js`, `patch_*.js`, `_*.cjs`, `inject_*.cjs`, dozens of `catalog_fix*.cjs`, etc.). Most are historical patches that have already run; do not execute them speculatively. They have been progressively archived over multiple cleanup sessions documented in `NEXT_SESSION.md`.
- **Deploy approval is required**. Per `.clinerules`, all deploys (CI, demo, production) require explicit user approval before triggering. Do not push to `master` autonomously, since that auto-fires the production deploy workflow.
- **Scope lock**: all work must stay within `D:\project\GeniegoROI`. Do not modify files outside this tree.
- **No PII storage**: design decisions around aggregation-only data (e.g., v418.1 decisioning) are intentional — segments are aggregate cohorts, not buyer records. Maintain this when adding new ingest endpoints.

## Working with the session log

`NEXT_SESSION.md` is the running session-by-session work log (currently 38 KB, 20+ sessions). When picking up where a previous session left off, read the most recent few sessions there for context — it captures CI failures, file-encoding traps, and which scripts have already been archived. Update it at the end of substantive sessions; do not delete prior entries.

## Useful reference docs

- `docs/PM_CURRENT_STATUS.md`, `docs/PM_PRIORITY_PLAN.md` — current bug priorities and sprint plan
- `docs/BUGS_TRACKING.md` — bug tracker
- `docs/V{NNN}_*.md` (V382 through V406) — per-version functional specs and merge reports
- `docs/DEPLOY_*.md` — AWS / Azure / Docker deployment guides
- `backend/README.md` — backend quick-start and v418.1 decisioning endpoint reference

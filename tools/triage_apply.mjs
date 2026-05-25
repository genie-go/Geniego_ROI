#!/usr/bin/env node
/**
 * tools/triage_apply.mjs
 *
 * N-157-A Tier 1 — triage detector 출력 (CSV) 를 입력으로 안전한 deletion
 * plan 을 생성한다. P1 범위: collision detector dry-run.
 *
 *   Spec     : docs/spec/triage_apply_v1.md
 *   Phase    : P1 (parseArgs + loadDetectorOutput + buildPlan + displayPlanSummary)
 *   Detector : collision only (wrong-language / dead-subtree 는 P4 stub)
 *   Apply    : --apply 는 P2 stub (P1 은 100% dry-run)
 *
 * 외부 의존 0 — node:fs / node:path / node:child_process / node:crypto 만 사용.
 */

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';

const SACRED_LOCALES   = new Set(['ja', 'zh']);
const VALID_DETECTORS  = new Set(['collision', 'wrong-language', 'dead-subtree']);
const VALID_SEVERITIES = new Set(['forbidden', 'warn', 'all']);
const VALID_G3_MODES   = new Set(['strict', 'safety-net']);
const COLLISION_HEADER = ['locale','path','kind','group_index','line','key_type','leaf_count','first_child_key_type','status','value_preview'];
const LOCALE_DIR       = 'frontend/src/i18n/locales';

function usage() {
  return `Usage: node tools/triage_apply.mjs --locale <name> --detector <mode> [options]

Required:
  --locale <name>      ko, en, id, etc. (ja/zh 차단 — N-79)
  --detector <mode>    collision | wrong-language | dead-subtree

Options:
  --input <path>       detector CSV path. 미지정 시 triage.mjs 즉시 실행
  --severity <level>   forbidden | warn | all (default: forbidden)
  --apply              실제 적용 (미지정 시 100% dry-run; P2 미구현)
  --yes                --apply 결합 시 interactive confirm 생략 (CI 용)
  --out <path>         plan JSON 경로 (default: triage_apply_plan_<locale>_<detector>.json)
  --target <path>      적용 대상 파일 override (default: frontend/src/i18n/locales/<locale>.js)
                       — basename 이 ja.js/zh.js 이면 즉시 abort (N-79)
  --g3-mode <mode>     strict | safety-net (default: strict).
                       strict     = post == pre + estimated_leaf_delta (patch03 §4)
                       safety-net = post >= pre + estimated_leaf_delta (loss only)
  --help               이 메시지 출력 후 종료

Phase : P1 (collision dry-run only). P2 apply / P4 other detectors 는 stub.
Spec  : docs/spec/triage_apply_v1.md
`;
}

function die(msg, code = 1) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {
    locale: null, detector: null, input: null,
    severity: 'forbidden', apply: false, yes: false,
    out: null, target: null, help: false,
    g3_mode: 'strict',  // patch03 §4 default
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--help':     opts.help = true; break;
      case '--apply':    opts.apply = true; break;
      case '--yes':      opts.yes = true; break;
      case '--locale':   opts.locale = args[++i]; break;
      case '--detector': opts.detector = args[++i]; break;
      case '--input':    opts.input = args[++i]; break;
      case '--severity': opts.severity = args[++i]; break;
      case '--out':      opts.out = args[++i]; break;
      case '--target':   opts.target = args[++i]; break;
      case '--g3-mode':  opts.g3_mode = args[++i]; break;
      default: die(`unknown flag: ${a}\n\n${usage()}`);
    }
  }
  if (opts.help) { process.stdout.write(usage()); process.exit(0); }
  if (!opts.locale)   die(`--locale required\n\n${usage()}`);
  if (!opts.detector) die(`--detector required\n\n${usage()}`);
  if (SACRED_LOCALES.has(opts.locale)) {
    die(`N-79 violation: locale '${opts.locale}' is sacred (write-protected). aborting.`);
  }
  if (!VALID_DETECTORS.has(opts.detector)) {
    die(`invalid --detector '${opts.detector}'. expected: ${[...VALID_DETECTORS].join(' | ')}`);
  }
  if (!VALID_SEVERITIES.has(opts.severity)) {
    die(`invalid --severity '${opts.severity}'. expected: ${[...VALID_SEVERITIES].join(' | ')}`);
  }
  if (!VALID_G3_MODES.has(opts.g3_mode)) {
    die(`invalid --g3-mode '${opts.g3_mode}'. expected: ${[...VALID_G3_MODES].join(' | ')}`);
  }
  if (opts.target) {
    // N-79 belt-and-suspenders: --target basename 도 sacred 파일이면 차단
    const basename = opts.target.split(/[\\/]/).pop();
    if (basename === 'ja.js' || basename === 'zh.js') {
      die(`N-79 violation: --target '${opts.target}' is a sacred file. aborting.`);
    }
  }
  if (!opts.out) opts.out = `triage_apply_plan_${opts.locale}_${opts.detector}.json`;
  return opts;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function loadDetectorOutput(csvPath, expectedHeader) {
  if (!existsSync(csvPath)) die(`detector CSV not found: ${csvPath}`);
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  if (header.length !== expectedHeader.length || header.some((h, i) => h !== expectedHeader[i])) {
    die(`CSV header mismatch.\n  expected: ${expectedHeader.join(',')}\n  got:      ${header.join(',')}`);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const row = {};
    expectedHeader.forEach((k, j) => { row[k] = fields[j] ?? ''; });
    row.line = Number(row.line);
    row.group_index = Number(row.group_index);
    row.leaf_count = Number(row.leaf_count || 0);
    rows.push(row);
  }
  return rows;
}

function groupByPath(rows) {
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.path)) groups.set(r.path, []);
    groups.get(r.path).push(r);
  }
  return groups;
}

function buildPlan(rows, options, preLeafCount, srcAST) {
  // Decision rules (158차 instruction; differs from spec §5.1 on `identical`:
  //   leaf identical/divergent → last-wins (delete earlier rows, preserve last)
  //   block_identical          → first-wins (delete later blocks, preserve first)
  //   block_divergent          → skip (canonical 결정 외부 의존)
  const decisions = [];
  const localePath = options.target || localeFilePath(options.locale);
  let idx = 0;
  for (const [path, members] of groupByPath(rows)) {
    if (members.length < 2) {
      for (const r of members) decisions.push(makeSkip(idx++, r, localePath, `lone row for path '${path}' — not a collision`));
      continue;
    }
    const sorted = [...members].sort((a, b) => a.line - b.line);
    const status = sorted[0].status;
    if (status === 'identical' || status === 'divergent') {
      const preserved = sorted[sorted.length - 1];
      for (const r of sorted.slice(0, -1)) {
        const mixedKind = r.kind !== preserved.kind;
        const kindNote = mixedKind
          ? ` [MIXED-KIND: ${r.kind} shadowed by ${preserved.kind}${preserved.leaf_count > 1 ? ` (${preserved.leaf_count} leaves)` : ''}]`
          : '';
        decisions.push(makeDelete(idx++, r, localePath,
          `last-wins (${status}): line ${r.line} superseded by line ${preserved.line}${kindNote}`));
      }
    } else if (status === 'block_identical') {
      const preserved = sorted[0];
      for (const r of sorted.slice(1)) {
        decisions.push(makeDelete(idx++, r, localePath,
          `block_identical: redundant block at line ${r.line}, canonical at line ${preserved.line}`));
      }
    } else if (status === 'block_divergent') {
      for (const r of sorted) {
        decisions.push(makeSkip(idx++, r, localePath, 'block_divergent: canonical 결정 외부 의존'));
      }
    } else {
      for (const r of sorted) {
        decisions.push(makeSkip(idx++, r, localePath, `unknown status '${status}'`));
      }
    }
  }

  // §5.1.1 Hierarchical Overlap Resolution:
  // block decision (delete or skip) 이 path-prefix 로 매칭되는 child leaf
  // delete 를 흡수. 158차 ed3c4a0~1 graph subtree 파괴 케이스 예방.
  demoteOverlappingLeaves(decisions);

  // patch03 §3 — precise per-decision Δ
  const est = estimateLeafDelta(decisions, srcAST, rows);
  for (const d of decisions) {
    d.estimated_leaf_delta = est.perDecision.get(d.row_index) ?? 0;
  }

  return {
    version: 1,
    tool: 'triage_apply',
    generated_at: new Date().toISOString(),
    input: {
      locale: options.locale,
      detector: options.detector,
      csv: options.input,
      row_count: rows.length,
    },
    decisions,
    summary: summarize(decisions, est.totalDelta),
    gates: currentGates(localePath, preLeafCount),
  };
}

function demoteOverlappingLeaves(decisions) {
  // 1. block decisions (delete + skip 둘 다) 의 path 수집
  const blockPaths = decisions
    .filter(d => d.kind === 'block')
    .map(d => ({ path: d.key_path, line: d.target.line, action: d.action }));

  if (blockPaths.length === 0) return;

  // 2. leaf delete decisions 중 block path 의 child 인 것 demote
  for (const d of decisions) {
    if (d.kind !== 'leaf') continue;
    if (d.action !== 'delete') continue;
    for (const bp of blockPaths) {
      if (d.key_path.startsWith(bp.path + '.')) {
        d.action = 'skip';
        d.rationale = `demoted: covered by parent block ${bp.action} at line ${bp.line} (path: ${bp.path})`;
        break;
      }
    }
  }
}

function makeDelete(row_index, r, file, rationale) {
  return {
    row_index, key_path: r.path, kind: r.kind, status: r.status,
    action: 'delete', rationale,
    target: { file, line: r.line, leaf_count: r.leaf_count || 1 },
    safety: { is_sacred: false },
  };
}

function makeSkip(row_index, r, file, rationale) {
  return {
    row_index, key_path: r.path, kind: r.kind, status: r.status,
    action: 'skip', rationale,
    target: { file, line: r.line },
  };
}

function summarize(decisions, totalDelta) {
  let del = 0, skip = 0;
  for (const d of decisions) {
    if (d.action === 'delete') del++;
    else if (d.action === 'skip') skip++;
  }
  return {
    delete: del,
    skip,
    estimated_leaf_delta: totalDelta,
    estimated_size_delta_bytes: null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// patch03 §3 — Precise estimator
// ─────────────────────────────────────────────────────────────────────

function walkLeaves(o) {
  // §3.4 — invariant identical to tools/leaf_count.mjs `count`.
  let n = 0;
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) n += walkLeaves(v);
    else n++;
  }
  return n;
}

function resolvePath(root, dotPath) {
  if (!root || typeof root !== 'object') return null;
  if (!dotPath) return root;
  const parts = dotPath.split('.');
  let cur = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[p];
  }
  return cur;
}

function countLeavesInBlock(blockPath, srcAST) {
  // §3.4 — # leaves under blockPath in srcAST; 0 if missing.
  const node = resolvePath(srcAST, blockPath);
  if (node == null) return 0;
  if (typeof node !== 'object' || Array.isArray(node)) return 1;
  return walkLeaves(node);
}

function estimateLeafDelta(decisions, srcAST, rows) {
  // §3.1 returns { totalDelta, perDecision }.
  //
  // 케이스:
  //   1. shadowed by parent block delete (§3.3)         → Δ=0
  //   2. same-path survivor in source rows (collision)  → Δ=0  (JS last-wins)
  //   3. AST loss (no survivor, path exists in srcAST):
  //        - leaf  : Δ=-1
  //        - block : Δ=-countLeavesInBlock(path)
  //   4. action != 'delete'                              → Δ=0
  const perDecision = new Map();

  const rowsByPath = new Map();
  if (rows) {
    for (const r of rows) rowsByPath.set(r.path, (rowsByPath.get(r.path) || 0) + 1);
  }

  const deleteCountByPath = new Map();
  for (const d of decisions) {
    if (d.action !== 'delete') continue;
    deleteCountByPath.set(d.key_path, (deleteCountByPath.get(d.key_path) || 0) + 1);
  }

  const blockDeletePaths = decisions
    .filter(d => d.action === 'delete' && d.kind === 'block')
    .map(d => d.key_path);

  const lossAttributed = new Set();

  for (const d of decisions) {
    if (d.action !== 'delete') { perDecision.set(d.row_index, 0); continue; }

    // Case 1: hierarchical shadow (descendant of a block-delete)
    const shadowed = blockDeletePaths.some(bp => d.key_path !== bp && d.key_path.startsWith(bp + '.'));
    if (shadowed) { perDecision.set(d.row_index, 0); continue; }

    // Case 2: same-path survivor in source rows
    const totalRows = rowsByPath.get(d.key_path) || 0;
    const deletesAtPath = deleteCountByPath.get(d.key_path) || 0;
    const remaining = totalRows - deletesAtPath;
    if (remaining >= 1) { perDecision.set(d.row_index, 0); continue; }

    // Case 3: AST loss — attribute once per path (first delete in group)
    if (lossAttributed.has(d.key_path)) { perDecision.set(d.row_index, 0); continue; }
    lossAttributed.add(d.key_path);

    let delta = 0;
    if (d.kind === 'leaf') delta = -1;
    else if (d.kind === 'block') delta = -countLeavesInBlock(d.key_path, srcAST);
    perDecision.set(d.row_index, delta);
  }

  let totalDelta = 0;
  for (const v of perDecision.values()) totalDelta += v;
  return { totalDelta, perDecision };
}

function localeFilePath(locale) {
  return `${LOCALE_DIR}/${locale}.js`;
}

function sha256Hex8(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8) + '...';
}

function currentGates(mainPath, preLeafCount) {
  // sacred (ja/zh) 는 항상 canonical 경로에서 — --target 으로 우회 불가
  const ja = localeFilePath('ja');
  const zh = localeFilePath('zh');
  return {
    pre_size:    existsSync(mainPath) ? statSync(mainPath).size : null,
    pre_leaves:  preLeafCount,
    pre_ja_sha:  existsSync(ja) ? sha256Hex8(ja) : null,
    pre_zh_sha:  existsSync(zh) ? sha256Hex8(zh) : null,
  };
}

async function loadLocaleAST(localePath) {
  try {
    const abs = resolve(localePath);
    const url = (process.platform === 'win32'
      ? 'file:///' + abs.replace(/\\/g, '/')
      : 'file://' + abs) + '?v=' + Date.now();
    const m = await import(url);
    return m.default ?? m;
  } catch { return null; }
}

function countLeavesAST(ast) {
  if (!ast || typeof ast !== 'object') return null;
  return walkLeaves(ast);
}

async function countLeaves(localePath) {
  const ast = await loadLocaleAST(localePath);
  return countLeavesAST(ast);
}

function breakdown(decisions) {
  const d = {}, s = {};
  for (const x of decisions) {
    const b = x.action === 'delete' ? d : (x.action === 'skip' ? s : null);
    if (!b) continue;
    b[x.status] = (b[x.status] || 0) + 1;
  }
  const fmt = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ') || '-';
  return { del: fmt(d), skip: fmt(s) };
}

function displayPlanSummary(plan, options) {
  const { input, summary, gates, decisions } = plan;
  const br = breakdown(decisions);
  const out = [];
  out.push(`[triage_apply v1] Plan summary:`);
  out.push(`  Locale: ${input.locale}`);
  out.push(`  Detector: ${input.detector}`);
  out.push(`  Delete: ${summary.delete} (${br.del})`);
  out.push(`  Skip: ${summary.skip} (${br.skip})`);
  out.push('');
  out.push(`  Pre-state:`);
  out.push(`    size: ${gates.pre_size?.toLocaleString() ?? '?'} B`);
  out.push(`    leaves: ${gates.pre_leaves?.toLocaleString() ?? '?'}`);
  out.push(`    ja SHA: ${gates.pre_ja_sha ?? '?'}`);
  out.push(`    zh SHA: ${gates.pre_zh_sha ?? '?'}`);
  out.push('');
  out.push(`  Expected post-state:`);
  out.push(`    size: ~? B (Δ unknown — simulated apply 는 P2)`);
  const postLeaves = gates.pre_leaves != null ? gates.pre_leaves + summary.estimated_leaf_delta : null;
  out.push(`    leaves: ${postLeaves?.toLocaleString() ?? '?'} (Δ ${summary.estimated_leaf_delta})`);
  out.push('');
  out.push(`  First 3 deletions:`);
  const dels = decisions.filter(d => d.action === 'delete').slice(0, 3);
  if (dels.length === 0) out.push('    (none)');
  else dels.forEach((d, i) => out.push(`    [${i+1}] ${d.key_path} @ line ${d.target.line} (${d.kind}) — ${d.rationale}`));
  out.push('');
  out.push(`  Plan written to: ${options.out}`);
  process.stdout.write(out.join('\n') + '\n');
}

function runTriage(locale) {
  const tmpCsv = `.triage_apply_tmp_${locale}_${Date.now()}.csv`;
  const result = spawnSync('node', [
    'tools/triage.mjs', '--locale', locale, '--mode', 'collision',
    '--csv', tmpCsv, '--quiet',
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  // triage.mjs exits 1 when findings present — that's a success for us.
  if (result.status !== 0 && result.status !== 1) {
    die(`triage.mjs failed (exit ${result.status}). aborting.`);
  }
  if (!existsSync(tmpCsv)) die(`triage.mjs ran but no CSV produced at ${tmpCsv}`);
  return tmpCsv;
}

function promptConfirm(_plan) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Proceed? [yes/no/diff]: ', (a) => {
      rl.close();
      const v = (a || '').trim().toLowerCase();
      resolve(v === 'yes' ? 'yes' : v === 'diff' ? 'diff' : 'no');
    });
  });
}

function findBlockEnd(lines, startIdx) {
  // start line 의 '{' 부터 brace depth 0 까지. 문자열/escape-aware.
  // 주의: escaped 플래그는 라인 사이에서 reset 되지 않지만, 멀티라인 끝의
  // \\ 는 i18n 파일에 거의 없어 실용상 무시 가능.
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;
  let started = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (inString) {
        if (c === stringChar) inString = false;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; continue; }
      if (c === '{') { depth++; started = true; }
      else if (c === '}') {
        depth--;
        if (started && depth === 0) return i;
      }
    }
  }
  return -1;
}

function applyDeletions(plan, localePath) {
  // descending line order so earlier-line deletions don't shift later targets
  const deletes = plan.decisions
    .filter(d => d.action === 'delete')
    .sort((a, b) => b.target.line - a.target.line);
  const original = readFileSync(localePath, 'utf-8');
  const lines = original.split('\n');
  for (const d of deletes) {
    const startIdx = d.target.line - 1;
    if (d.kind === 'leaf') {
      lines.splice(startIdx, 1);
    } else if (d.kind === 'block') {
      const endIdx = findBlockEnd(lines, startIdx);
      if (endIdx === -1) throw new Error(`unable to find block end for line ${d.target.line} (key=${d.key_path})`);
      lines.splice(startIdx, endIdx - startIdx + 1);
    } else {
      throw new Error(`unknown kind: ${d.kind}`);
    }
  }
  const newContent = lines.join('\n');
  const tmpPath = localePath + '.triage_apply_tmp';
  writeFileSync(tmpPath, newContent, 'utf-8');
  renameSync(tmpPath, localePath);
}

function validateGates(plan, postGates, g3Mode = 'strict') {
  const failed = [];
  const pre = plan.gates;
  const summary = plan.summary;
  if (postGates.pre_ja_sha !== pre.pre_ja_sha) failed.push('G2_ja_sha_changed');
  if (postGates.pre_zh_sha !== pre.pre_zh_sha) failed.push('G2_zh_sha_changed');
  // patch03 §4 — G3 strict equality (default) with safety-net opt-in
  const expectedLeaves = pre.pre_leaves + summary.estimated_leaf_delta;
  if (postGates.pre_leaves != null && expectedLeaves != null) {
    if (g3Mode === 'safety-net') {
      if (postGates.pre_leaves < expectedLeaves) {
        failed.push(`G3_leaf_loss (post ${postGates.pre_leaves} < expected ${expectedLeaves}, mode=safety-net)`);
      }
    } else {
      if (postGates.pre_leaves !== expectedLeaves) {
        failed.push(`G3_leaf_strict (post ${postGates.pre_leaves} !== expected ${expectedLeaves}, mode=strict)`);
      }
    }
  }
  if (postGates.pre_size >= pre.pre_size) failed.push('G1_size_did_not_decrease');
  // G4 (target lines empty) and G5 (triage re-run) intentionally out of scope here.
  return { ok: failed.length === 0, failed };
}

function rollback(localePath) {
  const result = spawnSync('git', ['checkout', 'HEAD', '--', localePath], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`rollback failed: git checkout exited ${result.status} (file may be outside repo or untracked)`);
    return false;
  }
  console.error(`rolled back via git checkout: ${localePath}`);
  return true;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.detector !== 'collision') {
    process.stdout.write(`[triage_apply v1] detector='${opts.detector}' — P4 not implemented yet. dry-run abort.\n`);
    process.exit(0);
  }
  const csvCleanup = !opts.input;
  const csv = opts.input ?? runTriage(opts.locale);
  opts.input = csv;

  const effectivePath = opts.target || localeFilePath(opts.locale);
  const srcAST = await loadLocaleAST(effectivePath);
  const leafCount = countLeavesAST(srcAST);
  const rows = loadDetectorOutput(csv, COLLISION_HEADER);
  const plan = buildPlan(rows, opts, leafCount, srcAST);

  writeFileSync(opts.out, JSON.stringify(plan, null, 2));
  displayPlanSummary(plan, opts);

  if (csvCleanup) { try { unlinkSync(csv); } catch {} }

  if (opts.apply) {
    if (plan.summary.delete === 0) {
      process.stdout.write(`\n[triage_apply v1] --apply: 삭제 대상 0 건 — no-op.\n`);
      process.exit(0);
    }
    if (!opts.yes) {
      const answer = await promptConfirm(plan);
      if (answer === 'no') { process.stdout.write('aborted by user\n'); process.exit(0); }
      if (answer === 'diff') {
        process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
        const answer2 = await promptConfirm(plan);
        if (answer2 !== 'yes') { process.stdout.write('aborted\n'); process.exit(0); }
      }
    }
    const localePath = effectivePath;
    try {
      applyDeletions(plan, localePath);
    } catch (e) {
      process.stderr.write(`apply failed: ${e.message}\n`);
      rollback(localePath);
      process.exit(1);
    }
    const postLeaves = await countLeaves(localePath);
    const postGates = currentGates(localePath, postLeaves);
    const result = validateGates(plan, postGates, opts.g3_mode);
    if (!result.ok) {
      process.stderr.write(`GATE FAILURE: ${result.failed.join(', ')}\n`);
      rollback(localePath);
      process.exit(1);
    }
    process.stdout.write(`\n✓ All gates passed (G1 size↓, G2 sacred SHA, G3 leaf count [${opts.g3_mode}]). Changes written.\n`);
    process.stdout.write(`  size:   ${plan.gates.pre_size?.toLocaleString()} → ${postGates.pre_size?.toLocaleString()}\n`);
    process.stdout.write(`  leaves: ${plan.gates.pre_leaves?.toLocaleString()} → ${postGates.pre_leaves?.toLocaleString()}\n`);
  }
  process.exit(0);
}

main().catch(err => die(`fatal: ${err.message}`));

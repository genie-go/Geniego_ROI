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

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SACRED_LOCALES   = new Set(['ja', 'zh']);
const VALID_DETECTORS  = new Set(['collision', 'wrong-language', 'dead-subtree']);
const VALID_SEVERITIES = new Set(['forbidden', 'warn', 'all']);
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
    out: null, help: false,
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

function buildPlan(rows, options, preLeafCount) {
  // Decision rules (158차 instruction; differs from spec §5.1 on `identical`:
  //   leaf identical/divergent → last-wins (delete earlier rows, preserve last)
  //   block_identical          → first-wins (delete later blocks, preserve first)
  //   block_divergent          → skip (canonical 결정 외부 의존)
  const decisions = [];
  const localePath = localeFilePath(options.locale);
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
    summary: summarize(decisions),
    gates: currentGates(options.locale, preLeafCount),
  };
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

function summarize(decisions) {
  let del = 0, skip = 0, leafDelta = 0;
  for (const d of decisions) {
    if (d.action === 'delete') { del++; leafDelta -= (d.target.leaf_count || 1); }
    else if (d.action === 'skip') skip++;
  }
  return {
    delete: del,
    skip,
    estimated_leaf_delta: leafDelta,
    estimated_size_delta_bytes: null,
  };
}

function localeFilePath(locale) {
  return `${LOCALE_DIR}/${locale}.js`;
}

function sha256Hex8(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8) + '...';
}

function currentGates(locale, preLeafCount) {
  const main = localeFilePath(locale);
  const ja = localeFilePath('ja');
  const zh = localeFilePath('zh');
  return {
    pre_size:    existsSync(main) ? statSync(main).size : null,
    pre_leaves:  preLeafCount,
    pre_ja_sha:  existsSync(ja) ? sha256Hex8(ja) : null,
    pre_zh_sha:  existsSync(zh) ? sha256Hex8(zh) : null,
  };
}

async function countLeaves(localePath) {
  try {
    const abs = resolve(localePath);
    const url = process.platform === 'win32'
      ? 'file:///' + abs.replace(/\\/g, '/')
      : 'file://' + abs;
    const m = await import(url);
    const root = m.default ?? m;
    let n = 0;
    const walk = (o) => {
      for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) walk(v);
        else n++;
      }
    };
    walk(root);
    return n;
  } catch {
    return null;
  }
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

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.detector !== 'collision') {
    process.stdout.write(`[triage_apply v1] detector='${opts.detector}' — P4 not implemented yet. dry-run abort.\n`);
    process.exit(0);
  }
  const csvCleanup = !opts.input;
  const csv = opts.input ?? runTriage(opts.locale);
  opts.input = csv;

  const leafCount = await countLeaves(localeFilePath(opts.locale));
  const rows = loadDetectorOutput(csv, COLLISION_HEADER);
  const plan = buildPlan(rows, opts, leafCount);

  writeFileSync(opts.out, JSON.stringify(plan, null, 2));
  displayPlanSummary(plan, opts);

  if (csvCleanup) { try { unlinkSync(csv); } catch {} }

  if (opts.apply) {
    process.stdout.write(`\n[triage_apply v1] --apply 통과했지만 P2 미구현 — dry-run only.\n`);
  }
  process.exit(0);
}

main().catch(err => die(`fatal: ${err.message}`));

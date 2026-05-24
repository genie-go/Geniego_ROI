#!/usr/bin/env node
// tools/triage.mjs — i18n locale triage (collision mode v1)
// Session 157 Step B. Persists the 156-session AST dotted-keypath
// collision detection pattern (ed3c4a0 / d4ae187). Read-only.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as acorn from 'acorn';

const VALID_LOCALES = new Set([
  'ko', 'en', 'ja', 'zh', 'zh-TW', 'es', 'fr', 'de',
  'pt', 'ru', 'ar', 'hi', 'id', 'th', 'vi',
]);
const VALID_MODES = new Set(['collision', 'mojibake', 'wrong-language', 'dead-subtree', 'all']);

function parseArgs(argv) {
  const args = { locale: null, mode: null, csvPath: null, jsonPath: null, quiet: false, root: null, srcRoot: 'frontend/src' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--locale':
        args.locale = argv[++i];
        break;
      case '--mode':
        args.mode = argv[++i];
        break;
      case '--csv':
        args.csvPath = argv[++i];
        break;
      case '--json':
        args.jsonPath = argv[++i];
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--root':
        args.root = argv[++i];
        break;
      case '--src-root':
        args.srcRoot = argv[++i];
        break;
      case '--out-dir':
        args.outDir = argv[++i];
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
      default:
        console.error(`[triage] unknown argument: ${a}`);
        printUsage();
        process.exit(2);
    }
  }
  if (!args.locale) {
    console.error('[triage] missing required --locale <name>');
    process.exit(2);
  }
  if (!VALID_LOCALES.has(args.locale)) {
    console.error(`[triage] invalid locale "${args.locale}". valid: ${[...VALID_LOCALES].join(', ')}`);
    process.exit(2);
  }
  if (!args.mode) {
    console.error('[triage] missing required --mode <mode>');
    process.exit(2);
  }
  if (!VALID_MODES.has(args.mode)) {
    console.error(`[triage] invalid mode "${args.mode}". valid (v1): ${[...VALID_MODES].join(', ')}`);
    process.exit(2);
  }
  return args;
}

function printUsage() {
  console.error('Usage: node tools/triage.mjs --locale <name> --mode collision [--csv <path>] [--json <path>] [--quiet]');
}

function loadLocale(locale) {
  const file = path.join('frontend', 'src', 'i18n', 'locales', `${locale}.js`);
  if (!fs.existsSync(file)) {
    console.error(`[triage:collision] locale file not found: ${file}`);
    process.exit(2);
  }
  const src = fs.readFileSync(file, 'utf8');
  return { src, file };
}

function parseAST(src, file) {
  try {
    return acorn.parse(src, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch (e) {
    console.error(`[triage:collision] AST parse failed for ${file}: ${e.message}`);
    process.exit(2);
  }
}

function extractRoot(ast, file) {
  const exportDefault = ast.body.find((n) => n.type === 'ExportDefaultDeclaration');
  if (!exportDefault || exportDefault.declaration.type !== 'ObjectExpression') {
    console.error(`[triage:collision] no \`export default { ... }\` in ${file}`);
    process.exit(2);
  }
  return exportDefault.declaration;
}

function keyName(prop) {
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal') return String(prop.key.value);
  return null;
}

function firstChildKeyType(objectExpr) {
  for (const p of objectExpr.properties) {
    if (p.type !== 'Property') continue;
    return p.key.type;
  }
  return null;
}

function countLeaves(node) {
  if (!node || node.type !== 'ObjectExpression') return 1;
  let count = 0;
  for (const p of node.properties) {
    if (p.type !== 'Property') continue;
    if (p.value.type === 'ObjectExpression') {
      count += countLeaves(p.value);
    } else {
      count += 1;
    }
  }
  return count;
}

function walk(node, pathParts, records, src) {
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    const name = keyName(prop);
    if (name === null) continue;
    const keyType = prop.key.type;
    const fullPath = [...pathParts, name].join('.');
    const line = prop.loc.start.line;
    if (prop.value.type === 'ObjectExpression') {
      records.push({
        path: fullPath,
        line,
        keyType,
        leafCount: countLeaves(prop.value),
        firstChildKeyType: firstChildKeyType(prop.value),
        kind: 'block',
        node: prop.value,
        depth: pathParts.length + 1,
        valueSrc: null,
      });
      walk(prop.value, [...pathParts, name], records, src);
    } else {
      records.push({
        path: fullPath,
        line,
        keyType,
        leafCount: 1,
        firstChildKeyType: null,
        kind: 'leaf',
        node: prop.value,
        depth: pathParts.length + 1,
        valueSrc: src.slice(prop.value.start, prop.value.end),
      });
    }
  }
}

function detectCollisions(records) {
  const byPath = new Map();
  for (const r of records) {
    if (!byPath.has(r.path)) byPath.set(r.path, []);
    byPath.get(r.path).push(r);
  }
  const groups = [];
  for (const [p, list] of byPath) {
    if (list.length >= 2) groups.push({ path: p, records: list });
  }
  return groups;
}

function flattenLeaves(node, prefix, out, src) {
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    const name = keyName(prop);
    if (name === null) continue;
    const k = prefix ? `${prefix}.${name}` : name;
    if (prop.value.type === 'ObjectExpression') {
      flattenLeaves(prop.value, k, out, src);
    } else {
      out.set(k, src.slice(prop.value.start, prop.value.end));
    }
  }
}

function classifyStatus(group, src) {
  const recs = group.records;
  const allLeaf = recs.every((r) => r.kind === 'leaf');
  const allBlock = recs.every((r) => r.kind === 'block');
  if (allLeaf) {
    const first = recs[0].valueSrc;
    return recs.every((r) => r.valueSrc === first) ? 'identical' : 'divergent';
  }
  if (allBlock) {
    const flat = recs.map((r) => {
      const m = new Map();
      flattenLeaves(r.node, '', m, src);
      return m;
    });
    const base = flat[0];
    const baseKeys = [...base.keys()].sort().join('|');
    for (let i = 1; i < flat.length; i++) {
      const ks = [...flat[i].keys()].sort().join('|');
      if (ks !== baseKeys) return 'block_divergent';
      for (const [k, v] of flat[i]) {
        if (base.get(k) !== v) return 'block_divergent';
      }
    }
    return 'block_identical';
  }
  return 'divergent';
}

function csvField(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}

function emitCSV(locale, collisions, csvPath) {
  const header = ['locale', 'path', 'kind', 'group_index', 'line', 'key_type', 'leaf_count', 'first_child_key_type', 'status', 'value_preview'];
  const rows = [header.map(csvField).join(',')];
  for (const g of collisions) {
    g.records.forEach((r, idx) => {
      const preview = r.kind === 'leaf' ? (r.valueSrc || '') : '';
      const truncated = preview.length > 200 ? preview.slice(0, 200) + '…' : preview;
      rows.push([
        locale,
        r.path,
        r.kind,
        idx + 1,
        r.line,
        r.keyType,
        r.leafCount,
        r.firstChildKeyType || '',
        g.status,
        truncated,
      ].map(csvField).join(','));
    });
  }
  fs.writeFileSync(csvPath, rows.join('\r\n') + '\r\n', 'utf8');
}

function emitJSON(locale, file, collisions, totals, jsonPath) {
  const out = {
    locale,
    mode: 'collision',
    file,
    ast_root_type: 'ObjectExpression',
    total_collisions: totals.total,
    by_kind: totals.byKind,
    by_status: totals.byStatus,
    collisions: collisions.map((g) => ({
      path: g.path,
      kind: g.records.every((r) => r.kind === 'block') ? 'block'
          : g.records.every((r) => r.kind === 'leaf') ? 'leaf'
          : 'mixed',
      groups: g.records.map((r, idx) => ({
        index: idx + 1,
        line: r.line,
        key_type: r.keyType,
        leaf_count: r.leafCount,
        first_child_key_type: r.firstChildKeyType,
      })),
      status: g.status,
    })),
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
}

function emitSummary(locale, totals, exitCode, quiet, collisions) {
  console.log(`[triage:collision] locale=${locale}`);
  console.log(`  total collisions: ${totals.total}`);
  console.log(`    block-level: ${totals.byKind.block}`);
  console.log(`    leaf-level: ${totals.byKind.leaf}`);
  console.log(`  by status:`);
  console.log(`    identical: ${totals.byStatus.identical}`);
  console.log(`    divergent: ${totals.byStatus.divergent}`);
  console.log(`    block_identical: ${totals.byStatus.block_identical}`);
  console.log(`    block_divergent: ${totals.byStatus.block_divergent}`);
  if (!quiet && collisions.length > 0) {
    console.log(`  collisions:`);
    for (const g of collisions) {
      const lines = g.records.map((r) => `L${r.line}(${r.keyType[0]},leaves=${r.leafCount})`).join(' vs ');
      console.log(`    [${g.status}] ${g.path}  ${lines}`);
    }
  }
  console.log(`exit code: ${exitCode}`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.mode === 'mojibake') {
    return runMojibake(args);
  }
  if (args.mode === 'wrong-language') {
    return runWrongLanguage(args);
  }
  if (args.mode === 'dead-subtree') {
    return runDeadSubtree(args);
  }
  if (args.mode === 'all') {
    return runAll(args);
  }
  const { src, file } = loadLocale(args.locale);
  const ast = parseAST(src, file);
  const root = extractRoot(ast, file);
  const records = [];
  walk(root, [], records, src);
  const groups = detectCollisions(records);
  for (const g of groups) {
    g.status = classifyStatus(g, src);
  }
  const totals = {
    total: groups.length,
    byKind: { block: 0, leaf: 0 },
    byStatus: { identical: 0, divergent: 0, block_identical: 0, block_divergent: 0 },
  };
  for (const g of groups) {
    const allLeaf = g.records.every((r) => r.kind === 'leaf');
    const allBlock = g.records.every((r) => r.kind === 'block');
    if (allBlock) totals.byKind.block++;
    else if (allLeaf) totals.byKind.leaf++;
    else totals.byKind.leaf++;
    if (g.status in totals.byStatus) totals.byStatus[g.status]++;
  }
  const exitCode = groups.length === 0 ? 0 : 1;
  if (args.csvPath) emitCSV(args.locale, groups, args.csvPath);
  if (args.jsonPath) emitJSON(args.locale, file, groups, totals, args.jsonPath);
  emitSummary(args.locale, totals, exitCode, args.quiet, groups);
  process.exit(exitCode);
}

// ─── mojibake mode (Session 157 Step E-1) ────────────────────────────

const MOJIBAKE_MAP_PATH = path.join('tools', 'mojibake_map.json');

function loadMojibakeMap() {
  if (!fs.existsSync(MOJIBAKE_MAP_PATH)) {
    console.error(`[triage:mojibake] map file not found: ${MOJIBAKE_MAP_PATH}`);
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(MOJIBAKE_MAP_PATH, 'utf8'));
  } catch (e) {
    console.error(`[triage:mojibake] map JSON parse failed: ${e.message}`);
    process.exit(2);
  }
  if (!Array.isArray(raw.patterns) || raw.patterns.length === 0) {
    console.error(`[triage:mojibake] map has no patterns`);
    process.exit(2);
  }
  return raw.patterns.map((p) => ({
    id: p.id,
    broken_raw: p.broken,
    broken_nfkc: String(p.broken).normalize('NFKC'),
    fixed_vi: p.fixed_vi,
    requires_context_match: !!p.requires_context_match,
  }));
}

function walkLeavesOnly(node, pathParts, out) {
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    const name = keyName(prop);
    if (name === null) continue;
    if (prop.value.type === 'ObjectExpression') {
      walkLeavesOnly(prop.value, [...pathParts, name], out);
    } else if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
      out.push({
        path: [...pathParts, name].join('.'),
        line: prop.loc.start.line,
        value: prop.value.value,
      });
    }
  }
}

function stripC1(s) {
  return s.replace(/[-]/g, '');
}

function normalizeForMatch(s) {
  return stripC1(s.normalize('NFKC'));
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let i = 0;
  while (true) {
    const idx = haystack.indexOf(needle, i);
    if (idx === -1) break;
    count++;
    i = idx + needle.length;
  }
  return count;
}

function detectMojibake(leaves, patterns) {
  const detections = [];
  for (const leaf of leaves) {
    const cleaned = normalizeForMatch(leaf.value);
    const hits = [];
    for (const pat of patterns) {
      const occ = countOccurrences(cleaned, pat.broken_nfkc);
      if (occ > 0) hits.push({ pattern: pat, occ });
    }
    if (hits.length === 0) continue;
    const distinctMatchCount = hits.length;
    const maxRun = hits.reduce((m, h) => Math.max(m, h.occ), 0);
    let status;
    if (distinctMatchCount >= 2) {
      status = 'multi_pattern';
    } else {
      const only = hits[0];
      status = only.pattern.requires_context_match ? 'context_required' : 'detected';
    }
    detections.push({
      path: leaf.path,
      line: leaf.line,
      value: leaf.value,
      hits,
      match_count: distinctMatchCount,
      run_equality_count: maxRun,
      status,
    });
  }
  return detections;
}

function emitMojibakeCSV(locale, detections, csvPath) {
  const header = ['locale', 'path', 'line', 'value_preview', 'pattern_id', 'broken', 'fixed_vi', 'match_count', 'run_equality_count', 'status'];
  const rows = [header.map(csvField).join(',')];
  for (const d of detections) {
    const ids = d.hits.map((h) => h.pattern.id).join('+');
    const brokens = d.hits.map((h) => h.pattern.broken_raw).join('+');
    const fixed = d.hits.map((h) => h.pattern.fixed_vi).join('+');
    const preview = d.value.length > 200 ? d.value.slice(0, 200) + '…' : d.value;
    rows.push([
      locale,
      d.path,
      d.line,
      preview,
      ids,
      brokens,
      fixed,
      d.match_count,
      d.run_equality_count,
      d.status,
    ].map(csvField).join(','));
  }
  fs.writeFileSync(csvPath, rows.join('\r\n') + '\r\n', 'utf8');
}

function emitMojibakeJSON(locale, file, detections, totals, jsonPath) {
  const out = {
    locale,
    mode: 'mojibake',
    file,
    total_detections: detections.length,
    by_pattern: totals.byPattern,
    by_status: totals.byStatus,
    detections: detections.map((d) => ({
      path: d.path,
      line: d.line,
      value: d.value,
      patterns: d.hits.map((h) => ({ id: h.pattern.id, broken: h.pattern.broken_raw, fixed_vi: h.pattern.fixed_vi, occurrences: h.occ })),
      match_count: d.match_count,
      run_equality_count: d.run_equality_count,
      status: d.status,
    })),
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
}

function emitMojibakeSummary(locale, detections, totals, exitCode, quiet) {
  console.log(`[triage:mojibake] locale=${locale}`);
  console.log(`  total detections: ${detections.length}`);
  console.log(`  by status:`);
  console.log(`    detected: ${totals.byStatus.detected}`);
  console.log(`    context_required: ${totals.byStatus.context_required}`);
  console.log(`    multi_pattern: ${totals.byStatus.multi_pattern}`);
  console.log(`  by pattern:`);
  for (const [id, n] of Object.entries(totals.byPattern)) {
    console.log(`    ${id}: ${n}`);
  }
  if (!quiet && detections.length > 0) {
    const sample = detections.slice(0, 10);
    console.log(`  sample (first ${sample.length}):`);
    for (const d of sample) {
      const ids = d.hits.map((h) => h.pattern.id).join('+');
      const preview = d.value.length > 60 ? d.value.slice(0, 60) + '…' : d.value;
      console.log(`    L${d.line} [${d.status}] ${ids}  ${d.path}  ${JSON.stringify(preview)}`);
    }
    if (detections.length > sample.length) {
      console.log(`    … and ${detections.length - sample.length} more`);
    }
  }
  console.log(`exit code: ${exitCode}`);
}

function runMojibake(args) {
  const { src, file } = loadLocale(args.locale);
  const ast = parseAST(src, file);
  const root = extractRoot(ast, file);
  const patterns = loadMojibakeMap();
  const leaves = [];
  walkLeavesOnly(root, [], leaves);
  const detections = detectMojibake(leaves, patterns);
  const totals = {
    byStatus: { detected: 0, context_required: 0, multi_pattern: 0 },
    byPattern: {},
  };
  for (const p of patterns) totals.byPattern[p.id] = 0;
  for (const d of detections) {
    if (d.status in totals.byStatus) totals.byStatus[d.status]++;
    for (const h of d.hits) totals.byPattern[h.pattern.id]++;
  }
  const exitCode = detections.length === 0 ? 0 : 1;
  if (args.csvPath) emitMojibakeCSV(args.locale, detections, args.csvPath);
  if (args.jsonPath) emitMojibakeJSON(args.locale, file, detections, totals, args.jsonPath);
  emitMojibakeSummary(args.locale, detections, totals, exitCode, args.quiet);
  process.exit(exitCode);
}

// ─── wrong-language mode (Session 157 Step E-2) ──────────────────────

const LOCALE_SCRIPT_PROFILE_PATH = path.join('tools', 'locale_script_profile.json');

const SCRIPT_RANGES = {
  Hangul:     /[가-힯ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]/,
  Hiragana:   /[぀-ゟ]/,
  Katakana:   /[゠-ヿㇰ-ㇿ]/,
  Han:        /[一-鿿㐀-䶿]/,
  Latin:      /[A-Za-zÀ-ɏḀ-ỿ]/,
  Cyrillic:   /[Ѐ-ӿԀ-ԯ]/,
  Arabic:     /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/,
  Devanagari: /[ऀ-ॿ]/,
  Thai:       /[฀-๿]/,
  Bopomofo:   /[㄀-ㄯㆠ-ㆿ]/,
};
const SCRIPT_NAMES = Object.keys(SCRIPT_RANGES);

function loadLocaleScriptProfile(locale) {
  if (!fs.existsSync(LOCALE_SCRIPT_PROFILE_PATH)) {
    console.error(`[triage:wrong-language] profile file not found: ${LOCALE_SCRIPT_PROFILE_PATH}`);
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(LOCALE_SCRIPT_PROFILE_PATH, 'utf8'));
  } catch (e) {
    console.error(`[triage:wrong-language] profile JSON parse failed: ${e.message}`);
    process.exit(2);
  }
  const p = raw.profiles && raw.profiles[locale];
  if (!p) {
    console.error(`[triage:wrong-language] no profile for locale "${locale}"`);
    process.exit(2);
  }
  return {
    primary: new Set(p.primary || []),
    allowed: new Set(p.allowed_supplementary || []),
    forbidden: new Set(p.forbidden || []),
  };
}

function detectScript(ch) {
  for (const name of SCRIPT_NAMES) {
    if (SCRIPT_RANGES[name].test(ch)) return name;
  }
  return null;
}

function scriptHistogram(s) {
  const hist = Object.create(null);
  let scripted = 0;
  for (const ch of s) {
    const sc = detectScript(ch);
    if (!sc) continue;
    hist[sc] = (hist[sc] || 0) + 1;
    scripted++;
  }
  return { hist, scripted };
}

function detectWrongLanguage(leaves, profile) {
  const detections = [];
  for (const leaf of leaves) {
    const { hist, scripted } = scriptHistogram(leaf.value);
    if (scripted === 0) continue;
    for (const [scriptName, count] of Object.entries(hist)) {
      if (profile.primary.has(scriptName)) continue;
      if (profile.allowed.has(scriptName)) continue;
      const severity = profile.forbidden.has(scriptName) ? 'forbidden' : 'unknown';
      const ratio = count / scripted;
      detections.push({
        path: leaf.path,
        line: leaf.line,
        value: leaf.value,
        detected_script: scriptName,
        char_count: count,
        total_chars: scripted,
        ratio,
        severity,
      });
    }
  }
  return detections;
}

function emitWrongLanguageCSV(locale, detections, csvPath) {
  const header = ['locale', 'path', 'line', 'value_preview', 'detected_script', 'char_count', 'total_chars', 'ratio', 'severity'];
  const rows = [header.map(csvField).join(',')];
  for (const d of detections) {
    const preview = d.value.length > 200 ? d.value.slice(0, 200) + '…' : d.value;
    rows.push([
      locale,
      d.path,
      d.line,
      preview,
      d.detected_script,
      d.char_count,
      d.total_chars,
      d.ratio.toFixed(2),
      d.severity,
    ].map(csvField).join(','));
  }
  fs.writeFileSync(csvPath, rows.join('\r\n') + '\r\n', 'utf8');
}

function emitWrongLanguageJSON(locale, file, profile, detections, totals, jsonPath) {
  const out = {
    locale,
    mode: 'wrong-language',
    file,
    profile: {
      primary: [...profile.primary],
      allowed_supplementary: [...profile.allowed],
      forbidden: [...profile.forbidden],
    },
    total_detections: detections.length,
    by_script: totals.byScript,
    by_severity: totals.bySeverity,
    detections: detections.map((d) => ({
      path: d.path,
      line: d.line,
      value: d.value,
      detected_script: d.detected_script,
      char_count: d.char_count,
      total_chars: d.total_chars,
      ratio: d.ratio,
      severity: d.severity,
    })),
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
}

function emitWrongLanguageSummary(locale, detections, totals, exitCode, quiet) {
  console.log(`[triage:wrong-language] locale=${locale}`);
  console.log(`  total detections: ${detections.length}`);
  console.log(`  by severity:`);
  console.log(`    forbidden: ${totals.bySeverity.forbidden}`);
  console.log(`    unknown: ${totals.bySeverity.unknown}`);
  console.log(`  by script:`);
  for (const [s, n] of Object.entries(totals.byScript)) {
    console.log(`    ${s}: ${n}`);
  }
  if (!quiet && detections.length > 0) {
    const sample = detections.slice(0, 10);
    console.log(`  sample (first ${sample.length}):`);
    for (const d of sample) {
      const preview = d.value.length > 60 ? d.value.slice(0, 60) + '…' : d.value;
      console.log(`    L${d.line} [${d.severity}] ${d.detected_script}(${d.char_count}/${d.total_chars}) ${d.path}  ${JSON.stringify(preview)}`);
    }
    if (detections.length > sample.length) {
      console.log(`    … and ${detections.length - sample.length} more`);
    }
  }
  console.log(`exit code: ${exitCode}`);
}

function runWrongLanguage(args) {
  const { src, file } = loadLocale(args.locale);
  const ast = parseAST(src, file);
  const root = extractRoot(ast, file);
  const profile = loadLocaleScriptProfile(args.locale);
  const leaves = [];
  walkLeavesOnly(root, [], leaves);
  const detections = detectWrongLanguage(leaves, profile);
  const totals = {
    bySeverity: { forbidden: 0, unknown: 0 },
    byScript: {},
  };
  for (const d of detections) {
    totals.bySeverity[d.severity]++;
    totals.byScript[d.detected_script] = (totals.byScript[d.detected_script] || 0) + 1;
  }
  const exitCode = detections.length === 0 ? 0 : 1;
  if (args.csvPath) emitWrongLanguageCSV(args.locale, detections, args.csvPath);
  if (args.jsonPath) emitWrongLanguageJSON(args.locale, file, profile, detections, totals, args.jsonPath);
  emitWrongLanguageSummary(args.locale, detections, totals, exitCode, args.quiet);
  process.exit(exitCode);
}

// ─── dead-subtree mode (Session 157 Step E-3) ────────────────────────

const ALL_LOCALES = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'id', 'th', 'vi'];
const I18N_RESOLVER_FILE = path.join('frontend', 'src', 'i18n', 'index.js');
const EXPECTED_RESOLVER_PATTERN = /deepGet\s*\([^)]*,\s*key\s*\)/;
const SOURCE_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '__pycache__']);

let _rgChecked = false;
let _rgAvailable = false;
function rgAvailable() {
  if (_rgChecked) return _rgAvailable;
  _rgChecked = true;
  try {
    execSync('rg --version', { stdio: 'ignore' });
    _rgAvailable = true;
  } catch (e) {
    _rgAvailable = false;
  }
  return _rgAvailable;
}

function findSubtree(root, dottedPath) {
  const parts = dottedPath.split('.');
  let cur = root;
  for (const part of parts) {
    if (!cur || cur.type !== 'ObjectExpression') return null;
    let next = null;
    for (const prop of cur.properties) {
      if (prop.type !== 'Property') continue;
      const name = keyName(prop);
      if (name === part) {
        next = prop.value;
        break;
      }
    }
    if (next === null) return null;
    cur = next;
  }
  return cur;
}

function* walkSourceFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      yield* walkSourceFiles(path.join(dir, ent.name));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name);
      if (SOURCE_EXTS.includes(ext)) {
        yield path.join(dir, ent.name);
      }
    }
  }
}

function rgSearch(pattern, srcRoot, isLiteral) {
  const occurrences = [];
  if (rgAvailable()) {
    const args = [
      '--no-messages',
      '--line-number',
      '--with-filename',
      isLiteral ? '-F' : '-e',
      pattern,
      ...SOURCE_EXTS.map((e) => `--glob=*${e}`),
      srcRoot,
    ];
    let stdout;
    try {
      stdout = execSync(`rg ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (e) {
      // rg exits 1 when no matches — that's normal
      if (e.status === 1 && (!e.stdout || e.stdout.toString() === '')) {
        return { hits: 0, occurrences: [] };
      }
      // any other error: fall back to JS
      stdout = '';
    }
    const lines = stdout.split('\n').filter(Boolean);
    for (const ln of lines) {
      const m = ln.match(/^(.+?):(\d+):(.*)$/);
      if (!m) continue;
      occurrences.push({ file: m[1].replace(/\\/g, '/'), line: parseInt(m[2], 10), preview: m[3].slice(0, 120) });
    }
    return { hits: occurrences.length, occurrences };
  }
  // fs fallback
  const re = isLiteral ? null : new RegExp(pattern);
  for (const f of walkSourceFiles(srcRoot)) {
    let content;
    try {
      content = fs.readFileSync(f, 'utf8');
    } catch (e) {
      continue;
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = isLiteral ? line.includes(pattern) : re.test(line);
      if (match) {
        occurrences.push({ file: f.replace(/\\/g, '/'), line: i + 1, preview: line.slice(0, 120) });
      }
    }
  }
  return { hits: occurrences.length, occurrences };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkResolverInvariant() {
  const file = I18N_RESOLVER_FILE;
  if (!fs.existsSync(file)) {
    return { valid: false, file, reason: 'resolver file not found' };
  }
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(EXPECTED_RESOLVER_PATTERN);
  if (!m) {
    return { valid: false, file, reason: 'expected deepGet(...,key) pattern not found' };
  }
  return { valid: true, file, snippet: m[0] };
}

function crossLocaleAstScan(rootPath) {
  const present = [];
  const absent = [];
  for (const loc of ALL_LOCALES) {
    const fp = path.join('frontend', 'src', 'i18n', 'locales', `${loc}.js`);
    if (!fs.existsSync(fp)) {
      absent.push(loc);
      continue;
    }
    let ast;
    try {
      ast = acorn.parse(fs.readFileSync(fp, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
    } catch (e) {
      absent.push(loc);
      continue;
    }
    const ed = ast.body.find((n) => n.type === 'ExportDefaultDeclaration');
    if (!ed || ed.declaration.type !== 'ObjectExpression') {
      absent.push(loc);
      continue;
    }
    const sub = findSubtree(ed.declaration, rootPath);
    if (sub !== null) present.push(loc);
    else absent.push(loc);
  }
  return {
    total_locales: ALL_LOCALES.length,
    present_in: present,
    absent_in: absent,
    symmetric: absent.length === 0,
  };
}

function emitDeadSubtreeCSV(locale, rootPath, layers, csvPath) {
  const header = ['locale', 'root_path', 'layer', 'pattern', 'hit_count', 'file', 'line_number', 'context_preview'];
  const rows = [header.map(csvField).join(',')];
  const layerSpecs = [
    { id: 'L1_literal', pattern: rootPath, data: layers.L1_literal },
    { id: 'L2_template', pattern: layers.L2_template.pattern, data: layers.L2_template },
    { id: 'L2_bracket_parent', pattern: layers.L2_bracket_parent.pattern, data: layers.L2_bracket_parent },
    { id: 'L2_bracket_self', pattern: layers.L2_bracket_self.pattern, data: layers.L2_bracket_self },
  ];
  for (const L of layerSpecs) {
    if (L.data.hits === 0) {
      rows.push([locale, rootPath, L.id, L.pattern, 0, '', '', ''].map(csvField).join(','));
    } else {
      for (const o of L.data.occurrences) {
        rows.push([locale, rootPath, L.id, L.pattern, L.data.hits, o.file, o.line, o.preview].map(csvField).join(','));
      }
    }
  }
  rows.push([locale, rootPath, 'L3_semantic', 'resolver_invariant', layers.L3_semantic.valid ? 'ok' : 'invalid', layers.L3_semantic.file, '', layers.L3_semantic.snippet || layers.L3_semantic.reason || ''].map(csvField).join(','));
  rows.push([locale, rootPath, 'L4_xlocale_presence', 'present_in', layers.L4_xlocale_presence.present_in.length, '', '', layers.L4_xlocale_presence.present_in.join(',')].map(csvField).join(','));
  fs.writeFileSync(csvPath, rows.join('\r\n') + '\r\n', 'utf8');
}

function emitDeadSubtreeJSON(result, jsonPath) {
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
}

function emitDeadSubtreeSummary(result, quiet) {
  console.log(`[triage:dead-subtree] locale=${result.locale} root=${result.root_path}`);
  console.log(`  subtree_leaf_count: ${result.subtree_leaf_count}`);
  console.log(`  Layer 1 literal:        ${result.layers.L1_literal.hits} hits`);
  console.log(`  Layer 2 template:       ${result.layers.L2_template.hits} hits  (${result.layers.L2_template.pattern})`);
  console.log(`  Layer 2 bracket-parent: ${result.layers.L2_bracket_parent.hits} hits  (${result.layers.L2_bracket_parent.pattern})`);
  console.log(`  Layer 2 bracket-self:   ${result.layers.L2_bracket_self.hits} hits  (${result.layers.L2_bracket_self.pattern})`);
  console.log(`  Layer 3 resolver:       ${result.layers.L3_semantic.valid ? 'valid' : 'INVALID'} (${result.layers.L3_semantic.file})`);
  const x = result.layers.L4_xlocale_presence;
  console.log(`  Layer 4 xlocale:        ${x.present_in.length}/${x.total_locales} present  ${x.symmetric ? '(symmetric)' : '(asymmetric: absent in ' + x.absent_in.join(',') + ')'}`);
  console.log(`  total_consumers: ${result.total_consumers}`);
  console.log(`  status: ${result.status}  verdict: ${result.verdict}`);
  if (!quiet && result.total_consumers > 0) {
    console.log(`  sample consumer hits (first 5):`);
    const all = [
      ...result.layers.L1_literal.occurrences.map((o) => ({ ...o, layer: 'L1' })),
      ...result.layers.L2_template.occurrences.map((o) => ({ ...o, layer: 'L2t' })),
      ...result.layers.L2_bracket_parent.occurrences.map((o) => ({ ...o, layer: 'L2bp' })),
      ...result.layers.L2_bracket_self.occurrences.map((o) => ({ ...o, layer: 'L2bs' })),
    ].slice(0, 5);
    for (const o of all) {
      console.log(`    [${o.layer}] ${o.file}:${o.line}  ${JSON.stringify(o.preview)}`);
    }
  }
}

function runDeadSubtree(args) {
  if (!args.root) {
    console.error('[triage:dead-subtree] missing required --root <dotted.path>');
    process.exit(2);
  }
  const { src, file } = loadLocale(args.locale);
  const ast = parseAST(src, file);
  const root = extractRoot(ast, file);
  const subtree = findSubtree(root, args.root);
  if (subtree === null) {
    console.error(`[triage:dead-subtree] root path "${args.root}" not found in ${file}`);
    process.exit(2);
  }
  const subtreeLeafCount = countLeaves(subtree);

  const lastSeg = args.root.split('.').pop();
  const parts = args.root.split('.');
  const parentSeg = parts.length >= 2 ? parts[parts.length - 2] : null;

  const srcRoot = args.srcRoot;

  const L1 = rgSearch(args.root, srcRoot, true);
  const L2tpl = rgSearch(`t\\(\`\\$\\{[^}]+\\}${escapeRegex(lastSeg)}\``, srcRoot, false);
  L2tpl.pattern = `t(\`\${...}${lastSeg}\`)`;
  const L2bp = parentSeg
    ? (() => { const r = rgSearch(`\\b${escapeRegex(parentSeg)}\\s*\\[`, srcRoot, false); r.pattern = `${parentSeg}[`; return r; })()
    : { hits: 0, occurrences: [], pattern: '(no parent)' };
  const L2bs = (() => { const r = rgSearch(`\\b${escapeRegex(lastSeg)}\\s*\\[`, srcRoot, false); r.pattern = `${lastSeg}[`; return r; })();

  const L3 = checkResolverInvariant();
  const L4 = crossLocaleAstScan(args.root);

  const total_consumers = L1.hits + L2tpl.hits + L2bp.hits + L2bs.hits;
  let status, verdict;
  if (total_consumers === 0 && L3.valid) {
    status = 'dead'; verdict = 'safe_to_delete';
  } else if (total_consumers === 0 && !L3.valid) {
    status = 'dead_uncertain'; verdict = 'review_resolver';
  } else if (L1.hits === 0 && (L2tpl.hits + L2bp.hits + L2bs.hits) > 0) {
    status = 'live_dynamic_only'; verdict = 'do_not_delete';
  } else {
    status = 'live'; verdict = 'do_not_delete';
  }

  const result = {
    locale: args.locale,
    mode: 'dead-subtree',
    root_path: args.root,
    src_root: srcRoot,
    subtree_leaf_count: subtreeLeafCount,
    layers: {
      L1_literal: L1,
      L2_template: L2tpl,
      L2_bracket_parent: L2bp,
      L2_bracket_self: L2bs,
      L3_semantic: L3,
      L4_xlocale_presence: L4,
    },
    total_consumers,
    status,
    verdict,
    generated_at: new Date().toISOString(),
  };

  if (args.csvPath) emitDeadSubtreeCSV(args.locale, args.root, result.layers, args.csvPath);
  if (args.jsonPath) emitDeadSubtreeJSON(result, args.jsonPath);
  emitDeadSubtreeSummary(result, args.quiet);

  const exitCode = total_consumers === 0 ? 1 : 0;
  process.exit(exitCode);
}

// ─── mode all (Session 157 Step E-4) ─────────────────────────────────

function runAll(args) {
  const outDir = args.outDir || `triage_out_${args.locale}`;
  fs.mkdirSync(outDir, { recursive: true });

  const modes = ['collision', 'mojibake', 'wrong-language'];
  if (args.root) modes.push('dead-subtree');

  const results = {};
  let aggregateExit = 0;

  for (const mode of modes) {
    const csvPath = path.join(outDir, `${mode}.csv`);
    const jsonPath = path.join(outDir, `${mode}.json`);
    const cmd = [
      process.argv[0],
      process.argv[1],
      '--locale', args.locale,
      '--mode', mode,
      '--csv', csvPath,
      '--json', jsonPath,
      '--quiet',
    ];
    if (mode === 'dead-subtree') {
      cmd.push('--root', args.root);
      if (args.srcRoot && args.srcRoot !== 'frontend/src') {
        cmd.push('--src-root', args.srcRoot);
      }
    }
    let exitCode = 0;
    try {
      execSync(cmd.map((c) => `"${String(c).replace(/"/g, '\\"')}"`).join(' '), { stdio: 'pipe' });
    } catch (e) {
      exitCode = e.status || 1;
    }
    let total = 0;
    let extra = {};
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if ('total_collisions' in data) total = data.total_collisions;
      else if ('total_detections' in data) total = data.total_detections;
      else if ('subtree_leaf_count' in data) total = data.subtree_leaf_count;
      if (mode === 'wrong-language' && data.by_script) extra.by_script = data.by_script;
      if (mode === 'dead-subtree') {
        extra.status = data.status;
        extra.verdict = data.verdict;
        extra.total_consumers = data.total_consumers;
      }
    } catch (e) {}
    results[mode] = { total, exit_code: exitCode, ...extra };
    if (exitCode === 2) aggregateExit = 2;
    else if (exitCode === 1 && aggregateExit !== 2) aggregateExit = 1;
  }

  const summary = {
    locale: args.locale,
    mode: 'all',
    generated_at: new Date().toISOString(),
    modes_run: modes,
    results,
    aggregate_exit_code: aggregateExit,
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

  if (!args.quiet) {
    console.log(`[triage:all] locale=${args.locale}  out=${outDir}`);
    for (const mode of modes) {
      const r = results[mode];
      let extra = '';
      if (mode === 'dead-subtree' && r.status) extra = `  status=${r.status}  consumers=${r.total_consumers}`;
      console.log(`  ${mode.padEnd(16)}: ${String(r.total).padStart(6)} (exit ${r.exit_code})${extra}`);
    }
    console.log(`aggregate exit code: ${aggregateExit}`);
  }
  process.exit(aggregateExit);
}

main();

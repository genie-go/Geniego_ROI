#!/usr/bin/env node
// tools/triage.mjs — i18n locale triage (collision mode v1)
// Session 157 Step B. Persists the 156-session AST dotted-keypath
// collision detection pattern (ed3c4a0 / d4ae187). Read-only.

import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const VALID_LOCALES = new Set([
  'ko', 'en', 'ja', 'zh', 'zh-TW', 'es', 'fr', 'de',
  'pt', 'ru', 'ar', 'hi', 'id', 'th', 'vi',
]);
const VALID_MODES = new Set(['collision']);

function parseArgs(argv) {
  const args = { locale: null, mode: null, csvPath: null, jsonPath: null, quiet: false };
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

main();

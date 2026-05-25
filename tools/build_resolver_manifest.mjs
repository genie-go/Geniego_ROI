#!/usr/bin/env node
/**
 * tools/build_resolver_manifest.mjs
 *
 * Resolver consumer manifest v1 — static regex scan of frontend code to enumerate
 * i18n key paths actually referenced. Output JSON consumed by triage_apply.mjs
 * --detector dead-subtree to break out of conservative-skip mode.
 *
 * Spec : docs/spec/resolver_consumer_manifest_v1.md §3
 * Patterns:
 *   direct  : t('a.b.c') | t("a.b.c") | i18n.t('a.b.c') | i18n.t("a.b.c")
 *   prefix  : t(`a.b.${...}`)  → "a.b.*"
 *   dynamic : t(varName)       → "varName" (suspect, over-collect for safety)
 *
 * Usage: node tools/build_resolver_manifest.mjs --root frontend/src --locale ko --out tools/resolver_consumer_manifest.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

function parseArgs(argv) {
  const opts = { root: 'frontend/src', locale: 'ko', out: 'tools/resolver_consumer_manifest.json' };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--root':   opts.root = args[++i]; break;
      case '--locale': opts.locale = args[++i]; break;
      case '--out':    opts.out = args[++i]; break;
      case '--help':
        process.stdout.write(`Usage: node tools/build_resolver_manifest.mjs [--root <dir>] [--locale <code>] [--out <path>]\n`);
        process.exit(0);
      default:
        process.stderr.write(`unknown flag: ${args[i]}\n`);
        process.exit(2);
    }
  }
  return opts;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage']);
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);

function walkFiles(dir) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const e of entries) {
      const p = join(d, e);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) {
        if (SKIP_DIRS.has(e)) continue;
        walk(p);
      } else if (st.isFile() && EXTS.has(extname(e))) {
        out.push(p);
      }
    }
  }
  walk(dir);
  return out;
}

// Patterns (§3.3 + 159차 실측 확장)
const RE_DIRECT_SINGLE   = /\bt\s*\(\s*'([^'\\\n]+)'/g;
const RE_DIRECT_DOUBLE   = /\bt\s*\(\s*"([^"\\\n]+)"/g;
const RE_DIRECT_I18N_S   = /\bi18n\.t\s*\(\s*'([^'\\\n]+)'/g;
const RE_DIRECT_I18N_D   = /\bi18n\.t\s*\(\s*"([^"\\\n]+)"/g;
const RE_PREFIX_TPL      = /\bt\s*\(\s*`([^`$]*?)\$\{/g;
const RE_DYNAMIC_VAR     = /\bt\s*\(\s*([a-zA-Z_$][\w$]*)\s*[,)]/g;

// path-like literal: dot-separated identifiers
const PATH_LIKE = /^[a-zA-Z_][\w.\-]*$/;
// var names that are clearly NOT i18n keys (reduce noise but keep over-collection bias)
const DYNAMIC_BLOCKLIST = new Set([
  't', 'true', 'false', 'null', 'undefined',
  'event', 'e', 'err', 'error', 'res', 'response',
  'time', 'timeout', 'time1', 'time2',
]);

function extractFromContent(content) {
  const direct = new Set();
  const prefix = new Set();
  const dynamic = new Set();
  let m;
  for (const re of [RE_DIRECT_SINGLE, RE_DIRECT_DOUBLE, RE_DIRECT_I18N_S, RE_DIRECT_I18N_D]) {
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      const p = m[1].trim();
      if (p && PATH_LIKE.test(p)) direct.add(p);
    }
  }
  RE_PREFIX_TPL.lastIndex = 0;
  while ((m = RE_PREFIX_TPL.exec(content)) !== null) {
    const p = m[1].trim().replace(/\.+$/, '');
    if (p && PATH_LIKE.test(p)) prefix.add(p + '.*');
  }
  RE_DYNAMIC_VAR.lastIndex = 0;
  while ((m = RE_DYNAMIC_VAR.exec(content)) !== null) {
    const v = m[1];
    if (DYNAMIC_BLOCKLIST.has(v)) continue;
    dynamic.add(v);
  }
  return { direct, prefix, dynamic };
}

function main() {
  const opts = parseArgs(process.argv);
  const files = walkFiles(opts.root);
  const all = { direct: new Set(), prefix: new Set(), dynamic: new Set() };

  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf-8'); } catch { continue; }
    const parts = extractFromContent(content);
    for (const p of parts.direct)  all.direct.add(p);
    for (const p of parts.prefix)  all.prefix.add(p);
    for (const p of parts.dynamic) all.dynamic.add(p);
  }

  const manifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    generator: 'tools/build_resolver_manifest.mjs',
    locale_scope: opts.locale,
    consumers: {
      direct:  [...all.direct].sort(),
      prefix:  [...all.prefix].sort(),
      dynamic: [...all.dynamic].sort(),
    },
    summary: {
      direct_count:  all.direct.size,
      prefix_count:  all.prefix.size,
      dynamic_count: all.dynamic.size,
      scan_files:    files.length,
      scan_root:     opts.root,
    },
  };

  writeFileSync(opts.out, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  process.stdout.write(`✓ Manifest written: ${opts.out}\n`);
  process.stdout.write(`  direct:  ${manifest.summary.direct_count}\n`);
  process.stdout.write(`  prefix:  ${manifest.summary.prefix_count}\n`);
  process.stdout.write(`  dynamic: ${manifest.summary.dynamic_count}\n`);
  process.stdout.write(`  scan_files: ${manifest.summary.scan_files}\n`);
}

main();

#!/usr/bin/env node
/**
 * tools/build_resolver_manifest_v2.mjs
 *
 * Resolver consumer manifest v2 — AST-based scanner (babel-parser + traverse).
 * Replaces v1's regex extraction; preserves v1 file (보존; 비교 가능).
 *
 * Spec : docs/spec/resolver_manifest_v2_ast_grep.md §2
 * Deps : @babel/parser, @babel/traverse (transitive 가능 — frontend tooling).
 *
 * 패턴 (§2.2):
 *   direct  : CallExpression callee Identifier 'i' (t/i18n.t/$t) + arg[0] StringLiteral
 *   prefix  : 같음 + arg[0] TemplateLiteral 의 첫 quasi.cooked 가 '.' 으로 끝나면
 *             "<cooked>.replace(/\.$/, '')+'.*'"
 *   dynamic : 같음 + arg[0] Identifier → 변수명 (보수적)
 *
 * scan_root = frontend/src (locale 디렉토리 제외 — i18n/locales, i18n/locales_backup)
 *
 * Usage:
 *   node tools/build_resolver_manifest_v2.mjs [--root frontend/src] [--locale ko] [--out tools/resolver_consumer_manifest_v2.json]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

function parseArgs(argv) {
  const opts = {
    root: 'frontend/src',
    locale: 'ko',
    out: 'tools/resolver_consumer_manifest_v2.json',
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--root':   opts.root = args[++i]; break;
      case '--locale': opts.locale = args[++i]; break;
      case '--out':    opts.out = args[++i]; break;
      case '--help':
        process.stdout.write(`Usage: node tools/build_resolver_manifest_v2.mjs [--root <dir>] [--locale <code>] [--out <path>]\n`);
        process.exit(0);
      default:
        process.stderr.write(`unknown flag: ${args[i]}\n`);
        process.exit(2);
    }
  }
  return opts;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage']);
// locale data 는 manifest 산정 대상이 아님 (자기 자신 import — false positive 위험)
const SKIP_PATH_SUBSTRINGS = ['i18n' + sep + 'locales', 'i18n' + sep + 'locales_backup'];
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

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
        if (SKIP_PATH_SUBSTRINGS.some(s => p.includes(s))) continue;
        out.push(p);
      }
    }
  }
  walk(dir);
  return out;
}

const PATH_LIKE = /^[a-zA-Z_][\w.\-]*$/;
const DYNAMIC_BLOCKLIST = new Set([
  't', 'true', 'false', 'null', 'undefined',
  'event', 'e', 'err', 'error', 'res', 'response',
  'time', 'timeout', 'time1', 'time2',
]);

function isI18nCallee(callee) {
  // t(...) | i18n.t(...) | $t(...)
  if (callee.type === 'Identifier' && (callee.name === 't' || callee.name === '$t')) return true;
  if (callee.type === 'MemberExpression') {
    const prop = callee.property;
    if (prop && prop.type === 'Identifier' && prop.name === 't') return true;
  }
  return false;
}

function extractFromAst(ast) {
  const direct = new Set();
  const prefix = new Set();
  const dynamic = new Set();
  traverse(ast, {
    CallExpression(p) {
      if (!isI18nCallee(p.node.callee)) return;
      const arg = p.node.arguments[0];
      if (!arg) return;
      if (arg.type === 'StringLiteral') {
        const v = arg.value.trim();
        if (v && PATH_LIKE.test(v)) direct.add(v);
      } else if (arg.type === 'TemplateLiteral') {
        const q0 = arg.quasis[0]?.value?.cooked;
        if (q0) {
          const base = q0.trim().replace(/\.+$/, '');
          if (base && PATH_LIKE.test(base)) prefix.add(base + '.*');
        }
      } else if (arg.type === 'Identifier') {
        if (!DYNAMIC_BLOCKLIST.has(arg.name)) dynamic.add(arg.name);
      }
    },
  });
  return { direct, prefix, dynamic };
}

function main() {
  const opts = parseArgs(process.argv);
  const files = walkFiles(opts.root);
  const all = { direct: new Set(), prefix: new Set(), dynamic: new Set() };
  let parseErrors = 0;

  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf-8'); } catch { continue; }
    let ast;
    try {
      ast = parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      });
    } catch (e) {
      parseErrors++;
      continue;
    }
    const parts = extractFromAst(ast);
    for (const p of parts.direct)  all.direct.add(p);
    for (const p of parts.prefix)  all.prefix.add(p);
    for (const p of parts.dynamic) all.dynamic.add(p);
  }

  const manifest = {
    version: 2,
    generated_at: new Date().toISOString(),
    generator: 'tools/build_resolver_manifest_v2.mjs',
    extraction_method: 'babel-parser AST',
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
      parse_errors:  parseErrors,
      scan_root:     opts.root,
      skipped_substrings: SKIP_PATH_SUBSTRINGS,
    },
  };

  writeFileSync(opts.out, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  process.stderr.write(`✓ Manifest v2 written: ${opts.out}\n`);
  process.stderr.write(`  direct:  ${manifest.summary.direct_count}\n`);
  process.stderr.write(`  prefix:  ${manifest.summary.prefix_count}\n`);
  process.stderr.write(`  dynamic: ${manifest.summary.dynamic_count}\n`);
  process.stderr.write(`  scan_files: ${manifest.summary.scan_files}\n`);
  process.stderr.write(`  parse_errors: ${manifest.summary.parse_errors}\n`);
}

main();

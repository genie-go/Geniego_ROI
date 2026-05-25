#!/usr/bin/env node
/**
 * tools/p4_root_enumerator.mjs
 *
 * Session 159 P4 — enumerate object-typed root paths of a locale file
 * for use as dead-subtree detector root candidates.
 *
 * Usage:
 *   node tools/p4_root_enumerator.mjs <locale-path> [--depth N]
 *
 *   --depth 1 (default): top-level object keys only (e.g., "auth", "dash")
 *   --depth 2          : depth-2 object paths only (e.g., "auth.login")
 *                        top-level 은 제외 — P4 (depth=1) 에서 이미 검증.
 *
 * Output: newline-separated, sorted, object-typed only (string leaves and
 *         arrays excluded; detector requires subtree).
 *
 * Spec: docs/spec/session159_p4_dead_subtree_ko_dryrun.md §2.1,
 *       docs/spec/session159_p4_depth2_enumeration.md §3.1
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const opts = { target: null, depth: 1 };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--depth') {
      opts.depth = Number(args[++i]);
      if (!Number.isInteger(opts.depth) || opts.depth < 1) {
        process.stderr.write(`invalid --depth (must be positive integer)\n`);
        process.exit(2);
      }
    } else if (!opts.target) {
      opts.target = a;
    } else {
      process.stderr.write(`unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  if (!opts.target) {
    process.stderr.write('usage: node tools/p4_root_enumerator.mjs <locale-path> [--depth N]\n');
    process.exit(2);
  }
  return opts;
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function enumerate(root, depth) {
  // depth=1: top-level object keys
  // depth=2: "parent.child" object paths (top-level 제외)
  // depth=N: N-level dot-joined object paths
  const out = [];
  function walk(node, prefix, level) {
    if (level === depth) {
      // 본 노드를 path 로 emit (단, 본 노드 = object 여야 detector 가 처리 가능)
      if (isObject(node) && prefix) out.push(prefix);
      return;
    }
    if (!isObject(node)) return;
    for (const k of Object.keys(node)) {
      const child = node[k];
      if (isObject(child)) {
        walk(child, prefix ? `${prefix}.${k}` : k, level + 1);
      }
    }
  }
  walk(root, '', 0);
  return out;
}

const opts = parseArgs(process.argv);
const url = pathToFileURL(resolve(opts.target)).href + '?v=' + Date.now();
const m = await import(url);
const root = m.default ?? m;
if (!root || typeof root !== 'object') {
  process.stderr.write(`no default object export in ${opts.target}\n`);
  process.exit(2);
}

const paths = [...new Set(enumerate(root, opts.depth))].sort();
process.stdout.write(paths.join('\n') + (paths.length ? '\n' : ''));

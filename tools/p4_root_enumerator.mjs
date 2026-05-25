#!/usr/bin/env node
/**
 * tools/p4_root_enumerator.mjs
 *
 * Session 159 P4 — enumerate object-typed top-level keys of a locale file
 * for use as dead-subtree detector root candidates.
 *
 * Usage:  node tools/p4_root_enumerator.mjs <locale-path>
 * Output: newline-separated, sorted, object-typed keys only
 *         (string leaves and arrays excluded — detector requires subtree)
 *
 * Spec: docs/spec/session159_p4_dead_subtree_ko_dryrun.md §2.1 + §7
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  process.stderr.write('usage: node tools/p4_root_enumerator.mjs <locale-path>\n');
  process.exit(2);
}

const url = pathToFileURL(resolve(target)).href + '?v=' + Date.now();
const m = await import(url);
const root = m.default ?? m;
if (!root || typeof root !== 'object') {
  process.stderr.write(`no default object export in ${target}\n`);
  process.exit(2);
}

const keys = Object.keys(root)
  .filter(k => {
    const v = root[k];
    return v && typeof v === 'object' && !Array.isArray(v);
  })
  .sort();

process.stdout.write(keys.join('\n') + (keys.length ? '\n' : ''));

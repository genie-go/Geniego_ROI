#!/usr/bin/env node
/**
 * session154_selfnest_cleanup.mjs
 *
 * Session 154 — Self-nest sub-tree cleanup (Session 153 N-153-C verified).
 *
 * Target: `pages.marketingIntel.marketingIntel.*` (entire sub-tree)
 * Locales: 15 (ko, en, ja, zh, zh-TW, es, fr, de, pt, ru, ar, hi, id, th, vi)
 * Verified orphan: 1,320 paths × 0 code references (session153_t7_selfnest_full_grep.csv)
 *
 * Modes:
 *   (default)  dry-run   — report only, no file writes
 *   --apply              — perform actual cleanup (mandatory user approval)
 *
 * Safety gates (Session 145-B + 154 carry-over):
 *   G1  pre-write backup → _quarantine/cleanup_backups_s154/
 *   G2  AST-based key matching (acorn parser, no string replace)
 *   G3  parent `pages.marketingIntel.*` preservation check
 *       (only the *.marketingIntel sub-key under it is removed)
 *   G4  leaf count delta sanity (compare vs s153 quarantine extracts)
 *   G5  node --check syntax verification on each output
 *   G6  on any G-failure → revert from backup
 *
 * Operational principles applied:
 *   N-152-A (bank-grade baseline)
 *   N-152-F (one step at a time — dry-run first)
 *   N-153-B (reviewer tools default safe)
 *   N-153-C (already satisfied by s153 grep)
 *   N-153-D (separate verify-commit and cleanup-commit)
 *
 * USAGE
 *   node session154_selfnest_cleanup.mjs           # dry-run
 *   node session154_selfnest_cleanup.mjs --apply   # write
 *   node session154_selfnest_cleanup.mjs --apply --skip-build  # write, skip auto vite hint
 *
 * INPUT  : frontend/src/i18n/locales/{ko,en,ja,zh,zh-TW,es,fr,de,pt,ru,ar,hi,id,th,vi}.js
 * BACKUP : frontend/_quarantine/cleanup_backups_s154/{locale}.js.s154-pre-cleanup
 * OUTPUT : (--apply only) overwrites locale files in place
 * REPORT : stdout table + session154_selfnest_cleanup_report.csv
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { generate } from 'astring';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT  = process.cwd(); // run from repo root
const LOCALES_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'i18n', 'locales');
const BACKUP_DIR  = path.join(REPO_ROOT, 'frontend', '_quarantine', 'cleanup_backups_s154');
const REPORT_CSV  = path.join(REPO_ROOT, 'session154_selfnest_cleanup_report.csv');
const S153_QUAR   = path.join(REPO_ROOT, 'frontend', '_quarantine', 'orphan_keys_s153_self_nest');

const LOCALES = [
  'ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','id','th','vi'
];

// Sacred SHA references (Session 79 baseline; will change after cleanup — by N-153 decision A)
const SACRED_BEFORE = {
  'ja.js': 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  'zh.js': '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};

// Expected leaf counts from Session 153 quarantine extraction (±10 sanity)
const EXPECTED_REMOVED_LEAVES = {
  'ko':1135,'en':1320,'ja':1305,'zh':1305,'zh-TW':1316,'es':1320,'fr':1320,
  'de':1329,'pt':1314,'ru':1314,'ar':1314,'hi':1314,'id':1331,'th':1331,'vi':1331,
};
const LEAF_DELTA_TOLERANCE = 10;

const args  = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SKIP_BUILD_HINT = args.includes('--skip-build');

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function log(...m) { console.log(...m); }
function err(...m) { console.error('❌', ...m); }
function ok (...m) { console.log ('✅', ...m); }
function warn(...m){ console.log ('⚠️ ', ...m); }

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readLocale(localeName) {
  const fp = path.join(LOCALES_DIR, `${localeName}.js`);
  if (!fs.existsSync(fp)) throw new Error(`Missing locale file: ${fp}`);
  return { fp, src: fs.readFileSync(fp, 'utf8') };
}

function backupLocale(localeName, src) {
  ensureDir(BACKUP_DIR);
  const dst = path.join(BACKUP_DIR, `${localeName}.js.s154-pre-cleanup`);
  fs.writeFileSync(dst, src, 'utf8');
  return dst;
}

function sha256OfFile(fp) {
  // use shell sha256sum for parity with operator-side verification
  try {
    const out = execSync(`sha256sum "${fp.replace(/\\/g, '/')}"`, { encoding: 'utf8' });
    return out.trim().split(/\s+/)[0];
  } catch {
    return '(sha256sum unavailable)';
  }
}

// -----------------------------------------------------------------------------
// AST core
// -----------------------------------------------------------------------------

/**
 * Locale files follow `export default { ... };` pattern.
 * Parse, locate the default-exported ObjectExpression, then mutate.
 */
function parseLocaleSource(src) {
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  });
  let objectExpr = null;
  let exportNode = null;
  for (const node of ast.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      exportNode = node;
      let decl = node.declaration;
      // Sometimes wrapped: e.g., `export default ({...});` (ParenthesizedExpression)
      while (decl && decl.type !== 'ObjectExpression') {
        if (decl.expression) decl = decl.expression;
        else break;
      }
      if (decl && decl.type === 'ObjectExpression') {
        objectExpr = decl;
      }
      break;
    }
  }
  if (!objectExpr) {
    throw new Error('Cannot find ExportDefault ObjectExpression');
  }
  return { ast, exportNode, objectExpr };
}

/**
 * Get string key name of a Property node.
 * Supports Identifier, Literal (string), and quoted keys.
 */
function propKeyName(prop) {
  if (!prop || prop.type !== 'Property') return null;
  const k = prop.key;
  if (!k) return null;
  if (k.type === 'Identifier') return k.name;
  if (k.type === 'Literal' && typeof k.value === 'string') return k.value;
  return null;
}

/**
 * Find the `pages` → `marketingIntel` → `marketingIntel` chain in the object.
 * Returns { parentMI, selfNestProp, removedLeafCount } or null if not found.
 *
 * parentMI       = the `marketingIntel` Property under `pages` (kept)
 * selfNestProp   = the nested `marketingIntel` Property inside parentMI (to be removed)
 */
function findSelfNest(rootObj) {
  // step 1: find `pages`
  const pagesProp = rootObj.properties.find(p => propKeyName(p) === 'pages');
  if (!pagesProp || !pagesProp.value || pagesProp.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'pages-not-object' };
  }
  // step 2: find `pages.marketingIntel`
  const parentMI = pagesProp.value.properties.find(p => propKeyName(p) === 'marketingIntel');
  if (!parentMI || !parentMI.value || parentMI.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'pages.marketingIntel-not-object' };
  }
  // step 3: find pages.marketingIntel.marketingIntel
  const selfIdx = parentMI.value.properties.findIndex(p => propKeyName(p) === 'marketingIntel');
  if (selfIdx === -1) {
    return { found: false, reason: 'no-self-nest' };
  }
  const selfNestProp = parentMI.value.properties[selfIdx];
  if (!selfNestProp.value || selfNestProp.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'self-nest-not-object' };
  }

  // count leaves recursively
  const leafCount = countLeaves(selfNestProp.value);

  return {
    found: true,
    pagesProp,
    parentMI,
    parentMIProps: parentMI.value.properties,
    selfNestProp,
    selfIdx,
    leafCount,
  };
}

/**
 * Count leaf entries (non-object Property values) recursively inside an ObjectExpression.
 */
function countLeaves(objExpr) {
  if (!objExpr || objExpr.type !== 'ObjectExpression') return 0;
  let n = 0;
  for (const p of objExpr.properties) {
    if (p.type !== 'Property') continue;
    const v = p.value;
    if (v && v.type === 'ObjectExpression') {
      n += countLeaves(v);
    } else {
      n += 1;
    }
  }
  return n;
}

/**
 * Remove the self-nest property from parentMI.
 * G3 check: parentMI must still have ≥ 1 other property after removal.
 */
function removeSelfNest(found) {
  const before = found.parentMIProps.length;
  found.parentMIProps.splice(found.selfIdx, 1);
  const after = found.parentMIProps.length;
  return { before, after, parentRemainingKeys: after };
}

/**
 * Stringify the AST back to JS source.
 * astring preserves structure but not original whitespace/comments.
 * For locale files (machine-generated), this is acceptable.
 */
function stringifyLocale(ast) {
  return generate(ast, { indent: '  ', lineEnd: '\n' });
}

// -----------------------------------------------------------------------------
// Per-locale processing
// -----------------------------------------------------------------------------

function processLocale(localeName) {
  const r = { locale: localeName, status: 'pending' };
  try {
    const { fp, src } = readLocale(localeName);
    r.fp = fp;
    r.sizeBefore = Buffer.byteLength(src, 'utf8');
    r.shaBefore  = sha256OfFile(fp);

    const { ast, objectExpr } = parseLocaleSource(src);
    const totalLeavesBefore = countLeaves(objectExpr);
    r.leavesBefore = totalLeavesBefore;

    const found = findSelfNest(objectExpr);
    if (!found.found) {
      r.status = 'skip';
      r.reason = found.reason;
      r.removedLeaves = 0;
      r.parentRemaining = null;
      return r;
    }
    r.removedLeaves = found.leafCount;

    // G4 delta sanity
    const expected = EXPECTED_REMOVED_LEAVES[localeName];
    if (expected != null) {
      const delta = Math.abs(found.leafCount - expected);
      r.expectedRemoved = expected;
      r.expectedDelta   = delta;
      if (delta > LEAF_DELTA_TOLERANCE) {
        r.status = 'block';
        r.reason = `G4-fail: removed=${found.leafCount} expected=${expected} delta=${delta}`;
        return r;
      }
    }

    // perform removal in AST
    const rem = removeSelfNest(found);
    r.parentRemaining = rem.parentRemainingKeys;
    if (rem.parentRemainingKeys === 0) {
      r.status = 'block';
      r.reason = 'G3-fail: pages.marketingIntel parent would become empty';
      return r;
    }

    if (!APPLY) {
      r.status = 'dry-ok';
      r.leavesAfter = totalLeavesBefore - found.leafCount;
      return r;
    }

    // ---- APPLY mode ----
    // G1: backup
    const bkp = backupLocale(localeName, src);
    r.backup = bkp;

    // Stringify + write
    const out = stringifyLocale(ast);
    fs.writeFileSync(fp, out, 'utf8');

    // G5: syntax check via node --check
    try {
      execSync(`node --check "${fp.replace(/\\/g, '/')}"`, { stdio: 'pipe' });
    } catch (e) {
      // G6 revert
      fs.writeFileSync(fp, src, 'utf8');
      r.status = 'reverted';
      r.reason = `G5-fail: node --check failed (${e.message.split('\n')[0]})`;
      return r;
    }

    r.sizeAfter   = Buffer.byteLength(out, 'utf8');
    r.shaAfter    = sha256OfFile(fp);
    r.leavesAfter = totalLeavesBefore - found.leafCount;
    r.status = 'applied';
    return r;

  } catch (e) {
    r.status = 'error';
    r.reason = e.message;
    return r;
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main() {
  log('='.repeat(78));
  log(`session154 self-nest cleanup — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`repo: ${REPO_ROOT}`);
  log(`target: pages.marketingIntel.marketingIntel.*  (15 locales)`);
  log('='.repeat(78));

  // sacred sha pre-check (informational; will change after apply on ja/zh)
  for (const sf of Object.keys(SACRED_BEFORE)) {
    const fp = path.join(LOCALES_DIR, sf);
    const cur = sha256OfFile(fp);
    const exp = SACRED_BEFORE[sf];
    const m = cur === exp ? 'match' : 'DIFF';
    log(`  sacred ${sf} pre-sha = ${cur.slice(0,16)}… (${m})`);
  }
  log('');

  const results = [];
  for (const loc of LOCALES) {
    const r = processLocale(loc);
    results.push(r);
    const tag = ({
      'dry-ok':    '🟦',
      'applied':   '✅',
      'skip':      '⏭️ ',
      'block':     '⛔',
      'reverted':  '↩️ ',
      'error':     '❌',
    })[r.status] || '?';
    log(
      `${tag} ${loc.padEnd(6)} ` +
      `removed=${String(r.removedLeaves ?? '?').padStart(5)}  ` +
      `before=${String(r.leavesBefore ?? '?').padStart(6)}  ` +
      `after=${String(r.leavesAfter ?? '?').padStart(6)}  ` +
      `parentKeep=${String(r.parentRemaining ?? '?').padStart(3)}  ` +
      (r.reason ? `(${r.reason})` : '')
    );
  }

  // CSV report
  const header = [
    'locale','status','removed_leaves','expected_removed','leaves_before','leaves_after',
    'parent_remaining','size_before','size_after','sha_before','sha_after','reason'
  ];
  const csvRows = [header.join(',')];
  for (const r of results) {
    csvRows.push([
      r.locale,
      r.status,
      r.removedLeaves ?? '',
      r.expectedRemoved ?? '',
      r.leavesBefore ?? '',
      r.leavesAfter ?? '',
      r.parentRemaining ?? '',
      r.sizeBefore ?? '',
      r.sizeAfter ?? '',
      r.shaBefore ?? '',
      r.shaAfter ?? '',
      (r.reason ?? '').replace(/,/g, ';'),
    ].join(','));
  }
  fs.writeFileSync(REPORT_CSV, csvRows.join('\n'), 'utf8');
  log('');
  ok(`report: ${REPORT_CSV}`);

  // summary
  const totalRemoved = results.reduce((a,r) => a + (r.removedLeaves || 0), 0);
  const blocks = results.filter(r => r.status === 'block' || r.status === 'error' || r.status === 'reverted');
  log('');
  log(`TOTAL removed leaves: ${totalRemoved}  (expected ≈ 19,599)`);
  log(`blocks/errors      : ${blocks.length}`);
  if (blocks.length) {
    for (const b of blocks) err(`  ${b.locale}: ${b.status} — ${b.reason}`);
  }

  // post-apply sacred sha report
  if (APPLY) {
    log('');
    log('Post-apply sacred SHA (expected to differ from Session 79 baseline):');
    for (const sf of Object.keys(SACRED_BEFORE)) {
      const fp = path.join(LOCALES_DIR, sf);
      log(`  ${sf} new-sha = ${sha256OfFile(fp)}`);
    }
    if (!SKIP_BUILD_HINT) {
      log('');
      log('Next steps (operator):');
      log('  1) cd frontend && npm run build      # vite build green check');
      log('  2) git diff --stat frontend/src/i18n/locales/');
      log('  3) commit on user explicit approval (N-145-G)');
    }
  } else {
    log('');
    log('DRY-RUN complete. To apply: node session154_selfnest_cleanup.mjs --apply');
  }

  process.exit(blocks.length ? 2 : 0);
}

main();

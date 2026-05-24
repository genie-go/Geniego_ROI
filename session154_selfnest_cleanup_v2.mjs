#!/usr/bin/env node
/**
 * session154_selfnest_cleanup_v2.mjs
 *
 * Session 154 — Self-nest sub-tree cleanup (SURGICAL VERSION).
 *
 * v1 (session154_selfnest_cleanup.mjs) used AST + astring stringify which
 * caused 12 locales to be fully re-serialized (~344k insertions /
 * 379k deletions). Diff review was infeasible → bank-grade infosec failure
 * (N-152-A). v1 was reverted; v2 below performs offset-based surgical
 * removal: acorn parses with locations, the target Property node's
 * `start`/`end` byte range (extended to swallow the trailing comma and
 * whitespace) is sliced out of the original source string. Format,
 * quoting style, and key order of all other content are byte-identical
 * to the pre-cleanup file. Expected diff: ~19,599 deletions, ~0 insertions.
 *
 * Target  : `pages.marketingIntel.marketingIntel.*` (entire sub-tree)
 * Locales : 15 (ko, en, ja, zh, zh-TW, es, fr, de, pt, ru, ar, hi, id, th, vi)
 * Verified orphan: Session 153 N-153-C — 1,320 paths × 0 code references.
 *
 * Modes
 *   (default)         dry-run — no writes, report only
 *   --apply           perform surgical cleanup
 *
 * Safety gates
 *   G1  pre-write backup → frontend/_quarantine/cleanup_backups_s154/ (re-used)
 *   G2  AST offset-based excision (no string-replace, no AST stringify)
 *   G3  parent pages.marketingIntel sibling-count ≥ 1 after removal
 *   G4  removed-leaf count within ±10 of session-153 expectations
 *   G5  node --check syntax verification after write; on fail → G6 revert
 *   G6  auto-revert from backup
 *   G7  line-delta sanity (deletions ≥ 0.8 × leaves removed,
 *                         insertions ≤ 0.1 × leaves removed)
 *
 * Operational principles applied
 *   N-152-A, N-152-F, N-153-A, N-153-B, N-153-C, N-153-D
 *
 * USAGE
 *   node session154_selfnest_cleanup_v2.mjs           # dry-run
 *   node session154_selfnest_cleanup_v2.mjs --apply   # write
 *
 * INPUT  : frontend/src/i18n/locales/{15 locales}.js
 * BACKUP : frontend/_quarantine/cleanup_backups_s154/{locale}.js.s154-pre-cleanup
 *          (existing v1 backups reused — they ARE the pre-cleanup originals
 *          since v1 was reverted from them; SHA verified by operator.)
 * OUTPUT : (--apply only) overwrites locale files in place
 * REPORT : session154_selfnest_cleanup_v2_report.csv
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parse } from 'acorn';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const REPO_ROOT   = process.cwd();
const LOCALES_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'i18n', 'locales');
const BACKUP_DIR  = path.join(REPO_ROOT, 'frontend', '_quarantine', 'cleanup_backups_s154');
const REPORT_CSV  = path.join(REPO_ROOT, 'session154_selfnest_cleanup_v2_report.csv');

const LOCALES = [
  'ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','id','th','vi'
];

const SACRED_BEFORE = {
  'ja.js': 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  'zh.js': '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};

const EXPECTED_REMOVED_LEAVES = {
  'ko':1135,'en':1320,'ja':1305,'zh':1305,'zh-TW':1316,'es':1320,'fr':1320,
  'de':1329,'pt':1314,'ru':1314,'ar':1314,'hi':1314,'id':1331,'th':1331,'vi':1331,
};
const LEAF_DELTA_TOLERANCE = 10;

// G7 line-delta thresholds (per leaf removed)
const DEL_MIN_RATIO = 0.8;
const INS_MAX_RATIO = 0.1;

const args  = process.argv.slice(2);
const APPLY = args.includes('--apply');

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function log(...m) { console.log(...m); }
function err(...m) { console.error('❌', ...m); }
function ok (...m) { console.log ('✅', ...m); }

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sha256OfFile(fp) {
  try {
    const out = execSync(`sha256sum "${fp.replace(/\\/g, '/')}"`, { encoding: 'utf8' });
    return out.trim().split(/\s+/)[0];
  } catch {
    return '(sha256sum-unavailable)';
  }
}

function readLocale(localeName) {
  const fp = path.join(LOCALES_DIR, `${localeName}.js`);
  if (!fs.existsSync(fp)) throw new Error(`Missing locale file: ${fp}`);
  return { fp, src: fs.readFileSync(fp, 'utf8') };
}

function backupLocale(localeName, src) {
  ensureDir(BACKUP_DIR);
  // re-use v1 backup filename ONLY if not already present (v1 backups are
  // the true pre-cleanup originals after revert; do not overwrite).
  const dst = path.join(BACKUP_DIR, `${localeName}.js.s154-pre-cleanup`);
  if (!fs.existsSync(dst)) {
    fs.writeFileSync(dst, src, 'utf8');
  }
  return dst;
}

// -----------------------------------------------------------------------------
// AST locate
// -----------------------------------------------------------------------------

function parseLocaleSource(src) {
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  });
  let objectExpr = null;
  for (const node of ast.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      let decl = node.declaration;
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
  if (!objectExpr) throw new Error('No ExportDefault ObjectExpression');
  return objectExpr;
}

function propKeyName(prop) {
  if (!prop || prop.type !== 'Property') return null;
  const k = prop.key;
  if (!k) return null;
  if (k.type === 'Identifier') return k.name;
  if (k.type === 'Literal' && typeof k.value === 'string') return k.value;
  return null;
}

function countLeaves(objExpr) {
  if (!objExpr || objExpr.type !== 'ObjectExpression') return 0;
  let n = 0;
  for (const p of objExpr.properties) {
    if (p.type !== 'Property') continue;
    const v = p.value;
    if (v && v.type === 'ObjectExpression') n += countLeaves(v);
    else n += 1;
  }
  return n;
}

/**
 * Locate the self-nest Property within `pages.marketingIntel`.
 * Return locator object with offsets + sibling context for surgical excision.
 */
function locateSelfNest(rootObj) {
  const pagesProp = rootObj.properties.find(p => propKeyName(p) === 'pages');
  if (!pagesProp || pagesProp.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'pages-missing' };
  }
  const parentMI = pagesProp.value.properties.find(p => propKeyName(p) === 'marketingIntel');
  if (!parentMI || parentMI.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'pages.marketingIntel-missing' };
  }
  const siblings = parentMI.value.properties;
  const selfIdx = siblings.findIndex(p => propKeyName(p) === 'marketingIntel');
  if (selfIdx === -1) return { found: false, reason: 'no-self-nest' };
  const selfProp = siblings[selfIdx];
  if (!selfProp.value || selfProp.value.type !== 'ObjectExpression') {
    return { found: false, reason: 'self-nest-not-object' };
  }
  const leafCount = countLeaves(selfProp.value);
  const parentRemaining = siblings.length - 1;
  return {
    found: true,
    selfProp,
    siblings,
    selfIdx,
    parentRemaining,
    leafCount,
    // start/end byte offsets of the self-nest Property
    selfStart: selfProp.start,
    selfEnd: selfProp.end,
    // sibling offsets for comma cleanup
    prevSiblingEnd: selfIdx > 0 ? siblings[selfIdx - 1].end : null,
    nextSiblingStart: selfIdx < siblings.length - 1 ? siblings[selfIdx + 1].start : null,
    parentObjStart: parentMI.value.start,   // includes the `{`
    parentObjEnd: parentMI.value.end,       // includes the `}`
  };
}

/**
 * Surgical excision plan:
 *   case A — self-nest is NOT last sibling :
 *     cut [selfStart, nextSiblingStart) — removes the property and the
 *     comma+whitespace separating it from the next sibling
 *   case B — self-nest IS last sibling AND has previous siblings :
 *     cut [prevSiblingEnd, selfEnd) — removes the leading comma+ws and the
 *     property itself, leaving the previous sibling clean
 *   case C — self-nest is the ONLY sibling (parentRemaining === 0) :
 *     blocked by G3
 *
 * Choose case based on layout; produce { sliceStart, sliceEnd }.
 */
function planExcision(loc) {
  if (loc.parentRemaining === 0) {
    return { ok: false, reason: 'G3-parent-empty-after-removal' };
  }
  // Case A : there is a next sibling — cut up to its start
  if (loc.nextSiblingStart != null) {
    return {
      ok: true,
      sliceStart: loc.selfStart,
      sliceEnd: loc.nextSiblingStart,
      mode: 'A-not-last',
    };
  }
  // Case B : self-nest is last sibling — cut from prevSiblingEnd
  if (loc.prevSiblingEnd != null) {
    return {
      ok: true,
      sliceStart: loc.prevSiblingEnd,
      sliceEnd: loc.selfEnd,
      mode: 'B-last',
    };
  }
  // Defensive — shouldn't reach (covered by G3)
  return { ok: false, reason: 'G3-no-siblings' };
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
    r.linesBefore = src.split('\n').length;
    r.shaBefore = sha256OfFile(fp);

    const rootObj = parseLocaleSource(src);
    const totalBefore = countLeaves(rootObj);
    r.leavesBefore = totalBefore;

    const loc = locateSelfNest(rootObj);
    if (!loc.found) {
      r.status = 'skip';
      r.reason = loc.reason;
      r.removedLeaves = 0;
      return r;
    }
    r.removedLeaves = loc.leafCount;
    r.parentRemaining = loc.parentRemaining;

    // G4 — leaf count sanity
    const expected = EXPECTED_REMOVED_LEAVES[localeName];
    if (expected != null) {
      r.expectedRemoved = expected;
      const delta = Math.abs(loc.leafCount - expected);
      r.expectedDelta = delta;
      if (delta > LEAF_DELTA_TOLERANCE) {
        r.status = 'block';
        r.reason = `G4-fail: removed=${loc.leafCount} expected=${expected}`;
        return r;
      }
    }

    const plan = planExcision(loc);
    if (!plan.ok) {
      r.status = 'block';
      r.reason = plan.reason;
      return r;
    }
    r.excisionMode = plan.mode;
    r.sliceStart = plan.sliceStart;
    r.sliceEnd = plan.sliceEnd;
    r.sliceBytes = plan.sliceEnd - plan.sliceStart;

    // Build new source by surgical slice
    const newSrc = src.slice(0, plan.sliceStart) + src.slice(plan.sliceEnd);
    r.sizeAfter = Buffer.byteLength(newSrc, 'utf8');
    r.linesAfter = newSrc.split('\n').length;

    // G7 — line-delta sanity (informational on dry-run, enforced on apply)
    const deletions = r.linesBefore - r.linesAfter;
    const insertions = 0; // surgical slice never inserts content
    r.deletions = deletions;
    r.insertions = insertions;
    const delMin = Math.floor(loc.leafCount * DEL_MIN_RATIO);
    const insMax = Math.ceil(loc.leafCount * INS_MAX_RATIO);
    if (deletions < delMin) {
      r.status = 'block';
      r.reason = `G7-fail: deletions=${deletions} < min=${delMin}`;
      return r;
    }
    if (insertions > insMax) {
      r.status = 'block';
      r.reason = `G7-fail: insertions=${insertions} > max=${insMax}`;
      return r;
    }

    if (!APPLY) {
      r.status = 'dry-ok';
      r.leavesAfter = totalBefore - loc.leafCount;
      return r;
    }

    // ---- APPLY ----
    // G1 — backup (idempotent if already exists from v1)
    r.backup = backupLocale(localeName, src);

    // Write
    fs.writeFileSync(fp, newSrc, 'utf8');

    // G5 — node --check
    try {
      execSync(`node --check "${fp.replace(/\\/g, '/')}"`, { stdio: 'pipe' });
    } catch (e) {
      // G6 revert
      fs.writeFileSync(fp, src, 'utf8');
      r.status = 'reverted';
      r.reason = `G5-fail: ${e.message.split('\n')[0]}`;
      return r;
    }

    r.shaAfter = sha256OfFile(fp);
    r.leavesAfter = totalBefore - loc.leafCount;
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
  log(`session154 self-nest cleanup v2 (surgical) — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`repo: ${REPO_ROOT}`);
  log(`target: pages.marketingIntel.marketingIntel.*  (15 locales)`);
  log('='.repeat(78));

  for (const sf of Object.keys(SACRED_BEFORE)) {
    const fp = path.join(LOCALES_DIR, sf);
    const cur = sha256OfFile(fp);
    const match = cur === SACRED_BEFORE[sf] ? 'match' : 'DIFF';
    log(`  sacred ${sf} pre-sha = ${cur.slice(0,16)}… (${match})`);
  }
  log('');

  const results = [];
  for (const loc of LOCALES) {
    const r = processLocale(loc);
    results.push(r);
    const tag = ({
      'dry-ok':'🟦','applied':'✅','skip':'⏭️ ','block':'⛔','reverted':'↩️ ','error':'❌'
    })[r.status] || '?';
    log(
      `${tag} ${loc.padEnd(6)} ` +
      `removed=${String(r.removedLeaves ?? '?').padStart(5)}  ` +
      `before=${String(r.leavesBefore ?? '?').padStart(6)}  ` +
      `after=${String(r.leavesAfter ?? '?').padStart(6)}  ` +
      `Δlines=-${String(r.deletions ?? '?').padStart(5)}/+${r.insertions ?? '?'}  ` +
      `mode=${r.excisionMode ?? '-'}  ` +
      (r.reason ? `(${r.reason})` : '')
    );
  }

  // CSV
  const header = [
    'locale','status','removed_leaves','expected_removed','leaves_before','leaves_after',
    'lines_before','lines_after','deletions','insertions','size_before','size_after',
    'excision_mode','slice_start','slice_end','slice_bytes',
    'sha_before','sha_after','reason'
  ];
  const rows = [header.join(',')];
  for (const r of results) {
    rows.push([
      r.locale, r.status,
      r.removedLeaves ?? '', r.expectedRemoved ?? '',
      r.leavesBefore ?? '', r.leavesAfter ?? '',
      r.linesBefore ?? '', r.linesAfter ?? '',
      r.deletions ?? '', r.insertions ?? '',
      r.sizeBefore ?? '', r.sizeAfter ?? '',
      r.excisionMode ?? '', r.sliceStart ?? '', r.sliceEnd ?? '', r.sliceBytes ?? '',
      r.shaBefore ?? '', r.shaAfter ?? '',
      (r.reason ?? '').replace(/,/g, ';'),
    ].join(','));
  }
  fs.writeFileSync(REPORT_CSV, rows.join('\n'), 'utf8');
  log('');
  ok(`report: ${REPORT_CSV}`);

  const totalRemoved = results.reduce((a,r)=>a+(r.removedLeaves||0),0);
  const totalDel = results.reduce((a,r)=>a+(r.deletions||0),0);
  const totalIns = results.reduce((a,r)=>a+(r.insertions||0),0);
  const blocks = results.filter(r => ['block','error','reverted'].includes(r.status));
  log('');
  log(`TOTAL removed leaves : ${totalRemoved}  (expected ≈ 19,599)`);
  log(`TOTAL line deletions : ${totalDel}`);
  log(`TOTAL line insertions: ${totalIns}  (target: 0)`);
  log(`blocks/errors        : ${blocks.length}`);
  if (blocks.length) for (const b of blocks) err(`  ${b.locale}: ${b.status} — ${b.reason}`);

  if (APPLY) {
    log('');
    log('Post-apply sacred SHA (will differ from Session 79 baseline — Decision A):');
    for (const sf of Object.keys(SACRED_BEFORE)) {
      const fp = path.join(LOCALES_DIR, sf);
      log(`  ${sf} new-sha = ${sha256OfFile(fp)}`);
    }
    log('');
    log('Next steps (operator):');
    log('  1) cd frontend && npm run build');
    log('  2) git diff --stat frontend/src/i18n/locales/');
    log('  3) commit on user explicit approval (N-145-G)');
  } else {
    log('');
    log('DRY-RUN complete. To apply: node session154_selfnest_cleanup_v2.mjs --apply');
  }

  process.exit(blocks.length ? 2 : 0);
}

main();

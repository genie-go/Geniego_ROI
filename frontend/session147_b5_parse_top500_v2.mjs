// session147_b5_parse_top500_v2.mjs
// Parse top500_raw.txt (5 BATCH blocks) -> japanese_top500_mapped.csv
// V2 ADDITIONS (N-147-A guard):
//   - WARNING if ja_value contains Hangul (가-힣)              [prevents rank-499 type accidents]
//   - WARNING if ja_value has zero CJK chars (suspect entry)
//   - WARNING if proposed_ko contains kana (translation miss)
//   - WARNING if proposed_ko contains Hanzi (translation residue)
// All new checks are non-fatal warnings; only structural errors abort.

import fs from 'node:fs';
import path from 'node:path';

const ROOT     = 'E:/project/GeniegoROI/frontend';
const IN_PATH  = path.join(ROOT, 'top500_raw.txt');
const OUT_PATH = path.join(ROOT, 'japanese_top500_mapped.csv');

// Regex sets
const RE_HANGUL   = /[\uAC00-\uD7AF]/;
const RE_HIRAGANA = /[\u3040-\u309F]/;
const RE_KATAKANA = /[\u30A0-\u30FF]/;
const RE_CJK_HAN  = /[\u3400-\u4DBF\u4E00-\u9FFF]/;
const RE_HANZI_G  = /[\u3400-\u4DBF\u4E00-\u9FFF]/g;

// ---------- CSV writer ----------
function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function writeCsv(filepath, header, rows) {
  const lines = [];
  lines.push(header.map(csvEscape).join(','));
  for (const r of rows) {
    lines.push(r.map(csvEscape).join(','));
  }
  const out = '\uFEFF' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(filepath, out, { encoding: 'utf8' });
}

// ---------- V2 per-entry validation ----------
function detectIssues(rank, ja, ko) {
  const issues = [];

  // 1. ja_value contains Hangul (most critical — N-147-A trigger)
  if (RE_HANGUL.test(ja)) {
    const positions = [];
    for (let i = 0; i < ja.length; i++) {
      if (RE_HANGUL.test(ja[i])) positions.push(`${ja[i]}@${i}`);
    }
    issues.push(`HANGUL_IN_JA rank=${rank} chars=[${positions.join(',')}] ja="${ja.slice(0, 60)}"`);
  }

  // 2. ja_value has zero CJK chars (kana or kanji)
  const hasKana = RE_HIRAGANA.test(ja) || RE_KATAKANA.test(ja);
  const hasHan  = RE_CJK_HAN.test(ja);
  if (!hasKana && !hasHan) {
    issues.push(`NO_CJK_IN_JA rank=${rank} ja="${ja.slice(0, 60)}"`);
  }

  // 3. proposed_ko contains kana (translation residue)
  if (RE_HIRAGANA.test(ko) || RE_KATAKANA.test(ko)) {
    issues.push(`KANA_IN_KO rank=${rank} ko="${ko.slice(0, 60)}"`);
  }

  // 4. proposed_ko contains Hanzi (might be translation residue — but Chinese chars
  //    sometimes appear legitimately in Korean compound terms; flag only, don't act)
  const hanInKo = ko.match(RE_HANZI_G);
  if (hanInKo) {
    issues.push(`HANZI_IN_KO rank=${rank} count=${hanInKo.length} chars=[${hanInKo.slice(0,5).join(',')}] ko="${ko.slice(0, 60)}"`);
  }

  return issues;
}

// ---------- MAIN ----------
function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`[ERROR] input not found: ${IN_PATH}`);
    process.exit(1);
  }

  let raw = fs.readFileSync(IN_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = raw.split('\n');
  const entries = [];
  const errors = [];
  const warnings = [];
  const v2Warnings = []; // new N-147-A warnings

  const lineRe = /^(\d+)\|([^|]*?)\|(.*)$/;

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('###') || trimmed.startsWith('BATCH_')) continue;

    const m = trimmed.match(lineRe);
    if (!m) {
      if (/^\d+\|/.test(trimmed)) {
        errors.push(`line ${lineNo}: malformed -> ${trimmed.slice(0, 80)}`);
      }
      continue;
    }

    const rank = parseInt(m[1], 10);
    const ja = m[2];
    const ko = m[3];

    if (ja === '') { errors.push(`line ${lineNo}: empty ja_value at rank ${rank}`); continue; }
    if (ko === '') { errors.push(`line ${lineNo}: empty proposed_ko at rank ${rank}`); continue; }

    entries.push({ rank, ja, ko, lineNo });

    // V2 checks
    const issues = detectIssues(rank, ja, ko);
    for (const iss of issues) v2Warnings.push(iss);
  }

  // Structural validation
  if (entries.length !== 500) {
    errors.push(`expected 500 entries, got ${entries.length}`);
  }
  entries.sort((a, b) => a.rank - b.rank);
  for (let i = 0; i < entries.length; i++) {
    const expected = i + 1;
    if (entries[i].rank !== expected) {
      errors.push(`rank gap: expected ${expected}, got ${entries[i].rank} at line ${entries[i].lineNo}`);
    }
  }

  // Duplicate ja_value
  const jaMap = new Map();
  for (const e of entries) {
    const ex = jaMap.get(e.ja);
    if (ex) {
      warnings.push(`duplicate ja_value at rank ${e.rank} (also at rank ${ex.rank}): "${e.ja.slice(0, 40)}"`);
    } else {
      jaMap.set(e.ja, e);
    }
  }

  // Print errors (fatal)
  if (errors.length > 0) {
    console.error('================ ERRORS ================');
    for (const err of errors) console.error('  [ERROR] ' + err);
    console.error('========================================');
    console.error(`Total errors: ${errors.length}. ABORTING.`);
    process.exit(1);
  }

  // Print warnings (non-fatal)
  if (warnings.length > 0) {
    console.warn('================ STRUCTURAL WARNINGS ================');
    for (const w of warnings) console.warn('  [WARN] ' + w);
    console.warn('=====================================================');
  }

  if (v2Warnings.length > 0) {
    console.warn('============= V2 SCRIPT-PURITY WARNINGS =============');
    // Group by category for readability
    const byCat = {};
    for (const w of v2Warnings) {
      const cat = w.split(' ')[0];
      (byCat[cat] = byCat[cat] || []).push(w);
    }
    for (const [cat, list] of Object.entries(byCat)) {
      console.warn(`  [${cat}] x${list.length}`);
      for (const w of list) console.warn('    ' + w);
    }
    console.warn('=====================================================');
    console.warn('NOTE: V2 warnings are non-fatal. Review each carefully.');
    console.warn('      HANGUL_IN_JA is the most serious (causes ko.js patch silently to miss the entry).');
  }

  // Write output
  const outRows = entries.map(e => [String(e.rank), e.ja, e.ko]);
  writeCsv(OUT_PATH, ['rank', 'ja_value', 'proposed_ko'], outRows);

  console.log('================ B5 V2 PARSE SUMMARY ================');
  console.log(`input        : ${IN_PATH}`);
  console.log(`output       : ${OUT_PATH}`);
  console.log(`entries      : ${entries.length}`);
  console.log(`errors       : ${errors.length}`);
  console.log(`struct warns : ${warnings.length} (duplicates, non-fatal)`);
  console.log(`v2 warnings  : ${v2Warnings.length} (script purity, non-fatal)`);
  console.log('=====================================================');
  console.log('First 3:');
  for (let i = 0; i < 3 && i < entries.length; i++) {
    const e = entries[i];
    console.log(`  #${e.rank}: ${e.ja.slice(0, 30)} -> ${e.ko.slice(0, 30)}`);
  }
  console.log('Last 3:');
  for (let i = Math.max(0, entries.length - 3); i < entries.length; i++) {
    const e = entries[i];
    console.log(`  #${e.rank}: ${e.ja.slice(0, 30)} -> ${e.ko.slice(0, 30)}`);
  }
  console.log('=====================================================');
}

main();

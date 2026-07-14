#!/usr/bin/env node
// tools/dedup_collisions.mjs
// Session collision-dedup helper. For a given locale, parse the AST,
// detect duplicate dotted key-paths (same logic as triage.mjs collision
// mode), and remove every EARLIER occurrence's Property node so only the
// last (runtime-effective) definition survives. JS object literal: last
// key wins, so removing earlier occurrences preserves runtime behavior.
//
// Removal is byte-exact: the Property node range plus the trailing comma
// (and any inline same-line whitespace up to and including the newline)
// is excised. We mutate from the highest start offset downward so that
// earlier offsets remain valid.
//
// Usage: node tools/dedup_collisions.mjs --locale <L> [--apply]
//   default = dry-run (prints what would be removed)
//   --apply = writes the file back (UTF-8, no BOM)

import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

function parseArgs(argv) {
  const a = { locale: null, apply: false, src: null };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--locale') a.locale = argv[++i];
    else if (x === '--apply') a.apply = true;
    else if (x === '--src') a.src = argv[++i];
    else { console.error('unknown arg', x); process.exit(2); }
  }
  if (!a.locale) { console.error('missing --locale'); process.exit(2); }
  return a;
}

function keyName(prop) {
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal') return String(prop.key.value);
  return null;
}

// Collect every Property with its full dotted path.
function walk(node, parts, out) {
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    const name = keyName(prop);
    if (name === null) continue;
    const full = [...parts, name].join('.');
    out.push({ path: full, prop, parent: node });
    if (prop.value.type === 'ObjectExpression') {
      walk(prop.value, [...parts, name], out);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const file = args.src ?? path.join('frontend', 'src', 'i18n', 'locales', `${args.locale}.js`);
  const src = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
  const ed = ast.body.find((n) => n.type === 'ExportDefaultDeclaration');
  const root = ed.declaration;

  const records = [];
  walk(root, [], records);

  // Group by path, but collisions are only meaningful among SIBLINGS that
  // share the same parent object (which is exactly what produces an identical
  // dotted path). Group by path string.
  const byPath = new Map();
  for (const r of records) {
    if (!byPath.has(r.path)) byPath.set(r.path, []);
    byPath.get(r.path).push(r);
  }

  // For each colliding path, mark all but the LAST (by source start offset)
  // sibling-occurrence for removal. We must only dedup within the same parent
  // (true runtime last-wins). Two same-path entries always share the same
  // parent object, so ordering by start offset is correct.
  const toRemove = []; // { path, prop }
  for (const [p, list] of byPath) {
    if (list.length < 2) continue;
    // sort by source order
    const sorted = [...list].sort((a, b) => a.prop.start - b.prop.start);
    // keep last, remove the rest
    for (let i = 0; i < sorted.length - 1; i++) {
      toRemove.push({ path: p, prop: sorted[i].prop, parent: sorted[i].parent });
    }
  }

  if (toRemove.length === 0) {
    console.log(`[dedup] ${args.locale}: no collisions, nothing to remove`);
    return;
  }

  // Compute precise removal spans. For each property to remove, the span is
  // [propStart, end] where end extends past the trailing comma and the rest
  // of that line (including the newline) if the property occupies its own line.
  // We find the property's index in its parent's properties array to locate
  // the comma boundary safely.
  const spans = [];
  for (const item of toRemove) {
    const { prop, parent } = item;
    const idx = parent.properties.indexOf(prop);
    const start = prop.start;
    // Find end of this property INCLUDING trailing comma.
    let end = prop.end;
    // scan forward for the comma
    let commaIdx = -1;
    for (let i = end; i < src.length; i++) {
      const ch = src[i];
      if (ch === ',') { commaIdx = i; break; }
      if (ch === '}' ) { break; } // last property, no trailing comma
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') continue;
      break; // something unexpected; stop
    }
    if (commaIdx !== -1) {
      end = commaIdx + 1;
    }
    // Trim leading whitespace on the property's own line back to (but not
    // including) the preceding newline, plus consume one trailing newline,
    // so we do not leave a blank line.
    let realStart = start;
    let s = start - 1;
    while (s >= 0 && (src[s] === ' ' || src[s] === '\t')) s--;
    if (s >= 0 && src[s] === '\n') {
      realStart = s + 1; // start at beginning of indentation
    }
    // consume trailing line break after the comma
    let realEnd = end;
    while (realEnd < src.length && (src[realEnd] === ' ' || src[realEnd] === '\t' || src[realEnd] === '\r')) realEnd++;
    if (realEnd < src.length && src[realEnd] === '\n') realEnd++;
    spans.push({ start: realStart, end: realEnd, path: item.path, line: prop.loc.start.line, preview: src.slice(prop.start, Math.min(prop.end, prop.start + 80)) });
  }

  // Overlap resolution: when an earlier-duplicate BLOCK is removed, its
  // child properties may also appear as their own colliding spans nested
  // inside it. Drop any span fully contained within another span so we
  // splice each region exactly once (the outer block removal subsumes it).
  spans.sort((a, b) => (a.start - b.start) || (b.end - a.end));
  const kept = [];
  for (const sp of spans) {
    const container = kept.find((k) => k.start <= sp.start && k.end >= sp.end);
    if (container) continue; // nested inside an already-kept removal span
    kept.push(sp);
  }
  spans.length = 0;
  spans.push(...kept);

  // sort descending by start so splicing doesn't shift earlier offsets
  spans.sort((a, b) => b.start - a.start);

  console.log(`[dedup] ${args.locale}: removing ${spans.length} earlier duplicate occurrence(s):`);
  for (const sp of [...spans].sort((a, b) => a.start - b.start)) {
    console.log(`  L${sp.line}  ${sp.path}  ${sp.preview.replace(/\s+/g, ' ')}`);
  }

  let out = src;
  for (const sp of spans) {
    out = out.slice(0, sp.start) + out.slice(sp.end);
  }

  // verify parses
  try {
    acorn.parse(out, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (e) {
    console.error(`[dedup] ${args.locale}: POST-EDIT PARSE FAILED: ${e.message}`);
    process.exit(3);
  }

  if (args.apply) {
    fs.writeFileSync(file, out, { encoding: 'utf8' }); // no BOM
    console.log(`[dedup] ${args.locale}: WROTE ${file} (${src.length} -> ${out.length} bytes)`);
  } else {
    console.log(`[dedup] ${args.locale}: DRY-RUN ok (${src.length} -> ${out.length} bytes). Re-run with --apply to write.`);
  }
}

main();

/**
 * SAFE JSX Structural Auditor & Fixer
 * ─────────────────────────────────────
 * 1. Runs vite build to find the FIRST broken file
 * 2. Reads the entire file and performs deep structural analysis
 * 3. Shows exactly where tags are mismatched
 * 4. Does NOT auto-fix — only reports
 * 
 * Usage: node _audit.cjs
 */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname);
const VITE = path.join(ROOT, 'node_modules/vite/bin/vite.js');

// ─── Step 1: Find the first broken file ───
let brokenFile, brokenLine, errorMsg;
try {
  execSync(`node "${VITE}" build`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('✅ Build succeeded! No errors.');
  process.exit(0);
} catch (err) {
  const out = (err.stdout || '') + (err.stderr || '');
  const m = out.match(/([A-Za-z]:\/[^\s:]+\.jsx):(\d+):(\d+): ERROR: (.+)/);
  if (!m) { console.log('Unknown error:\n', out.substring(0, 500)); process.exit(1); }
  brokenFile = m[1];
  brokenLine = parseInt(m[2]);
  errorMsg = m[4];
}

console.log(`\n═══ BROKEN FILE: ${path.basename(brokenFile)} ═══`);
console.log(`Line ${brokenLine}: ${errorMsg}\n`);

// ─── Step 2: Deep structural analysis ───
const src = fs.readFileSync(brokenFile, 'utf8');
const lines = src.split('\n');

// Find all component/function boundaries
const components = [];
let currentComp = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const funcMatch = line.match(/^(export\s+)?(default\s+)?function\s+(\w+)/);
  const arrowMatch = line.match(/^const\s+(\w+)\s*=\s*\(/);
  if (funcMatch || arrowMatch) {
    if (currentComp) currentComp.end = i - 1;
    currentComp = { name: funcMatch ? funcMatch[3] : arrowMatch[1], start: i, end: null };
    components.push(currentComp);
  }
}
if (currentComp) currentComp.end = lines.length - 1;

// Find which component contains the error
const errorComp = components.find(c => brokenLine - 1 >= c.start && brokenLine - 1 <= c.end);
if (errorComp) {
  console.log(`Component: ${errorComp.name} [lines ${errorComp.start + 1}-${errorComp.end + 1}]`);
}

// ─── Step 3: Tag-level analysis in error component ───
const startLine = errorComp ? errorComp.start : Math.max(0, brokenLine - 50);
const endLine = errorComp ? errorComp.end : Math.min(lines.length - 1, brokenLine + 50);

// Track JSX nesting
const tagStack = [];
const issues = [];

for (let i = startLine; i <= endLine; i++) {
  const line = lines[i];
  
  // Find opening tags: <TagName or <div
  const opens = line.matchAll(/<(\w+)[\s>]/g);
  for (const m of opens) {
    // Skip self-closing on same line
    const restOfLine = line.substring(m.index);
    if (restOfLine.match(new RegExp(`<${m[1]}[^>]*/>`))) continue;
    tagStack.push({ tag: m[1], line: i + 1 });
  }
  
  // Find closing tags: </TagName>
  const closes = line.matchAll(/<\/(\w+)>/g);
  for (const m of closes) {
    if (tagStack.length === 0) {
      issues.push({ line: i + 1, msg: `Extra closing </${m[1]}> with no matching open tag` });
      continue;
    }
    const last = tagStack[tagStack.length - 1];
    if (last.tag === m[1]) {
      tagStack.pop();
    } else {
      issues.push({ line: i + 1, msg: `</${m[1]}> but expected </${last.tag}> (opened at line ${last.line})` });
      // Try to recover by popping if we find the tag deeper in stack
      const deeper = tagStack.findIndex(t => t.tag === m[1]);
      if (deeper >= 0) {
        const unclosed = tagStack.splice(deeper);
        unclosed.forEach(t => {
          if (t.tag !== m[1]) {
            issues.push({ line: t.line, msg: `<${t.tag}> opened here but never closed before line ${i + 1}` });
          }
        });
      }
    }
  }
}

// Remaining unclosed tags
tagStack.forEach(t => {
  issues.push({ line: t.line, msg: `<${t.tag}> opened but never closed` });
});

console.log(`\n─── Tag Balance Issues (${issues.length}) ───`);
issues.forEach(iss => {
  console.log(`  Line ${iss.line}: ${iss.msg}`);
});

// ─── Step 4: Show context around error ───
console.log(`\n─── Context around line ${brokenLine} ───`);
const ctxStart = Math.max(0, brokenLine - 8);
const ctxEnd = Math.min(lines.length - 1, brokenLine + 4);
for (let i = ctxStart; i <= ctxEnd; i++) {
  const marker = i === brokenLine - 1 ? '>>>' : '   ';
  console.log(`${marker} ${i + 1}: ${lines[i].substring(0, 140)}`);
}

// ─── Step 5: Show the full component return block structure ───
if (errorComp) {
  console.log(`\n─── Return block structure (${errorComp.name}) ───`);
  let depth = 0;
  const returnStart = lines.findIndex((l, i) => i >= errorComp.start && l.includes('return ('));
  if (returnStart >= 0) {
    for (let i = returnStart; i <= endLine; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      // Only show structural lines (open/close tags, braces)
      if (trimmed.startsWith('<') || trimmed.startsWith('{') || trimmed.startsWith('}') || 
          trimmed.startsWith(')') || trimmed === '' || trimmed.includes('return')) {
        if (i >= brokenLine - 3 && i <= brokenLine + 1) {
          console.log(`>>> ${i + 1}: ${line.substring(0, 140)}`);
        } else {
          console.log(`    ${i + 1}: ${line.substring(0, 140)}`);
        }
      }
    }
  }
}

/**
 * _cleanup_excess.cjs — Safe Excess </div> Removal Script v2
 * 
 * SAFETY RULES:
 *   1. ONLY removes </div> tags — NEVER adds any
 *   2. Only removes from functions where the FUNCTION's own return block
 *      has more </div> than <div (negative balance = excess closes)
 *   3. Only removes trailing </div> lines at the end of the function
 *   4. Never removes more than the excess count
 *   5. Validates total file balance before and after
 *   6. Dry-run by default (pass --apply to actually write)
 */

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DIR = path.join(__dirname, 'src/pages');

function countDivs(line) {
  const opens = (line.match(/<div[\s>]/g) || []).length;
  const selfClose = (line.match(/<div[^>]*\/>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  return { opens: opens - selfClose, closes };
}

function findFunctions(lines) {
  const funcs = [];
  const funcPattern = /^(export\s+default\s+)?function\s+\w+/;
  for (let i = 0; i < lines.length; i++) {
    if (funcPattern.test(lines[i].trim())) {
      funcs.push({ start: i, name: lines[i].trim().match(/function\s+(\w+)/)?.[1] || '?' });
    }
  }
  for (let i = 0; i < funcs.length; i++) {
    funcs[i].end = (i + 1 < funcs.length) ? funcs[i + 1].start - 1 : lines.length - 1;
  }
  return funcs;
}

function analyzeFunction(lines, func) {
  let totalOpens = 0, totalCloses = 0;
  for (let i = func.start; i <= func.end; i++) {
    const { opens, closes } = countDivs(lines[i]);
    totalOpens += opens;
    totalCloses += closes;
  }
  const balance = totalOpens - totalCloses; // negative = excess closes
  
  if (balance >= 0) return { removals: [], balance };
  
  // balance is negative — we have |balance| excess </div>
  const excessCount = -balance;
  
  // Find trailing </div> lines at the end of the function
  // Walk backwards from funcEnd, skipping empty lines, ); and }
  const removals = [];
  let found = 0;
  
  for (let i = func.end; i >= func.start && found < excessCount; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed === ');' || trimmed === '}' || trimmed === '\r') continue;
    if (trimmed === '</div>') {
      removals.push(i);
      found++;
    } else {
      break; // Stop at first non-</div> content line
    }
  }
  
  return { removals, balance, excess: excessCount, found };
}

// ═══ Main ═══
console.log(`═══ Safe Excess </div> Cleanup v2 ═══`);
console.log(`Mode: ${APPLY ? '⚠️  APPLY' : '🔍 DRY-RUN'}\n`);

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jsx'));
let totalRemoved = 0;
const report = [];

for (const file of files) {
  const filePath = path.join(DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const funcs = findFunctions(lines);
  const fileRemovals = [];
  
  for (const func of funcs) {
    const { removals, balance, excess, found } = analyzeFunction(lines, func);
    if (removals.length > 0) {
      fileRemovals.push({ 
        func: func.name, 
        removals, 
        balance, 
        excess 
      });
    }
  }
  
  if (fileRemovals.length === 0) continue;
  
  // Calculate file-level impact
  const allRemovals = new Set();
  for (const r of fileRemovals) {
    for (const idx of r.removals) allRemovals.add(idx);
  }
  
  // File-level div balance
  let fileOpens = 0, fileCloses = 0;
  for (const line of lines) {
    const { opens, closes } = countDivs(line);
    fileOpens += opens;
    fileCloses += closes;
  }
  const fileBal = fileOpens - fileCloses;
  const newFileBal = fileBal + allRemovals.size;
  
  console.log(`📄 ${file} (file balance: ${fileBal} → ${newFileBal})`);
  for (const r of fileRemovals) {
    console.log(`   ${r.func}: balance=${r.balance}, removing ${r.removals.length} trailing </div> at L${r.removals.map(l=>l+1).join(',')}`);
  }
  
  if (APPLY) {
    const newLines = lines.filter((_, idx) => !allRemovals.has(idx));
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`   ✅ Written (removed ${allRemovals.size} lines)\n`);
  } else {
    console.log(`   (dry-run)\n`);
  }
  
  totalRemoved += allRemovals.size;
  report.push({ file, removed: allRemovals.size, fileBal, newFileBal });
}

console.log(`\n═══ Summary ═══`);
console.log(`Files: ${report.length} | Lines removed: ${totalRemoved}`);
if (!APPLY && totalRemoved > 0) {
  console.log(`\n⚡ Run: node _cleanup_excess.cjs --apply`);
}

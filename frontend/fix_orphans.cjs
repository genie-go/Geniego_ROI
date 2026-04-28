/**
 * Remove orphan closing tags that appear after ); or )} closings
 * These are leftovers from corrupted function boundaries
 */
const fs = require('fs');
const esbuild = require('esbuild');
const path = require('path');

const TARGET = path.resolve(__dirname, 'src/pages/Admin.jsx');

async function validate(code) {
  try {
    await esbuild.transform(code, { loader: 'jsx', jsx: 'automatic' });
    return null;
  } catch (e) {
    return e.message;
  }
}

function removeOrphanClosings(content) {
  const lines = content.split('\n');
  let removed = 0;
  
  // Find consecutive </div> lines that come after ); or )} on a line by itself
  // but before a const/function/export declaration
  const toRemove = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Check pattern: )} or ); followed by consecutive </div> lines
    // that are followed by a function/const declaration
    if (trimmed === ')}' || trimmed === ');') {
      // Check if next lines are all </div>
      let j = i + 1;
      // Skip empty lines
      while (j < lines.length && lines[j].trim() === '') j++;
      
      const divStart = j;
      while (j < lines.length && lines[j].trim() === '</div>') j++;
      
      if (j > divStart) {
        // Found consecutive </div> after )} or );
        // Check what comes after
        const afterTrimmed = (lines[j] || '').trim();
        if (afterTrimmed.startsWith('const ') || afterTrimmed.startsWith('function ') || 
            afterTrimmed.startsWith('export ') || afterTrimmed.startsWith('/* ') ||
            afterTrimmed === '' || afterTrimmed.startsWith('}') ||
            afterTrimmed.startsWith(');')) {
          // These </div> are orphans — they're between a function close and the next declaration
          for (let k = divStart; k < j; k++) {
            toRemove.add(k);
          }
        }
      }
    }
  }
  
  if (toRemove.size > 0) {
    const newLines = lines.filter((_, i) => !toRemove.has(i));
    console.log(`Removed ${toRemove.size} orphan </div> lines at: ${[...toRemove].map(i => 'L' + (i + 1)).join(', ')}`);
    return { content: newLines.join('\n'), changes: toRemove.size };
  }
  
  return { content, changes: 0 };
}

async function main() {
  console.log('=== Orphan Closing Tag Remover ===\n');
  
  let content = fs.readFileSync(TARGET, 'utf-8');
  let totalChanges = 0;
  
  // Run multiple passes
  for (let pass = 0; pass < 5; pass++) {
    const { content: fixed, changes } = removeOrphanClosings(content);
    if (changes === 0) break;
    content = fixed;
    totalChanges += changes;
  }
  
  fs.writeFileSync(TARGET, content, 'utf-8');
  console.log(`\nTotal removed: ${totalChanges}`);
  
  // Now run div balance fixer
  const lines = content.split('\n');
  const returnStarts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*return\s*\(/.test(lines[i])) {
      returnStarts.push(i);
    }
  }
  
  // Check remaining div depths
  let needsFixes = false;
  for (let ri = 0; ri < returnStarts.length; ri++) {
    const retLine = returnStarts[ri];
    let parenDepth = 0;
    let endLine = -1;
    for (let i = retLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') {
          parenDepth--;
          if (parenDepth === 0) { endLine = i; break; }
        }
      }
      if (endLine >= 0) break;
    }
    if (endLine < 0) continue;
    
    let divDepth = 0;
    for (let i = retLine; i <= endLine; i++) {
      divDepth += (lines[i].match(/<div/g) || []).length;
      divDepth -= (lines[i].match(/<\/div>/g) || []).length;
    }
    if (divDepth !== 0) {
      console.log(`  Return at L${retLine+1}: div depth = ${divDepth}`);
      needsFixes = true;
    }
  }
  
  // Validate
  const err = await validate(content);
  if (!err) {
    console.log('\n✅ Admin.jsx passes esbuild validation!');
  } else {
    const match = err.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
    if (match) {
      console.log(`\n⚠️ Remaining error at L${match[1]}:${match[2]}: ${match[3]}`);
    }
  }
}

main().catch(console.error);

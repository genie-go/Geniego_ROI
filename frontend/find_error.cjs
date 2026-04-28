// Binary search for first broken line in Audit.jsx
const fs = require('fs');
const esbuild = require('esbuild');

const content = fs.readFileSync('src/pages/Audit.jsx', 'utf8');
const lines = content.split('\n');

async function testRange(start, end) {
  // Create a valid JSX file with just these lines wrapped in a function
  const slice = lines.slice(start, end).join('\n');
  const testCode = `import React from 'react';\nfunction Test() { return (\n${slice}\n); }`;
  try {
    await esbuild.transform(testCode, { loader: 'jsx', jsx: 'automatic' });
    return true;
  } catch { return false; }
}

async function main() {
  const total = lines.length;
  
  // Test the return block (lines 330-573)
  // Find first failure point by testing incremental ranges
  for (let endLine = 340; endLine <= 574; endLine += 10) {
    const ok = await testRange(329, endLine);
    if (!ok) {
      // Narrow down
      for (let precise = endLine - 9; precise <= endLine; precise++) {
        const ok2 = await testRange(329, precise);
        if (!ok2) {
          console.log(`First failure at line ${precise}`);
          console.log(`Content: ${lines[precise-1]?.trim()?.substring(0, 100)}`);
          // Show surrounding context
          for (let c = Math.max(precise-3, 0); c <= Math.min(precise+1, total-1); c++) {
            console.log(`  L${c+1}: ${lines[c]?.trim()?.substring(0, 120)}`);
          }
          break;
        }
      }
      break;
    }
  }
}

main();

/**
 * Smart JSX div-balance fixer for Admin.jsx
 * For each function with a return(), calculates div depth and adds/removes
 * closing </div> tags at the end to balance.
 * Also fixes the orphan comment close pattern.
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

function fixFile(content) {
  let lines = content.split('\n');
  let changes = 0;
  
  // Step 1: Find all function return() blocks and balance divs
  // Find all "return (" lines
  const returnStarts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*return\s*\(/.test(lines[i])) {
      returnStarts.push(i);
    }
  }
  
  console.log(`Found ${returnStarts.length} return() blocks`);
  
  // For each return, find the matching ); and check div depth
  // Process in reverse so line numbers don't shift
  for (let ri = returnStarts.length - 1; ri >= 0; ri--) {
    const retLine = returnStarts[ri];
    
    // Find matching ); — track paren depth
    let parenDepth = 0;
    let endLine = -1;
    for (let i = retLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            endLine = i;
            break;
          }
        }
      }
      if (endLine >= 0) break;
    }
    
    if (endLine < 0) continue;
    
    // Calculate div depth within this return block
    let divDepth = 0;
    for (let i = retLine; i <= endLine; i++) {
      divDepth += (lines[i].match(/<div/g) || []).length;
      divDepth -= (lines[i].match(/<\/div>/g) || []).length;
    }
    
    if (divDepth === 0) continue; // balanced
    
    if (divDepth > 0) {
      // Need to add </div> tags
      // Find the line just before ); to insert
      const insertBefore = endLine;
      console.log(`  Return at L${retLine+1}: div depth = +${divDepth}, adding ${divDepth} </div> before L${endLine+1}`);
      
      // Get the indent from the endLine
      const endIndent = lines[insertBefore].length - lines[insertBefore].trimStart().length;
      const closingTags = [];
      for (let d = 0; d < divDepth; d++) {
        closingTags.push(' '.repeat(endIndent + 2 + d * 2) + '</div>');
      }
      
      lines.splice(insertBefore, 0, ...closingTags);
      changes += divDepth;
    } else {
      // Too many </div> — remove extras from the end of the block
      const excess = -divDepth;
      console.log(`  Return at L${retLine+1}: div depth = ${divDepth}, removing ${excess} extra </div>`);
      
      // Find the last N consecutive </div> lines before ); and remove extras
      let removed = 0;
      for (let i = endLine - 1; i > retLine && removed < excess; i--) {
        if (lines[i].trim() === '</div>') {
          lines.splice(i, 1);
          removed++;
          endLine--; // adjust
        }
      }
      changes += removed;
    }
  }
  
  return { content: lines.join('\n'), changes };
}

async function main() {
  console.log('=== Smart JSX Div-Balance Fixer ===\n');
  
  let content = fs.readFileSync(TARGET, 'utf-8');
  
  // Apply div balance fixes
  const { content: fixed, changes } = fixFile(content);
  console.log(`\nApplied ${changes} div fixes`);
  
  // Save and validate
  fs.writeFileSync(TARGET, fixed, 'utf-8');
  
  const err = await validate(fixed);
  if (!err) {
    console.log('\n✅ Admin.jsx passes esbuild validation!');
  } else {
    const match = err.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
    if (match) {
      console.log(`\n⚠️ Remaining error at L${match[1]}:${match[2]}: ${match[3]}`);
    } else {
      console.log('\n⚠️ Remaining errors');
    }
  }
}

main().catch(console.error);

/**
 * Auto-fix JSX syntax errors in Admin.jsx using esbuild validation loop.
 * Strategy: scan for known broken patterns, fix them, validate with esbuild, repeat.
 */
const fs = require('fs');
const esbuild = require('esbuild');
const path = require('path');

const TARGET = path.resolve(__dirname, 'src/pages/Admin.jsx');

async function validate(code) {
  try {
    await esbuild.transform(code, { loader: 'jsx', jsx: 'automatic' });
    return null; // no error
  } catch (e) {
    return e.message;
  }
}

function fixOrphanCommentCloses(content) {
  // Pattern: </div>\nKorean_text */  → </div>\n  );\n}\n\n/* ── Korean_text */
  const lines = content.split('\n');
  let fixed = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Check for bare Korean/English text ending with */
    if (/^[^\/<\*{].*\*\/\s*$/.test(trimmed) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      // Check if previous line is </div> or similar closing tag
      const prevTrimmed = (lines[i-1] || '').trim();
      if (prevTrimmed === '</div>' || prevTrimmed === '</div>}' || prevTrimmed.endsWith('</div>')) {
        console.log(`  [FIX] L${i+1}: Orphan comment close → adding ); } and /* ──`);
        lines[i] = '  );\n}\n\n/* ── ' + trimmed;
        fixed = true;
      }
    }
  }
  return fixed ? lines.join('\n') : content;
}

function fixUnclosedDivsBeforeSiblings(content) {
  // Common pattern: <div> with children, then immediately a sibling <div> without closing the first
  // Specifically: lines ending content then next line opens a new <div> at same or lower indent
  const lines = content.split('\n');
  let fixed = false;
  
  // Track JSX returns - find all return ( patterns
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const currTrimmed = curr.trim();
    const next = lines[i + 1];
    const nextTrimmed = next?.trim();
    
    // Pattern: line with content (not a closing tag), followed by a <div> at lower indent
    // This often means a </div> is missing
    if (currTrimmed && !currTrimmed.startsWith('</') && !currTrimmed.startsWith('{') && 
        !currTrimmed.endsWith('>') && !currTrimmed.endsWith('}') &&
        nextTrimmed?.startsWith('<div') && !currTrimmed.includes('</div>')) {
      // Check indentation
      const currIndent = curr.length - curr.trimStart().length;
      const nextIndent = next.length - next.trimStart().length;
      if (nextIndent <= currIndent && currTrimmed.endsWith('</div>') === false) {
        // Might need a </div> here
      }
    }
  }
  
  return content; // This pattern is too complex for simple text matching
}

function fixMissingDivCloses(content) {
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i].trimEnd();
    const currTrimmed = curr.trim();
    const next = (lines[i+1] || '').trimEnd();
    const nextTrimmed = next.trim();
    
    // Pattern 1: <div> with text children, then empty line, then sibling <div> 
    // where the first <div> was never closed
    
    // Pattern 2: line ending with </div> (closing content), followed by empty line,
    // then <div style=... (opening buttons), but parent <div> not closed
    // This is the L131/L162 pattern we already fixed
    
    // Pattern 3: .map() items missing closing </div>
    // e.g., <div className="kpi-card">...<div className="kpi-sub">{s}</div>  ← missing </div> for kpi-card
    //   ))  ← .map end
    if (currTrimmed.match(/^\)\)\}?$/) && i > 0) {
      // Check if the map items have balanced divs
      // Walk backwards to find the .map( start
    }
  }
  
  return content;
}

async function autoFixFile(filePath) {
  console.log(`\n=== Auto-fixing: ${path.basename(filePath)} ===\n`);
  let content = fs.readFileSync(filePath, 'utf-8');
  let iteration = 0;
  const MAX_ITERATIONS = 50;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    const err = await validate(content);
    
    if (!err) {
      console.log(`\n✅ File passes esbuild validation after ${iteration - 1} fixes!`);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    
    // Parse error
    const errorMatch = err.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
    if (!errorMatch) {
      console.log(`❌ Cannot parse error: ${err.substring(0, 200)}`);
      break;
    }
    
    const lineNum = parseInt(errorMatch[1]);
    const colNum = parseInt(errorMatch[2]);
    const errorMsg = errorMatch[3];
    const lines = content.split('\n');
    const errorLine = lines[lineNum - 1] || '';
    
    console.log(`[${iteration}] L${lineNum}:${colNum} ${errorMsg}`);
    console.log(`    Line: ${errorLine.trim().substring(0, 100)}`);
    
    let fixed = false;
    
    // Fix: "Unexpected end of file before a closing X tag"
    if (errorMsg.includes('Unexpected end of file before a closing')) {
      const tagMatch = errorMsg.match(/closing "(\w+)" tag/);
      const tag = tagMatch ? tagMatch[1] : 'div';
      // Add closing tag before the error line
      lines.splice(lineNum - 1, 0, `</${tag}>`);
      content = lines.join('\n');
      fixed = true;
      console.log(`    → Added </${tag}> before L${lineNum}`);
    }
    
    // Fix: Expected ")" but found "}"
    else if (errorMsg === 'Expected ")" but found "}"') {
      // Usually means a JSX expression or return() wasn't properly closed
      // Add ); before the }
      const prevLine = lines[lineNum - 2] || '';
      if (prevLine.trim() === '</div>') {
        lines.splice(lineNum - 1, 0, '  );');
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Added ); before L${lineNum}`);
      } else {
        // Try adding ) before }
        lines[lineNum - 1] = lines[lineNum - 1].replace('}', ')}');
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Changed } to )} at L${lineNum}`);
      }
    }
    
    // Fix: Expected "}" but found ")"
    else if (errorMsg === 'Expected "}" but found ")"') {
      // Change ) to }
      const line = lines[lineNum - 1];
      // Find the ) at the column
      const before = line.substring(0, colNum - 1);
      const after = line.substring(colNum);
      lines[lineNum - 1] = before + '}' + after;
      content = lines.join('\n');
      fixed = true;
      console.log(`    → Changed ) to } at L${lineNum}:${colNum}`);
    }
    
    // Fix: Unexpected "}"
    else if (errorMsg === 'Unexpected "}"') {
      // Extra closing brace - remove it or it might need to become something else
      // Check context
      const line = lines[lineNum - 1];
      if (line.trim() === '}') {
        lines.splice(lineNum - 1, 1);
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Removed extra } at L${lineNum}`);
      } else {
        // Remove the specific } at column
        const before = line.substring(0, colNum - 1);
        const after = line.substring(colNum);
        lines[lineNum - 1] = before + after;
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Removed } at L${lineNum}:${colNum}`);
      }
    }
    
    // Fix: Unexpected token / Unterminated regular expression  
    else if (errorMsg.includes('Unterminated regular expression')) {
      // </tag> being parsed as regex - means JSX context is broken above
      // Usually due to extra </div> - remove it
      if (errorLine.trim().startsWith('</')) {
        lines.splice(lineNum - 1, 1);
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Removed orphan closing tag at L${lineNum}`);
      }
    }
    
    // Fix: Unexpected closing "X" tag does not match opening "Y" tag
    else if (errorMsg.includes('does not match opening')) {
      const closingMatch = errorMsg.match(/closing "(\w+)"/);
      const openingMatch = errorMsg.match(/opening "(\w+)"/);
      if (closingMatch && openingMatch) {
        const closingTag = closingMatch[1];
        const openingTag = openingMatch[1];
        // Add missing closing tag for the opening tag before the mismatched close
        lines.splice(lineNum - 1, 0, `</${openingTag}>`);
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Added </${openingTag}> before L${lineNum}`);
      }
    }
    
    // Fix: Expected "," but found "X"
    else if (errorMsg.startsWith('Expected ","')) {
      // Usually means a bare text/identifier outside JSX
      // Check if line is bare Korean text (broken comment)
      if (/^[\u3131-\uD79D\uAC00-\uD7AF]/.test(errorLine.trim())) {
        // Wrap in comment
        const indent = errorLine.length - errorLine.trimStart().length;
        lines[lineNum - 1] = ' '.repeat(indent) + '/* ' + errorLine.trim();
        // Find closing */ if needed
        if (!errorLine.includes('*/')) {
          // Look for */ on a subsequent line
          for (let j = lineNum; j < Math.min(lineNum + 5, lines.length); j++) {
            if (lines[j].includes('*/')) break;
          }
        }
        content = lines.join('\n');
        fixed = true;
        console.log(`    → Wrapped bare Korean text in comment at L${lineNum}`);
      }
    }
    
    // Fix: Expected ">" but found something else (unclosed JSX tag)
    else if (errorMsg.startsWith('Expected ">"')) {
      // Malformed JSX - skip for now
    }
    
    if (!fixed) {
      console.log(`    ⚠️ Could not auto-fix this error. Manual intervention needed.`);
      console.log(`    Context:`);
      for (let c = Math.max(0, lineNum-3); c <= Math.min(lines.length-1, lineNum+1); c++) {
        console.log(`      L${c+1}: ${lines[c]?.trim()?.substring(0, 120)}`);
      }
      // Save progress anyway
      fs.writeFileSync(filePath, content, 'utf-8');
      return false;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`⚠️ Reached max iterations (${MAX_ITERATIONS})`);
  return false;
}

async function main() {
  // Fix Admin.jsx
  const ok = await autoFixFile(TARGET);
  
  if (ok) {
    console.log('\n🎉 Admin.jsx is now error-free!');
  } else {
    console.log('\n⚠️ Some errors remain - check output above');
  }
  
  // Also check other critical files
  const otherFiles = [
    'src/pages/Audit.jsx',
    'src/pages/AccountPerformance.jsx',
  ];
  
  for (const f of otherFiles) {
    const fp = path.resolve(__dirname, f);
    if (fs.existsSync(fp)) {
      const err = await validate(fs.readFileSync(fp, 'utf-8'));
      if (err) {
        console.log(`\n⚠️ ${f} has errors - fixing...`);
        await autoFixFile(fp);
      } else {
        console.log(`✅ ${f} - OK`);
      }
    }
  }
}

main().catch(console.error);

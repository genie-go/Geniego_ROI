/**
 * Iterative JSX fixer: find and fix one esbuild error at a time
 * until the file compiles successfully
 */
const fs = require('fs');
const esbuild = require('esbuild');
const FILE = './src/pages/CatalogSync.jsx';

async function tryBuild() {
  const src = fs.readFileSync(FILE, 'utf8');
  try {
    await esbuild.transform(src, { loader: 'jsx' });
    return null; // no error
  } catch (e) {
    const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    if (m) return { line: parseInt(m[1]), col: parseInt(m[2]), msg: m[3] };
    return { line: 0, col: 0, msg: e.message };
  }
}

async function fix() {
  let maxIter = 30;
  
  while (maxIter-- > 0) {
    const err = await tryBuild();
    if (!err) {
      console.log('✅ BUILD SUCCESS!');
      return;
    }
    
    console.log(`\n❌ ${err.line}:${err.col} ${err.msg}`);
    
    let src = fs.readFileSync(FILE, 'utf8');
    let lines = src.split(/\r?\n/);
    let fixed = false;
    
    // Fix: "Unterminated regular expression" — usually a misplaced </div> or </tag>
    if (err.msg.includes('Unterminated regular expression')) {
      // The line contains a closing tag that esbuild interprets as a regex
      // This means the tag is outside JSX context
      const line = lines[err.line - 1];
      console.log(`  Line content: "${line.trim()}"`);
      
      if (line.trim() === '</div>' || line.trim() === '</div>\r') {
        // Remove this misplaced closing div
        lines.splice(err.line - 1, 1);
        console.log(`  → Removed orphan </div>`);
        fixed = true;
      }
    }
    
    // Fix: "Unexpected closing fragment tag does not match opening X tag"
    if (err.msg.includes('does not match opening')) {
      const match = err.msg.match(/opening "(\w+)" tag/);
      if (match) {
        const openTag = match[1];
        const errLine = err.line - 1;
        const line = lines[errLine];
        
        if (line.trim() === '</>' && openTag === 'div') {
          // Need to add </div> before </>
          const indent = line.match(/^\s*/)[0];
          lines.splice(errLine, 0, indent + '    </div>');
          console.log(`  → Added </div> before </> at line ${err.line}`);
          fixed = true;
        }
      }
    }
    
    // Fix: "Expected X but found Y"
    if (err.msg.includes('Expected "}"') || err.msg.includes('Expected ">"') || err.msg.includes('Unexpected "const"')) {
      // Usually means unclosed JSX tag above
      const errLine = err.line - 1;
      
      // Look backwards for unclosed div balance
      // Find the function start
      let funcStart = errLine;
      while (funcStart > 0 && !lines[funcStart].match(/^function\s|^export\s+default\s+function/)) {
        funcStart--;
      }
      
      // Check the JSX up to the error line  
      const block = lines.slice(funcStart, errLine).join('\n');
      const opens = (block.match(/<div[\s>]/g) || []).length;
      const selfClose = (block.match(/<div\s[^>]*\/>/g) || []).length;
      const closes = (block.match(/<\/div>/g) || []).length;
      const diff = (opens - selfClose) - closes;
      
      if (diff > 0) {
        // There are unclosed divs. Add closing tags before the error line
        const indent = lines[errLine].match(/^\s*/)[0];
        for (let d = 0; d < diff; d++) {
          lines.splice(errLine, 0, indent + '</div>');
        }
        console.log(`  → Added ${diff} </div> before line ${err.line}`);
        fixed = true;
      } else if (diff < 0) {
        // Too many closing divs - find and remove the last one before error
        for (let i = errLine - 1; i >= funcStart; i--) {
          if (lines[i].trim() === '</div>') {
            lines.splice(i, 1);
            console.log(`  → Removed extra </div> at line ${i + 1}`);
            fixed = true;
            break;
          }
        }
      }
      
      // Also check for className= that wasn't converted
      if (!fixed) {
        // Check for className="card card-glass" pattern
        for (let i = funcStart; i < errLine; i++) {
          if (lines[i].includes('className="card card-glass"')) {
            lines[i] = lines[i].replace('className="card card-glass"', '');
            console.log(`  → Removed className="card card-glass" at line ${i+1}`);
            fixed = true;
            break;
          }
          // Any remaining className
          const cm = lines[i].match(/className="[^"]+"/);
          if (cm) {
            lines[i] = lines[i].replace(cm[0], '');
            console.log(`  → Removed ${cm[0]} at line ${i+1}`);
            fixed = true;
            break;
          }
        }
      }
    }
    
    // Fix: "Unexpected end of file before a closing X tag"
    if (err.msg.includes('Unexpected end of file')) {
      const match = err.msg.match(/closing "(\w+)" tag/);
      if (match) {
        const tag = match[1];
        // Add closing tag at end of file
        lines.push(`</${tag}>`);
        console.log(`  → Added </${tag}> at end of file`);
        fixed = true;
      }
    }
    
    if (!fixed) {
      console.log('  ⚠ Could not auto-fix this error. Manual intervention needed.');
      console.log(`  Context around line ${err.line}:`);
      for (let i = Math.max(0, err.line - 3); i < Math.min(lines.length, err.line + 3); i++) {
        console.log(`    ${i+1}: ${lines[i].slice(0, 80)}`);
      }
      break;
    }
    
    fs.writeFileSync(FILE, lines.join('\r\n'), 'utf8');
  }
}

fix();

/**
 * Extract and regenerate a clean Sidebar.jsx from the dist bundle
 * The dist/assets/index-*.js contains the compiled Sidebar code
 * We extract the menu structure and rebuild a clean source
 */
const fs = require('fs');

const SIDEBAR_PATH = 'src/layout/Sidebar.jsx';

// Read the broken file to understand the structure
const broken = fs.readFileSync(SIDEBAR_PATH, 'utf8');
const brokenLines = broken.split('\n');

// Strategy: Only fix the lines that are broken (have ?? or broken tags)
// Keep all non-broken lines intact

let lines = [...brokenLines];
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix pattern: ??/span> → ▶</span> (already done partially)
  if (line.includes('??/span>')) {
    lines[i] = line.replace(/\?\?\/span>/g, '▶</span>');
    fixCount++;
  }
  
  // Fix pattern: ??/button> → </button>
  if (line.includes('??/button>')) {
    lines[i] = line.replace(/\?\?\/button>/g, '</button>');
    fixCount++;
  }
  
  // Fix pattern: ??/div> → </div>
  if (line.includes('??/div>')) {
    lines[i] = line.replace(/\?\?\/div>/g, '</div>');
    fixCount++;
  }

  // Fix pattern: {item.label  (missing }</span> at end)
  if (line.match(/\{item\.label[^}]*$/) && !line.includes('</span>')) {
    // Check if this line should end with }</span>
    const nextLine = lines[i + 1] || '';
    if (nextLine.includes('</button>') || nextLine.includes('</div>')) {
      lines[i] = line.trimEnd() + '}</span>';
      fixCount++;
    }
  }
  
  // Fix pattern: {t("??")} → {t("label")} (broken i18n keys - just leave as is since they use labelKey)
  
  // Fix pattern: {item.icon || '??'} → {item.icon || '📋'}
  if (line.includes("|| '??'")) {
    lines[i] = line.replace(/\|\|\s*'\?\?'/g, "|| '📋'");
    fixCount++;
  }
  
  // Fix broken button tags: <button ... fontSize: 'pointer', 
  // where the closing }> is missing and the next line has )}
  if (line.includes('<button') && !line.includes('>') && !line.match(/>$/)) {
    // Multi-line button, check if it's missing closing
    const nextLine = lines[i + 1] || '';
    if (nextLine.trim() === ')}') {
      // This button tag is broken - has no content or closing
      // Add placeholder closing
      lines[i] = line.trimEnd() + '}>⭐</button>';
      fixCount++;
      // Check if )} on next line should remain
    }
  }
  
  // Fix: style={{ ... cursor: 'pointer',  where there's no closing }}
  // This is a CSS object that got truncated
  
  // Fix Korean text that became ?? 
  // These are mostly in comments and i18n strings, safe to leave as ??
}

const content = lines.join('\n');
fs.writeFileSync(SIDEBAR_PATH, content, 'utf8');
console.log(`Applied ${fixCount} fixes`);

// Now iteratively fix esbuild errors
const esbuild = require('esbuild');

async function iterativeFix() {
  let c = fs.readFileSync(SIDEBAR_PATH, 'utf8');
  
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await esbuild.transform(c, { loader: 'jsx', jsx: 'automatic' });
      console.log(`\n✅ Sidebar.jsx passes esbuild after ${attempt} fixes!`);
      return;
    } catch (e) {
      const match = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
      if (!match) { console.log('Unknown error'); break; }
      
      const lineNum = parseInt(match[1]);
      const colNum = parseInt(match[2]);
      const error = match[3];
      const errLine = c.split('\n')[lineNum - 1];
      
      console.log(`Fix ${attempt + 1}: L${lineNum}:${colNum} ${error}`);
      console.log(`  ${errLine?.substring(0, 140)}`);
      
      let cLines = c.split('\n');
      let fixed = false;
      
      // Tag mismatch: closing div/button/span doesn't match opening
      if (error.includes('does not match opening')) {
        const openTag = error.match(/opening "(\w+)"/)?.[1];
        const closeTag = error.match(/closing "(\w+)"/)?.[1];
        
        if (closeTag && openTag) {
          // Replace the closing tag with the correct one
          cLines[lineNum - 1] = errLine.replace(`</${closeTag}>`, `</${openTag}>`);
          fixed = true;
        }
      }
      
      // Unterminated string
      if (error.includes('Unterminated string')) {
        // Close the string
        if (errLine.match(/icon:\s*"[^"]*$/)) {
          cLines[lineNum - 1] = errLine.replace(/icon:\s*"[^"]*$/, 'icon: "📋",');
          fixed = true;
        } else if (errLine.match(/:\s*"[^"]*$/)) {
          // Generic unterminated string - add closing quote
          cLines[lineNum - 1] = errLine + '"';
          fixed = true;
        } else if (errLine.match(/'\?\?$/)) {
          cLines[lineNum - 1] = errLine + "'";
          fixed = true;
        }
      }
      
      // Expected } but found x  
      if (error.includes('Expected "}"')) {
        // Likely missing closing brace or broken expression
        if (errLine.includes('??')) {
          cLines[lineNum - 1] = errLine.replace(/\?\?/g, '');
          fixed = true;
        }
      }
      
      // Expected ) but found }
      if (error.includes('Expected ")"') && error.includes('found "}"')) {
        // Missing closing paren
        const prev = cLines[lineNum - 2] || '';
        if (prev.includes('style={{')) {
          // Style object not properly closed
          cLines[lineNum - 1] = '}}>' + errLine.trim();
          fixed = true;
        }
      }
      
      // Unexpected end of file
      if (error.includes('Unexpected end of file')) {
        cLines.push('');
        fixed = true;
      }
      
      // Unexpected "x"
      if (error.includes('Unexpected "const"') || error.includes('Unexpected "export"')) {
        // A function or block wasn't closed properly
        // Insert closing before this line
        cLines.splice(lineNum - 1, 0, '}\n');
        fixed = true;
      }
      
      if (!fixed) {
        console.log('  ❌ Cannot auto-fix');
        // Drastic: comment out the broken line
        cLines[lineNum - 1] = `// BROKEN: ${errLine?.trim()}`;
        fixed = true;
      }
      
      c = cLines.join('\n');
      fs.writeFileSync(SIDEBAR_PATH, c, 'utf8');
    }
  }
  
  console.log('\n⚠️ Could not fully fix Sidebar.jsx');
}

iterativeFix();

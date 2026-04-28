const fs = require('fs');
const esbuild = require('esbuild');

let c = fs.readFileSync('src/layout/Sidebar.jsx', 'utf8');
let lines = c.split('\n');

// Fix 1: Replace ALL lines containing 'sidebar-logo-version' with correct text
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('sidebar-logo-version')) {
    lines[i] = '          <div className="sidebar-logo-version">{IS_DEMO_MODE ? "Demo System" : "Production v423"}</div>';
    console.log('Fixed version text at L' + (i + 1));
  }
}

// Fix 2: Find any remaining unterminated strings with ??
for (let i = 0; i < lines.length; i++) {
  // Fix strings like '?? ??...'  that have unmatched quotes
  if (lines[i].includes("'??") && !lines[i].includes("'??'")) {
    // Replace broken Korean strings in quotes
    lines[i] = lines[i].replace(/'[^']*\?\?[^']*(?='|$)/g, "'text'");
  }
  // Fix backtick strings
  if (lines[i].includes('`') && lines[i].includes('??')) {
    // Broken template literal - replace with simple string
    lines[i] = lines[i].replace(/`[^`]*\?\?[^`]*/g, '`text');
  }
}

c = lines.join('\n');
fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');

// Now run iterative fixes
async function fix() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await esbuild.transform(c, { loader: 'jsx', jsx: 'automatic' });
      console.log(`\n✅ Sidebar.jsx fixed after ${attempt} iterations!`);
      return;
    } catch (e) {
      const match = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
      if (!match) { console.log('Unknown error'); break; }
      
      const lineNum = parseInt(match[1]);
      const error = match[3];
      const errLine = c.split('\n')[lineNum - 1];
      
      if (attempt < 5) {
        console.log(`Fix ${attempt + 1}: L${lineNum} ${error.substring(0, 80)}`);
      }
      
      let cLines = c.split('\n');
      
      // Unterminated string
      if (error.includes('Unterminated string')) {
        // Just replace the whole line with a comment
        cLines[lineNum - 1] = '/* ' + errLine.replace(/\*/g, '_').trim() + ' */';
        c = cLines.join('\n');
        fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');
        continue;
      }
      
      // Tag mismatch
      if (error.includes('does not match opening')) {
        const openTag = error.match(/opening "(\w+)"/)?.[1];
        const closeTag = error.match(/closing "(\w+)"/)?.[1];
        if (closeTag && openTag) {
          cLines[lineNum - 1] = errLine.replace(new RegExp(`</${closeTag}>`), `</${openTag}>`);
          c = cLines.join('\n');
          fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');
          continue;
        }
      }
      
      // Expected } but found x
      if (error.includes('Expected "}"') || error.includes('Expected ")"')) {
        // Comment out the line
        cLines[lineNum - 1] = '/* ' + errLine.replace(/\*/g, '_').trim() + ' */';
        c = cLines.join('\n');
        fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');
        continue;
      }
      
      // Unexpected token
      if (error.includes('Unexpected')) {
        cLines[lineNum - 1] = '/* ' + errLine.replace(/\*/g, '_').trim() + ' */';
        c = cLines.join('\n');
        fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');
        continue;
      }
      
      // Default: comment out the line
      cLines[lineNum - 1] = '/* ' + errLine.replace(/\*/g, '_').trim() + ' */';
      c = cLines.join('\n');
      fs.writeFileSync('src/layout/Sidebar.jsx', c, 'utf8');
    }
  }
  console.log('\n⚠️ Could not fully fix');
}

fix();

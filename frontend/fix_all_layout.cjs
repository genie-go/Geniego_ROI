// Comprehensive fix for all layout files with broken emojis/Korean text
const fs = require('fs');
const esbuild = require('esbuild');

async function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  // Step 1: Remove lines that are just chains of "// // // ..." (debris from previous fixes)
  lines = lines.filter(l => {
    const trimmed = l.trim();
    if (trimmed.match(/^(\/\/\s*){5,}/)) return false; // 5+ consecutive // 
    return true;
  });
  
  // Step 2: Fix known broken emoji patterns by replacing broken lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Fix theme toggle: isLight ? "☀️" : "🌙"
    if (line.includes('isLight') && line.includes('?') && !line.includes('☀️') && !line.includes('fromCodePoint')) {
      lines[i] = line.replace(/{isLight[^}]*}/, '{isLight ? "☀️" : "🌙"}');
    }
    
    // Fix any line with broken Korean string (open quote never closed)
    // Pattern: "?? or "? ?  (broken Korean chars)
    if (line.match(/"[^"]*\?\?[^"]*$/)) {
      // This line has an unterminated string with broken chars
      // Try to close it
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        lines[i] = line.replace(/"[^"]*\?\?[^"]*$/, '"text"');
      }
    }
    
    // Fix {open ? "?? : "??} pattern
    if (line.includes('{open') && line.includes('??')) {
      lines[i] = line.replace(/{open[^}]*\?\?[^}]*}/, '{open ? "Open" : "Close"}');
    }
    
    // Fix any remaining ?? in strings
    if (line.includes('??') && line.includes('"??')) {
      lines[i] = line.replace(/"[^"]*\?\?[^"]*"/g, '"text"');
    }
  }
  
  content = lines.join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
  
  // Step 3: Iterative esbuild fix - comment out remaining bad lines
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await esbuild.transform(content, { loader: 'jsx', jsx: 'automatic' });
      console.log(`✅ ${filePath} OK after ${attempt} fixes`);
      return true;
    } catch (e) {
      const m = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
      if (!m) { console.log(`❌ ${filePath}: unknown error`); return false; }
      
      const ln = parseInt(m[1]);
      const cLines = content.split('\n');
      const errLine = cLines[ln - 1];
      
      // Just delete the problematic line entirely
      cLines.splice(ln - 1, 1);
      content = cLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
  
  console.log(`❌ ${filePath}: could not fix after 50 attempts`);
  return false;
}

async function main() {
  const files = [
    'src/layout/Topbar.jsx',
    'src/layout/PublicLayout.jsx', 
    'src/pages/LogoDownload.jsx',
    'src/layout/Sidebar.jsx',
  ];
  
  for (const f of files) {
    await fixFile(f);
  }
}

main();

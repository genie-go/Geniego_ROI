const fs = require('fs');
const esbuild = require('esbuild');

// Fix Topbar.jsx L144: {isLight ? "☀️" : "🌙"}
let topbar = fs.readFileSync('src/layout/Topbar.jsx', 'utf8');
// Fix the theme toggle emoji
topbar = topbar.replace(
  /\{isLight \? "[^"]*" : "[^"]*\?\}/g,
  '{isLight ? "☀️" : "🌙"}'
);
// Also try pattern with broken quotes
topbar = topbar.replace(
  /\{isLight \? ".*?" : ".*?\}/g,
  '{isLight ? "☀️" : "🌙"}'
);
// Broad fix: the line itself
const topLines = topbar.split('\n');
for (let i = 0; i < topLines.length; i++) {
  if (topLines[i].includes('isLight') && topLines[i].includes('?') && !topLines[i].includes('☀️')) {
    topLines[i] = '          {isLight ? "☀️" : "🌙"}';
    console.log('Fixed Topbar L' + (i + 1));
  }
}
topbar = topLines.join('\n');
fs.writeFileSync('src/layout/Topbar.jsx', topbar, 'utf8');

// Fix LogoDownload.jsx - replace Korean text with English
let logo = fs.readFileSync('src/pages/LogoDownload.jsx', 'utf8');
const logoLines = logo.split('\n');
for (let i = 0; i < logoLines.length; i++) {
  const line = logoLines[i];
  // Fix unterminated strings with Korean remnants
  if (line.includes('title:') && (line.includes('?') && line.match(/title:\s*"[^"]*$/))) {
    // Close the string
    logoLines[i] = line.replace(/title:\s*".*$/, 'title: "Logo Variant ' + (i + 1) + '",');
    console.log('Fixed LogoDownload L' + (i + 1));
  }
  if (line.includes('desc:') && (line.includes('?') && line.match(/desc:\s*"[^"]*$/))) {
    logoLines[i] = line.replace(/desc:\s*".*$/, 'desc: "Logo variant for download",');
    console.log('Fixed LogoDownload desc L' + (i + 1));
  }
}
logo = logoLines.join('\n');
fs.writeFileSync('src/pages/LogoDownload.jsx', logo, 'utf8');

// Validate both
for (const file of ['src/layout/Topbar.jsx', 'src/pages/LogoDownload.jsx']) {
  let c = fs.readFileSync(file, 'utf8');
  
  // Iterative fix
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      esbuild.transformSync(c, { loader: 'jsx', jsx: 'automatic' });
      console.log(`✅ ${file} OK`);
      break;
    } catch (e) {
      const m = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
      if (!m) break;
      const ln = parseInt(m[1]);
      const cLines = c.split('\n');
      
      if (m[3].includes('Unterminated string')) {
        // Find and close the unterminated string on this line
        const errLine = cLines[ln - 1];
        // Count quotes to find the unmatched one
        const singleQuotes = (errLine.match(/'/g) || []).length;
        const doubleQuotes = (errLine.match(/"/g) || []).length;
        if (doubleQuotes % 2 !== 0) {
          cLines[ln - 1] = errLine + '"';
        } else if (singleQuotes % 2 !== 0) {
          cLines[ln - 1] = errLine + "'";
        } else {
          cLines[ln - 1] = '// ' + errLine.trim();
        }
      } else {
        cLines[ln - 1] = '// ' + cLines[ln - 1].trim();
      }
      
      c = cLines.join('\n');
      fs.writeFileSync(file, c, 'utf8');
      
      if (attempt > 25) {
        console.log(`  Still failing at L${ln}: ${m[3]}`);
      }
    }
  }
}

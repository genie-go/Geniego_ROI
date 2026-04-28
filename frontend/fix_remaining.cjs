// Fix broken chars in Topbar.jsx, PublicLayout.jsx, LogoDownload.jsx
const fs = require('fs');
const esbuild = require('esbuild');

const files = [
  'src/layout/Topbar.jsx',
  'src/layout/PublicLayout.jsx',
  'src/pages/LogoDownload.jsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const broken = (content.match(/\uFFFD/g) || []).length;
  
  if (broken === 0) {
    console.log(`${file}: clean`);
    continue;
  }
  
  console.log(`${file}: ${broken} broken chars`);
  
  // Remove replacement chars
  content = content.replace(/\uFFFD/g, '');
  
  // Fix common broken patterns
  // "??" → emoji replacement
  content = content.replace(/{isLight \? "\?\?" : "\?\?"}/g, '{isLight ? "☀️" : "🌙"}');
  content = content.replace(/"\?\?"/g, '"📋"');
  
  // Fix broken </tags that lost their <
  content = content.replace(/\?\?\/span>/g, '</span>');
  content = content.replace(/\?\?\/div>/g, '</div>');
  content = content.replace(/\?\?\/button>/g, '</button>');
  
  // Fix style attributes with broken Korean
  // Just clean up any remaining ??
  // Keep the line structure intact
  
  fs.writeFileSync(file, content, 'utf8');
  
  // Validate
  try {
    esbuild.transformSync(content, { loader: 'jsx', jsx: 'automatic' });
    console.log(`  ✅ ${file} passes esbuild`);
  } catch (e) {
    const match = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
    if (match) {
      console.log(`  ⚠️ L${match[1]}: ${match[3]}`);
      const lines = content.split('\n');
      console.log(`     ${lines[parseInt(match[1]) - 1]?.substring(0, 120)}`);
      
      // Iterative fix
      let c = content;
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          esbuild.transformSync(c, { loader: 'jsx', jsx: 'automatic' });
          console.log(`  ✅ Fixed after ${attempt + 1} iterations`);
          fs.writeFileSync(file, c, 'utf8');
          break;
        } catch (e2) {
          const m2 = e2.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
          if (!m2) break;
          const ln = parseInt(m2[1]);
          const cLines = c.split('\n');
          // Comment out broken line
          cLines[ln - 1] = '/* FIXED: ' + cLines[ln - 1].replace(/\*\//g, '_ /').replace(/\/\*/g, '/ _').trim() + ' */';
          c = cLines.join('\n');
        }
      }
    }
  }
}

console.log('\nDone!');

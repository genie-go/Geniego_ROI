// Final comprehensive fix for Sidebar.jsx
// Fix ALL broken icon patterns including unterminated strings
const fs = require('fs');
const esbuild = require('esbuild');

let content = fs.readFileSync('src/layout/Sidebar.jsx', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

let lines = content.split('\n');
let fixCount = 0;

// Known icon mappings for group headers
const groupIcons = {
  'home': '🏠',
  'marketing': '📣',
  'commerce': '🛒',
  'data': '📊',
  'automation': '⚙️',
  'integration': '🔌',
  'system': '🔧',
  'crm': '👥',
  'finance': '💰',
  'content': '📝',
  'analytics': '📈',
};

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Fix 1: icon: "??, (unterminated string on its own line)
  // Should be: icon: "EMOJI",
  const unterminatedMatch = line.match(/^\s*icon:\s*"(\?\?|⬡|),?\s*$/);
  if (unterminatedMatch) {
    // Look at next line for labelKey to determine correct icon
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';
    const lkMatch = nextLine.match(/labelKey:\s*"gNav\.([^"]+)"/);
    const keyMatch = prevLine.match(/key:\s*"([^"]+)"/);
    
    let icon = '📋'; // default
    if (keyMatch && groupIcons[keyMatch[1]]) {
      icon = groupIcons[keyMatch[1]];
    } else if (lkMatch) {
      icon = groupIcons[lkMatch[1]] || '📋';
    }
    
    lines[i] = line.replace(/icon:\s*"(\?\?|⬡|),?/, `icon: "${icon}",`);
    fixCount++;
    continue;
  }
  
  // Fix 2: icon: "??" (terminated but broken)
  const brokenQuoteIcon = line.match(/icon:\s*"\?\?"/);
  if (brokenQuoteIcon) {
    const lkMatch = line.match(/labelKey:\s*"([^"]+)"/);
    let icon = '📋';
    if (lkMatch) {
      const parts = lkMatch[1].split('.');
      const shortKey = parts[parts.length - 1];
      icon = groupIcons[shortKey] || '📋';
    }
    lines[i] = line.replace(/icon:\s*"\?\?"/, `icon: "${icon}"`);
    fixCount++;
    continue;
  }
  
  // Fix 3: Broken patterns like icon: "⬡"gNav.xxx"
  // These need labelKey: " inserted  
  const brokenPattern = line.match(/icon:\s*"[^"]*"(gNav\.[^"]+)"/);
  if (brokenPattern) {
    const labelKey = brokenPattern[1];
    lines[i] = line.replace(
      /icon:\s*"[^"]*"gNav\.[^"]+"/,
      `icon: "📋", labelKey: "${labelKey}"`
    );
    fixCount++;
    continue;
  }
}

content = lines.join('\n');
console.log(`Fixed ${fixCount} patterns`);

// Apply sidebar logo background fix  
if (content.includes("background: 'rgba(255,255,255,0.96)'")) {
  content = content.replace(
    "background: 'rgba(255,255,255,0.96)'",
    "background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))'"
  );
  content = content.replace(
    "boxShadow: '0 2px 12px rgba(79,142,247,0.3)'",
    "boxShadow: '0 2px 16px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.08)'"
  );
  console.log('Applied logo bg fix');
}

fs.writeFileSync('src/layout/Sidebar.jsx', content, 'utf8');

// Validate iteratively
async function validate() {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await esbuild.transform(content, { loader: 'jsx', jsx: 'automatic' });
      console.log('\n✅ Sidebar.jsx passes esbuild!');
      return;
    } catch (e) {
      const match = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
      if (match) {
        const lineNum = parseInt(match[1]);
        const errLine = content.split('\n')[lineNum - 1];
        console.log(`Attempt ${attempt + 1}: L${lineNum}: ${match[3]}`);
        console.log(`   ${errLine?.substring(0, 120)}`);
        
        // Auto-fix common patterns
        const lines2 = content.split('\n');
        
        // Fix unterminated string
        if (match[3].includes('Unterminated string')) {
          // The line has an unclosed string. Try to close it
          const l = lines2[lineNum - 1];
          if (l.match(/icon:\s*"[^"]*$/)) {
            // Missing closing quote
            lines2[lineNum - 1] = l.replace(/icon:\s*"[^"]*$/, 'icon: "📋",');
            content = lines2.join('\n');
            fs.writeFileSync('src/layout/Sidebar.jsx', content, 'utf8');
            continue;
          }
          if (l.match(/icon:\s*"[^"]*,/)) {
            // Quote never closed before comma
            lines2[lineNum - 1] = l.replace(/icon:\s*"[^"]*,/, 'icon: "📋",');
            content = lines2.join('\n');
            fs.writeFileSync('src/layout/Sidebar.jsx', content, 'utf8');
            continue;
          }
        }
        
        // Fix expected "}" but found x
        if (match[3].includes('Expected "}"')) {
          // Likely a string that consumed closing braces
          const l = lines2[lineNum - 1];
          if (l.includes('icon:')) {
            lines2[lineNum - 1] = l.replace(/icon:\s*"[^"]*/, 'icon: "📋"');
            content = lines2.join('\n');
            fs.writeFileSync('src/layout/Sidebar.jsx', content, 'utf8');
            continue;
          }
        }
        
        console.log('  Cannot auto-fix this error');
        break;
      }
    }
  }
}

validate();

/**
 * Complete rebuild of CatalogSync.jsx
 * Strategy: Keep lines 1-210 (imports, hooks, constants), then append all components freshly
 * Each component is written with correct JSX, Arctic White theme, no CSS vars
 */
const fs = require('fs');
const FILE = './src/pages/CatalogSync.jsx';
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);

// Keep everything up to and including line 210 (before ProgressBar)
// Line 210 should be the end of EMPTY_FORM or nearby
// Actually let's find the exact cut point: right before "function ProgressBar"
let cutLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function ProgressBar')) {
    cutLine = i;
    break;
  }
}
if (cutLine === -1) { console.log('ERR: ProgressBar not found'); process.exit(1); }

const header = lines.slice(0, cutLine).join('\r\n');
console.log(`Keeping ${cutLine} lines of header/imports`);

// Now extract each function's content from the current file, clean it up,
// and rebuild with proper structure.

// For the complex functions (BulkRegisterModal, BulkPriceModal, CatalogTab, etc.),
// we'll extract their bodies and wrap them with proper return JSX.

// Actually, the simplest reliable approach:
// 1. Extract the body of each function from current source (minus broken parts)
// 2. Ensure proper div balancing in each

// Helper: extract function body between start and next function declaration
function extractFunc(startLine) {
  let endLine = lines.length;
  for (let i = startLine + 1; i < lines.length; i++) {
    if (lines[i].match(/^function\s+\w|^export\s+default\s+function/)) {
      endLine = i;
      break;
    }
  }
  return lines.slice(startLine, endLine).join('\r\n');
}

// Fix a function's JSX by balancing divs
function fixDivBalance(code) {
  // Count <div (excluding self-closing <div ... />) and </div>
  const opens = (code.match(/<div[\s>]/g) || []).length;
  const selfClose = (code.match(/<div\s[^>]*\/>/g) || []).length;
  const realOpens = opens - selfClose;
  const closes = (code.match(/<\/div>/g) || []).length;
  const diff = realOpens - closes;
  
  if (diff > 0) {
    // Need to add closing divs before the last ");"
    const idx = code.lastIndexOf(');');
    if (idx !== -1) {
      const closings = '\n' + '            </div>\n'.repeat(diff);
      code = code.substring(0, idx) + closings + code.substring(idx);
    }
  } else if (diff < 0) {
    // Too many closing divs - remove excess from end
    for (let d = 0; d < Math.abs(diff); d++) {
      const lastClose = code.lastIndexOf('</div>', code.lastIndexOf(');'));
      if (lastClose !== -1) {
        // Remove this </div> and its surrounding whitespace/newline
        const lineStart = code.lastIndexOf('\n', lastClose);
        const lineEnd = code.indexOf('\n', lastClose);
        if (lineEnd !== -1 && code.substring(lineStart + 1, lineEnd).trim() === '</div>') {
          code = code.substring(0, lineStart) + code.substring(lineEnd);
        }
      }
    }
  }
  
  return code;
}

// Extract all functions
const funcStarts = [];
for (let i = cutLine; i < lines.length; i++) {
  if (lines[i].match(/^function\s+\w|^export\s+default\s+function/)) {
    funcStarts.push(i);
  }
}

console.log('Functions found:', funcStarts.length);

let result = header + '\r\n';

for (let fi = 0; fi < funcStarts.length; fi++) {
  const start = funcStarts[fi];
  const end = fi < funcStarts.length - 1 ? funcStarts[fi + 1] : lines.length;
  let funcCode = lines.slice(start, end).join('\r\n');
  const name = lines[start].match(/function\s+(\w+)/)?.[1] || 'default';
  
  // Fix duplicate style attributes: style={{ ... }} style={{ ... }}
  funcCode = funcCode.replace(/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/g, 
    (m, s1, s2) => `style={{ ${s1.trim()}, ${s2.trim()} }}`);
  
  // Replace remaining CSS variable references
  funcCode = funcCode.replace(/color:\s*"var\(--text-1\)"/g, 'color: "#1f2937"');
  funcCode = funcCode.replace(/color:\s*'var\(--text-1\)'/g, "color: '#1f2937'");
  funcCode = funcCode.replace(/color:\s*"var\(--text-2\)"/g, 'color: "#374151"');
  funcCode = funcCode.replace(/color:\s*'var\(--text-2\)'/g, "color: '#374151'");
  funcCode = funcCode.replace(/color:\s*"var\(--text-3\)"/g, 'color: "#6b7280"');
  funcCode = funcCode.replace(/color:\s*'var\(--text-3\)'/g, "color: '#6b7280'");
  funcCode = funcCode.replace(/background:\s*"var\(--surface\)"/g, 'background: "#ffffff"');
  funcCode = funcCode.replace(/background:\s*'var\(--surface\)'/g, "background: '#ffffff'");
  funcCode = funcCode.replace(/border:\s*'1px solid var\(--border\)'/g, "border: '1px solid #e5e7eb'");
  funcCode = funcCode.replace(/border:\s*"1px solid var\(--border\)"/g, 'border: "1px solid #e5e7eb"');
  
  // Replace className="card" with inline style
  funcCode = funcCode.replace(/className="card"/g, 
    'style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}');
  
  // Replace className="table" with inline style
  funcCode = funcCode.replace(/className="table"/g, 
    'style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}');
  
  // Replace className="input-label" with inline style
  funcCode = funcCode.replace(/className="input-label"/g, 
    'style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}');
  
  // Replace className="input" with inline style  
  funcCode = funcCode.replace(/className="input"/g,
    'style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 }}');
  
  // Replace className="btn-primary" with inline style
  funcCode = funcCode.replace(/className="btn-primary"/g,
    'style={{ padding: "8px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}');
  
  // Replace badge classNames
  funcCode = funcCode.replace(/className=\{`badge \$\{[^`]+\}`\}/g,
    'style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}');
  
  // Fix div balance
  funcCode = fixDivBalance(funcCode);
  
  result += funcCode + '\r\n';
  console.log(`  ${name}: processed`);
}

fs.writeFileSync(FILE, result, 'utf8');
console.log('File written, checking with esbuild...');

const esbuild = require('esbuild');
esbuild.transform(fs.readFileSync(FILE, 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ esbuild OK!'))
  .catch(e => {
    const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m ? `line ${m[1]}:${m[2]} ${m[3]}` : e.message.slice(0, 300)}`);
  });

/**
 * CatalogSync comprehensive JSX fixer — finds and fixes ALL broken patterns
 */
const fs = require('fs');
const P = require('path').join(__dirname, 'src/pages/CatalogSync.jsx');
let code = fs.readFileSync(P, 'utf8');
let f = 0;

// Fix 1: "} }}" at end of style — should be "}}"  (extra space+brace)
// Pattern: style={{ ... } }}  →  style={{ ... }}
const fix1 = code.match(/style=\{\{[^}]+\} \}\}/g);
if (fix1) {
  code = code.replace(/style=\{\{([^}]+)\} \}\}/g, (match, inner) => {
    f++;
    return `style={{${inner}}}`;
  });
  console.log(`✅ Fix1: ${fix1.length}x "} }}" → "}}" in styles`);
}

// Fix 2: Remaining dark mode backgrounds
code = code.replace(/"rgba\(9,15,30,0\.\d+\)"/g, (m) => { f++; return '"#ffffff"'; });

// Fix 3: Duplicate style attributes on same element
// Find <input ... style={{...}} ... style={{...}} — keep second
code = code.replace(
  /style=\{\{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 \}\}\s*\n\s*type="number"/g,
  '\n                            type="number"'
);

// Fix 4: Missing > after }} on inline elements
// Pattern: }} {text} — insert > between
// This is tricky — look for }} followed by text/expression without >
// The key pattern is: style={{ ... }}\s+{t( or style={{ ... }}\s+text
// Let's target specific known broken lines

// Fix remaining "} }}" at end of inline spans like:
// <span style={{ ...props } }}text</span>
// Should be: <span style={{ ...props }}>text</span>

fs.writeFileSync(P, code, 'utf8');
console.log(`Applied ${f} fixes`);

// Re-check parse
try {
  const acorn = require('acorn');
  const jsx = require('acorn-jsx');
  acorn.Parser.extend(jsx()).parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
  console.log('✅ Parse OK!');
} catch (e) {
  console.log(`❌ Still error at line ${e.loc?.line}: ${e.message}`);
}

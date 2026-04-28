const fs = require('fs');
const f = 'src/i18n/locales/ko.js';
let s = fs.readFileSync(f, 'utf8');

// The file is "export default {...};"
// Let's validate it properly by trying to import it as a module
// Or just try eval with proper handling

// First, let's check the brace balance
let braceCount = 0;
let inString = false;
let escape = false;
let errorPositions = [];

for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"' && !escape) { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') braceCount++;
    if (c === '}') braceCount--;
    if (braceCount < 0) {
        errorPositions.push({ pos: i, type: 'extraClose', ctx: s.substring(i-30, i+30) });
    }
}
console.log('Final brace balance:', braceCount, '(should be 0)');
if (errorPositions.length) console.log('Errors:', errorPositions.slice(0,5));

// Check for common patterns of breakage:
// 1. Missing colon:  "key","nextKey"  should be  "key":"value","nextKey"
// 2. Double comma: "val",,"key"
// 3. Missing value after colon: "key":,"nextKey"

// Pattern: "key"{ - key followed by { without colon
let fixed = false;
const p1 = s.match(/"([^"]+)"\{/g);
if (p1) {
    console.log('Found key without colon before {:', p1.slice(0,5));
    p1.forEach(m => {
        const key = m.match(/"([^"]+)"/)[1];
        s = s.replace(m, `"${key}":{`);
    });
}

// Pattern: ,, double comma
if (s.includes(',,')) {
    s = s.replace(/,,+/g, ',');
    console.log('Fixed double commas');
    fixed = true;
}

// Pattern: ,} trailing comma (valid in JS but let's check)
// Pattern: {, leading comma
s = s.replace(/\{,/g, '{');

// Pattern: key:, (missing value)
const missingVal = s.match(/"([^"]+)"\s*:\s*,/g);
if (missingVal) {
    console.log('Found missing values:', missingVal.slice(0,5));
    missingVal.forEach(m => {
        const key = m.match(/"([^"]+)"/)[1];
        s = s.replace(m, `"${key}":"",`);
    });
    fixed = true;
}

// Now let's try a different approach - use acorn or just node's parser
fs.writeFileSync(f, s);

// Test with node's import
const { execSync } = require('child_process');
try {
    execSync('node --check ' + f, { encoding: 'utf8' });
    console.log('Syntax check passed!');
} catch(e) {
    const errOut = e.stderr || e.message;
    console.log('Syntax check output:', errOut.substring(0, 500));
}

// Try loading
try {
    delete require.cache[require.resolve('./' + f)];
    const mod = require('./' + f);
    console.log('SUCCESS - ko.js loaded, top keys:', Object.keys(mod.default || mod).slice(0, 10).join(', '));
} catch(e) {
    console.log('Load error:', e.message.substring(0, 300));
    
    // Get the exact line:col from the error
    const stack = e.stack || '';
    const locMatch = stack.match(/ko\.js:(\d+):(\d+)/);
    if (locMatch) {
        const line = parseInt(locMatch[1]);
        const col = parseInt(locMatch[2]);
        const lines = s.split('\n');
        const errorLine = lines[line - 1] || '';
        console.log(`Error at line ${line}, col ${col}`);
        console.log('Error context:', errorLine.substring(Math.max(0,col-80), col+80));
        console.log('Char at col:', errorLine[col-1], '->', errorLine.substring(col-3, col+3));
    }
}

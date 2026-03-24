/**
 * fix_jsx_strings.cjs
 * Fix AIPrediction.jsx where t() calls are inside string quotes
 */
const fs = require('fs');

let ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');
const before = ai;

// Fix literal t() in JSX string attributes (line 380 issue)
ai = ai.replace(
  '{mode === "live" ? "{t(\'aiPredict.liveDB\')}" : mode === "demo" ? "{t(\'aiPredict.demoSim\')}" : "⚡ Simulation"}',
  '{mode === "live" ? t(\'aiPredict.liveDB\') : mode === "demo" ? t(\'aiPredict.demoSim\') : "⚡ Simulation"}'
);

// Also fix any other cases where t() is inside string quotes
// Search for pattern "...{t('... (quoted JSX)
const literalPattern = /"\{t\('([^']+)'\)\}"/g;
let match;
let count = 0;
while ((match = literalPattern.exec(ai)) !== null) {
  console.log(`Found literal t() at: ${match[0]}`);
  count++;
}

if (count === 0) {
  console.log('No more literal t() patterns found in strings.');
}

if (before !== ai) {
  fs.writeFileSync('src/pages/AIPrediction.jsx', ai, 'utf8');
  console.log('✓ Fixed literal t() strings in AIPrediction.jsx');
} else {
  console.log('Pattern not found - may need manual inspection');
  // Let's search for the exact issue
  const idx = ai.indexOf('{t(\'aiPredict.liveDB\')}');
  console.log('t(liveDB) at:', idx);
  const ctx = ai.slice(Math.max(0, idx-100), idx+200);
  console.log('Context:', ctx);
}

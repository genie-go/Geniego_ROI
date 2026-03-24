const fs = require('fs');

// Check if aiPredict section is PROPERLY inside the main object
// by looking at the bracket/brace structure
const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');

// Find the auto-generated section
const autoIdx = ja.indexOf('// ── Auto-generated i18n keys ──');
console.log('Auto section starts at:', autoIdx);

// Count braces from start to autoIdx
let braces = 0;
for (let i = 0; i < autoIdx; i++) {
  if (ja[i] === '{') braces++;
  else if (ja[i] === '}') braces--;
}
console.log('Open brace depth at auto section start:', braces);
// If braces == 1, we're inside the main object (correct)
// If braces == 0, we're outside the main object (WRONG)

// Also check the last }; line position
const closeIdx = ja.lastIndexOf('};');
console.log('Last }; at:', closeIdx, 'of', ja.length);
console.log('Auto section vs closeIdx:', autoIdx < closeIdx ? 'Auto BEFORE close (OK)' : 'Auto AFTER close (WRONG)');

// Show exact content being added (first 500 chars of auto section)
console.log('\nAuto section content:');
console.log(ja.slice(autoIdx, autoIdx + 600));

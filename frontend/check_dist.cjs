const fs = require('fs');

// Search specifically for our new keys in the built dist file
const dist = fs.readFileSync('dist/assets/i18n-locales-DEj7rNQl.js', 'utf8');

// Check for specific translated text that would only be there if our new keys were included
const checks = [
  ['予測対象', 'ja kpi.target translation'],   // Japanese for "Forecast Target"
  ['チャーンリスク', 'ja filterHigh translation'],
  ['販売商品情報', 'ja aiRec.salesInfo translation'],
  ['ビューティ・コスメ', 'ja cat.beauty translation'],
  ['Forecast Target', 'en kpi.target translation'],
  ['Sales Product Info', 'en aiRec.salesInfo'],
];

let found = 0, missing = 0;
for (const [text, label] of checks) {
  const idx = dist.indexOf(text);
  if (idx >= 0) {
    console.log(`✓ FOUND [${label}]: "${text}" at pos ${idx}`);
    found++;
  } else {
    console.log(`✗ MISSING [${label}]: "${text}"`);
    missing++;
  }
}

console.log(`\nResult: ${found} found, ${missing} missing out of ${checks.length} checks`);
console.log('File size:', dist.length);

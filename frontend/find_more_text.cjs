const fs = require('fs');

// Fix "외 N개" text in Pricing.jsx
let c = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');
const idx = c.indexOf('외 ${sec.items.length - 2}개');
if (idx >= 0) {
  const before = c.slice(Math.max(0, idx-50), idx+40);
  console.log('Found at pos', idx, ':', JSON.stringify(before));
} else {
  console.log('Not found directly, searching...');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('\uC678 ') || l.includes('more') && l.includes('sec.items')) {
      console.log(i+1, ':', l.slice(0, 150));
    }
  });
}

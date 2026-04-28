const fs = require('fs');
const f = 'd:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx';
let c = fs.readFileSync(f, 'utf-8');
const lines = c.split('\n');

// Direct fix for line 653 (0-indexed 652)
lines[652] = "        { icon: '\u26A0', title: t('orderHub.guideStep4Title'), desc: t('orderHub.guideStep4Desc'), color: '#eab308' },";

fs.writeFileSync(f, lines.join('\n'));
console.log('Fixed line 653:', lines[652].trim().substring(0,80));

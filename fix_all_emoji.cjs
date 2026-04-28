const fs = require('fs');
const f = 'd:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx';
let c = fs.readFileSync(f, 'utf-8');
const lines = c.split('\n');

for (let i = 0; i < lines.length; i++) {
    // Fix "English—?" comment
    if (lines[i].includes('English') && lines[i].includes('display labels')) {
        lines[i] = '/* Status keys are normalized English - display labels come from i18n */';
    }
    // Fix 정산 type in LiveFeed 
    if (lines[i].includes("type: '") && lines[i].includes('산') && lines[i].includes('newEvents')) {
        lines[i] = lines[i].replace(/type: '[^']*산'/, "type: '\uC815\uC0B0'");
    }
    // Fix 정산 msg in LiveFeed
    if (lines[i].includes('산') && lines[i].includes('갱') && lines[i].includes('msg:')) {
        lines[i] = lines[i].replace(/\$\{latest\.period[^}]*\}[^`]*갱[^`]*/g, '${latest.period || ""} \uC815\uC0B0 \uB370\uC774\uD130 \uAC31\uC2E0');
    }
    // Fix typeColor 정산 key
    if (lines[i].includes('typeColor') && lines[i].includes('산')) {
        lines[i] = lines[i].replace(/"[^"]*산"/g, '"\uC815\uC0B0"');
    }
    // Fix fallback emoji in INTL table
    if (lines[i].includes("||'") && lines[i].includes('INTL_CHANNELS') && lines[i].includes('icon')) {
        lines[i] = lines[i].replace(/\|\|'[^']*'/g, (m) => m.includes('icon') ? "||'\uD83C\uDF10'" : m);
        lines[i] = lines[i].replace(/icon\|\|'[^']*'/, "icon||'\uD83C\uDF10'");
    }
    if (lines[i].includes("||'") && lines[i].includes('COUNTRY_FLAG')) {
        lines[i] = lines[i].replace(/\|\|'[^']*'\}/, "||'\uD83C\uDF10'}");
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf-8');
console.log('Residual fixes applied');

// Final check
const c2 = fs.readFileSync(f, 'utf-8');
const broken = c2.split('\n').filter(l => l.includes('\uFFFD'));
console.log(`Replacement chars remaining: ${broken.length}`);
broken.forEach((l,i) => console.log(`  L: ${l.trim().substring(0,80)}`));

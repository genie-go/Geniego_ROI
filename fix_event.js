const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/EventNorm.jsx', 'utf8');

c = c.replace(/\{t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'Count집된\s*Raw\s*Event가\s*없습니다.*?'\)\).*?\)\}/g, "{t('auto.event_empty', '수집된 Raw Event가 없습니다. Demo Raw Event 시드를 클릭하세요.')}");

// Fix the exact bug output:
// <div style={{ fontSize: 12 }}>{t('auto.76vkbe', t('auto.v79kvv', 'Count집된 Raw Event가 없습니다. t(')auto.z66qj2', t('auto.4zkr33', 'Demo Raw Event 시드')) 를 Clicks하세요.')}</div>
c = c.replace(/<div style={{ fontSize: 12 }}>\{t\('auto\..*?<\/div>/g, "<div style={{ fontSize: 12 }}>{t('auto.event_empty', '수집된 Raw Event가 없습니다. Demo Raw Event 시드를 클릭하세요.')}</div>");

fs.writeFileSync('frontend/src/pages/EventNorm.jsx', c);
console.log('Fixed EventNorm.jsx');

const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/AIRuleEngine.jsx', 'utf8');

c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'반품률'\)\)\s*:/g, "[t('auto.rule_return', '반품률')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'ROAS 적자'\)\s*:/g, "[t('auto.rule_roas', 'ROAS 적자')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'ROAS 적자'\)\)\s*:/g, "[t('auto.rule_roas', 'ROAS 적자')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'반품률'\)\s*:/g, "[t('auto.rule_return', '반품률')]:");

fs.writeFileSync('frontend/src/pages/AIRuleEngine.jsx', c);
console.log('Fixed AIRuleEngine.jsx');

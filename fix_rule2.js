const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/AIRuleEngine.jsx', 'utf8');

c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'화이트리스트'\)\)\s*:/g, "[t('auto.rule_whitelist', '화이트리스트')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'화이트리스트'\)\s*:/g, "[t('auto.rule_whitelist', '화이트리스트')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'콘텐츠 피로도'\)\)\s*:/g, "[t('auto.rule_content_fatigue', '콘텐츠 피로도')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'콘텐츠 피로도'\)\s*:/g, "[t('auto.rule_content_fatigue', '콘텐츠 피로도')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'이탈 대응'\)\)\s*:/g, "[t('auto.rule_churn', '이탈 대응')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'이탈 대응'\)\s*:/g, "[t('auto.rule_churn', '이탈 대응')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*t\('auto\.[a-z0-9]+',\s*'미표기'\)\)\s*:/g, "[t('auto.rule_undisclosed', '미표기')]:");
c = c.replace(/t\('auto\.[a-z0-9]+',\s*'미표기'\)\s*:/g, "[t('auto.rule_undisclosed', '미표기')]:");

fs.writeFileSync('frontend/src/pages/AIRuleEngine.jsx', c);
console.log('Fixed AIRuleEngine.jsx again');

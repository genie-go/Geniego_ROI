const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8');

c = c.replace(/RFM Analysis Loading\.\.\./g, "{t('crm.rfm_loading', 'RFM 분석 데이터를 불러오는 중입니다...')}");

fs.writeFileSync('frontend/src/pages/CRM.jsx', c);
console.log('done');

const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Reconciliation.jsx', 'utf8');

c = c.replace(/catch \{ setError\('JSON.*?\).*; return; \}/g, "catch { setError(t('auto.json_err', 'JSON 형식 에러. 배열 형태로 입력하세요.')); setLoading(false); return; }");
c = c.replace(/if \(!Array\.isArray\(parsed\)\) \{ setError\(.*?\); setLoading\(false\); return; \}/g, "if (!Array.isArray(parsed)) { setError(t('auto.not_arr', '배열 형태가 아닙니다.')); setLoading(false); return; }");

fs.writeFileSync('frontend/src/pages/Reconciliation.jsx', c);
console.log('Fixed Reconciliation.jsx');

const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8');

const sIdx = content.indexOf('tab === "ai_segments"');
console.log(content.substring(sIdx - 100, sIdx + 1500));

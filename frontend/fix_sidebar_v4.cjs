const fs = require('fs');
const file = 'd:/project/GeniegoROI/frontend/src/layout/Sidebar.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('{isPro ? "? PRO" : "? "}', '{isPro ? "🚀 PRO" : "⭐ 일반"}');
content = content.replace('?영?스???원', '운영시스템 회원');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Sidebar strings');

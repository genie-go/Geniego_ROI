const fs = require('fs');
const c = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const routes = c.match(/path=["']([^"']+)/g) || [];
console.log('Total routes:', routes.length);
routes.forEach(r => console.log(' ', r));

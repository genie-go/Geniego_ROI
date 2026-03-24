const fs = require('fs');
const filePath = 'src/i18n/locales/zh-TW.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find variable name in zh-TW.js
const varMatch = content.match(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/m);
console.log('Variable match:', varMatch ? varMatch[1] : 'not found');

// Also try other patterns
const exportMatch = content.match(/export\s+(?:default\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/m);
console.log('Export match:', exportMatch ? exportMatch[1] : 'not found');

// Try zh without hyphen
const zhtwMatch = content.match(/zhtw|zhTW|zh_TW|zhTw/i);
console.log('zhTW match:', zhtwMatch ? zhtwMatch[0] : 'not found');

// Show first 500 chars
console.log('First 500 chars:', content.slice(0,500));

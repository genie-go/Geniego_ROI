const fs = require('fs');
const path = 'd:/project/GeniegoROI/frontend/dist/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Change version
html = html.replace('v5.7.0', 'v5.8.0');

// 2. Remove setTimeout that causes extra reload
html = html.replace(
  /setTimeout\(function\(\)\s*\{\s*window\.location\.reload\(true\);\s*\},\s*2000\);/,
  '// timeout removed'
);

// 3. Remove Phase 2 reload entirely
html = html.replace(
  /\} else if \(localStorage\.getItem\("roi_cache_phase"\) === "1"\) \{[\s\S]*?return;\s*\n/,
  '} else { localStorage.removeItem("roi_cache_phase"); }\n'
);

// 4. Add reload counter safety
html = html.replace(
  'var stored = localStorage.getItem("roi_help_ver");',
  'var stored = localStorage.getItem("roi_help_ver");\n        var _rc = parseInt(localStorage.getItem("roi_rc")||"0");\n        if (_rc > 2) { localStorage.removeItem("roi_rc"); localStorage.setItem("roi_help_ver", v); stored = v; }'
);

// 5. Track reload count
html = html.replace(
  'localStorage.setItem("roi_help_ver", v);',
  'localStorage.setItem("roi_help_ver", v); localStorage.setItem("roi_rc", String(_rc+1));'
);

// 6. Clear counter on success
html = html.replace(
  /\/\/ Phase 2 removed/,
  'localStorage.removeItem("roi_rc"); // done'
);

fs.writeFileSync(path, html, 'utf8');
console.log('Fixed! Checking...');

// Verify
const check = fs.readFileSync(path, 'utf8');
console.log('Version:', check.match(/var v = "([^"]+)"/)?.[1]);
console.log('Has setTimeout reload?', check.includes('setTimeout(function() { window.location.reload'));
console.log('Has Phase 2?', check.includes('roi_cache_phase') && check.includes('reload(true)'));
console.log('Has reload counter?', check.includes('roi_rc'));

// Fix ko.js - remove the broken email key and re-inject correctly
const fs = require('fs');
const p = __dirname + '/src/i18n/locales/ko.js';
let s = fs.readFileSync(p, 'utf8');

// Find the email section and everything after it that's broken
// Strategy: find "email": and remove everything from there to the next proper key or end
const emailStart = s.indexOf('"email":{');
if (emailStart > 0) {
    // Find the balancing closing brace
    let depth = 0;
    let i = emailStart + 8; // after "email":
    for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') { depth--; if (depth === 0) break; }
    }
    // Remove the email section including the preceding comma
    const before = s.substring(0, emailStart);
    const after = s.substring(i + 1);
    // Clean up: remove trailing/leading commas
    s = before.replace(/,\s*$/, '') + after;
}

// Now re-inject email at the end properly
const emailKo = require('./i18n_email_ko_en.cjs'); // won't work, use inline
// Actually just remove the broken part and save
fs.writeFileSync(p, s, 'utf8');

// Now verify
try {
    delete require.cache[require.resolve(p)];
    require(p);
    console.log('✅ ko.js syntax OK after removing email key');
} catch(e) {
    console.log('❌ Still broken:', e.message.substring(0, 100));
}

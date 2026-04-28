const fs = require('fs');
const p = __dirname + '/src/i18n/locales/ko.js';
let s = fs.readFileSync(p, 'utf8');

// Find the problematic area - search for the broken text pattern
// The issue is the regex replaced middle of a key, leaving orphaned text
// Find "email":{ and properly track braces to remove it
const emailIdx = s.indexOf('"email":{');
if (emailIdx > 0) {
    let depth = 0;
    let startBrace = s.indexOf('{', emailIdx + 7);
    let i = startBrace;
    for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    // Check if there's a preceding comma
    let cutStart = emailIdx;
    if (cutStart > 0 && s[cutStart - 1] === ',') cutStart--;
    
    s = s.substring(0, cutStart) + s.substring(i);
    fs.writeFileSync(p, s, 'utf8');
    console.log('Removed email section');
}

// Verify
try {
    delete require.cache[require.resolve(p)];
    require(p);
    console.log('✅ ko.js OK');
} catch(e) {
    console.log('❌ Error:', e.message.substring(0, 200));
    // More aggressive fix: look for the pattern }} 사용 
    const badIdx = s.indexOf('}} 사용');
    if (badIdx > 0) {
        console.log('Found orphaned text at', badIdx);
        // Find the start of the broken section - go back to find the key
        // Look for the previous complete key
        let scanBack = badIdx;
        while (scanBack > 0 && s[scanBack] !== ',') scanBack--;
        // Remove from scanBack to the next proper key/end
        let scanFwd = badIdx + 5;
        while (scanFwd < s.length && s[scanFwd] !== ',' && s[scanFwd] !== '}') scanFwd++;
        s = s.substring(0, scanBack) + s.substring(scanFwd);
        fs.writeFileSync(p, s, 'utf8');
        try {
            delete require.cache[require.resolve(p)];
            require(p);
            console.log('✅ ko.js fixed after orphan removal');
        } catch(e2) {
            console.log('❌ Still broken after orphan fix:', e2.message.substring(0, 200));
        }
    }
}

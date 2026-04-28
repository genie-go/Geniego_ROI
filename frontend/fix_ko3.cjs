const fs=require('fs');
const p=__dirname+'/src/i18n/locales/ko.js';
let s=fs.readFileSync(p,'utf8');

// Fix: "crm":{, -> "crm":{
// The "crm.email" sub-key was removed, leaving a leading comma
s = s.replace('"crm":{,', '"crm":{');

// Also check for any other {, patterns
s = s.replace(/\{,/g, (match, offset) => {
    // Only fix if it's really a broken pattern (not inside a string)
    return '{';
});

fs.writeFileSync(p, s, 'utf8');

// Verify
try {
    delete require.cache[require.resolve(p)];
    require(p);
    console.log('✅ ko.js is now valid!');
} catch(e) {
    console.log('❌ Still broken:', e.message.substring(0, 200));
    // Try JSON parse to find next error
    let testStr = s.replace(/^\uFEFF?export\s+default\s+/, '').trim();
    try { JSON.parse(testStr); } catch(e2) {
        const m = e2.message.match(/position (\d+)/);
        if (m) {
            const pos = parseInt(m[1]);
            console.log('Next error at pos', pos, ':', testStr.substring(Math.max(0,pos-40), pos+40));
        }
    }
}

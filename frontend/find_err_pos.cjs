const fs=require('fs');
const p=__dirname+'/src/i18n/locales/ko.js';
let s=fs.readFileSync(p,'utf8');

// Binary search for the error position
// Try parsing progressively larger chunks
const prefix = 'var x = ';
let lo = 100, hi = s.length;
// Replace export default with assignment for eval
let testStr = s.replace(/^\uFEFF?export\s+default\s+/, '');

// Remove trailing newlines
testStr = testStr.trim();

// Try parsing chunks to find error
for (let size = 1000; size < testStr.length; size += 1000) {
    const chunk = testStr.substring(0, size);
    // Count braces to find natural boundary
    let depth = 0;
    let lastGoodEnd = 0;
    for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === '{') depth++;
        else if (chunk[i] === '}') { depth--; if (depth === 0) lastGoodEnd = i + 1; }
    }
    if (lastGoodEnd > 0) {
        try {
            JSON.parse(chunk.substring(0, lastGoodEnd));
        } catch(e) {
            const m = e.message.match(/position (\d+)/);
            if (m) {
                const pos = parseInt(m[1]);
                console.log(`Error at position ${pos} (chunk size ${lastGoodEnd}):`);
                console.log(chunk.substring(Math.max(0,pos-40), pos+40));
                process.exit(0);
            }
        }
    }
}
console.log('Could not locate error via chunk parsing');

// Alternative: just try JSON.parse on the whole thing  
try {
    JSON.parse(testStr);
    console.log('JSON is valid!');
} catch(e) {
    const m = e.message.match(/position (\d+)/);
    if (m) {
        const pos = parseInt(m[1]);
        console.log(`JSON error at position ${pos}:`);
        console.log(testStr.substring(Math.max(0,pos-60), pos+60));
    } else {
        console.log('JSON error:', e.message.substring(0, 200));
    }
}

const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

const content = fs.readFileSync('src/pages/CampaignManager.jsx', 'utf8');
const lines = content.split('\n');

// Find the return( of AIRecommendTab
// AIRecommendTab function starts around line 750
// return statement starts at line ~951
let retLine = -1;
for (let i = 750; i < 1000; i++) {
    if (lines[i] && lines[i].trim() === 'return (') {
        retLine = i;
        break;
    }
}
console.log('Return line:', retLine + 1);

// Find where the return ends (should be around 1528-1529)
// It's the ); line after the closing </div>
let retEndLine = -1;
for (let i = 1525; i < 1540; i++) {
    if (lines[i] && lines[i].trim() === ');') {
        retEndLine = i;
        break;
    }
}
console.log('Return end line:', retEndLine + 1);

// Now test by appending lines one by one until error
function testUpTo(endLine) {
    // Extract from the return( to endLine
    const chunk = lines.slice(retLine, endLine + 1).join('\n');
    const wrapped = `function T() {\n${chunk}\n}`;
    try {
        parser.parse(wrapped, { sourceType: 'module', plugins: ['jsx'] });
        return true;
    } catch (e) {
        return false;
    }
}

// Binary search to find the first line that causes error
let lo = retLine + 1, hi = retEndLine;
while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (testUpTo(mid)) {
        lo = mid;
    } else {
        hi = mid;
    }
}

console.log(`\nError appears when adding line ${hi + 1}:`);
console.log('Context:');
for (let i = Math.max(retLine, hi - 10); i <= Math.min(retEndLine, hi + 2); i++) {
    console.log(`  ${i + 1}: ${lines[i]}`);
}

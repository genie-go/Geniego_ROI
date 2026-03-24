const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

const content = fs.readFileSync('src/pages/CampaignManager.jsx', 'utf8');
const lines = content.split('\n');

// Test: does removing our changes fix it?
// Our changes are in lines 1339-1503 (upload+ai tab sections)
// Let's test replacing that section with a simple placeholder

const retLine = 951;   // return ( line (0-indexed)
const retEnd = 1527;   // ); line (0-indexed)

// Get original lines for the return block
const retLines = lines.slice(retLine, retEnd + 1);

// Try different variants to isolate the issue
function testModified(from, to, replacement) {
    const modified = [
        ...lines.slice(retLine, retLine + (from - retLine)),
        ...replacement,
        ...lines.slice(retLine + (to - retLine) + 1, retEnd + 1)
    ];
    const wrapped = `function T() {\nreturn (\n${modified.join('\n')}\n);\n}`;
    try {
        parser.parse(wrapped, { sourceType: 'module', plugins: ['jsx'] });
        return 'OK';
    } catch (e) {
        return `ERROR: ${e.message.substring(0, 60)}`;
    }
}

// Test 1: Replace upload tab section with simple div
const uploadFrom = 1338;  // line 1339 (0-indexed)
const uploadTo = 1372;    // line 1373 (0-indexed)
const uploadReplacement = ['<div key="upload">upload</div>'];

console.log('Test 1 - Replace upload tab section:');
const r1 = testModified(uploadFrom, uploadTo, uploadReplacement);
console.log(' Result:', r1);

// Test 2: Replace AI tab section  
const aiFrom = 1374;   // line 1375 (0-indexed)
const aiTo = 1501;     // line 1502 (0-indexed)
const aiReplacement = ['<div key="ai">ai</div>'];

console.log('\nTest 2 - Replace AI tab section:');
const r2 = testModified(aiFrom, aiTo, aiReplacement);
console.log(' Result:', r2);

// Test 3: Replace both sections
console.log('\nTest 3 - Replace both sections:');
const combined = [
    ...lines.slice(retLine, retLine + (uploadFrom - retLine)),
    '<div key="upload">upload</div>',
    '<div key="ai">ai</div>',
    ...lines.slice(retLine + (aiTo - retLine) + 1, retEnd + 1)
];
const wrapped3 = `function T() {\nreturn (\n${combined.join('\n')}\n);\n}`;
try {
    parser.parse(wrapped3, { sourceType: 'module', plugins: ['jsx'] });
    console.log(' Result: OK');
} catch (e) {
    console.log(' Result: ERROR:', e.message.substring(0, 80));
}

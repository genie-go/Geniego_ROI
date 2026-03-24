const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

const content = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
const lines = content.split('\n');

// Find the AIRecommendTab return block
let retLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'return (') {
        retLine = i;
        break;
    }
}
console.log('Return( at line:', retLine + 1);

// The error is at line 855, show context
const errLine = 855;
console.log('\nContext around line 855:');
for (let i = Math.max(0, errLine - 15); i <= Math.min(lines.length - 1, errLine + 3); i++) {
    console.log(`  ${i + 1}: ${lines[i]}`);
}

// Also show end of file
console.log('\nLast 10 lines:');
for (let i = lines.length - 10; i < lines.length; i++) {
    console.log(`  ${i + 1}: ${lines[i]}`);
}

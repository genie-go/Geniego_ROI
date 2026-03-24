const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

const content = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
const lines = content.split('\n');

// Find return ( in AIRecommendTab
let retLine = -1;
let inFunc = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function AIRecommendTab()')) inFunc = true;
    if (inFunc && lines[i].trim() === 'return (') {
        retLine = i;
        break;
    }
}
console.log(`Return( at line ${retLine + 1}`);

// Find the end of the function (last })
let funcEnd = lines.length - 1;
for (let i = lines.length - 1; i >= retLine; i--) {
    if (lines[i].trim() === '}') {
        funcEnd = i;
        break;
    }
}
console.log(`Function end at line ${funcEnd + 1}`);

// Binary search to find exactly where the parse error appears
function testSegment(to) {
    // Take everything from beginning to line 'to', with closing brackets
    const chunk = lines.slice(0, to + 1).join('\n');
    try {
        parser.parse(chunk, { sourceType: 'module', plugins: ['jsx'] });
        return true;
    } catch (e) {
        return false;
    }
}

// First verify that the beginning parses OK
console.log(`Full file parses: ${testSegment(funcEnd) ? 'OK' : 'ERROR'}`);

// Now test section by section within the return block
// We need to find which JSX expression causes the error
// Strategy: temporarily comment out sections and see if error disappears

// Test without the images tab
const withoutImages_lines = [...lines];
// Find activeTab === 'images' block
let imagesStart = -1, imagesEnd = -1;
for (let i = retLine; i < funcEnd; i++) {
    if (lines[i].includes("activeTab === 'images'") && lines[i].includes('&&')) {
        imagesStart = i;
    }
}
if (imagesStart > 0) {
    console.log(`Images tab starts at line ${imagesStart + 1}: ${lines[imagesStart].trim()}`);
}

// Find the channels tab block
let channelsStart = -1;
for (let i = retLine; i < funcEnd; i++) {
    if (lines[i].includes("activeTab === 'channels'") && lines[i].includes('&&')) {
        channelsStart = i;
    }
}
if (channelsStart > 0) {
    console.log(`Channels tab starts at line ${channelsStart + 1}`);
}

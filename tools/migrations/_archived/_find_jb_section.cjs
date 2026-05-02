const fs = require('fs');

const content = fs.readFileSync('d:/project/GeniegoROI/frontend/src/i18n/locales/ko.js', 'utf8');
const lines = content.split('\n');

let inJbSection = false;
let startLine = 0;
let endLine = 0;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('"jb":')) {
        inJbSection = true;
        startLine = i + 1; // 1-based line number
        braceCount = 0;
    }

    if (inJbSection) {
        // Count braces
        for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }

        if (braceCount === 0 && line.includes('}')) {
            endLine = i + 1;
            break;
        }
    }
}

console.log(`jb section: lines ${startLine} to ${endLine}`);
console.log(`Total lines: ${endLine - startLine + 1}`);

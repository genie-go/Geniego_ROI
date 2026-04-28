const fs = require('fs');
const path = require('path');

const srcDir = 'd:/project/GeniegoROI/frontend/src/pages';
const filesToProcess = ['AIRuleEngine.jsx', 'Audit.jsx', 'DataProduct.jsx', 'EventNorm.jsx', 'Onboarding.jsx', 'PixelTracking.jsx'];

for (const name of filesToProcess) {
    const p = path.join(srcDir, name);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');

    // Parse the file character by character to find global const definitions involving t(
    let inString = false;
    let strChar = '';
    let inComment = false;
    let inBlockComment = false;
    let braceLevel = 0;

    let statements = [];
    let currentStatement = { start: -1, text: '' };

    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        
        if (!inString && !inComment && !inBlockComment) {
            if (c === '/' && content[i+1] === '/') { inComment = true; i++; continue; }
            if (c === '/' && content[i+1] === '*') { inBlockComment = true; i++; continue; }
            
            if (c === '"' || c === "'" || c === "`") {
                inString = true; strChar = c;
            } else if (c === '{' || c === '[') {
                braceLevel++;
            } else if (c === '}' || c === ']') {
                braceLevel--;
            } else if (c === '\n' && braceLevel === 0) {
                // Not really reliable for statements. Use standard semicolon or newline parsing.
            }
        } else if (inString) {
            if (c === strChar && content[i-1] !== '\\') {
                inString = false;
            }
        } else if (inComment) {
            if (c === '\n') inComment = false;
        } else if (inBlockComment) {
            if (c === '*' && content[i+1] === '/') { inBlockComment = false; i++; }
        }
    }
}

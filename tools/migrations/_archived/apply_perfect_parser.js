const fs = require('fs');
const path = require('path');

const srcDir = 'd:/project/GeniegoROI/frontend/src/pages';
const filesToProcess = ['AIRuleEngine.jsx', 'Approvals.jsx', 'Audit.jsx', 'DataProduct.jsx', 'EventNorm.jsx', 'Onboarding.jsx', 'PixelTracking.jsx', 'Reconciliation.jsx'];

for (const name of filesToProcess) {
    const p = path.join(srcDir, name);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');

    let insideVar = null;
    let braceLevel = 0;
    const toWrap = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!insideVar && /^const\s+([A-Z_0-9]+)\s*=\s*([\[\{])/.test(line)) {
            const m = line.match(/^const\s+([A-Z_0-9]+)\s*=\s*([\[\{])/);
            insideVar = { name: m[1], startLine: i, endLine: -1, text: '', usesT: false };
        }

        if (insideVar) {
            insideVar.text += line + '\n';
            if (line.includes('t(')) {
                insideVar.usesT = true;
            }
            // Count braces and brackets
            let inString = false;
            let strChar = '';
            for (let j = 0; j < line.length; j++) {
                const c = line[j];
                // basic string skipping to avoid `{` inside strings
                if ((c === '"' || c === "'" || c === "`") && line[j-1] !== '\\') {
                    if (!inString) { inString = true; strChar = c; }
                    else if (strChar === c) { inString = false; }
                }

                if (!inString) {
                    if (c === '{' || c === '[') braceLevel++;
                    if (c === '}' || c === ']') braceLevel--;
                }
            }

            if (braceLevel === 0) {
                insideVar.endLine = i;
                if (insideVar.usesT) {
                    toWrap.push(insideVar);
                }
                insideVar = null;
            }
        }
        
        // Stop going into components
        if (/^export default function|function|^const [A-Z].*=.*=>/.test(line) && braceLevel === 0 && !insideVar) {
            break;
        }
    }

    if (toWrap.length > 0) {
        // We will do exact line replacements backwards to not mess up line numbers
        for (let idx = toWrap.length - 1; idx >= 0; idx--) {
            const w = toWrap[idx];
            // Start line: const XYZ = [   ->   const get_XYZ = (t) => { return ( [
            lines[w.startLine] = lines[w.startLine].replace(new RegExp(`^const\\s+${w.name}\\s*=`), `const get_${w.name} = (t) => { return `);
            // End line: ]; or };  ->   ]; ); };
            // But wait, it might end with `]` or `}` without semicolon.
            // Let's just append `); };` to the end line
            lines[w.endLine] += ' };';
        }

        content = lines.join('\n');

        // Replace references (XYZ -> get_XYZ(t))
        for (const w of toWrap) {
            const occRegex = new RegExp(`\\b${w.name}\\b`, 'g');
            content = content.replace(occRegex, (match, offset, str) => {
                if (offset >= 4 && str.substr(offset - 4, 4) === 'get_') return match;
                if (offset >= 1 && str[offset - 1] === '.') return match;
                if (str.substr(offset + match.length).trimLeft().startsWith(':')) return match;
                return `get_${w.name}(t)`;
            });
        }

        // Add useT() to components
        content = content.replace(/(function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)/g, (match) => {
            return match + '\n    const t = useT();';
        });
        content = content.replace(/(const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)(?![\s\S]*useT\(\))/g, (match) => {
            return match + '\n    const t = useT();';
        });

        content = content.replace(/(\n\s*const t = useT\(\);)+/g, '\n    const t = useT();');

        // also need to import useT if missing? It should be there.

        fs.writeFileSync(p, content, 'utf8');
        console.log(`Rewrote ${name} with ${toWrap.length} dynamic constants.`);
    }
}

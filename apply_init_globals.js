const fs = require('fs');
const path = require('path');

const srcDir = 'd:/project/GeniegoROI/frontend/src/pages';
const filesToProcess = ['AIRuleEngine.jsx', 'Approvals.jsx', 'Audit.jsx', 'DataProduct.jsx', 'EventNorm.jsx', 'Onboarding.jsx', 'PixelTracking.jsx', 'Reconciliation.jsx'];

for (const name of filesToProcess) {
    const p = path.join(srcDir, name);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');

    // Find `const NAME = [` or `const NAME = {` globally that contain `t(`
    const regex = /^const\s+([A-Z_0-9]+)\s*=\s*(?:\[|\{)/gm;
    let match;
    const toWrap = [];

    // Simple brute-force parser to find bounds
    const lines = content.split('\n');
    let insideVar = null;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!insideVar && /^const\s+([A-Z_0-9]+)\s*=\s*([\[\{])/.test(line)) {
            const m = line.match(/^const\s+([A-Z_0-9]+)\s*=\s*([\[\{])/);
            insideVar = { name: m[1], open: m[2], startLine: i, endLine: -1, text: '', usesT: false };
        }

        if (insideVar) {
            insideVar.text += line + '\n';
            if (line.includes('t(')) {
                insideVar.usesT = true;
            }

            let inStr = false;
            let strC = '';
            for (let j = 0; j < line.length; j++) {
                const c = line[j];
                if ((c === '"' || c === "'" || c === "`") && line[j-1] !== '\\') {
                    if (!inStr) { inStr = true; strC = c; }
                    else if (strC === c) { inStr = false; }
                }

                if (!inStr) {
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
        if (/^export default function|function|^const [A-Z].*=.*=>/.test(line) && braceLevel === 0 && !insideVar) {
            break;
        }
    }

    if (toWrap.length > 0) {
        // Rewrite `const NAME = ` into `let NAME;` and collect initializers
        const initializers = [];
        for (let idx = toWrap.length - 1; idx >= 0; idx--) {
            const w = toWrap[idx];
            // Change let NAME;
            lines[w.startLine] = lines[w.startLine].replace(new RegExp(`^const\\s+${w.name}\\s*=\\s*([\\s\\S]*)`), (m, rest) => {
                initializers.push(`  ${w.name} = ` + rest);
                return `let ${w.name};`;
            });
            // The rest of the body stays intact, but wait: the body spans lines[startLine..endLine].
            // If I just change line[startLine], the whole block remains globally defined WITHOUT `let NAME =`!
            // E.g.
            // let SCHEMA;
            // { domain: ... }
            // ];
            // This is invalid syntax (top-level block with syntax error).
            
            // I must remove the entire block from the file, and place it in initGlobals!
        }
    }
}

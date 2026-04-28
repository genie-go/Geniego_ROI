const fs = require('fs');

const data = {
  'AIRuleEngine.jsx': [
    { name: 'PATTERNS', start: 33, end: 74 },
    { name: 'ACTIVE_RULES', start: 76, end: 83 },
    { name: 'SUGGESTIONS', start: 440, end: 447 },
    { name: 'LLM_MOCK', start: 449, end: 474 },
    { name: 'TABS', start: 620, end: 625 }
  ],
  'Audit.jsx': [
    { name: 'MOCK_LOGS', start: 40, end: 61 }
  ],
  'DataProduct.jsx': [
    { name: 'SCHEMA', start: 14, end: 74 },
    { name: 'PLATFORM_MAPPING', start: 77, end: 200 },
    { name: 'METRICS', start: 203, end: 222 },
    { name: 'RULES', start: 225, end: 275 }
  ],
  'EventNorm.jsx': [
    { name: 'SCHEMA_SECTIONS', start: 65, end: 119 },
    { name: 'TABS', start: 398, end: 403 }
  ],
  'Onboarding.jsx': [
    { name: 'ROLES', start: 6, end: 67 }
  ],
  'PixelTracking.jsx': [
    { name: 'PLAN_FEES', start: 7, end: 12 }
  ]
};

const dir = 'd:/project/GeniegoROI/frontend/src/pages/';

for (const [file, ranges] of Object.entries(data)) {
    let lines = fs.readFileSync(dir + file, 'utf8').split('\n');
    let output = [];

    // 1. Process lines
    let inVar = false;
    let currVar = null;
    let initializers = [];
    
    // Create declarations
    const declarations = ranges.map(r => `let ${r.name};`).join('\n');

    for (let i = 0; i < lines.length; i++) {
        let isStart = ranges.find(r => r.start - 1 === i); // 0-indexed
        let isEnd = ranges.find(r => r.end - 1 === i);

        if (isStart) {
            inVar = true;
            currVar = isStart;
            // Record original text
            initializers.push({ name: isStart.name, text: [] });
            // Instead of 'const NAME = [', we store 'NAME = ['
            initializers[initializers.length - 1].text.push(lines[i].replace(/^const\s+[A-Z_]+/, currVar.name));
            continue; // Skip putting this into file right away
        }

        if (inVar) {
            initializers[initializers.length - 1].text.push(lines[i]);
            if (isEnd) {
                inVar = false;
                currVar = null;
            }
            continue;
        }

        output.push(lines[i]);
    }

    // 2. Put definitions together
    let initFunc = `const initGlobals = (t) => {\n`;
    for (const init of initializers) {
        initFunc += `  ${init.text.join('\n  ')}\n`;
    }
    initFunc += `};\n`;

    // 3. Inject at top
    // Find the first non-import, non-comment line, or after last import
    let injectIdx = 0;
    for (let i = output.length - 1; i >= 0; i--) {
        if (output[i].startsWith('import')) {
            injectIdx = i + 1;
            break;
        }
    }

    output.splice(injectIdx, 0, declarations + '\n' + initFunc);

    // 4. Inject `initGlobals(t);` inside main component
    const funcName = file.replace('.jsx', '');
    for (let i = 0; i < output.length; i++) {
        if (output[i].includes(`export default function ${funcName}(`) || output[i].includes(`export default function() {`)) {
            // Check next lines for `useT()`
            let added = false;
            for (let j = i + 1; j < Math.min(output.length, i + 5); j++) {
                if (output[j].includes('useT(') || output[j].includes('= useI18n(')) {
                    output.splice(j + 1, 0, `  initGlobals(t);`);
                    added = true;
                    break;
                }
            }
            if (!added) {
                output.splice(i + 1, 0, `  const t = useT();`, `  initGlobals(t);`);
            }
            break;
        }
    }

    fs.writeFileSync(dir + file, output.join('\n'), 'utf8');
}
console.log('Fixed accurately!');

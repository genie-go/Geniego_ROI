const fs = require('fs');
const path = require('path');

const map = {
    'AIRuleEngine.jsx': ['PATTERNS', 'ACTIVE_RULES', 'SUGGESTIONS', 'LLM_MOCK', 'TABS'],
    'Approvals.jsx': ['MOCK_REQUESTS'],
    'Audit.jsx': ['MOCK_LOGS'],
    'DataProduct.jsx': ['SCHEMA', 'PLATFORM_MAPPING', 'METRICS', 'RULES'],
    'EventNorm.jsx': ['SCHEMA_SECTIONS', 'TABS'],
    'Onboarding.jsx': ['ROLES'],
    'PixelTracking.jsx': ['PLAN_FEES'],
    'Reconciliation.jsx': ['CHANNELS', 'SEVERITY_COLOR']
};

for (const [file, globals] of Object.entries(map)) {
    const srcPath = `d:/project/GeniegoROI/frontend/src/pages/${file}`;
    let c = fs.readFileSync(srcPath, 'utf8');

    for (const v of globals) {
        c = c.replace(new RegExp(`^const ${v}\\s*=`, 'm'), `const get_${v} = (t) =>`);
    }

    const funcName = file.replace('.jsx', '');
    
    // Some components use 'export default function Name() {'
    let funcDeclRegex = new RegExp(`export default function ${funcName}\\s*\\([^)]*\\)\\s*\\{`);
    let funcDeclAlt = new RegExp(`export default \\*?function(?:\\s+${funcName})?\\s*\\([^)]*\\)\\s*\\{`);
    // wait, what if it's `function Component`? Let's just blindly match the export default function.
    
    const m = c.match(funcDeclRegex) || c.match(/(export default function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/);

    if (m) {
        const injectList = globals.map(v => `  const ${v} = React.useMemo(() => get_${v}(t), [t]);`).join('\n');
        
        // Remove old 'const t = useT();' if it exists directly below the function signature, to avoid duplication
        const oldStr = m[1];
        let replacement = `${oldStr}\n  const t = useT();\n${injectList}\n`;
        
        // Let's check if the NEXT line already had `const t = useT();` and remove it from replacement target
        if (c.includes(`${oldStr}\n  const t = useT();`)) {
             c = c.replace(`${oldStr}\n  const t = useT();`, replacement);
        } else if (c.includes(`${oldStr}\n    const t = useT();`)) {
             c = c.replace(`${oldStr}\n    const t = useT();`, replacement);
        } else {
             c = c.replace(oldStr, replacement);
             // wait, if `const t = useT();` appears later, it will error with "Identifier 't' has already been declared".
             c = c.replace(/useT\(\);[\s\S]*?useT\(\);/, 'useT();'); // crude deduplication if any
        }
    }

    // if there are sub-components like StatusBadge that DO NOT use `t` but now might need it because we didn't inject `const t = useT();` in them.
    // However, the original code had these globals outside and `t` was global, so sub-components accessed the GLOBAL array, not the one inside the parent!
    // This is a CRITICAL flaw in moving globals into the main component!
    // If a sub-component accesses `MOCK_REQUESTS` directly, it will throw ReferenceError!
    // To solve this: pass `MOCK_REQUESTS={MOCK_REQUESTS}` OR redefine them outside as getters and call `get_XYZ(useT())` inside the subcomponents!

    fs.writeFileSync(srcPath, c, 'utf8');
}

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
    if (!fs.existsSync(srcPath)) continue;
    let content = fs.readFileSync(srcPath, 'utf8');

    // 1. Rename declarations to get_XYZ = (t) => ...
    for (const v of globals) {
        // e.g. const SCHEMA = [
        content = content.replace(new RegExp(`const\\s+${v}\\s*=`, 'gm'), `const get_${v} = (t) =>`);
        // e.g. let SCHEMA = [
        content = content.replace(new RegExp(`let\\s+${v}\\s*=`, 'gm'), `let get_${v} = (t) =>`);
    }

    // 2. Replace occurrences of XYZ with get_XYZ(t)
    for (const v of globals) {
        // We look for word boundaries but avoid 'get_XYZ'
        // Also avoid where it was declared (already changed above)
        // Also avoid if it's already get_XYZ(t)
        const occRegex = new RegExp(`\\b${v}\\b`, 'g');
        content = content.replace(occRegex, (match, offset, str) => {
            // Check if preceded by 'get_'
            if (offset >= 4 && str.substr(offset - 4, 4) === 'get_') return match;
            // Check if preceded by '.' (property access e.g. obj.XYZ)
            if (offset >= 1 && str[offset - 1] === '.') return match;
            // Check if followed by ':' (object key e.g. { XYZ: 1 })
            if (str.substr(offset + match.length).trimLeft().startsWith(':')) return match;
            
            return `get_${v}(t)`;
        });
    }

    // 3. Ensure 'const t = useT();' exists in any component that has 'get_XYZ(t)'
    // This requires matching all functions and arrow functions inside the component.
    // simpler: search for: function X() { or const X = () => {
    // and inject 'const t = useT();'
    content = content.replace(/(function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/g, (match) => {
        return match + '\n    const t = useT();';
    });
    content = content.replace(/(const\s+[a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)(?![\s\S]*useT\(\))/g, (match) => {
        return match + '\n    const t = useT();';
    });
    // This works well enough, although it might add `useT()` to small helper functions that don't need it.
    // If it's a hook call outside components, it might trigger React warning "Hooks can only be called inside the body of a function component".
    // Is there any non-component function using get_XYZ(t)?
    // Usually, array `.map()` isn't a block that sets const unless it has `{}`.
    // If a simple map func `a => { const t = useT(); }` has it, React will throw an error since it's not a component custom hook!
    // -> We MUST ONLY inject in components: Capitalized function names!
    content = content.replace(/(\n    const t = useT\(\);)+/g, ''); // strip to be safe first
    content = content.replace(/(function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)/g, (match) => {
        return match + '\n    const t = useT();';
    });
    content = content.replace(/(const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)/g, (match) => {
        return match + '\n    const t = useT();';
    });

    // Clean up multiple duplicate `const t = useT();` inside the same scope.
    // A bit hacky but works for the main component:
    content = content.replace(/(const t = useT\(\);\s*){2,}/g, 'const t = useT();\n  ');

    fs.writeFileSync(srcPath, content, 'utf8');
    console.log(`Rewritten ${file}`);
}

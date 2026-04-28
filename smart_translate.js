const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            results = results.concat(walkDir(full));
        } else if (f.endsWith('.jsx')) {
            results.push(full);
        }
    });
    return results;
}

const targetDirs = [
    'frontend/src/pages',
    'frontend/src/components',
    'frontend/src/layout'
];

let allFiles = [];
targetDirs.forEach(d => allFiles = allFiles.concat(walkDir(d)));

let totalReplacements = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We keep track if we changed anything
    let changed = false;

    // 1. Literal JSX Text (> 한 글 <)
    content = content.replace(/>(\s*)([^><{}]*[가-힣][^><{}]*)(\s*)</g, (m, s1, text, s2) => {
        if (text.includes("t(") || text.includes("{") || text.includes("}")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `>${s1}{t('${key}', '${safeTxt}')}${s2}<`;
    });

    // 2. React props with double/single quotes
    content = content.replace(/(\b\w+)=["']([^"']*[가-힣][^"']*)["']/g, (m, prop, text) => {
        if (m.includes('{t(')) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `${prop}={t('${key}', '${safeTxt}')}`;
    });

    // 3. Known properties
    content = content.replace(/(label|name|desc|tooltip|text|message|title|subtitle)\s*:\s*(["'])([^"']*[가-힣][^"']*)\2/g, (m, prop, quote, text) => {
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `${prop}: t('${key}', '${safeTxt}')`;
    });

    // 4. Array string literals
    content = content.replace(/\[\s*(.*?)\s*\]\.map/gs, (m, inner) => {
        let newInner = inner.replace(/(["'])([^"']*[가-힣][^"']*)\1/g, (m2, q, text) => {
            let safeTxt = text.trim().replace(/'/g, "\\'");
            let key = "auto." + Math.random().toString(36).substring(2, 8);
            changed = true;
            return `t('${key}', '${safeTxt}')`;
        });
        return `[${newInner}].map`;
    });

    // 5. JSX Simple conditions
    content = content.replace(/(\?|:)\s*(["'])([^"']*[가-힣][^"']*)\2/g, (m, op, q, text) => {
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `${op} t('${key}', '${safeTxt}')`;
    });

    if (changed && content !== original) {
        // If the file DOES NOT have `useT()` or equivalent, inject it ONLY inside uppercase React functions
        if (!content.match(/const\s+\{\s*t\s*\}\s*=\s*useI18n\(\)/) && !content.includes('const t = useT()')) {
            const relativePath = path.relative(path.dirname(file), path.join('frontend', 'src', 'i18n', 'index.jsx')).replace(/\\/g, '/');
            // Ensure import is there
            if (!content.includes('useT')) {
                // If it imports from i18n already
                if (content.includes('../i18n')) {
                    content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]([^'"]*i18n[^'"]*)['"];/, "import { $1, useT } from '$2';");
                } else {
                    content = content.replace(/(import React[^;]*;)/, "$1\nimport { useT } from '../i18n/index.js';");
                }
            }
            
            // Inject strictly into UPPERCASE functions (React components)
            content = content.replace(/(export\s+default\s+)?(function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)/g, "$1$2\n  const t = useT();\n");
            
            // For arrow functions: const Component = () => {
            content = content.replace(/(const\s+[A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*\{)/g, "$1\n  const t = useT();\n");
        }
        
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Updated ${totalReplacements} files.`);

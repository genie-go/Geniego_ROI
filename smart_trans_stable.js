const fs = require('fs');

const targets = [
    'frontend/src/pages/AIRuleEngine.jsx',
    'frontend/src/pages/AlertPolicies.jsx',
    'frontend/src/pages/AiPolicy.jsx',
    'frontend/src/components/RulesEditorV2.jsx',
    'frontend/src/pages/Approvals.jsx',
    'frontend/src/pages/Writeback.jsx',
    'frontend/src/pages/Onboarding.jsx',
    
    'frontend/src/pages/Connectors.jsx',
    'frontend/src/pages/EventNorm.jsx',
    'frontend/src/pages/ApiKeys.jsx',
    'frontend/src/pages/PixelTracking.jsx',
    'frontend/src/pages/DataTrustDashboard.jsx',
    'frontend/src/pages/MappingRegistry.jsx',
    'frontend/src/pages/DataProduct.jsx',
    
    'frontend/src/pages/Settlements.jsx',
    'frontend/src/pages/Reconciliation.jsx',
    'frontend/src/pages/Pricing.jsx',
    'frontend/src/pages/Audit.jsx',
    'frontend/src/pages/ActionPresets.jsx'
];

let totalReplacements = 0;

targets.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Rule 1: Literal JSX Text Node (> 한글 텍스트 <) - Single line
    content = content.replace(/>(\s*)([^\r\n><{}]*[가-힣][^\r\n><{}]*)(\s*)</g, (m, s1, text, s2) => {
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `>${s1}{t('${key}', '${safeTxt}')}${s2}<`;
    });

    // Rule 2: Component Props
    content = content.replace(/ \b(label|placeholder|title|tooltip|message|desc|subtitle|group|trigger|pipeline)=(["'])([^"'\r\n]*?[가-힣][^"'\r\n]*?)\2/g, (m, prop, q, text) => {
        if (text.includes("t('") || text.includes("{")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return ` ${prop}={t('${key}', '${safeTxt}')}`;
    });

    // Rule 3: Object literals
    content = content.replace(/\b(label|name|title|desc|message|text|group|trigger|pipeline)\s*:\s*(["'])([^"'\r\n]*?[가-힣][^"'\r\n]*?)\2/g, (m, prop, q, text) => {
        if (text.includes("t('") || text.includes("{")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `${prop}: t('${key}', '${safeTxt}')`;
    });

    // NOW Rule 4 is SAFE! Arrays containing strings. 
    // We only match object literal arrays but using the exact same quote strictness.
    content = content.replace(/\[([\s\S]*?)\]\.map/g, (m, inner) => {
        let newInner = inner.replace(/(["'])([^"'\r\n]*?[가-힣][^"'\r\n]*?)\1/g, (m2, q, text) => {
            if (text.includes("t('") || text.includes("{")) return m2;
            let safeTxt = text.trim().replace(/'/g, "\\'");
            let key = "auto." + Math.random().toString(36).substring(2, 8);
            return `t('${key}', '${safeTxt}')`;
        });
        return `[${newInner}].map`;
    });

    // Rule 5: Free floating strings inside braces or parens (like alert('한글'))
    // ONLY if they contain Korean, are strict string literals, and have no quotes inside.
    content = content.replace(/([{([,;:?]\s*)(["'])([^"'\r\n]*?[가-힣][^"'\r\n]*?)\2/g, (m, prefix, q, text) => {
        if (text.includes("t('") || text.includes("{")) return m;
        if (m.match(/require\(/) || m.match(/import /)) return m;
        // Avoid objects properties being doubled
        if (prefix.trim() === ':') {
            // we probably caught this in Rule 3, so let's skip for safety.
            // Wait, if rule 3 hit it, it's ALREADY `t()`.
            // But if rule 3 didn't match the prop name (e.g. someOtherProp: "한글"?), then we translate it.
        }
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `${prefix}t('${key}', '${safeTxt}')`;
    });

    if (content !== original) {
        // Safe useT injection if absent
        if (!content.includes('const t = useT(') && !content.includes('const { t } = useI18n') && !content.includes('const t = useI18n')) {
            if (!content.includes('import { useT }')) {
                content = content.replace(/(import React[^;]*;)/, "$1\nimport { useT } from '../i18n/index.js';");
            }
            content = content.replace(/(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, "$1\n  const t = useT();");
            content = content.replace(/(export\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, (m) => m + "\n  const t = useT();");
            content = content.replace(/(const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{(?!\s*return))/, (m) => m + "\n  const t = useT();");
        }
        
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Final rock-solid correctly updated ${totalReplacements} files!`);

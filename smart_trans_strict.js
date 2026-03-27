const fs = require('fs');

const targets = [
    // Automation & AI
    'frontend/src/pages/AIRuleEngine.jsx',
    'frontend/src/pages/AlertPolicies.jsx',
    'frontend/src/pages/AiPolicy.jsx',
    'frontend/src/components/RulesEditorV2.jsx',
    'frontend/src/pages/Approvals.jsx',
    'frontend/src/pages/Writeback.jsx',
    'frontend/src/pages/Onboarding.jsx',
    
    // Data Connectors
    'frontend/src/pages/Connectors.jsx',
    'frontend/src/pages/EventNorm.jsx',
    'frontend/src/pages/ApiKeys.jsx',
    'frontend/src/pages/PixelTracking.jsx',
    'frontend/src/pages/DataTrustDashboard.jsx',
    'frontend/src/pages/MappingRegistry.jsx',
    'frontend/src/pages/DataProduct.jsx',
    
    // Finance
    'frontend/src/pages/Settlements.jsx',
    'frontend/src/pages/Reconciliation.jsx',
    'frontend/src/pages/Pricing.jsx',
    'frontend/src/pages/Audit.jsx'
];

let totalReplacements = 0;

targets.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    let changed = false;

    // 1. Literal JSX Text (> 한 글 <)
    content = content.replace(/>(\s*)([^><{}]*[가-힣][^><{}]*)(\s*)</g, (m, s1, text, s2) => {
        if (text.includes("t(") || text.includes("{")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `>${s1}{t('${key}', '${safeTxt}')}${s2}<`;
    });

    // 2. React props with double quotes -> replace completely but skip functions
    content = content.replace(/(\w+)=["']([^"']*[가-힣][^"']*)["']/g, (m, prop, text) => {
        if (m.includes('{t(')) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `${prop}={t('${key}', '${safeTxt}')}`;
    });

    // 3. Known JS properties: label, name, desc, message, title, l
    content = content.replace(/(label|name|desc|text|message|title|subtitle|l)\s*:\s*(["'])([^"']*[가-힣][^"']*)\2/g, (m, prop, quote, text) => {
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        changed = true;
        return `${prop}: t('${key}', '${safeTxt}')`;
    });

    // 4. Raw string array map elements: ["한글", "두글"].map
    content = content.replace(/\[\s*(.*?)\s*\]\.map/gs, (m, inner) => {
        let newInner = inner.replace(/(["'])([^"']*[가-힣][^"']*)\1/g, (m2, q, text) => {
            let safeTxt = text.trim().replace(/'/g, "\\'");
            let key = "auto." + Math.random().toString(36).substring(2, 8);
            changed = true;
            return `t('${key}', '${safeTxt}')`;
        });
        return `[${newInner}].map`;
    });

    if (changed && content !== original) {
        // If file doesn't have useT, inject it
        if (!content.includes('const t = useT') && !content.includes('const { t } = useI18n') && !content.includes('const t = useI18n()')) {
            if (!content.includes("useT")) {
                content = content.replace(/(import React[^;]*;)/, "$1\nimport { useT } from '../i18n';");
            }
            // Safely inject exactly once per function match
            content = content.replace(/((?:export\s+default\s+)?function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)/g, "$1\n  const t = useT();");
        }
        
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Updated ${totalReplacements} explicit files strictly!`);

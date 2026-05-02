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

    // Rule 1: Literal JSX Text Node (> 한글 텍스트 <) - Single line, no inner nodes
    content = content.replace(/>(\s*)([^\r\n><{}]*[가-힣][^\r\n><{}]*)(\s*)</g, (m, s1, text, s2) => {
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `>${s1}{t('${key}', '${safeTxt}')}${s2}<`;
    });

    // Rule 2: Component Props (e.g. placeholder="한글")
    content = content.replace(/ \b(label|placeholder|title|tooltip|message|desc|subtitle|group|trigger|pipeline)=(["'])([^\r\n]*?[가-힣][^\r\n]*?)\2/g, (m, prop, q, text) => {
        if (text.includes("t('")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return ` ${prop}={t('${key}', '${safeTxt}')}`;
    });

    // Rule 3: Object literals (e.g. label: "한글")
    content = content.replace(/\b(label|name|title|desc|message|text|group|trigger|pipeline)\s*:\s*(["'])([^\r\n]*?[가-힣][^\r\n]*?)\2/g, (m, prop, q, text) => {
        if (text.includes("t('")) return m;
        let safeTxt = text.trim().replace(/'/g, "\\'");
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `${prop}: t('${key}', '${safeTxt}')`;
    });

    // Rule 4: Array maps
    content = content.replace(/\[([\s\S]*?)\]\.map/g, (m, inner) => {
        let newInner = inner.replace(/(["'])([^\r\n]*?[가-힣][^\r\n]*?)\1/g, (m2, q, text) => {
            if (text.includes("t('")) return m2;
            let safeTxt = text.trim().replace(/'/g, "\\'");
            let key = "auto." + Math.random().toString(36).substring(2, 8);
            return `t('${key}', '${safeTxt}')`;
        });
        return `[${newInner}].map`;
    });

    if (content !== original) {
        // Safe useT injection if absent
        if (!content.includes('const t = useT(') && !content.includes('const { t } = useI18n') && !content.includes('const t = useI18n')) {
            if (!content.includes('import { useT }')) {
                content = content.replace(/(import React[^;]*;)/, "$1\nimport { useT } from '../i18n';");
            }
            content = content.replace(/(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, "$1\n  const t = useT();");
            content = content.replace(/(export\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, (m) => m + "\n  const t = useT();");
            content = content.replace(/(const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/, (m) => m + "\n  const t = useT();");
        }
        
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Final safely updated ${totalReplacements} files!`);

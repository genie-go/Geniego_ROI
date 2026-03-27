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

    // VERY SAFE Rule 1: Literal JSX Text Node (> 한글 텍스트 <)
    content = content.replace(/>(\s*)([^><{}"'()]*[가-힣][^><{}"'()]*)(\s*)</g, (m, s1, text, s2) => {
        let safeTxt = text.trim();
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `>${s1}{t('${key}', '${safeTxt}')}${s2}<`;
    });

    // VERY SAFE Rule 2: Component Props (e.g. placeholder="한글")
    content = content.replace(/ \b(label|placeholder|title|tooltip|message|desc|subtitle)=["']([^"'{()<>]*[가-힣][^"'{()<>]*)["']/g, (m, prop, text) => {
        let safeTxt = text.trim();
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return ` ${prop}={t('${key}', '${safeTxt}')}`;
    });

    // VERY SAFE Rule 3: Object literals (e.g. label: "한글")
    // Note: this rule replaces `"한글"` with `t('key', '한글')`
    content = content.replace(/\b(label|name|title|desc|message|text)\s*:\s*(["'])([^"'{()<>]*[가-힣][^"'{()<>]*)["']/g, (m, prop, q, text) => {
        let safeTxt = text.trim();
        let key = "auto." + Math.random().toString(36).substring(2, 8);
        return `${prop}: t('${key}', '${safeTxt}')`;
    });

    if (content !== original) {
        // Safe useT injection if absent
        if (!content.includes('const t = useT(') && !content.includes('const { t } = useI18n') && !content.includes('const t = useI18n')) {
            if (!content.includes('import { useT }')) {
                content = content.replace(/(import React[^;]*;)/, "$1\nimport { useT } from '../i18n';");
            }
            // Safely inject inside the main component function exactly once
            // Looks for `export default function Component(`
            content = content.replace(/(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, "$1\n  const t = useT();");
        }
        
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Safely updated ${totalReplacements} files!`);

const fs = require('fs');

const targets = [
    'frontend/src/pages/AIRuleEngine.jsx',
    'frontend/src/pages/AlertPolicies.jsx',
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

    // Flatten nested t(t(...))
    for (let i = 0; i < 5; i++) {
        content = content.replace(/t\('auto\.[a-z0-9]+', t\('auto\.[a-z0-9]+', (.*?)\)\)/g, (m, innerText) => {
            return `t('auto.${Math.random().toString(36).substring(2, 8)}', ${innerText})`;
        });
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        totalReplacements++;
    }
});

console.log(`Flattened nested t() in ${totalReplacements} files!`);

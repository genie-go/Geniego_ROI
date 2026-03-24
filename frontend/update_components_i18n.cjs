/**
 * update_components_i18n.cjs
 * Updates AIPrediction.jsx, AIRecommendTab.jsx, JourneyBuilder.jsx, campaignConstants
 * to use t() instead of hardcoded strings.
 */
const fs = require('fs');

// ─── 1. AIPrediction.jsx ─────────────────────────────────────────────────────
let ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');

// Add useI18n import if missing
if (!ai.includes('useI18n')) {
  ai = ai.replace(
    'import PlanGate from "../components/PlanGate.jsx";',
    'import PlanGate from "../components/PlanGate.jsx";\nimport { useI18n } from "../i18n/index.js";'
  );
}

// Add const { t } = useI18n(); in AIPredictionInner
if (!ai.includes("const { t } = useI18n()")) {
  ai = ai.replace(
    'const { isDemo } = useDemo();\n    const { crmSegments',
    'const { isDemo } = useDemo();\n    const { t } = useI18n();\n    const { crmSegments'
  );
}

// CustomerDetailPanel also needs t
if (!ai.includes("CustomerDetailPanel") || ai.includes('const { t } = useI18n(); // detail')) {
  // skip
} else {
  ai = ai.replace(
    'const [tab, setTab] = useState("overview");\n    const [prodRecs',
    'const [tab, setTab] = useState("overview");\n    const { t } = useI18n();\n    const [prodRecs'
  );
}

// Replace hardcoded strings with t() in AIPredictionInner render
const replacements = [
  // Sub-title
  ['Purchase Probability · LTV Forecast · Churn Score · Product Recommend Engine · ML Model Performance', "{t('aiPredict.pageSub')}"],
  // Mode badges
  ['🟢 Live DB', "{t('aiPredict.liveDB')}"],
  ['🟡 Demo Simulation', "{t('aiPredict.demoSim')}"],
  // KPI labels & sub
  ['label: "Forecast Target"', "label: t('aiPredict.kpi.target')"],
  ['label: "Churn Risk",', "label: t('aiPredict.kpi.churnRisk'),"],
  ['"Immediate action needed"', "t('aiPredict.kpi.churnAction')"],
  ['label: "High LTV Potential"', "label: t('aiPredict.kpi.highLtv')"],
  ['"CLV ₩3M+"', "t('aiPredict.kpi.highLtvSub')"],
  ['label: "30-day Forecast Revenue"', "label: t('aiPredict.kpi.revenue')"],
  ['"+18% Growth Expected"', "t('aiPredict.kpi.revenueSub')"],
  ['label: "ML Model Accuracy"', "label: t('aiPredict.kpi.mlAccuracy')"],
  ['"Daily retrain at 04:00"', "t('aiPredict.kpi.mlSub')"],
  // Tab labels
  ['["ltv", "💰 LTV Segments"]', `["ltv", t('aiPredict.tab.ltv')]`],
  ['["graph_score", "🕸️ Graph Score"]', `["graph_score", t('aiPredict.tab.graph')]`],
  ['["model", "⚙️ Model Performance"]', `["model", t('aiPredict.tab.model')]`],
  ['["integration", "🔗 Integration Status"]', `["integration", t('aiPredict.tab.integration')]`],
  // Loading
  ['Loading forecast data from ML models...', "{t('aiPredict.loading')}"],
  // Filter options
  ['<option value="all">All Risk Levels</option>', "{/* filter */}"],
  // Bulk action
  ['⚡ Bulk Churn Action', "{t('aiPredict.bulkAction')}"],
  // Table headers
  ['"30-day Purchase Prob."', "t('aiPredict.col.prob30')"],
  ['"Churn Risk"', "t('aiPredict.col.churn')"],
  ['"LTV 12-month"', "t('aiPredict.col.ltv12')"],
  ['"Next Purchase Est."', "t('aiPredict.col.nextPurchase')"],
  // Detail button
  ['→ Details</button>', "{t('aiPredict.col.detail')}</button>"],
  // No results
  ['No results found', "{t('aiPredict.noResults')}"],
  // Retry
  ['>Retry</button>', ">{t('aiPredict.retry')}</button>"],
];

for (const [from, to] of replacements) {
  ai = ai.split(from).join(to);
}

// Fix filter options properly
ai = ai.replace(
  '{/* filter */}\n                            <option value="high">{t(\'aiPredict.filterHigh\')}</option>\n                            <option value="medium">{t(\'aiPredict.filterMed\')}</option>\n                            <option value="low">{t(\'aiPredict.filterLow\')}</option>',
  `<option value="all">{t('aiPredict.filterAll')}</option>
                            <option value="high">{t('aiPredict.filterHigh')}</option>
                            <option value="medium">{t('aiPredict.filterMed')}</option>
                            <option value="low">{t('aiPredict.filterLow')}</option>`
);

// Fix filter fallback if the replace above didn't match
if (ai.includes('{/* filter */}')) {
  ai = ai.replace('{/* filter */}', `<option value="all">{t('aiPredict.filterAll')}</option>`);
}

fs.writeFileSync('src/pages/AIPrediction.jsx', ai, 'utf8');
console.log('✓ AIPrediction.jsx');

// ─── 2. AIRecommendTab.jsx ────────────────────────────────────────────────────
let rec = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');

if (!rec.includes('useI18n')) {
  rec = rec.replace(
    "import { CAT_OPTIONS, PRODUCT_CATALOG, CAT_TO_PRODUCT } from './campaignConstants.js';",
    "import { CAT_OPTIONS, PRODUCT_CATALOG, CAT_TO_PRODUCT } from './campaignConstants.js';\nimport { useI18n } from '../i18n/index.js';"
  );
}

// Add const { t } to AIRecommendTab component
if (!rec.includes("const { t } = useI18n()")) {
  rec = rec.replace(
    "const [catId, setCatId] = useState('beauty');",
    "const [catId, setCatId] = useState('beauty');\n    const { t } = useI18n();"
  );
}

// Replace hardcoded strings
const recReplacements = [
  ['📦 Sales Product Info', "{t('aiRec.salesInfo')}"],
  ['Catalog Auto-filled', "{t('aiRec.catalogAuto')}"],
  ["['Product Name/SKU Count', 'skuCount', 'units']", "[t('aiRec.skuCount'), 'skuCount', 'units']"],
  ["['Monthly Sales Goal', 'monthlyQty', 'units']", "[t('aiRec.monthlyQty'), 'monthlyQty', 'units']"],
  ["['Avg. Unit Price', 'avgPrice', '₩']", "[t('aiRec.avgPrice'), 'avgPrice', '₩']"],
  ["['Margin Rate', 'marginRate', '%']", "[t('aiRec.marginRate'), 'marginRate', '%']"],
  ["['Goal Revenue', 'targetRevenue', '₩']", "[t('aiRec.goalRevenue'), 'targetRevenue', '₩']"],
  ['Main Sales Channels (multi-select)', "{t('aiRec.mainChannels')}"],
];

for (const [from, to] of recReplacements) {
  rec = rec.split(from).join(to);
}

fs.writeFileSync('src/pages/AIRecommendTab.jsx', rec, 'utf8');
console.log('✓ AIRecommendTab.jsx');

// ─── 3. JourneyBuilder.jsx - template descriptions ─────────────────────────
let jb = fs.readFileSync('src/pages/JourneyBuilder.jsx', 'utf8');

// Templates are rendered via tpl.description and tpl.estimated_duration
// The descriptions are now keys in DEMO_JOURNEY_TEMPLATES - we need t() there
// JourneyBuilder already uses t(), just need to make tpl.description use t()
// Replace template card description rendering
jb = jb.replace(
  '<div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{tpl.description}</div>',
  `<div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{t(\`journey.tpl.\${tpl.tplKey}Desc\`) !== \`journey.tpl.\${tpl.tplKey}Desc\` ? t(\`journey.tpl.\${tpl.tplKey}Desc\`) : tpl.description}</div>`
);

fs.writeFileSync('src/pages/JourneyBuilder.jsx', jb, 'utf8');
console.log('✓ JourneyBuilder.jsx');

// ─── 4. DemoDataLayer.js - add tplKey to templates ───────────────────────────
let dl = fs.readFileSync('src/utils/DemoDataLayer.js', 'utf8');
dl = dl
  .replace('{ id: "tpl1", name: "Cart Abandonment Recovery",', '{ id: "tpl1", tplKey: "cart", name: "Cart Abandonment Recovery",')
  .replace('{ id: "tpl2", name: "New Member Onboarding",', '{ id: "tpl2", tplKey: "onboard", name: "New Member Onboarding",')
  .replace('{ id: "tpl3", name: "VIP Customer Retention",', '{ id: "tpl3", tplKey: "vip", name: "VIP Customer Retention",')
  .replace('{ id: "tpl4", name: "Churn Prevention Campaign",', '{ id: "tpl4", tplKey: "churn", name: "Churn Prevention Campaign",')
  .replace('{ id: "tpl5", name: "Birthday Coupon",', '{ id: "tpl5", tplKey: "bday", name: "Birthday Coupon",');
fs.writeFileSync('src/utils/DemoDataLayer.js', dl, 'utf8');
console.log('✓ DemoDataLayer.js');

// ─── 5. campaignConstants.js - use t() keys for category labels/routes ───────
// Category rendering in AIRecommendTab uses c.label and c.route directly
// We add a catKey field so the component can look up t('cat.beauty') etc.
let cc = fs.readFileSync('src/pages/campaignConstants.js', 'utf8');
cc = cc
  .replace("id: 'beauty', label:", "id: 'beauty', catKey: 'beauty', label:")
  .replace("id: 'fashion', label:", "id: 'fashion', catKey: 'fashion', label:")
  .replace("id: 'general', label:", "id: 'general', catKey: 'general', label:")
  .replace("id: 'food', label:", "id: 'food', catKey: 'food', label:")
  .replace("id: 'electronics', label:", "id: 'electronics', catKey: 'electronics', label:")
  .replace("id: 'forwarding', label:", "id: 'forwarding', catKey: 'forwarding', label:")
  .replace("id: 'purchasing', label:", "id: 'purchasing', catKey: 'purchasing', label:")
  .replace("id: 'travel', label:", "id: 'travel', catKey: 'travel', label:")
  .replace("id: 'digital', label:", "id: 'digital', catKey: 'digital', label:")
  .replace("id: 'sports', label:", "id: 'sports', catKey: 'sports', label:");
fs.writeFileSync('src/pages/campaignConstants.js', cc, 'utf8');
console.log('✓ campaignConstants.js');

// ─── 6. Update AIRecommendTab to use t('cat.xxx') for category buttons ────────
let rec2 = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
// Replace {c.label} in category chip rendering with translated version
rec2 = rec2.replace(
  '>{c.label} <span style={{ fontSize: 9, opacity: 0.7 }}>({c.route})</span>',
  `>{c.catKey ? (t(\`cat.\${c.catKey}\`) !== \`cat.\${c.catKey}\` ? t(\`cat.\${c.catKey}\`) : c.label) : c.label}</span>`
);
fs.writeFileSync('src/pages/AIRecommendTab.jsx', rec2, 'utf8');
console.log('✓ AIRecommendTab.jsx (cat labels)');

console.log('\nAll components updated!');

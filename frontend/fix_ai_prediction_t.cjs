/**
 * fix_ai_prediction_t.cjs
 * Fixes AIPrediction.jsx:
 * 1. Remove t() calls from IIFE (module scope - not in React context)  
 * 2. Add const { t } = useI18n() to AIPredictionInner component
 * 3. Add const { t } = useI18n() to CustomerDetailPanel component
 */
const fs = require('fs');

let content = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');

// 1. Fix IIFE - replace t() calls with static strings (these run at module init time)
content = content.replace(
  "const grades = [\"Champions\", \"Loyal Customer\", \"General\", \"New\", t('aiPredict.col.churn'), \"Churned\"];",
  'const grades = ["Champions", "Loyal", "General", "New", "Churn Risk", "Churned"];'
);

// 2. Fix handleBulkAction which also calls t() - replace with static string
content = content.replace(
  "msg: `🤖 AI: ${riskLevel === \"high\" ? t('aiPredict.col.churn') : \"Medium Risk\"} Customer Auto Create Campaign (Email + Kakao)`",
  "msg: `🤖 AI: ${riskLevel === \"high\" ? \"Churn Risk\" : \"Medium Risk\"} Customer Auto Create Campaign (Email + Kakao)`"
);

// 3. Add const { t } = useI18n() to AIPredictionInner component
// Find "function AIPredictionInner()" and add after "const navigate = useNavigate();"
content = content.replace(
  'function AIPredictionInner() {\n    const { isDemo } = useDemo();\n    const { crmSegments, createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert, alerts } = useGlobalData();\n    const navigate = useNavigate();',
  'function AIPredictionInner() {\n    const { isDemo } = useDemo();\n    const { crmSegments, createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert, alerts } = useGlobalData();\n    const navigate = useNavigate();\n    const { t } = useI18n();'
);

// 4. Add const { t } = useI18n() to CustomerDetailPanel component  
content = content.replace(
  'function CustomerDetailPanel({ customer, onClose, onAction }) {\n    const [tab, setTab] = useState("overview");\n    const [prodRecs, setProdRecs] = useState([]);\n    const { createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert } = useGlobalData();\n    const navigate = useNavigate();',
  'function CustomerDetailPanel({ customer, onClose, onAction }) {\n    const [tab, setTab] = useState("overview");\n    const [prodRecs, setProdRecs] = useState([]);\n    const { createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert } = useGlobalData();\n    const navigate = useNavigate();\n    const { t } = useI18n();'
);

// 5. Also replace the riskLabel with t() calls  
content = content.replace(
  'const riskLabel = { high: "🔴 Churn Risk", medium: "🟡 Medium Risk", low: "🟢 Safe" };',
  'const riskLabel = { high: t("aiPredict.filterHigh"), medium: t("aiPredict.filterMed"), low: t("aiPredict.filterLow") };'
);

fs.writeFileSync('src/pages/AIPrediction.jsx', content, 'utf8');
console.log('✓ AIPrediction.jsx fixed');

// Also fix AIRecommendTab cat button rendering - the closing tag was mismatched
let rec = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
// The cat button rendering was broken - check and fix
const brokenBtn = '>{c.catKey ? (t(`cat.${c.catKey}`) !== `cat.${c.catKey}` ? t(`cat.${c.catKey}`) : c.label) : c.label}</span>';
const goodBtn = '>{c.catKey ? (t(`cat.${c.catKey}`) !== `cat.${c.catKey}` ? t(`cat.${c.catKey}`) : c.label) : c.label}\n                    </button>';
if (rec.includes(brokenBtn)) {
  rec = rec.replace(brokenBtn, goodBtn);
  console.log('✓ AIRecommendTab cat button fixed');
} else {
  console.log('- AIRecommendTab cat button: no change needed');
}

// Also fix the field labels - they use t() within array which should work
// Check if t('aiRec.salesInfo') pattern is used correctly
const salesInfoCheck = rec.includes("t('aiRec.salesInfo')") || rec.includes('{t(\'aiRec.salesInfo\')}');
console.log('AIRecommendTab salesInfo t() present:', salesInfoCheck);

fs.writeFileSync('src/pages/AIRecommendTab.jsx', rec, 'utf8');
console.log('\nDone!');

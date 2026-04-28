/**
 * Patch en.js marketing section with missing keys
 * Maps Korean keys to proper English translations
 */
const fs = require('fs');

const MISSING_TRANSLATIONS = {
  tabSetup: "⚙️ Campaign Setup",
  heroTitle: "AI Marketing Automation",
  tabStatus: "📊 Status",
  tabGuide: "📖 Usage Guide",
  heroDesc: "Set your monthly budget and AI will automatically create optimized strategies for TikTok, Meta, Naver",
  badgeLive: "Live",
  badgeChannels: "Channels",
  badgeSecurity: "Security",
  kpiSpend: "Total Spend",
  kpiCtr: "CTR",
  kpiCpc: "CPC",
  kpiCpa: "CPA",
  kpiRevenue: "Revenue",
  tabBudget: "💰 Budget",
  performance: "Performance",
  totalSpend: "Total Spend",
  totalRevenue: "Total Revenue",
  averageRoas: "Avg. ROAS",
  averageCtr: "Avg. CTR",
  averageCpc: "Avg. CPC",
  totalConversions: "Total Conversions",
  channelPerformance: "Channel Performance",
  channelBreakdown: "Channel Breakdown",
  spend: "Spend",
  revenue: "Revenue",
  ctr: "CTR",
  cpc: "CPC",
  roas: "ROAS",
  convRate: "Conv. Rate",
  bestChannel: "Best Channel",
  worstChannel: "Worst Channel",
  trendTitle: "Performance Trend",
  trendWeekly: "Weekly",
  trendMonthly: "Monthly",
  trendQuarterly: "Quarterly",
  filterAllChannels: "All Channels",
  filterAllCampaigns: "All Campaigns",
  loading: "Loading...",
  refreshData: "Refresh",
  lastUpdate: "Last Updated",
  campaignName: "Campaign Name",
  campaignStatus: "Campaign Status",
  campaignBudget: "Campaign Budget",
  campaignSpend: "Campaign Spend",
  campaignRoas: "Campaign ROAS",
  paused: "Paused",
  ended: "Ended",
  guideTitle: "AI Auto Marketing Usage Guide",
  guideSub: "This guide explains all AI-based ad automation features step by step. Even beginners can follow along easily.",
  guideStepsTitle: "🚀 Step-by-Step Guide",
  guideTipsTitle: "💡 Expert Tips",
  guideTip1: "Start with a small budget for testing. Scale up channels with proven ROAS performance.",
  guideTip2: "AI recommendations improve with more category selections. Choose at least 2 categories for optimal results.",
  guideTip3: "Connect API keys in Integration Hub first for real-time data sync and accurate recommendations.",
  guideTip4: "Review the AI Strategy Preview carefully before submitting. Adjust channel allocations if needed.",
  guideTip5: "Use Campaign Manager to monitor performance after launch. AI continuously optimizes based on real data.",
  guideStep1Title: "Connect Channels via Integration Hub",
  guideStep1Desc: "Register API keys for ad and sales channels (Meta, Google, TikTok, Naver, Coupang, Kakao) in Integration Hub. Connected channels will be automatically reflected in AI Auto Marketing.",
  guideStep2Title: "Set Monthly Budget",
  guideStep2Desc: "Enter your total monthly marketing budget. AI analyzes past conversion data and calculates optimal budget allocation by channel based on ROAS and diminishing returns curves.",
  guideStep3Title: "AI Campaign Auto-Generation",
  guideStep3Desc: "AI automatically generates campaign targeting, creatives, and channel allocation. A/B testing and auto-management of bid schedules are included.",
  guideStep4Title: "Real-Time Performance Monitoring",
  guideStep4Desc: "Monitor impressions, clicks, conversions, and ROAS in real-time from the Performance Overview tab. Track channel-level analysis and trend changes instantly.",
  guideStep5Title: "Creative & Campaign Comparison",
  guideStep5Desc: "Compare material-level performance in the Creative Analysis tab. Use the radar chart in Campaign Comparison to identify strengths and weaknesses of 2-4 campaigns.",
  guideStep6Title: "Budget Optimization & Reports",
  guideStep6Desc: "Track channel-level consumption in the Budget Planner, maximize ROAS with AI budget reallocation. Download reports and apply them to campaigns."
};

// Read en.js
const enPath = 'frontend/src/i18n/locales/en.js';
let content = fs.readFileSync(enPath, 'utf8');

// Find the marketing section and add missing keys
// The file format is: export default {"budgetTracker":{...},"marketing":{...}}
// Find the end of marketing section object
const marketingStart = content.indexOf('"marketing":{');
if (marketingStart === -1) {
  console.error('marketing section not found!');
  process.exit(1);
}

// Find the opening brace
const braceStart = content.indexOf('{', marketingStart + 12);

// We need to insert after the last key before the closing brace
// Build the insert string
const insertKvs = Object.entries(MISSING_TRANSLATIONS)
  .map(([k, v]) => `"${k}":${JSON.stringify(v)}`)
  .join(',');

// Insert right after the opening brace of marketing
const insertPos = braceStart + 1;
const newContent = content.slice(0, insertPos) + insertKvs + ',' + content.slice(insertPos);

fs.writeFileSync(enPath, newContent, 'utf8');
console.log(`✅ Added ${Object.keys(MISSING_TRANSLATIONS).length} missing keys to en.js marketing section`);

// Verify
const verify = require('./' + enPath);
const m = (verify.default || verify).marketing || {};
const stillMissing = Object.keys(MISSING_TRANSLATIONS).filter(k => !m[k]);
if (stillMissing.length > 0) {
  console.log('⚠️ Still missing:', stillMissing.join(', '));
} else {
  console.log('✅ All keys verified successfully');
}

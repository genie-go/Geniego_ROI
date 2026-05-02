const fs = require('fs');
const jsx = fs.readFileSync('frontend/src/pages/ChannelKPI.jsx', 'utf8');

const regex = /t\(['"]channelKpi\.([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?\)/g;
let match;
const enDict = {};
const koDict = {}; 

while ((match = regex.exec(jsx)) !== null) {
  const key = match[1];
  const enFallback = match[2];
  enDict[key] = enFallback || key;
}

// Additional keys explicitly seen in the code without fallback attached inside t(),
// or nested deeply.
const others = [
  'brandAwareness', 'brandAwarenessDesc', 'webTraffic', 'webTrafficDesc',
  'inquiriesPurchases', 'inquiriesPurchasesDesc', 'bizGoalSetting', 'selected',
  'clickSelect', 'selectedGoals', 'pleaseSelectGoal', 'roleCaptureIntent',
  'descCaptureIntent', 'roleBrandReach', 'descBrandReach', 'pageViews', 'visitors',
  'searchTraffic', 'roleInfoTrust', 'descInfoTrust', 'postViews', 'comments',
  'inquiries', 'newMembers', 'roleCustRel', 'descCustRel', 'channelRoleDef',
  'coreKpis', 'targetSetup', 'hintCtr', 'hintConvRate', 'hintCpa', 'hintRoas',
  'hintCpc', 'descCtr', 'descConvRate', 'descCpa', 'descRoas', 'descCpc',
  'targetVsActuals', 'overallAchieve', 'achievedOk', 'belowTarget', 'achieved',
  'monitorAi', 'claudeAiTitle', 'claudeAiDesc', 'weeklyAi', 'monthlyAi',
  'aiAnalyzing', 'runAi', 'aiSummary', 'strengths', 'weaknesses', 'improveRecs',
  'weeklyAdTrend', 'checklist', 'chkEff', 'chkCostPerf', 'chkImprove',
  'aiHistoryList', 'noHistory', 'tabGoals', 'tabRoles', 'tabSetup', 'tabSns',
  'tabContent', 'tabCommunity', 'tabTargets', 'tabMonitor', 'heroDesc',
  'snsKpiOverview', 'allChannels', 'snsKpiByChannel', 'contentKpi',
  'contentImpressions', 'siteTraffic', 'contentEngage', 'seoImpact', 'monthlyTrend',
  'communityKpi', 'contentInterest', 'communityAct', 'interestConv', 'communityGrowth'
];

for(const k of others) {
  if (!enDict[k]) enDict[k] = k;
}

fs.writeFileSync('kpi_keys.json', JSON.stringify(enDict, null, 2));
console.log('Done mapping.');

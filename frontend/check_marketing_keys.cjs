const fs = require('fs');
const langs = ['ko','en','ja','zh','de','th','vi','id'];
const keys = ['aiHubTitle','aiHubDesc1','aiHubDesc2','aiHubDesc3','aiHubDesc4','aiHubBtn',
  'creativeAutoSync','creativeSyncDesc1','creativeSyncBtn','creativeSyncDesc2',
  'creativeSyncDesc3','creativeSyncDesc4','creativeGoSetup','aiRecommendBadge',
  // CampaignTab hardcoded KPIs
  'colTotalAdSpend','colBlendedRoas','colTotalConv','colActivePlatforms',
];
langs.forEach(lg => {
  let c;
  try { c = fs.readFileSync('src/i18n/locales/'+lg+'.js','utf8'); } catch(e){ return; }
  const missing = keys.filter(k => !c.includes('"'+k+'"') && !c.includes("'"+k+"'") && !c.includes('`'+k+'`'));
  console.log(lg+':', missing.length===0 ? 'ALL OK' : 'MISSING: '+missing.join(', '));
});

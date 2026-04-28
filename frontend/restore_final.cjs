// Step 1: Re-restore from backup (v3 logic)
// Step 2: Inject guide keys ONLY where missing (no overwrite)
const fs=require('fs'),vm=require('vm');
const backupDir='src/i18n/locales_backup',currentDir='src/i18n/locales';

function extractRaw(content){
  let s=content.replace(/^export\s+default\s+/,'').replace(/;\s*$/,'').trim();
  if(s[0]==='{')s=s.slice(1);if(s[s.length-1]==='}')s=s.slice(0,-1);
  const sections={};let pos=0;
  while(pos<s.length){
    while(pos<s.length&&/[\s,]/.test(s[pos]))pos++;
    if(pos>=s.length)break;
    if(s[pos]!=='"'){pos++;continue;}
    pos++;let key='';
    while(pos<s.length&&s[pos]!=='"'){if(s[pos]==='\\'){key+=s[pos]+s[pos+1];pos+=2;}else{key+=s[pos];pos++;}}
    pos++;while(pos<s.length&&/[\s:]/.test(s[pos]))pos++;
    if(s[pos]==='{'){
      const start=pos;let depth=0,inStr=false,esc=false;
      while(pos<s.length){const ch=s[pos];if(esc){esc=false;pos++;continue;}if(ch==='\\'&&inStr){esc=true;pos++;continue;}if(ch==='"'){inStr=!inStr;pos++;continue;}if(!inStr){if(ch==='{')depth++;if(ch==='}'){depth--;if(depth===0){pos++;break;}}}pos++;}
      sections[key]=s.substring(start,pos);
    }else if(s[pos]==='"'){
      pos++;let val='';while(pos<s.length){if(s[pos]==='\\'){val+=s[pos]+s[pos+1];pos+=2;}else if(s[pos]==='"'){pos++;break;}else{val+=s[pos];pos++;}}
      sections[key]='"'+val+'"';
    }else{const start=pos;while(pos<s.length&&s[pos]!==','&&s[pos]!=='}')pos++;sections[key]=s.substring(start,pos).trim();}
  }
  return sections;
}

function parseVal(raw){
  try{return JSON.parse(raw);}catch(e){}
  try{const sb={r:null};vm.runInNewContext('r=('+raw+')',sb,{timeout:3000});return sb.r;}catch(e){}
  if(raw.startsWith('{')){try{const sub=extractRaw('export default '+raw);const r={};for(const[k,v]of Object.entries(sub)){const p=parseVal(v);if(p!==null)r[k]=p;}if(Object.keys(r).length>0)return r;}catch(e){}}
  return null;
}

// English guide translations (fallback for languages without native translation)
const enGuide={
dashGuide:{title:"Dashboard Usage Guide",subtitle:"Learn all Dashboard features step by step.",beginnerBadge:"Beginner Guide",timeBadge:"5 min read",langBadge:"15 Languages",whereToStart:"Where do I start?",whereToStartDesc:"1. Click \"Dashboard\" from the left menu.\n2. Check overview KPIs.\n3. Click sub-tabs for detailed analysis.\n4. Review security banner.",stepsTitle:"🚀 Getting Started — 10-Step Guide",step1Title:"Access Dashboard",step1Desc:"Click \"Dashboard\" from the left menu after login.",step2Title:"Check KPI Cards",step2Desc:"Review the top 6 KPI cards.",step3Title:"Analyze Marketing",step3Desc:"Compare channel performance in Marketing tab.",step4Title:"Check Channel KPIs",step4Desc:"View CTR, CPC, ROAS per channel.",step5Title:"Review Commerce",step5Desc:"Check marketplace settlement status.",step6Title:"Global Sales",step6Desc:"Analyze country-level revenue.",step7Title:"Manage Influencers",step7Desc:"Monitor creator followers.",step8Title:"System Monitoring",step8Desc:"Check server and security status.",step9Title:"Security Alerts",step9Desc:"Check security banner for threats.",step10Title:"Regular Monitoring",step10Desc:"Create daily dashboard review routine.",tabsTitle:"📋 Tab-by-Tab Reference",tabOverview:"View 6 major KPIs.",tabMarketing:"Compare ad performance.",tabChannel:"Real-time CTR, CPC, ROAS.",tabCommerce:"Marketplace settlements.",tabSales:"Country comparison.",tabInfluencer:"Creator engagement.",tabSystem:"Server monitoring.",featuresTitle:"✨ Key Features",feat1Title:"Real-Time KPI",feat1Desc:"All data syncs in real-time.",feat2Title:"Auto Sync",feat2Desc:"Updates every 5 seconds.",feat3Title:"15 Languages",feat3Desc:"Auto-detects 15 languages.",feat4Title:"Unified Analysis",feat4Desc:"Analyze by channel, country, creator.",feat5Title:"Enterprise Security",feat5Desc:"XSS, CSRF protection.",feat6Title:"Responsive Design",feat6Desc:"Optimized for all devices.",tipsTitle:"Expert Tips",tip1:"Check KPI colors daily. Red = action needed.",tip2:"Click channel cards for analysis.",tip3:"Click country markers for details.",tip4:"Use AI analysis for creators.",tip5:"Verify SECURE status regularly.",faqTitle:"FAQ",faq1Q:"No data showing",faq1A:"Create campaigns first.",faq2Q:"KPI values are 0",faq2A:"Data collection takes time.",faq3Q:"Missing channel",faq3A:"Connect in Campaign Manager.",faq4Q:"Security alerts",faq4A:"SecurityGuard detected threats.",faq5Q:"Switch language?",faq5A:"Use top-right dropdown.",readyTitle:"🎉 Ready to Start!",readyDesc:"Click Overview tab to begin."},
marketing:{guideTitle:"Auto Marketing Guide",guideSub:"AI marketing automation guide.",guideStepsTitle:"Getting Started — 6 Steps",guideStep1Title:"Set Budget",guideStep1Desc:"Set monthly ad budget.",guideStep2Title:"Create Campaign",guideStep2Desc:"Create AI-optimized campaigns.",guideStep3Title:"Set Targeting",guideStep3Desc:"Configure AI segments.",guideStep4Title:"Create Assets",guideStep4Desc:"Auto-generate creatives.",guideStep5Title:"Monitor",guideStep5Desc:"Track performance real-time.",guideStep6Title:"Optimize",guideStep6Desc:"Auto-optimize with AI.",guideTabsTitle:"Tab Features",guideTipsTitle:"Tips",guideTip1:"Review budget weekly.",guideTip2:"Use A/B testing.",guideTip3:"Use AI segments.",guideTip4:"Check reports regularly.",guideTip5:"Plan seasonal campaigns.",guideStartBtn:"Get Started",autoTab1:"① Campaign Setup",autoTab2:"③ Campaign Config",autoTab3:"③ AI Strategy Preview",autoTab4:"Usage Guide",mktTabOverview:"Overview",mktTabAdStatus:"Ad Status",mktTabCreative:"Creative",mktTabCompare:"Compare",mktTabAiDesign:"AI Design",mktTabGuide:"Guide"},
campMgr:{guideTitle:"Campaign Manager Guide",guideSub:"Campaign creation & analysis guide.",guideStepsTitle:"Getting Started — 6 Steps",guideStep1Title:"Create Campaign",guideStep1Desc:"Click New Campaign.",guideStep2Title:"Set Goals",guideStep2Desc:"Set KPI targets.",guideStep3Title:"Allocate Budget",guideStep3Desc:"Distribute by channel.",guideStep4Title:"Set Schedule",guideStep4Desc:"Set dates.",guideStep5Title:"Analyze",guideStep5Desc:"Monitor real-time.",guideStep6Title:"A/B Test",guideStep6Desc:"Test variables.",guideTabsTitle:"Tab Features",guideTipsTitle:"Tips",tabGuide:"Guide"},
jb:{guideTitle:"Journey Builder Guide",guideSub:"Customer journey design guide.",guideStepsTitle:"Getting Started — 6 Steps",guideStep1Title:"Create Journey",guideStep1Desc:"Create scenario.",guideStep2Title:"Set Triggers",guideStep2Desc:"Configure events.",guideStep3Title:"Add Steps",guideStep3Desc:"Add actions.",guideStep4Title:"Conditions",guideStep4Desc:"Set branching.",guideStep5Title:"Test",guideStep5Desc:"Simulate flow.",guideStep6Title:"Analyze",guideStep6Desc:"Analyze conversions.",guideTabsTitle:"Tab Features",guideTipsTitle:"Tips",tabGuide:"Guide"},
adPerf:{tabAdStatus:"Ad Status",tabCreative:"Creative",tabCompare:"Compare",tabAiDesign:"AI Design",tabGuide:"Guide"},
acctPerf:{tabDashboard:"Dashboard",tabDrilldown:"Drill Down",tabGuide:"Guide"},
channelKpiPage:{tabGoals:"KPI Goals",tabRoles:"Roles",tabSetup:"Setup",tabSns:"SNS",tabContent:"Content",tabCommunity:"Community",tabTargets:"Targets",tabMonitor:"Monitor",tabGuide:"Guide"},
crm:{tabCust:"Customers",tabAiSeg:"AI Segments",tabManSeg:"Manual Segments",tabRfm:"RFM Analysis",tabGuide:"Guide"},
omniChannel:{tabChannels:"Channels",tabProducts:"Products",tabOrders:"Orders",tabInventory:"Inventory",tabOverview:"Overview",tabGuide:"Guide"},
catalogSync:{tabCatalog:"Catalog",tabSyncRun:"Sync",tabCategoryMapping:"Category Map",tabStockPolicy:"Stock Policy",tabHistory:"History",tabGuide:"Guide"},
orderHub:{tabOverview:"Overview",tabOrders:"Orders",tabClaims:"Claims",tabDelivery:"Delivery",tabSettlement:"Settlement",tabIntl:"International",tabB2B:"B2B",tabSettings:"Settings",tabRouting:"Routing",tabGuide:"Guide"},
budgetTracker:{tabOverview:"Overview",tabAllocation:"Allocation",tabBurnRate:"Burn Rate",tabAlerts:"Alerts",tabGuide:"Guide"},
};

const backupFiles=fs.readdirSync(backupDir).filter(f=>f.endsWith('.js'));

for(const file of [...backupFiles,...fs.readdirSync(currentDir).filter(f=>f.endsWith('.js')&&!backupFiles.includes(f))]){
  const lang=file.replace('.js','');
  const isKo=lang==='ko';
  const hasBackup=backupFiles.includes(file);
  
  // Step 1: Get backup data
  let backupData={};
  if(hasBackup){
    const raw=extractRaw(fs.readFileSync(`${backupDir}/${file}`,'utf8'));
    for(const[k,v]of Object.entries(raw)){const p=parseVal(v);if(p!==null)backupData[k]=p;}
  }
  
  // Step 2: Get current data (which may have been corrupted by previous inject)
  const curPath=`${currentDir}/${file}`;
  let currentData={};
  if(fs.existsSync(curPath)){
    try{const M={e:null};vm.runInNewContext(fs.readFileSync(curPath,'utf8').replace(/^export\s+default\s+/,'M.e='),{M});currentData=M.e||{};}catch(e){}
  }
  
  // Step 3: Merge - backup takes absolute priority
  const merged={};
  for(const[k,v]of Object.entries(backupData)){
    merged[k]=typeof v==='object'&&!Array.isArray(v)?{...v}:v;
  }
  // Add current-only keys (NOT overwriting backup)
  for(const[k,v]of Object.entries(currentData)){
    if(!(k in merged)){merged[k]=v;}
    else if(typeof merged[k]==='object'&&typeof v==='object'&&!Array.isArray(merged[k])){
      for(const[sk,sv]of Object.entries(v)){if(!(sk in merged[k]))merged[k][sk]=sv;}
    }
  }
  
  // Step 4: Inject guide keys ONLY where missing
  if(!isKo){
    for(const[section,keys]of Object.entries(enGuide)){
      if(!merged[section])merged[section]={};
      if(typeof keys==='object'){
        for(const[k,v]of Object.entries(keys)){
          if(!(k in merged[section]))merged[section][k]=v;
        }
      }
    }
  }
  
  const out=`export default ${JSON.stringify(merged,null,2)};\n`;
  fs.writeFileSync(curPath,out,'utf8');
  const sections=Object.keys(merged).length;
  const size=(Buffer.byteLength(out,'utf8')/1024).toFixed(1);
  console.log(`${hasBackup?'✅':'⚠️'} ${file}: ${sections} sections, ${size}KB`);
}
console.log('\nDone! Backup translations preserved, English guide fallbacks added only where missing.');

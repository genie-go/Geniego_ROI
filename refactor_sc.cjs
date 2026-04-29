const fs = require('fs');
const fpath = 'frontend/src/pages/SmartConnect.jsx';
let c = fs.readFileSync(fpath, 'utf8');

const replacements = [
  // Hero section
  ['SmartConnect — API 키 Auto화 허브', "${t('sc.heroTitle', 'SmartConnect — API Key Automation Hub')}"],
  ['가입된 모든 Channel의 API 키를 Auto으로 스캔·감지·Register·Integration합니다. 키가 없는 Channel은 Auto으로 Issue신청할 Count 있습니다.', "${t('sc.heroDesc', 'Auto scan, detect, register, and integrate API keys.')}"],
  
  // KPI labels  
  ['"All Channel"', "t('sc.kpiAll','All Channels')"],
  ['"키 Register Done"', "t('sc.kpiRegistered','Registered')"],
  ['"키 감지됨"', "t('sc.kpiFound','Detected')"],
  ['"Integration Active",  v:stats.linked', "t('sc.kpiLinked','Linked'),  v:stats.linked"],
  ['"키 None"', "t('sc.kpiMissing','Missing')"],
  ['"Issue 신청"', "t('sc.kpiApplied','Applied')"],
  ['"미스캔"', "t('sc.kpiUnscanned','Unscanned')"],
  ['"Auto 가능"', "t('sc.kpiAutoAvail','Auto Available')"],
  
  // Notification title
  ['"API 키 스캔 Done"', "t('sc.scanNotif','API Key Scan Complete')"],
  
  // Detail modal labels
  ['"Integration 시 Activate Feature"', "t('sc.activatedFeatures','Features Activated')"],
  
  // StatusPill - linked
  ['"✅ Integration Active"', "('✅ ' + t('sc.linkedActive','Linked Active'))"],
  ['"🔑 Register됨"', "('🔑 ' + t('sc.statusRegistered','Registered'))"],
  ['"🔍 키 감지"', "('🔍 ' + t('sc.statusFound','Key Detected'))"],
  ['"❌ 키 None"', "('❌ ' + t('sc.statusMissing','No Key'))"],
  ['"📋 신청Done"', "('📋 ' + t('sc.statusApplied','Requested'))"],
  ['"⏳ 신청in progress"', "('⏳ ' + t('sc.statusApplying','Requesting'))"],
  ['"🔍 스캔in progress"', "('🔍 ' + t('sc.statusScanning','Scanning'))"],
  ['"⏸ 미스캔"', "('⏸ ' + t('sc.statusUnscanned','Unscanned'))"],
  
  // Card buttons
  ['"⏳ Integration in progress..."', "('⏳ ' + t('sc.linking','Linking...'))"],
  ['"⚡ Auto Sync"', "('⚡ ' + t('sc.autoSync','Auto Sync'))"],
  ['"⏳ 신청 in progress..."', "('⏳ ' + t('sc.applying','Applying...'))"],
  ['"📋 Issue 신청"', "('📋 ' + t('sc.applyIssue','Request Key'))"],
  ['"📋 Issue 신청 Done"', "('📋 ' + t('sc.appliedDone','Request Submitted'))"],
  ['"🔍 스캔 in progress..."', "('🔍 ' + t('sc.scanning','Scanning...'))"],
  ['"⏸ 스캔 전"', "('⏸ ' + t('sc.preScan','Not Scanned'))"],
  ['"🤖 AutoIssue 가능"', "{t('sc.autoIssueAvail','Auto Issue')}"],
  
  // Detail modal  
  ['"⚡ Auto Sync Run"', "('⚡ ' + t('sc.autoSyncRun','Run Auto Sync'))"],
];

let count = 0;
for (const [from, to] of replacements) {
  if (c.includes(from)) {
    c = c.replace(from, to);
    count++;
  }
}

// Template literals need special handling
c = c.replace("scanning ? `🔍 스캔 in progress... (${scanProgress}%)` : \"✅ 스캔 Done\"", 
  "scanning ? `🔍 ${t('sc.scanning','Scanning...')} (${scanProgress}%)` : ('✅ ' + t('sc.scanDone','Scan Complete'))");
count++;

c = c.replace("{scanning ? \"⏳ 스캔 in progress...\" : \"🔍 All Auto 스캔\"}", 
  "{scanning ? ('⏳ ' + t('sc.scanning','Scanning...')) : ('🔍 ' + t('sc.scanAll','Full Auto Scan'))}");
count++;

c = c.replace("⚡ 감지된 키 All Auto Sync ({foundCount}건)", 
  "{t('sc.autoSyncAll','Auto Sync Detected Keys')} ({foundCount})");
count++;

c = c.replace("🔑 API 키 Management Page", 
  "{t('sc.apiKeyMgmt','API Key Management')}");
count++;

// Filter tabs  
c = c.replace("`All (${CHANNELS.length})`", "`${t('sc.filterAll','All')} (${CHANNELS.length})`");
c = c.replace("`RegisterDone (${stats.registered})`", "`${t('sc.filterRegistered','Registered')} (${stats.registered})`");
c = c.replace("`감지됨 (${stats.found})`", "`${t('sc.filterFound','Detected')} (${stats.found})`");
c = c.replace("`Integrationin progress (${stats.linked})`", "`${t('sc.filterLinked','Linked')} (${stats.linked})`");
c = c.replace("`키None (${stats.missing})`", "`${t('sc.filterMissing','Missing')} (${stats.missing})`");
c = c.replace("`신청in progress (${stats.applied})`", "`${t('sc.filterApplied','Applied')} (${stats.applied})`");
count += 6;

// Guide panel
c = c.replace("Auto 획득 불가 Channel — API 키 Issue 방법 안내", "{t('sc.guideTitle','Channels Requiring Manual Setup')}");
c = c.replace("▲ 접기", "{t('sc.collapse','Collapse')}");
c = c.replace("▼ 열기", "{t('sc.expand','Expand')}");
count += 3;

// Guide - console links
c = c.replace("개발자 콘솔 →", "{t('sc.devConsole','Dev Console')} →");
c = c.replace("신청 →", "{t('sc.apply','Apply')} →");
c = c.replace("🔗 개발자 콘솔 열기", "{t('sc.openDevConsole','Open Dev Console')}");
count += 3;

// Ticket display
c = c.replace("📋 신청Done: ", "{t('sc.appliedDone','Requested')}: ");
count++;

fs.writeFileSync(fpath, c, 'utf8');
console.log('SmartConnect.jsx: ' + count + ' replacements applied');

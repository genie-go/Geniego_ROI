const fs = require('fs');
const DIR = 'src/i18n/locales';
const locales = ['ko','en','ja','zh','zh-TW','th','vi','de','fr','es','id'];

const KEYS = {
ko:{guideStep1Title:'캠페인 생성',guideStep1Desc:'AI 오토 마케팅에서 캠페인을 생성합니다. 예산, 타겟 ROAS, 기간, 광고 채널을 설정합니다.',guideStep2Title:'캠페인 승인',guideStep2Desc:'예약된 캠페인의 활성화 승인 버튼을 클릭합니다.',guideStep3Title:'실시간 모니터링',guideStep3Desc:'소진율, 일일 예산, 전환 수, CPA를 추적합니다.',guideStep4Title:'예산 알림 관리',guideStep4Desc:'소진율 70% 이상 자동 알림. 95% 이상 자동 일시정지.',guideStep5Title:'ROI 분석',guideStep5Desc:'캠페인별 ROAS, ROI를 종합 비교합니다.',guideStep6Title:'AI 카피 생성',guideStep6Desc:'채널과 톤을 선택하여 광고 카피를 자동 생성합니다.',guideTabOverviewName:'캠페인 현황',guideTabOverviewDesc:'전체 캠페인을 카드 형태로 표시합니다.',guideTabAbName:'A/B 테스트',guideTabAbDesc:'A/B 테스트 결과를 통합 조회합니다.',guideTabDetailName:'상세 분석',guideTabDetailDesc:'KPI 목표 vs 실적을 확인합니다.',guideTabGanttName:'일정 관리',guideTabGanttDesc:'간트 차트로 일정을 시각화합니다.',guideTabCrmName:'CRM 채널',guideTabCrmDesc:'이메일과 카카오톡 현황을 조회합니다.',guideTabRoiName:'ROI 분석',guideTabRoiDesc:'전체 캠페인 ROI를 분석합니다.',guideTabMonitorName:'실시간 모니터링',guideTabMonitorDesc:'활성 캠페인 KPI를 모니터링합니다.',guideTabBudgetName:'예산 알림',guideTabBudgetDesc:'예산 자동 알림 시스템입니다.',guideTabCopyName:'AI 카피',guideTabCopyDesc:'AI 광고 카피 자동 생성기입니다.',tabCreative:'AI 광고 소재',creativeTitle:'AI 광고 크리에이티브 생성기',creativeSub:'자연어 프롬프트로 캠페인 광고 디자인을 생성합니다.',guideTabCreativeName:'AI 광고 소재',guideTabCreativeDesc:'자연어 기반 AI 광고 이미지 생성기입니다.',channelFee:'수수료',channelFeeRate:'수수료율',noFeeData:'수수료 정보 없음'},
en:{guideStep1Title:'Create Campaign',guideStep1Desc:'Create campaigns from AI Auto Marketing. Set budget, target ROAS, and ad channels.',guideStep2Title:'Approve Campaign',guideStep2Desc:'Click the Activate button on the scheduled campaign card.',guideStep3Title:'Real-time Monitoring',guideStep3Desc:'Track burn rate, daily budget, conversions, and CPA.',guideStep4Title:'Budget Alert Management',guideStep4Desc:'Auto alerts when burn exceeds 70%. Auto-pause above 95%.',guideStep5Title:'ROI Analysis',guideStep5Desc:'Compare ROAS and ROI across campaigns.',guideStep6Title:'AI Copy Generation',guideStep6Desc:'Select channel and tone, enter prompt to generate ad copy.',guideTabOverviewName:'Campaign Overview',guideTabOverviewDesc:'All campaigns displayed as filterable cards.',guideTabAbName:'A/B Testing',guideTabAbDesc:'Integrated A/B test results.',guideTabDetailName:'Detail Analysis',guideTabDetailDesc:'KPI targets vs actuals.',guideTabGanttName:'Schedule',guideTabGanttDesc:'Gantt chart visualization.',guideTabCrmName:'CRM Channels',guideTabCrmDesc:'Email and KakaoTalk status.',guideTabRoiName:'ROI Analysis',guideTabRoiDesc:'Comprehensive ROI analysis.',guideTabMonitorName:'Real-time Monitor',guideTabMonitorDesc:'Live KPI monitoring.',guideTabBudgetName:'Budget Alerts',guideTabBudgetDesc:'Automatic budget alert system.',guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'AI-powered ad copy generator.',tabCreative:'AI Creative',creativeTitle:'AI Ad Creative Generator',creativeSub:'Enter a prompt and AI generates campaign ad designs.',guideTabCreativeName:'AI Creative',guideTabCreativeDesc:'AI ad image generator with 16 scene types.',channelFee:'Fee',channelFeeRate:'Fee Rate',noFeeData:'No fee data'},
};
['ja','zh','zh-TW','th','vi','de','fr','es','id'].forEach(l => { KEYS[l] = KEYS[l] || KEYS.en; });

for (const lang of locales) {
  const f = DIR + '/' + lang + '.js';
  let s = fs.readFileSync(f, 'utf8');
  const keys = KEYS[lang] || KEYS.en;

  // Remove ALL previously injected keys from the entire file
  for (const k of Object.keys(keys)) {
    const pat = new RegExp(',"' + k + '":\\s*"(?:[^"\\\\]|\\\\.)*"', 'g');
    s = s.replace(pat, '');
  }

  // Strategy: find the LAST "campaignMgr":{ block, then find the
  // marker key "guideTip5" inside that block (which we know exists at 132 keys)
  // and append after guideTip5's value

  // Find the last campaignMgr position
  let lastPos = -1, sp = 0;
  while (true) {
    const idx = s.indexOf('"campaignMgr"', sp);
    if (idx === -1) break;
    lastPos = idx;
    sp = idx + 1;
  }

  if (lastPos === -1) {
    console.log(lang + ': campaignMgr not found');
    continue;
  }

  // Find the opening brace of this last campaignMgr
  const openBrace = s.indexOf('{', lastPos);

  // Find "guideTip5" within this section
  const gt5 = s.indexOf('"guideTip5"', openBrace);
  if (gt5 === -1) {
    console.log(lang + ': guideTip5 not found in last campaignMgr');
    continue;
  }

  // Find the end of guideTip5's value (skip the colon, then find the closing quote)
  const colonAfter = s.indexOf(':', gt5 + 12);
  const quoteStart = s.indexOf('"', colonAfter + 1);
  // scan to closing quote (not escaped)
  let quoteEnd = quoteStart + 1;
  while (quoteEnd < s.length) {
    if (s[quoteEnd] === '\\') { quoteEnd += 2; continue; }
    if (s[quoteEnd] === '"') break;
    quoteEnd++;
  }
  
  // Insert after the closing quote of guideTip5
  const insertAt = quoteEnd + 1;
  const inject = ',' + Object.entries(keys).map(([k,v]) => '"' + k + '":' + JSON.stringify(v)).join(',');
  s = s.slice(0, insertAt) + inject + s.slice(insertAt);

  fs.writeFileSync(f, s, 'utf8');

  // Verify by spawning a fresh node process
  const { execSync } = require('child_process');
  try {
    const out = execSync(
      'node -e "const m=require(\'./'+f+'\').default||require(\'./'+f+'\');console.log(Object.keys(m.campaignMgr||{}).length,!!m.campaignMgr.guideStep1Title)"',
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    console.log(lang + ': ' + out);
  } catch(e) {
    console.log(lang + ': VERIFY FAIL - ' + (e.stderr||'').split('\n')[0]);
  }
}

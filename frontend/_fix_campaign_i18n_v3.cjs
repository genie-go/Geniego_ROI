const fs = require('fs');
const DIR = 'src/i18n/locales';
const locales = ['ko','en','ja','zh','zh-TW','th','vi','de','fr','es','id'];

// Keys to inject
const KEYS = {
ko:{guideStep1Title:'캠페인 생성',guideStep1Desc:'AI 오토 마케팅 또는 통합 AI 캠페인 빌더에서 캠페인을 생성합니다. 예산, 타겟 ROAS, 기간을 설정하고 광고 채널을 선택합니다.',guideStep2Title:'캠페인 승인',guideStep2Desc:'예약된 캠페인 카드의 활성화 승인 버튼을 클릭하여 승인합니다.',guideStep3Title:'실시간 모니터링',guideStep3Desc:'모니터링 탭에서 활성 캠페인의 소진율, 일일 예산, 전환 수, CPA를 추적합니다.',guideStep4Title:'예산 알림 관리',guideStep4Desc:'예산 소진율 70% 이상 자동 알림. 95% 이상 자동 일시정지, 85-95% 경고.',guideStep5Title:'ROI 분석',guideStep5Desc:'ROI 분석 탭에서 캠페인별 ROAS, ROI, 소진 금액을 종합 비교합니다.',guideStep6Title:'AI 카피 생성',guideStep6Desc:'AI 카피라이터 탭에서 채널과 톤을 선택하고 프롬프트를 입력하면 광고 카피를 자동 생성합니다.',guideTabOverviewName:'캠페인 현황',guideTabOverviewDesc:'전체 캠페인을 카드 형태로 표시하고 상태별 필터링, 예산 소진율을 확인합니다.',guideTabAbName:'A/B 테스트',guideTabAbDesc:'이메일 마케팅과 어트리뷰션의 A/B 테스트 결과를 통합 조회합니다.',guideTabDetailName:'상세 분석',guideTabDetailDesc:'캠페인의 KPI 목표 vs 실적, 채널별 예산 배분을 확인합니다.',guideTabGanttName:'일정 관리',guideTabGanttDesc:'간트 차트로 캠페인 일정을 시각화합니다.',guideTabCrmName:'CRM 채널',guideTabCrmDesc:'이메일과 카카오톡 캠페인 현황을 통합 조회합니다.',guideTabRoiName:'ROI 분석',guideTabRoiDesc:'전체 캠페인 ROI를 종합 분석합니다.',guideTabMonitorName:'실시간 모니터링',guideTabMonitorDesc:'활성 캠페인의 실시간 KPI를 모니터링합니다.',guideTabBudgetName:'예산 알림',guideTabBudgetDesc:'예산 소진율 기준 자동 알림 시스템입니다.',guideTabCopyName:'AI 카피',guideTabCopyDesc:'AI 광고 카피 자동 생성기입니다.',tabCreative:'AI 광고 소재',creativeTitle:'AI 광고 크리에이티브 생성기',creativeSub:'자연어 프롬프트를 입력하면 AI가 캠페인에 맞는 광고 디자인을 자동 생성합니다.',guideTabCreativeName:'AI 광고 소재',guideTabCreativeDesc:'자연어 프롬프트 기반 AI 광고 이미지 생성기입니다.',channelFee:'수수료',channelFeeRate:'수수료율',noFeeData:'수수료 정보 없음'},
en:{guideStep1Title:'Create Campaign',guideStep1Desc:'Create campaigns from AI Auto Marketing. Set budget, target ROAS, duration, and select ad channels.',guideStep2Title:'Approve Campaign',guideStep2Desc:'Click the Activate Approve button on the scheduled campaign card.',guideStep3Title:'Real-time Monitoring',guideStep3Desc:'Track burn rate, daily budget, conversions, and CPA of active campaigns.',guideStep4Title:'Budget Alert Management',guideStep4Desc:'Auto alerts when budget burn exceeds 70%. Auto-pause above 95%, warning at 85-95%.',guideStep5Title:'ROI Analysis',guideStep5Desc:'Compare ROAS, ROI, and spend across campaigns in the ROI tab.',guideStep6Title:'AI Copy Generation',guideStep6Desc:'Select channel and tone, enter a prompt to auto-generate ad copy.',guideTabOverviewName:'Campaign Overview',guideTabOverviewDesc:'Displays all campaigns as cards with status filtering and budget burn rate.',guideTabAbName:'A/B Testing',guideTabAbDesc:'View integrated A/B test results from Email Marketing and Attribution.',guideTabDetailName:'Detail Analysis',guideTabDetailDesc:'View KPI targets vs actuals and channel budget allocation.',guideTabGanttName:'Schedule',guideTabGanttDesc:'Visualize campaign schedules with Gantt charts.',guideTabCrmName:'CRM Channels',guideTabCrmDesc:'View Email and KakaoTalk campaign status.',guideTabRoiName:'ROI Analysis',guideTabRoiDesc:'Comprehensive ROI analysis across all campaigns.',guideTabMonitorName:'Real-time Monitor',guideTabMonitorDesc:'Live monitoring of active campaign KPIs.',guideTabBudgetName:'Budget Alerts',guideTabBudgetDesc:'Automatic alert system based on budget burn rate.',guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'AI-powered ad copy generator.',tabCreative:'AI Creative',creativeTitle:'AI Ad Creative Generator',creativeSub:'Enter a natural language prompt and AI generates campaign-specific ad designs.',guideTabCreativeName:'AI Creative',guideTabCreativeDesc:'Natural language prompt-based AI ad image generator with 16 scene types.',channelFee:'Fee',channelFeeRate:'Fee Rate',noFeeData:'No fee data'},
ja:{guideStep1Title:'キャンペーン作成',guideStep1Desc:'AIオートマーケティングからキャンペーンを作成。予算、ROAS、チャネルを設定。',guideStep2Title:'承認',guideStep2Desc:'予約済みカードの有効化ボタンをクリック。',guideStep3Title:'リアルタイム監視',guideStep3Desc:'消化率、日次予算、CV数、CPAを追跡。',guideStep4Title:'予算アラート',guideStep4Desc:'70%以上で自動アラート。95%以上は自動停止。',guideStep5Title:'ROI分析',guideStep5Desc:'ROAS、ROIを総合比較。',guideStep6Title:'AIコピー',guideStep6Desc:'AIで広告コピーを自動生成。',guideTabOverviewName:'概要',guideTabOverviewDesc:'全キャンペーンをカード表示。',guideTabAbName:'A/Bテスト',guideTabAbDesc:'A/B結果を統合表示。',guideTabDetailName:'詳細',guideTabDetailDesc:'KPI目標vs実績。',guideTabGanttName:'スケジュール',guideTabGanttDesc:'ガントチャート。',guideTabCrmName:'CRM',guideTabCrmDesc:'メールとKakaoTalk。',guideTabRoiName:'ROI',guideTabRoiDesc:'ROI総合分析。',guideTabMonitorName:'監視',guideTabMonitorDesc:'リアルタイムKPI。',guideTabBudgetName:'予算',guideTabBudgetDesc:'自動アラート。',guideTabCopyName:'AIコピー',guideTabCopyDesc:'AI広告コピー。',tabCreative:'AI広告素材',creativeTitle:'AI広告生成',creativeSub:'自然言語で広告デザインを自動生成。',guideTabCreativeName:'AI素材',guideTabCreativeDesc:'AI画像生成。',channelFee:'手数料',channelFeeRate:'手数料率',noFeeData:'なし'},
};
// Use English as fallback for other languages
['zh','zh-TW','th','vi','de','fr','es','id'].forEach(l => { KEYS[l] = KEYS[l] || KEYS.en; });

for(const lang of locales) {
  const f = DIR + '/' + lang + '.js';
  let s = fs.readFileSync(f, 'utf8');
  const keys = KEYS[lang] || KEYS.en;
  
  // First: remove any previously injected keys from ALL campaignMgr blocks
  for(const k of Object.keys(keys)) {
    const pat = new RegExp(',"' + k + '"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"', 'g');
    s = s.replace(pat, '');
  }
  
  // Find the LAST occurrence of "campaignMgr" (which is the one JS uses due to object key dedup)
  let lastCmIdx = -1, searchFrom = 0;
  while(true) {
    const idx = s.indexOf('"campaignMgr"', searchFrom);
    if(idx === -1) break;
    lastCmIdx = idx;
    searchFrom = idx + 1;
  }
  
  if(lastCmIdx === -1) { console.log(lang + ': ERROR - campaignMgr not found'); continue; }
  
  // Find the brace-counted end of this last occurrence (string-aware)
  const firstBrace = s.indexOf('{', lastCmIdx);
  let depth = 0, end = -1, inStr = false, esc = false;
  for(let i = firstBrace; i < s.length; i++) {
    const c = s[i];
    if(esc) { esc = false; continue; }
    if(c === '\\') { esc = true; continue; }
    if(c === '"') { inStr = !inStr; continue; }
    if(inStr) continue;
    if(c === '{' || c === '[') depth++;
    if(c === '}' || c === ']') { depth--; if(depth === 0) { end = i; break; } }
  }
  
  if(end === -1) { console.log(lang + ': ERROR - end not found'); continue; }
  
  // Insert before the closing brace
  const inject = ',' + Object.entries(keys).map(([k,v]) => '"' + k + '":' + JSON.stringify(v)).join(',');
  s = s.slice(0, end) + inject + s.slice(end);
  
  fs.writeFileSync(f, s, 'utf8');
  
  // Verify
  try {
    Object.keys(require.cache).forEach(k => delete require.cache[k]);
    const m = require('./' + f).default || require('./' + f);
    const cnt = Object.keys(m.campaignMgr || {}).length;
    const hasGuide = 'guideStep1Title' in (m.campaignMgr || {});
    console.log(lang + ': ' + cnt + ' keys, guideStep1Title=' + hasGuide);
  } catch(e) {
    console.log(lang + ': PARSE FAIL - ' + e.message.split('\n')[0]);
  }
}

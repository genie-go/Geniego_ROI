/**
 * Re-inject missing campaignMgr original keys into each locale file
 * These were lost when locale files were extracted from the Vite bundle
 */
const fs = require('fs');
const vm = require('vm');

const DIR = 'd:/project/GeniegoROI/frontend/src/i18n/locales/';

// Original campaignMgr keys that were in the source before corruption
const ORIGINAL_CM = {
  ko: {
    pageTitle:"캠페인 관리",pageSub:"AI 마케팅 캠페인 통합 관리 · 소재·예산·성과 · 실시간",
    automationLinked:"{{n}}개 자동화 캠페인 연동 중",btnAutoMarketing:"AI 자동화로 이동",
    btnAiRecommend:"AI 마케팅 추천",tabRecommend:"AI 마케팅 추천",
    tabOverview:"캠페인 현황",tabAbTest:"A/B 테스트",tabDetail:"상세",tabGantt:"일정",tabCrm:"CRM 채널",
    kpiTotal:"전체 캠페인",kpiActive:"운영 중",kpiBudget:"총 예산",kpiSpent:"집행액",
    countUnit:"개",personUnit:"명",caseUnit:"건",
    statusActive:"운영 중",statusScheduled:"예약됨",statusEnded:"종료",statusPaused:"일시정지",
    filterAll:"전체",manager:"담당",budget:"예산",spent:"집행",burnRate:"소진율",
    targetRoas:"목표 ROAS",actualRoas:"실제 ROAS",kpiSection:"성과 목표 KPI",
    channelSection:"채널별 예산 집행",influencerSection:"연계 인플루언서",
    target:"목표",actual:"실제",conversions:"전환",goalAchieved:"목표 달성",goalMissed:"목표 미달",
    selectCampaignHint:"좌측 목록에서 캠페인을 선택하세요",ganttTitle:"캠페인 일정 (Gantt)",
    todayNote:"* 오늘 기준 표시",months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    emailTitle:"이메일 캠페인",kakaoTitle:"카카오 캠페인",
    noEmail:"이메일 캠페인이 없습니다",noKakao:"카카오 캠페인이 없습니다",
    manage:"관리",allSegments:"전체",colName:"캠페인명",colSegment:"세그먼트",
    colSent:"발송",colOpenRate:"오픈율",colSuccess:"성공",colFailed:"실패",
    abTitle:"A/B 테스트 결과",abSub:"이메일·Attribution A/B 테스트 결과를 통합 확인",
    abEmpty:"아직 완료된 A/B 테스트가 없습니다",emailAb:"이메일 A/B 테스트",
    startEmailAb:"이메일 A/B 시작",completed:"완료",source:"출처",winner:"승",confidence:"신뢰도",
    activateApprove:"캠페인 활성화 승인",approvalTitle:"캠페인 실행 승인",
    period:"기간",newCampaignBtn:"신규 캠페인 승인 등록",newCampaignTitle:"신규 캠페인 등록 승인",
    campaignType:"캠페인 유형",adChannels:"적용 채널",afterApproval:"승인 후",
    newCampaignConfirm:"승인 후 AI 캠페인 설정",
  },
  en: {
    pageTitle:"Campaign Management",pageSub:"AI Marketing Campaign Management · Assets·Budget·Performance · Real-time",
    automationLinked:"{{n}} automation campaigns linked",btnAutoMarketing:"Go to AI Automation",
    btnAiRecommend:"AI Marketing Recommend",tabRecommend:"AI Marketing Recommend",
    tabOverview:"Campaign Overview",tabAbTest:"A/B Test",tabDetail:"Detail",tabGantt:"Schedule",tabCrm:"CRM Channel",
    kpiTotal:"Total Campaigns",kpiActive:"Active",kpiBudget:"Total Budget",kpiSpent:"Spent",
    countUnit:"",personUnit:"",caseUnit:"",
    statusActive:"Active",statusScheduled:"Scheduled",statusEnded:"Ended",statusPaused:"Paused",
    filterAll:"All",manager:"Manager",budget:"Budget",spent:"Spent",burnRate:"Burn Rate",
    targetRoas:"Target ROAS",actualRoas:"Actual ROAS",kpiSection:"Performance KPI",
    channelSection:"Channel Budget Execution",influencerSection:"Linked Influencers",
    target:"Target",actual:"Actual",conversions:"Conversions",goalAchieved:"Goal Achieved",goalMissed:"Goal Missed",
    selectCampaignHint:"Select a campaign from the list",ganttTitle:"Campaign Schedule (Gantt)",
    todayNote:"* Based on today",months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    emailTitle:"Email Campaigns",kakaoTitle:"Kakao Campaigns",
    noEmail:"No email campaigns",noKakao:"No Kakao campaigns",
    manage:"Manage",allSegments:"All",colName:"Campaign Name",colSegment:"Segment",
    colSent:"Sent",colOpenRate:"Open Rate",colSuccess:"Success",colFailed:"Failed",
    abTitle:"A/B Test Results",abSub:"View email & attribution A/B test results",
    abEmpty:"No completed A/B tests yet",emailAb:"Email A/B Test",
    startEmailAb:"Start Email A/B",completed:"Completed",source:"Source",winner:"Winner",confidence:"Confidence",
    activateApprove:"Activate Campaign Approval",approvalTitle:"Campaign Execution Approval",
    period:"Period",newCampaignBtn:"New Campaign Approval",newCampaignTitle:"New Campaign Registration",
    campaignType:"Campaign Type",adChannels:"Channels",afterApproval:"After Approval",
    newCampaignConfirm:"Setup AI Campaign after approval",
  },
  ja: {
    pageTitle:"キャンペーン管理",pageSub:"AI マーケティングキャンペーン統合管理",
    tabOverview:"キャンペーン概況",tabAbTest:"A/B テスト",tabDetail:"詳細",tabGantt:"スケジュール",tabCrm:"CRMチャネル",
    kpiTotal:"全キャンペーン",kpiActive:"運用中",kpiBudget:"総予算",kpiSpent:"支出額",
    statusActive:"運用中",statusScheduled:"予約済み",statusEnded:"終了",filterAll:"すべて",
    budget:"予算",spent:"支出",burnRate:"消化率",conversions:"コンバージョン",
    abTitle:"A/B テスト結果",abEmpty:"完了したA/Bテストがありません",
    newCampaignConfirm:"承認後AIキャンペーン設定",
    btnAutoMarketing:"AI自動化へ",btnAiRecommend:"AIマーケティング推薦",
  },
};

// For zh/zh-TW/de/vi/th/id, use English as base
for (const lang of ['zh','zh-TW','de','vi','th','id']) {
  if (!ORIGINAL_CM[lang]) ORIGINAL_CM[lang] = { ...ORIGINAL_CM.en };
}

const FILES = ['ko.js','en.js','ja.js','zh.js','zh-TW.js','de.js','vi.js','th.js','id.js'];

for (const f of FILES) {
  const lang = f.replace('.js','');
  const filePath = DIR + f;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if campaignMgr exists and has the required keys
  const modContent = content.replace('export default', 'module.exports =');
  let obj;
  try {
    const script = new vm.Script(modContent);
    const ctx = { module: { exports: {} }, exports: {} };
    script.runInNewContext(ctx);
    obj = ctx.module.exports;
  } catch(e) {
    console.log(`❌ ${f}: parse error`);
    continue;
  }
  
  const cm = obj.campaignMgr || {};
  const origKeys = ORIGINAL_CM[lang] || ORIGINAL_CM.en;
  const missing = Object.keys(origKeys).filter(k => !(k in cm));
  
  if (missing.length === 0) {
    console.log(`✅ ${f}: all campaignMgr keys present`);
    continue;
  }
  
  console.log(`${f}: adding ${missing.length} missing campaignMgr keys`);
  
  // Find campaignMgr section and add missing keys
  const cmIdx = content.indexOf('"campaignMgr"');
  if (cmIdx < 0) {
    console.log(`⚠️ ${f}: campaignMgr section not found`);
    continue;
  }
  
  // Find the opening { after campaignMgr
  const openBrace = content.indexOf('{', cmIdx);
  if (openBrace < 0) continue;
  
  // Insert after opening brace
  let newKeys = '';
  for (const key of missing) {
    const value = origKeys[key];
    if (Array.isArray(value)) {
      newKeys += `"${key}":${JSON.stringify(value)},`;
    } else {
      const escaped = String(value).replace(/"/g, '\\"');
      newKeys += `"${key}":"${escaped}",`;
    }
  }
  
  content = content.substring(0, openBrace + 1) + newKeys + content.substring(openBrace + 1);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  // Verify
  try {
    new vm.Script(content.replace('export default', 'module.exports ='));
    console.log(`✅ ${f}: patched OK (+${missing.length} keys)`);
  } catch(e) {
    console.log(`❌ ${f}: ${e.message.slice(0,80)}`);
  }
}

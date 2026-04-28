/**
 * fix_sidebar_labels.cjs — Fix sidebar menu labels by adding dedicated label keys
 * Problem: gNav.dashboard is an object (contains nested keys) but sidebar expects a string
 * Solution: Add gNav.xxxLabel keys for sidebar display names
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src', 'i18n', 'locales');

// Keys that conflict (are objects, not strings) — need dedicated label keys
const LABEL_KEYS = {
  ko: {
    "dashboardLabel":"대시보드","rollupLabel":"통합 대시보드",
    "autoMarketingLabel":"AI 마케팅 허브","campaignManagerLabel":"캠페인 매니저","journeyBuilderLabel":"저니 빌더",
    "adPerformanceLabel":"광고 성과","budgetTrackerLabel":"예산 플래너","accountPerformanceLabel":"계정 성과",
    "attributionLabel":"어트리뷰션","channelKpiLabel":"채널 KPI","graphScoreLabel":"그래프 스코어",
    "crmMainLabel":"고객 관리","kakaoChannelLabel":"카카오 채널","emailMarketingLabel":"이메일 마케팅",
    "smsMarketingLabel":"SMS 마케팅","influencerLabel":"인플루언서","contentCalendarLabel":"콘텐츠 캘린더",
    "reviewsUgcLabel":"리뷰 & UGC","webPopupLabel":"웹 팝업",
    "omniChannelLabel":"옴니채널","catalogLabel":"카탈로그 동기화","orderHubLabel":"주문 허브",
    "wmsLabel":"WMS 관리","priceOptLabel":"가격 최적화","supplyChainLabel":"공급망","returnsPortalLabel":"반품 포털",
    "performanceHubLabel":"성과 허브","reportBuilderLabel":"리포트 빌더","pnlLabel":"손익 분석",
    "aiInsightsLabel":"AI 인사이트","dataProductLabel":"데이터 상품",
    "aiRuleEngineLabel":"AI 규칙 엔진","approvalsLabel":"승인 관리","writebackLabel":"라이트백","onboardingLabel":"온보딩",
    "integrationHubLabel":"연동 허브","dataSchemaLabel":"데이터 스키마","dataTrustLabel":"데이터 신뢰",
    "settlementsLabel":"정산 관리","reconciliationLabel":"대사 관리","pricingLabel":"요금제","auditLogLabel":"감사 로그",
    "workspaceLabel":"워크스페이스","operationsLabel":"운영 관리","caseStudyLabel":"성공 사례",
    "helpLabel":"도움말","feedbackLabel":"피드백","developerHubLabel":"개발자 허브",
    "platformEnvLabel":"플랫폼 환경","dbSchemaLabel":"DB 스키마","paymentPgLabel":"결제 PG",
  },
  en: {
    "dashboardLabel":"Dashboard","rollupLabel":"Rollup Dashboard",
    "autoMarketingLabel":"AI Marketing Hub","campaignManagerLabel":"Campaign Manager","journeyBuilderLabel":"Journey Builder",
    "adPerformanceLabel":"Ad Performance","budgetTrackerLabel":"Budget Tracker","accountPerformanceLabel":"Account Performance",
    "attributionLabel":"Attribution","channelKpiLabel":"Channel KPI","graphScoreLabel":"Graph Score",
    "crmMainLabel":"CRM","kakaoChannelLabel":"Kakao Channel","emailMarketingLabel":"Email Marketing",
    "smsMarketingLabel":"SMS Marketing","influencerLabel":"Influencer","contentCalendarLabel":"Content Calendar",
    "reviewsUgcLabel":"Reviews & UGC","webPopupLabel":"Web Popup",
    "omniChannelLabel":"Omni Channel","catalogLabel":"Catalog Sync","orderHubLabel":"Order Hub",
    "wmsLabel":"WMS Manager","priceOptLabel":"Price Optimization","supplyChainLabel":"Supply Chain","returnsPortalLabel":"Returns Portal",
    "performanceHubLabel":"Performance Hub","reportBuilderLabel":"Report Builder","pnlLabel":"P&L Analytics",
    "aiInsightsLabel":"AI Insights","dataProductLabel":"Data Product",
    "aiRuleEngineLabel":"AI Rule Engine","approvalsLabel":"Approvals","writebackLabel":"Writeback","onboardingLabel":"Onboarding",
    "integrationHubLabel":"Integration Hub","dataSchemaLabel":"Data Schema","dataTrustLabel":"Data Trust",
    "settlementsLabel":"Settlements","reconciliationLabel":"Reconciliation","pricingLabel":"Pricing","auditLogLabel":"Audit Log",
    "workspaceLabel":"Workspace","operationsLabel":"Operations","caseStudyLabel":"Case Study",
    "helpLabel":"Help","feedbackLabel":"Feedback","developerHubLabel":"Developer Hub",
    "platformEnvLabel":"Platform Settings","dbSchemaLabel":"DB Schema","paymentPgLabel":"Payment PG",
  },
  ja: {
    "dashboardLabel":"ダッシュボード","rollupLabel":"統合ダッシュボード",
    "autoMarketingLabel":"AIマーケティングハブ","campaignManagerLabel":"キャンペーン管理","journeyBuilderLabel":"ジャーニービルダー",
    "adPerformanceLabel":"広告パフォーマンス","budgetTrackerLabel":"予算トラッカー","accountPerformanceLabel":"アカウント成果",
    "attributionLabel":"アトリビューション","channelKpiLabel":"チャネルKPI","graphScoreLabel":"グラフスコア",
    "crmMainLabel":"CRM","kakaoChannelLabel":"カカオチャンネル","emailMarketingLabel":"メールマーケティング",
    "smsMarketingLabel":"SMSマーケティング","influencerLabel":"インフルエンサー","contentCalendarLabel":"コンテンツカレンダー",
    "reviewsUgcLabel":"レビュー＆UGC","webPopupLabel":"ウェブポップアップ",
    "omniChannelLabel":"オムニチャネル","catalogLabel":"カタログ同期","orderHubLabel":"注文ハブ",
    "wmsLabel":"WMS管理","priceOptLabel":"価格最適化","supplyChainLabel":"サプライチェーン","returnsPortalLabel":"返品ポータル",
    "performanceHubLabel":"パフォーマンスハブ","reportBuilderLabel":"レポートビルダー","pnlLabel":"損益分析",
    "aiInsightsLabel":"AIインサイト","dataProductLabel":"データプロダクト",
    "aiRuleEngineLabel":"AIルールエンジン","approvalsLabel":"承認管理","writebackLabel":"ライトバック","onboardingLabel":"オンボーディング",
    "integrationHubLabel":"連携ハブ","dataSchemaLabel":"データスキーマ","dataTrustLabel":"データトラスト",
    "settlementsLabel":"精算","reconciliationLabel":"照合","pricingLabel":"料金プラン","auditLogLabel":"監査ログ",
    "workspaceLabel":"ワークスペース","operationsLabel":"運営管理","caseStudyLabel":"成功事例",
    "helpLabel":"ヘルプ","feedbackLabel":"フィードバック","developerHubLabel":"開発者ハブ",
    "platformEnvLabel":"プラットフォーム設定","dbSchemaLabel":"DBスキーマ","paymentPgLabel":"決済PG",
  },
  zh: {
    "dashboardLabel":"仪表盘","rollupLabel":"综合仪表盘",
    "autoMarketingLabel":"AI营销中心","campaignManagerLabel":"广告活动管理","journeyBuilderLabel":"旅程构建器",
    "adPerformanceLabel":"广告效果","budgetTrackerLabel":"预算追踪","accountPerformanceLabel":"账户绩效",
    "attributionLabel":"归因分析","channelKpiLabel":"渠道KPI","graphScoreLabel":"图谱评分",
    "crmMainLabel":"客户管理","kakaoChannelLabel":"Kakao频道","emailMarketingLabel":"邮件营销",
    "smsMarketingLabel":"短信营销","influencerLabel":"网红营销","contentCalendarLabel":"内容日历",
    "reviewsUgcLabel":"评论和UGC","webPopupLabel":"网页弹窗",
    "omniChannelLabel":"全渠道","catalogLabel":"目录同步","orderHubLabel":"订单中心",
    "wmsLabel":"仓储管理","priceOptLabel":"价格优化","supplyChainLabel":"供应链","returnsPortalLabel":"退货门户",
    "performanceHubLabel":"绩效中心","reportBuilderLabel":"报表构建器","pnlLabel":"损益分析",
    "aiInsightsLabel":"AI洞察","dataProductLabel":"数据产品",
    "aiRuleEngineLabel":"AI规则引擎","approvalsLabel":"审批管理","writebackLabel":"回写","onboardingLabel":"引导",
    "integrationHubLabel":"集成中心","dataSchemaLabel":"数据架构","dataTrustLabel":"数据信任",
    "settlementsLabel":"结算","reconciliationLabel":"对账","pricingLabel":"定价","auditLogLabel":"审计日志",
    "workspaceLabel":"工作空间","operationsLabel":"运营管理","caseStudyLabel":"成功案例",
    "helpLabel":"帮助","feedbackLabel":"反馈","developerHubLabel":"开发者中心",
    "platformEnvLabel":"平台设置","dbSchemaLabel":"数据库架构","paymentPgLabel":"支付PG",
  },
};

const LANGS = ['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
let total = 0;

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  const keys = LABEL_KEYS[lang] || LABEL_KEYS.en;
  let added = 0;
  
  Object.entries(keys).forEach(([k, v]) => {
    const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const entry = `"${k}":"${escaped}"`;
    if (src.includes(`"${k}"`)) return; // already exists
    
    // Insert into gNav namespace
    const nsMatch = /"gNav"\s*:\s*\{/.exec(src);
    if (nsMatch) {
      const idx = nsMatch.index + nsMatch[0].length;
      src = src.slice(0, idx) + entry + ',' + src.slice(idx);
      added++;
    }
  });
  
  if (added > 0) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`✅ ${lang}: ${added} label keys injected`);
    total += added;
  } else {
    console.log(`⏭️  ${lang}: no new keys needed`);
  }
});
console.log(`\n🎯 Total: ${total} sidebar label keys injected`);

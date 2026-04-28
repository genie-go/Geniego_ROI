/**
 * inject_sidebar_i18n.cjs — Sidebar gNav keys for 15 languages
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const KEYS = {
  ko: {
    "gNav.home":"홈","gNav.dashboard":"대시보드","gNav.rollup":"통합 대시보드",
    "gNav.aiMarketing":"AI마케팅 자동화","gNav.autoMarketing":"AI 마케팅 허브","gNav.campaignManager":"캠페인 매니저","gNav.journeyBuilder":"저니 빌더",
    "gNav.adAnalytics":"광고·채널 분석","gNav.adPerformance":"광고 성과","gNav.budgetTracker":"예산 플래너","gNav.accountPerformance":"계정 성과","gNav.attribution":"attribution","gNav.channelKpi":"channelKpi","gNav.graphScore":"graphScore",
    "gNav.crm":"crm","gNav.crmMain":"CRM","gNav.kakaoChannel":"카카오 채널","gNav.emailMarketing":"이메일 마케팅","gNav.smsMarketing":"SMS 마케팅","gNav.influencer":"인플루언서","gNav.contentCalendar":"콘텐츠 캘린더","gNav.reviewsUgc":"리뷰 & UGC","gNav.webPopup":"웹 팝업",
    "gNav.commerce":"커머스","gNav.omniChannel":"옴니채널","gNav.catalog":"카탈로그","gNav.orderHub":"주문 허브","gNav.wms":"WMS 관리","gNav.priceOpt":"가격 최적화","gNav.supplyChain":"공급망","gNav.returnsPortal":"반품 포털",
    "gNav.analytics":"데이터 분석","gNav.performanceHub":"성과 허브","gNav.reportBuilder":"리포트 빌더","gNav.pnl":"손익 분석","gNav.aiInsights":"AI 인사이트","gNav.dataProduct":"데이터 상품",
    "gNav.automation":"자동화 및 AI 규칙","gNav.aiRuleEngine":"AI 규칙 엔진","gNav.approvals":"승인 관리","gNav.writeback":"라이트백","gNav.onboarding":"온보딩",
    "gNav.data":"데이터 및 수집","gNav.integrationHub":"연동 허브","gNav.dataSchema":"데이터 스키마","gNav.dataTrust":"데이터 신뢰",
    "gNav.finance":"재무 및 결산","gNav.settlements":"정산 관리","gNav.reconciliation":"대사 관리","gNav.pricing":"요금제","gNav.auditLog":"감사 로그",
    "gNav.memberTools":"멤버 구성형 도구","gNav.workspace":"워크스페이스","gNav.operations":"운영 관리","gNav.caseStudy":"성공 사례","gNav.help":"도움말","gNav.feedback":"피드백","gNav.developerHub":"개발자 허브",
    "gNav.adminSystem":"시스템 관리","gNav.platformEnv":"플랫폼 환경","gNav.dbSchema":"DB 스키마","gNav.paymentPg":"결제 PG",
  },
  en: {
    "gNav.home":"Home","gNav.dashboard":"Dashboard","gNav.rollup":"Rollup Dashboard",
    "gNav.aiMarketing":"AI Marketing","gNav.autoMarketing":"AI Marketing Hub","gNav.campaignManager":"Campaign Manager","gNav.journeyBuilder":"Journey Builder",
    "gNav.adAnalytics":"Ad & Channel Analytics","gNav.adPerformance":"Ad Performance","gNav.budgetTracker":"Budget Tracker","gNav.accountPerformance":"Account Performance","gNav.attribution":"Attribution","gNav.channelKpi":"Channel KPI","gNav.graphScore":"Graph Score",
    "gNav.crm":"CRM","gNav.crmMain":"CRM","gNav.kakaoChannel":"Kakao Channel","gNav.emailMarketing":"Email Marketing","gNav.smsMarketing":"SMS Marketing","gNav.influencer":"Influencer","gNav.contentCalendar":"Content Calendar","gNav.reviewsUgc":"Reviews & UGC","gNav.webPopup":"Web Popup",
    "gNav.commerce":"Commerce","gNav.omniChannel":"Omni Channel","gNav.catalog":"Catalog Sync","gNav.orderHub":"Order Hub","gNav.wms":"WMS Manager","gNav.priceOpt":"Price Optimization","gNav.supplyChain":"Supply Chain","gNav.returnsPortal":"Returns Portal",
    "gNav.analytics":"Analytics","gNav.performanceHub":"Performance Hub","gNav.reportBuilder":"Report Builder","gNav.pnl":"P&L Analytics","gNav.aiInsights":"AI Insights","gNav.dataProduct":"Data Product",
    "gNav.automation":"Automation & AI Rules","gNav.aiRuleEngine":"AI Rule Engine","gNav.approvals":"Approvals","gNav.writeback":"Writeback","gNav.onboarding":"Onboarding",
    "gNav.data":"Data & Collection","gNav.integrationHub":"Integration Hub","gNav.dataSchema":"Data Schema","gNav.dataTrust":"Data Trust",
    "gNav.finance":"Finance & Settlement","gNav.settlements":"Settlements","gNav.reconciliation":"Reconciliation","gNav.pricing":"Pricing","gNav.auditLog":"Audit Log",
    "gNav.memberTools":"Member Tools","gNav.workspace":"Workspace","gNav.operations":"Operations","gNav.caseStudy":"Case Study","gNav.help":"Help","gNav.feedback":"Feedback","gNav.developerHub":"Developer Hub",
    "gNav.adminSystem":"System Admin","gNav.platformEnv":"Platform Env","gNav.dbSchema":"DB Schema","gNav.paymentPg":"Payment PG",
  },
  ja: {
    "gNav.home":"ホーム","gNav.dashboard":"ダッシュボード","gNav.rollup":"統合ダッシュボード",
    "gNav.aiMarketing":"AIマーケティング自動化","gNav.autoMarketing":"AIマーケティングハブ","gNav.campaignManager":"キャンペーン管理","gNav.journeyBuilder":"ジャーニービルダー",
    "gNav.adAnalytics":"広告・チャネル分析","gNav.adPerformance":"広告パフォーマンス","gNav.budgetTracker":"予算トラッカー","gNav.accountPerformance":"アカウント成果","gNav.attribution":"アトリビューション","gNav.channelKpi":"チャネルKPI","gNav.graphScore":"グラフスコア",
    "gNav.crm":"CRM","gNav.crmMain":"CRM","gNav.kakaoChannel":"カカオチャンネル","gNav.emailMarketing":"メールマーケティング","gNav.smsMarketing":"SMSマーケティング","gNav.influencer":"インフルエンサー","gNav.contentCalendar":"コンテンツカレンダー","gNav.reviewsUgc":"レビュー＆UGC","gNav.webPopup":"ウェブポップアップ",
    "gNav.commerce":"コマース","gNav.omniChannel":"オムニチャネル","gNav.catalog":"カタログ同期","gNav.orderHub":"注文ハブ","gNav.wms":"WMS管理","gNav.priceOpt":"価格最適化","gNav.supplyChain":"サプライチェーン","gNav.returnsPortal":"返品ポータル",
    "gNav.analytics":"データ分析","gNav.performanceHub":"パフォーマンスハブ","gNav.reportBuilder":"レポートビルダー","gNav.pnl":"損益分析","gNav.aiInsights":"AIインサイト","gNav.dataProduct":"データプロダクト",
    "gNav.automation":"自動化＆AIルール","gNav.aiRuleEngine":"AIルールエンジン","gNav.approvals":"承認管理","gNav.writeback":"ライトバック","gNav.onboarding":"オンボーディング",
    "gNav.data":"データ＆収集","gNav.integrationHub":"連携ハブ","gNav.dataSchema":"データスキーマ","gNav.dataTrust":"データトラスト",
    "gNav.finance":"財務＆決算","gNav.settlements":"精算","gNav.reconciliation":"照合","gNav.pricing":"料金プラン","gNav.auditLog":"監査ログ",
    "gNav.memberTools":"メンバーツール","gNav.workspace":"ワークスペース","gNav.operations":"運営管理","gNav.caseStudy":"成功事例","gNav.help":"ヘルプ","gNav.feedback":"フィードバック","gNav.developerHub":"開発者ハブ",
    "gNav.adminSystem":"システム管理","gNav.platformEnv":"プラットフォーム環境","gNav.dbSchema":"DBスキーマ","gNav.paymentPg":"決済PG",
  },
  zh: {
    "gNav.home":"首页","gNav.dashboard":"仪表盘","gNav.rollup":"综合仪表盘",
    "gNav.aiMarketing":"AI营销自动化","gNav.autoMarketing":"AI营销中心","gNav.campaignManager":"广告活动管理","gNav.journeyBuilder":"旅程构建器",
    "gNav.adAnalytics":"广告·渠道分析","gNav.adPerformance":"广告效果","gNav.budgetTracker":"预算追踪","gNav.accountPerformance":"账户绩效","gNav.attribution":"归因分析","gNav.channelKpi":"渠道KPI","gNav.graphScore":"图谱评分",
    "gNav.crm":"客户管理","gNav.crmMain":"CRM","gNav.kakaoChannel":"Kakao频道","gNav.emailMarketing":"邮件营销","gNav.smsMarketing":"短信营销","gNav.influencer":"网红营销","gNav.contentCalendar":"内容日历","gNav.reviewsUgc":"评论&UGC","gNav.webPopup":"网页弹窗",
    "gNav.commerce":"电商","gNav.omniChannel":"全渠道","gNav.catalog":"目录同步","gNav.orderHub":"订单中心","gNav.wms":"仓储管理","gNav.priceOpt":"价格优化","gNav.supplyChain":"供应链","gNav.returnsPortal":"退货门户",
    "gNav.analytics":"数据分析","gNav.performanceHub":"绩效中心","gNav.reportBuilder":"报表构建器","gNav.pnl":"损益分析","gNav.aiInsights":"AI洞察","gNav.dataProduct":"数据产品",
    "gNav.automation":"自动化&AI规则","gNav.aiRuleEngine":"AI规则引擎","gNav.approvals":"审批管理","gNav.writeback":"回写","gNav.onboarding":"引导",
    "gNav.data":"数据&采集","gNav.integrationHub":"集成中心","gNav.dataSchema":"数据模式","gNav.dataTrust":"数据信任",
    "gNav.finance":"财务&结算","gNav.settlements":"结算","gNav.reconciliation":"对账","gNav.pricing":"定价","gNav.auditLog":"审计日志",
    "gNav.memberTools":"成员工具","gNav.workspace":"工作空间","gNav.operations":"运营管理","gNav.caseStudy":"成功案例","gNav.help":"帮助","gNav.feedback":"反馈","gNav.developerHub":"开发者中心",
    "gNav.adminSystem":"系统管理","gNav.platformEnv":"平台环境","gNav.dbSchema":"数据库架构","gNav.paymentPg":"支付PG",
  },
};

// For remaining languages, clone from en
const LANGS = ['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];

let total = 0;
LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  
  // Check if gNav namespace exists
  if (!/"gNav"\s*:\s*\{/.test(src)) {
    // Add gNav namespace before the last closing brace of the export
    const keys = KEYS[lang] || KEYS.en;
    const entries = Object.entries(keys).map(([k,v]) => {
      const shortKey = k.replace('gNav.','');
      return `"${shortKey}":"${v.replace(/"/g,'\\"')}"`;
    }).join(',');
    const nsBlock = `"gNav":{${entries}},`;
    
    // Find first namespace to insert before it
    const firstNs = src.indexOf('"marketing"');
    if (firstNs === -1) {
      // Try inserting after export default {
      const expIdx = src.indexOf('export default {');
      if (expIdx !== -1) {
        const insertAt = expIdx + 'export default {'.length;
        src = src.slice(0, insertAt) + nsBlock + src.slice(insertAt);
      }
    } else {
      src = src.slice(0, firstNs) + nsBlock + src.slice(firstNs);
    }
    fs.writeFileSync(file, src, 'utf8');
    const count = Object.keys(keys).length;
    console.log(`✅ ${lang}: gNav namespace created with ${count} keys`);
    total += count;
  } else {
    console.log(`⏭️  ${lang}: gNav already exists`);
  }
});
console.log(`\n🎯 Total: ${total} sidebar keys injected`);

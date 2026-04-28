/**
 * Inject topbar.pg keys into all locale files that are missing them
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/i18n/locales');

const pgKeys = {
  ko: { dashboard:"대시보드", adPerformance:"광고 성과", autoMarketing:"AI 마케팅 자동화", campaignManager:"캠페인 매니저", journeyBuilder:"고객 여정 빌더", budgetTracker:"예산 플래너", accountPerformance:"계정 성과", attribution:"어트리뷰션", channelKpi:"채널 KPI", graphScore:"그래프 스코어", crm:"CRM", kakaoChannel:"카카오 채널", emailMarketing:"이메일 마케팅", smsMarketing:"SMS 마케팅", influencer:"인플루언서 UGC", contentCalendar:"콘텐츠 캘린더", reviewsUgc:"리뷰 & UGC", webPopup:"웹 팝업", omniChannel:"옴니채널", catalogSync:"카탈로그 동기화", orderHub:"주문 허브", wmsManager:"WMS 관리", priceOpt:"가격 최적화", supplyChain:"공급망", returnsPortal:"반품 포털", performanceHub:"성과 허브", reportBuilder:"리포트 빌더", pnl:"손익 분석", aiInsights:"AI 인사이트", dataProduct:"데이터 프로덕트", aiRuleEngine:"AI 규칙 엔진", approvals:"승인 관리", writeback:"데이터 라이트백", onboarding:"온보딩", integrationHub:"연동 허브", dataSchema:"데이터 스키마", dataTrust:"데이터 신뢰도", settlements:"정산 관리", reconciliation:"대사 관리", pricing:"요금제", auditLog:"감사 로그", workspace:"팀 워크스페이스", operations:"운영 허브", help:"도움말", feedback:"피드백", developerHub:"개발자 허브", admin:"플랫폼 관리", dbAdmin:"DB 관리", pgConfig:"PG 설정", rollup:"롤업 대시보드", caseStudy:"사례 연구", demandForecast:"수요 예측", supplierPortal:"공급업체 포털", myCoupons:"내 쿠폰", license:"라이선스 활성화" },
  en: { dashboard:"Dashboard", adPerformance:"Ad Performance", autoMarketing:"Auto Marketing", campaignManager:"Campaign Manager", journeyBuilder:"Journey Builder", budgetTracker:"Budget Tracker", accountPerformance:"Account Performance", attribution:"Attribution", channelKpi:"Channel KPI", graphScore:"Graph Score", crm:"CRM", kakaoChannel:"Kakao Channel", emailMarketing:"Email Marketing", smsMarketing:"SMS Marketing", influencer:"Influencer UGC", contentCalendar:"Content Calendar", reviewsUgc:"Reviews & UGC", webPopup:"Web Popup", omniChannel:"Omni Channel", catalogSync:"Catalog Sync", orderHub:"Order Hub", wmsManager:"WMS Manager", priceOpt:"Price Optimization", supplyChain:"Supply Chain", returnsPortal:"Returns Portal", performanceHub:"Performance Hub", reportBuilder:"Report Builder", pnl:"P&L Analytics", aiInsights:"AI Insights", dataProduct:"Data Product", aiRuleEngine:"AI Rule Engine", approvals:"Approvals", writeback:"Writeback", onboarding:"Onboarding", integrationHub:"Integration Hub", dataSchema:"Data Schema", dataTrust:"Data Trust", settlements:"Settlements", reconciliation:"Reconciliation", pricing:"Pricing", auditLog:"Audit Log", workspace:"Team Workspace", operations:"Operations Hub", help:"Help Center", feedback:"Feedback", developerHub:"Developer Hub", admin:"Platform Admin", dbAdmin:"DB Admin", pgConfig:"PG Config", rollup:"Rollup Dashboard", caseStudy:"Case Study", demandForecast:"Demand Forecast", supplierPortal:"Supplier Portal", myCoupons:"My Coupons", license:"License Activation" },
  ja: { dashboard:"ダッシュボード", adPerformance:"広告パフォーマンス", autoMarketing:"AIマーケティング自動化", campaignManager:"キャンペーンマネージャー", journeyBuilder:"カスタマージャーニー", budgetTracker:"予算プランナー", accountPerformance:"アカウント実績", attribution:"アトリビューション", channelKpi:"チャネルKPI", graphScore:"グラフスコア", crm:"CRM", kakaoChannel:"カカオチャネル", emailMarketing:"メールマーケティング", smsMarketing:"SMSマーケティング", influencer:"インフルエンサーUGC", contentCalendar:"コンテンツカレンダー", reviewsUgc:"レビュー＆UGC", webPopup:"Webポップアップ", omniChannel:"オムニチャネル", catalogSync:"カタログ同期", orderHub:"注文ハブ", wmsManager:"WMS管理", priceOpt:"価格最適化", supplyChain:"サプライチェーン", returnsPortal:"返品ポータル", performanceHub:"パフォーマンスハブ", reportBuilder:"レポートビルダー", pnl:"損益分析", aiInsights:"AIインサイト", dataProduct:"データプロダクト", aiRuleEngine:"AIルールエンジン", approvals:"承認管理", writeback:"ライトバック", onboarding:"オンボーディング", integrationHub:"統合ハブ", dataSchema:"データスキーマ", dataTrust:"データ信頼性", settlements:"精算管理", reconciliation:"照合管理", pricing:"料金プラン", auditLog:"監査ログ", workspace:"チームワークスペース", operations:"運営ハブ", help:"ヘルプセンター", feedback:"フィードバック", developerHub:"開発者ハブ", admin:"プラットフォーム管理", dbAdmin:"DB管理", pgConfig:"PG設定", rollup:"ロールアップ", caseStudy:"ケーススタディ", demandForecast:"需要予測", supplierPortal:"サプライヤーポータル", myCoupons:"マイクーポン", license:"ライセンス認証" },
  zh: { dashboard:"仪表盘", adPerformance:"广告效果", autoMarketing:"AI营销自动化", campaignManager:"活动管理器", journeyBuilder:"客户旅程", budgetTracker:"预算规划", accountPerformance:"账户绩效", attribution:"归因分析", channelKpi:"渠道KPI", graphScore:"图谱评分", crm:"CRM", kakaoChannel:"Kakao频道", emailMarketing:"邮件营销", smsMarketing:"短信营销", influencer:"KOL & UGC", contentCalendar:"内容日历", reviewsUgc:"评论 & UGC", webPopup:"网页弹窗", omniChannel:"全渠道", catalogSync:"商品目录同步", orderHub:"订单中心", wmsManager:"WMS管理", priceOpt:"价格优化", supplyChain:"供应链", returnsPortal:"退货门户", performanceHub:"绩效中心", reportBuilder:"报表构建器", pnl:"损益分析", aiInsights:"AI洞察", dataProduct:"数据产品", aiRuleEngine:"AI规则引擎", approvals:"审批管理", writeback:"数据回写", onboarding:"入门引导", integrationHub:"集成中心", dataSchema:"数据架构", dataTrust:"数据信任", settlements:"结算管理", reconciliation:"对账管理", pricing:"定价", auditLog:"审计日志", workspace:"团队空间", operations:"运营中心", help:"帮助中心", feedback:"反馈", developerHub:"开发者中心", admin:"平台管理", dbAdmin:"数据库管理", pgConfig:"支付配置", rollup:"汇总仪表盘", caseStudy:"案例研究", demandForecast:"需求预测", supplierPortal:"供应商门户", myCoupons:"我的优惠券", license:"许可证激活" },
};

// Clone EN for remaining langs, override wmsManager
const wmsOverride = {
  'zh-TW':"WMS管理", de:"WMS-Verwaltung", th:"จัดการ WMS", vi:"Quản lý WMS",
  id:"Manajemen WMS", es:"Gestión WMS", fr:"Gestion WMS", pt:"Gestão WMS",
  ru:"Управление WMS", ar:"إدارة WMS", hi:"WMS प्रबंधन"
};
for (const [lang, wms] of Object.entries(wmsOverride)) {
  pgKeys[lang] = { ...pgKeys.en, wmsManager: wms };
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let count = 0;
for (const file of files) {
  const lang = file.replace('.js', '');
  const pg = pgKeys[lang] || pgKeys.en;
  const fp = path.join(dir, file);
  let src = fs.readFileSync(fp, 'utf8');
  
  // Check if topbar.pg already exists
  const m = require(fp);
  const obj = m.default || m;
  if (obj.topbar?.pg?.wmsManager) {
    console.log(`SKIP ${lang} (topbar.pg exists)`);
    continue;
  }
  
  // Strategy: find "topbar":{...} and inject "pg":{...} into it
  const pgJson = JSON.stringify(pg);
  
  // Find topbar object start
  const topbarIdx = src.indexOf('"topbar"');
  if (topbarIdx === -1) {
    console.log(`ERR ${lang}: no topbar key`);
    continue;
  }
  // Find the opening { after "topbar":
  const braceStart = src.indexOf('{', topbarIdx + 8);
  if (braceStart === -1) {
    console.log(`ERR ${lang}: no topbar brace`);
    continue;
  }
  
  // Insert "pg":{...}, right after the opening brace
  src = src.slice(0, braceStart + 1) + `"pg":${pgJson},` + src.slice(braceStart + 1);
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`OK ${lang}`);
  count++;
}
console.log(`\nDone: ${count} files updated`);

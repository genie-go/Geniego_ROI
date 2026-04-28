// Inject gNav keys by finding gNav section and adding before its closing brace
const fs=require('fs');
const {parse}=require('acorn');
const DIR='src/i18n/locales/';
const NAV_KEYS={
ko:{dashboardLabel:"종합 대시보드",rollupLabel:"롤업 뷰",autoMarketingLabel:"자동화 전략",campaignManagerLabel:"캠페인 관리",journeyBuilderLabel:"여정 빌더",adPerformanceLabel:"광고성과",budgetTrackerLabel:"예산 관리",accountPerformanceLabel:"어카운트 성과",attributionLabel:"어트리뷰션",channelKpiLabel:"채널 KPI",graphScoreLabel:"그래프 스코어",crmLabel:"고객/CRM",crmMainLabel:"CRM 대시보드",kakaoChannelLabel:"카카오 비즈니스",emailMarketingLabel:"이메일 마케팅",smsMarketingLabel:"SMS 마케팅",influencerLabel:"인플루언서",contentCalendarLabel:"콘텐츠 캘린더",reviewsUgcLabel:"리뷰 및 UGC",webPopupLabel:"웹 팝업",commerceLabel:"커머스 및 물류",omniChannelLabel:"옴니 채널",catalogLabel:"카탈로그 동기화",orderHubLabel:"주문 허브",wmsLabel:"WMS 재고관리",priceOptLabel:"최적 가격 설정",supplyChainLabel:"공급망 관리",returnsPortalLabel:"반품 포털",performanceHubLabel:"퍼포먼스 인사이트",pnlLabel:"P&L 손익",aiInsightsLabel:"AI 인사이트",reportBuilderLabel:"리포트 빌더",dataProductLabel:"데이터 프로덕트",aiRuleEngineLabel:"AI 룰 엔진",approvalsLabel:"결재 센터",writebackLabel:"데이터 라이트백",dataSchemaLabel:"데이터 스키마",dataTrustLabel:"데이터 신뢰성",reconciliationLabel:"정산 대조",settlementsLabel:"결제 내역",pricingLabel:"플랜 및 업그레이드",auditLogLabel:"보안 감사 로그",workspaceLabel:"워크스페이스 설정",operationsLabel:"운영 실행 목록",caseStudyLabel:"성공 사례",helpLabel:"플랫폼 가이드",feedbackLabel:"의견/피드백",developerHubLabel:"개발자 포털",adminSystem:"관리자 시스템",platformEnvLabel:"관리자 환경",dbSchemaLabel:"DB 어드민",paymentPgLabel:"게이트웨이 관리",integrationHubLabel:"연동 허브",onboardingLabel:"온보딩 맵"},
en:{dashboardLabel:"Dashboard",rollupLabel:"Rollup View",autoMarketingLabel:"Auto Strategy",campaignManagerLabel:"Campaign Manager",journeyBuilderLabel:"Journey Builder",adPerformanceLabel:"Ad Performance",budgetTrackerLabel:"Budget Tracker",accountPerformanceLabel:"Account Performance",attributionLabel:"Attribution",channelKpiLabel:"Channel KPI",graphScoreLabel:"Graph Score",crmLabel:"CRM",crmMainLabel:"CRM Dashboard",kakaoChannelLabel:"Kakao Business",emailMarketingLabel:"Email Marketing",smsMarketingLabel:"SMS Marketing",influencerLabel:"Influencer",contentCalendarLabel:"Content Calendar",reviewsUgcLabel:"Reviews & UGC",webPopupLabel:"Web Popup",commerceLabel:"Commerce & Logistics",omniChannelLabel:"Omni Channel",catalogLabel:"Catalog Sync",orderHubLabel:"Order Hub",wmsLabel:"WMS Inventory",priceOptLabel:"Price Optimization",supplyChainLabel:"Supply Chain",returnsPortalLabel:"Returns Portal",performanceHubLabel:"Performance Hub",pnlLabel:"P&L",aiInsightsLabel:"AI Insights",reportBuilderLabel:"Report Builder",dataProductLabel:"Data Product",aiRuleEngineLabel:"AI Rule Engine",approvalsLabel:"Approvals",writebackLabel:"Writeback",dataSchemaLabel:"Data Schema",dataTrustLabel:"Data Trust",reconciliationLabel:"Reconciliation",settlementsLabel:"Settlements",pricingLabel:"Plans & Upgrade",auditLogLabel:"Audit Log",workspaceLabel:"Workspace",operationsLabel:"Operations",caseStudyLabel:"Case Studies",helpLabel:"Platform Guide",feedbackLabel:"Feedback",developerHubLabel:"Developer Hub",adminSystem:"Admin System",platformEnvLabel:"Admin Settings",dbSchemaLabel:"DB Admin",paymentPgLabel:"Payment Gateway",integrationHubLabel:"Integration Hub",onboardingLabel:"Onboarding"},
ja:{dashboardLabel:"ダッシュボード",rollupLabel:"ロールアップ",autoMarketingLabel:"自動化戦略",campaignManagerLabel:"キャンペーン管理",journeyBuilderLabel:"ジャーニービルダー",adPerformanceLabel:"広告成果",budgetTrackerLabel:"予算管理",accountPerformanceLabel:"アカウント成果",attributionLabel:"アトリビューション",channelKpiLabel:"チャネルKPI",graphScoreLabel:"グラフスコア",crmLabel:"CRM",crmMainLabel:"CRMダッシュボード",kakaoChannelLabel:"カカオビジネス",emailMarketingLabel:"メールマーケティング",smsMarketingLabel:"SMSマーケティング",influencerLabel:"インフルエンサー",contentCalendarLabel:"コンテンツカレンダー",reviewsUgcLabel:"レビュー＆UGC",webPopupLabel:"Webポップアップ",commerceLabel:"コマース・物流",omniChannelLabel:"オムニチャネル",catalogLabel:"カタログ同期",orderHubLabel:"注文ハブ",wmsLabel:"WMS在庫管理",priceOptLabel:"価格最適化",supplyChainLabel:"サプライチェーン",returnsPortalLabel:"返品ポータル",performanceHubLabel:"パフォーマンス",pnlLabel:"P&L損益",aiInsightsLabel:"AIインサイト",reportBuilderLabel:"レポートビルダー",dataProductLabel:"データプロダクト",aiRuleEngineLabel:"AIルールエンジン",approvalsLabel:"承認センター",writebackLabel:"ライトバック",dataSchemaLabel:"データスキーマ",dataTrustLabel:"データ信頼性",reconciliationLabel:"精算照合",settlementsLabel:"決済履歴",pricingLabel:"プラン",auditLogLabel:"監査ログ",workspaceLabel:"ワークスペース",operationsLabel:"運営実行",caseStudyLabel:"成功事例",helpLabel:"ガイド",feedbackLabel:"フィードバック",developerHubLabel:"開発者ポータル",adminSystem:"管理者システム",platformEnvLabel:"管理者設定",dbSchemaLabel:"DB管理",paymentPgLabel:"PG管理",integrationHubLabel:"連携ハブ",onboardingLabel:"オンボーディング"},
zh:{dashboardLabel:"综合仪表盘",rollupLabel:"汇总视图",autoMarketingLabel:"自动化策略",campaignManagerLabel:"活动管理",journeyBuilderLabel:"旅程构建",adPerformanceLabel:"广告效果",budgetTrackerLabel:"预算管理",accountPerformanceLabel:"账户绩效",attributionLabel:"归因分析",channelKpiLabel:"渠道KPI",graphScoreLabel:"图谱评分",crmLabel:"CRM",crmMainLabel:"CRM仪表盘",kakaoChannelLabel:"Kakao商务",emailMarketingLabel:"邮件营销",smsMarketingLabel:"短信营销",influencerLabel:"达人管理",contentCalendarLabel:"内容日历",reviewsUgcLabel:"评论与UGC",webPopupLabel:"网页弹窗",commerceLabel:"电商与物流",omniChannelLabel:"全渠道",catalogLabel:"目录同步",orderHubLabel:"订单中心",wmsLabel:"WMS库存",priceOptLabel:"价格优化",supplyChainLabel:"供应链",returnsPortalLabel:"退货门户",performanceHubLabel:"绩效中心",pnlLabel:"损益表",aiInsightsLabel:"AI洞察",reportBuilderLabel:"报表构建",dataProductLabel:"数据产品",aiRuleEngineLabel:"AI规则引擎",approvalsLabel:"审批中心",writebackLabel:"数据回写",dataSchemaLabel:"数据模式",dataTrustLabel:"数据可信度",reconciliationLabel:"对账",settlementsLabel:"结算记录",pricingLabel:"套餐升级",auditLogLabel:"审计日志",workspaceLabel:"工作区",operationsLabel:"运营执行",caseStudyLabel:"成功案例",helpLabel:"平台指南",feedbackLabel:"反馈",developerHubLabel:"开发者门户",adminSystem:"管理系统",platformEnvLabel:"管理设置",dbSchemaLabel:"DB管理",paymentPgLabel:"支付网关",integrationHubLabel:"集成中心",onboardingLabel:"引导"},
};
NAV_KEYS["zh-TW"]={...NAV_KEYS.zh,dashboardLabel:"綜合儀表板",commerceLabel:"電商與物流",supplyChainLabel:"供應鏈",pricingLabel:"方案升級"};
NAV_KEYS.de={...NAV_KEYS.en,crmLabel:"Kundenmanagement",commerceLabel:"Handel & Logistik",supplyChainLabel:"Lieferkette",adminSystem:"Verwaltung"};
NAV_KEYS.fr={...NAV_KEYS.en,crmLabel:"Gestion clients",commerceLabel:"Commerce & Logistique",supplyChainLabel:"Chaîne d'approvisionnement",adminSystem:"Administration"};
NAV_KEYS.es={...NAV_KEYS.en,crmLabel:"Gestión de clientes",commerceLabel:"Comercio y Logística",supplyChainLabel:"Cadena de Suministro",adminSystem:"Administración"};
NAV_KEYS.pt={...NAV_KEYS.en,supplyChainLabel:"Cadeia de Suprimentos",adminSystem:"Administração"};
NAV_KEYS.ru={...NAV_KEYS.en,supplyChainLabel:"Цепочка поставок",adminSystem:"Администрирование"};
NAV_KEYS.ar={...NAV_KEYS.en,supplyChainLabel:"سلسلة التوريد",adminSystem:"الإدارة"};
NAV_KEYS.hi={...NAV_KEYS.en,supplyChainLabel:"आपूर्ति श्रृंखला",adminSystem:"प्रशासन"};
NAV_KEYS.th={...NAV_KEYS.en,crmLabel:"CRM",commerceLabel:"อีคอมเมิร์ซ",supplyChainLabel:"ซัพพลายเชน",adminSystem:"ระบบผู้ดูแล"};
NAV_KEYS.vi={...NAV_KEYS.en,commerceLabel:"Thương mại & Logistics",supplyChainLabel:"Chuỗi cung ứng",adminSystem:"Quản trị"};
NAV_KEYS.id={...NAV_KEYS.en,commerceLabel:"Perdagangan & Logistik",supplyChainLabel:"Rantai Pasok",adminSystem:"Administrasi"};

const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id','fr','es','pt','ru','ar','hi'];
LANGS.forEach(lang=>{
  const p=DIR+lang+'.js';
  let src=fs.readFileSync(p,'utf8');
  const nav=NAV_KEYS[lang]||NAV_KEYS.en;
  const varName=lang==='zh-TW'?'zhTW':lang;
  
  // Find gNav: { or varName.gNav = {
  // Strategy: find "gNav" keyword, then find its opening { and matching closing }
  const gNavIdx=src.search(new RegExp('\\bgNav\\b\\s*[:{=]'));
  if(gNavIdx<0){console.log(lang+': gNav NOT FOUND, skipping');return;}
  
  // Find the opening brace
  let braceStart=src.indexOf('{',gNavIdx);
  if(braceStart<0){console.log(lang+': no { after gNav');return;}
  
  // Find matching closing brace (string-aware)
  let depth=0,i=braceStart;
  for(;i<src.length;i++){
    const c=src[i];
    if(c==='"'||c==="'"){
      const q=c;i++;
      while(i<src.length&&src[i]!==q){if(src[i]==='\\')i++;i++;}
    }
    if(c==='{')depth++;
    if(c==='}')depth--;
    if(depth===0)break;
  }
  const closeBrace=i;
  
  // Insert new keys before the closing brace
  const indent='        ';
  const pairs=Object.entries(nav).map(([k,v])=>indent+JSON.stringify(k)+': '+JSON.stringify(v)).join(',\n');
  const insertion=',\n'+pairs+'\n    ';
  
  src=src.substring(0,closeBrace)+insertion+src.substring(closeBrace);
  fs.writeFileSync(p,src);
  console.log(lang+': injected '+Object.keys(nav).length+' keys');
});

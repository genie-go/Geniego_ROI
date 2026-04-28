const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// Native sidebar translations for gNav keys
const T={
zh:{home:"首页",dashboardLabel:"仪表盘",aiMarketing:"AI策略与营销",autoMarketingLabel:"AI营销自动化",campaignManagerLabel:"活动管理器",journeyBuilderLabel:"客户旅程",adAnalytics:"广告分析",adPerformanceLabel:"广告效果",budgetTrackerLabel:"预算规划",accountPerformanceLabel:"账户绩效",attributionLabel:"归因分析",channelKpiLabel:"渠道KPI",graphScoreLabel:"图谱评分",crmLabel:"客户与渠道",crmMainLabel:"CRM",kakaoChannelLabel:"Kakao频道",emailMarketingLabel:"邮件营销",smsMarketingLabel:"短信营销",influencerLabel:"网红",contentCalendarLabel:"内容日历",reviewsUgcLabel:"评论与UGC",webPopupLabel:"网页弹窗",commerceLabel:"商务与物流",omniChannelLabel:"全渠道",catalogLabel:"商品同步",orderHubLabel:"订单中心",wmsLabel:"WMS管理",priceOptLabel:"价格优化",supplyChainLabel:"供应链",returnsPortalLabel:"退货门户",analytics:"分析与报告",performanceHubLabel:"绩效中心",reportBuilderLabel:"报表构建",pnlLabel:"损益分析",aiInsightsLabel:"AI洞察",dataProductLabel:"数据产品",automation:"自动化与规则",aiRuleEngineLabel:"AI规则引擎",approvalsLabel:"审批管理",writebackLabel:"数据回写",onboardingLabel:"入门引导",data:"数据与集成",integrationHubLabel:"集成中心",dataSchemaLabel:"数据架构",dataTrustLabel:"数据信任",finance:"财务与结算",settlementsLabel:"结算管理",reconciliationLabel:"对账管理",pricingLabel:"定价",auditLogLabel:"审计日志",memberTools:"运营与支持",workspaceLabel:"团队空间",operationsLabel:"运营中心",caseStudyLabel:"案例研究",helpLabel:"帮助中心",feedbackLabel:"反馈",developerHubLabel:"开发者中心",adminSystem:"系统管理",platformEnvLabel:"平台管理",dbSchemaLabel:"数据库管理",paymentPgLabel:"支付配置"},
'zh-TW':{home:"首頁",commerceLabel:"商務與物流",wmsLabel:"WMS管理",analytics:"分析與報告",finance:"財務與結算",memberTools:"營運與支援",adminSystem:"系統管理",crmLabel:"客戶與頻道"},
de:{home:"Startseite",commerceLabel:"Handel & Logistik",wmsLabel:"WMS-Verwaltung",analytics:"Analyse & Berichte",finance:"Finanzen & Abrechnung",memberTools:"Betrieb & Support",adminSystem:"Systemverwaltung",crmLabel:"Kunden & Kanäle"},
th:{home:"หน้าแรก",commerceLabel:"การค้าและโลจิสติกส์",wmsLabel:"จัดการ WMS",analytics:"การวิเคราะห์และรายงาน",finance:"การเงินและการชำระบัญชี",memberTools:"การดำเนินงานและสนับสนุน",adminSystem:"การจัดการระบบ",crmLabel:"ลูกค้าและช่องทาง"},
vi:{home:"Trang chủ",commerceLabel:"Thương mại & Logistics",wmsLabel:"Quản lý WMS",analytics:"Phân tích & Báo cáo",finance:"Tài chính & Thanh toán",memberTools:"Vận hành & Hỗ trợ",adminSystem:"Quản trị hệ thống",crmLabel:"Khách hàng & Kênh"},
id:{home:"Beranda",commerceLabel:"Perdagangan & Logistik",wmsLabel:"Manajemen WMS",analytics:"Analitik & Laporan",finance:"Keuangan & Penyelesaian",memberTools:"Operasi & Dukungan",adminSystem:"Admin Sistem",crmLabel:"Pelanggan & Saluran"},
es:{home:"Inicio",commerceLabel:"Comercio y Logística",wmsLabel:"Gestión WMS",analytics:"Análisis e Informes",finance:"Finanzas y Liquidación",memberTools:"Operaciones y Soporte",adminSystem:"Admin del Sistema",crmLabel:"Clientes y Canales"},
fr:{home:"Accueil",commerceLabel:"Commerce et Logistique",wmsLabel:"Gestion WMS",analytics:"Analyses et Rapports",finance:"Finance et Règlement",memberTools:"Opérations et Support",adminSystem:"Admin Système",crmLabel:"Clients et Canaux"},
pt:{home:"Início",commerceLabel:"Comércio e Logística",wmsLabel:"Gestão WMS",analytics:"Análises e Relatórios",finance:"Finanças e Liquidação",memberTools:"Operações e Suporte",adminSystem:"Admin do Sistema",crmLabel:"Clientes e Canais"},
ru:{home:"Главная",commerceLabel:"Коммерция и логистика",wmsLabel:"Управление WMS",analytics:"Аналитика и отчёты",finance:"Финансы и расчёты",memberTools:"Операции и поддержка",adminSystem:"Администрирование",crmLabel:"Клиенты и каналы"},
ar:{home:"الرئيسية",commerceLabel:"التجارة والخدمات اللوجستية",wmsLabel:"إدارة WMS",analytics:"التحليلات والتقارير",finance:"المالية والتسوية",memberTools:"العمليات والدعم",adminSystem:"إدارة النظام",crmLabel:"العملاء والقنوات"},
hi:{home:"होम",commerceLabel:"वाणिज्य और रसद",wmsLabel:"WMS प्रबंधन",analytics:"विश्लेषण और रिपोर्ट",finance:"वित्त और निपटान",memberTools:"संचालन और सहायता",adminSystem:"सिस्टम प्रशासन",crmLabel:"ग्राहक और चैनल"}
};
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){
  const lang=file.replace('.js','');
  const native=T[lang];
  if(!native)continue;
  const fp=path.join(dir,file);
  let src=fs.readFileSync(fp,'utf8');
  delete require.cache[require.resolve(fp)];
  const obj=(require(fp).default||require(fp));
  if(!obj.gNav)continue;
  const merged={...obj.gNav,...native};
  const idx=src.indexOf('"gNav"');
  if(idx===-1)continue;
  const bs=src.indexOf('{',idx+6);
  let d=1,p=bs+1;
  while(d>0&&p<src.length){if(src[p]==='{')d++;else if(src[p]==='}')d--;p++;}
  src=src.slice(0,idx)+'"gNav":'+JSON.stringify(merged)+src.slice(p);
  fs.writeFileSync(fp,src,'utf8');
  console.log(`OK ${lang}`);
}
console.log('Done');

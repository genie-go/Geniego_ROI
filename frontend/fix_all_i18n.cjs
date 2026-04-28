const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const SB={
es:{dashboardLabel:"Panel",rollupLabel:"Panel Integrado",autoMarketingLabel:"Hub de Marketing IA",campaignManagerLabel:"Gestor de Campañas",journeyBuilderLabel:"Constructor de Viajes",adPerformanceLabel:"Rendimiento Publicitario",budgetTrackerLabel:"Rastreador de Presupuesto",accountPerformanceLabel:"Rendimiento de Cuenta",attributionLabel:"Atribución",channelKpiLabel:"KPI de Canal",graphScoreLabel:"Puntuación Gráfica",crmMainLabel:"CRM",crmLabel:"CRM y Canales",kakaoChannelLabel:"Canal Kakao",emailMarketingLabel:"Email Marketing",smsMarketingLabel:"SMS Marketing",influencerLabel:"Influencer",contentCalendarLabel:"Calendario de Contenido",reviewsUgcLabel:"Reseñas y UGC",webPopupLabel:"Popup Web",commerceLabel:"Comercio y Logística",omniChannelLabel:"Omnicanal",catalogLabel:"Catálogo",orderHubLabel:"Centro de Pedidos",wmsLabel:"Gestión WMS",priceOptLabel:"Optimización de Precios",supplyChainLabel:"Cadena de Suministro",returnsPortalLabel:"Portal de Devoluciones",performanceHubLabel:"Hub de Rendimiento",reportBuilderLabel:"Constructor de Informes",pnlLabel:"Análisis P&L",aiInsightsLabel:"IA Insights",dataProductLabel:"Producto de Datos",aiRuleEngineLabel:"Motor de Reglas IA",approvalsLabel:"Aprobaciones",writebackLabel:"Writeback",onboardingLabel:"Incorporación",integrationHubLabel:"Hub de Integración",dataSchemaLabel:"Esquema de Datos",dataTrustLabel:"Confianza de Datos",settlementsLabel:"Liquidaciones",reconciliationLabel:"Conciliación",pricingLabel:"Precios",auditLogLabel:"Registro de Auditoría",workspaceLabel:"Espacio de Trabajo",operationsLabel:"Operaciones",caseStudyLabel:"Casos de Éxito",helpLabel:"Ayuda",feedbackLabel:"Comentarios",developerHubLabel:"Hub de Desarrollador",platformEnvLabel:"Configuración",dbSchemaLabel:"Esquema BD",paymentPgLabel:"Pagos PG"},
fr:{dashboardLabel:"Tableau de bord",rollupLabel:"Tableau de bord intégré",autoMarketingLabel:"Hub Marketing IA",campaignManagerLabel:"Gestionnaire de campagnes",journeyBuilderLabel:"Constructeur de parcours",adPerformanceLabel:"Performance publicitaire",budgetTrackerLabel:"Suivi du budget",accountPerformanceLabel:"Performance du compte",attributionLabel:"Attribution",channelKpiLabel:"KPI Canal",graphScoreLabel:"Score graphique",crmMainLabel:"CRM",crmLabel:"CRM et Canaux",kakaoChannelLabel:"Canal Kakao",emailMarketingLabel:"Email Marketing",smsMarketingLabel:"SMS Marketing",influencerLabel:"Influenceur",contentCalendarLabel:"Calendrier de contenu",reviewsUgcLabel:"Avis et UGC",webPopupLabel:"Popup Web",commerceLabel:"Commerce et Logistique",omniChannelLabel:"Omnicanal",catalogLabel:"Catalogue",orderHubLabel:"Centre de commandes",wmsLabel:"Gestion WMS",priceOptLabel:"Optimisation des prix",supplyChainLabel:"Chaîne d'approvisionnement",returnsPortalLabel:"Portail de retours",performanceHubLabel:"Hub Performance",reportBuilderLabel:"Constructeur de rapports",pnlLabel:"Analyse P&L",aiInsightsLabel:"IA Insights",dataProductLabel:"Produit de données",aiRuleEngineLabel:"Moteur de règles IA",approvalsLabel:"Approbations",writebackLabel:"Writeback",onboardingLabel:"Intégration",integrationHubLabel:"Hub d'intégration",dataSchemaLabel:"Schéma de données",dataTrustLabel:"Confiance des données",settlementsLabel:"Règlements",reconciliationLabel:"Réconciliation",pricingLabel:"Tarification",auditLogLabel:"Journal d'audit",workspaceLabel:"Espace de travail",operationsLabel:"Opérations",caseStudyLabel:"Études de cas",helpLabel:"Aide",feedbackLabel:"Commentaires",developerHubLabel:"Hub développeur",platformEnvLabel:"Configuration",dbSchemaLabel:"Schéma BD",paymentPgLabel:"Paiements PG"},
de:{dashboardLabel:"Dashboard",rollupLabel:"Gesamt-Dashboard",autoMarketingLabel:"KI-Marketing-Hub",campaignManagerLabel:"Kampagnen-Manager",journeyBuilderLabel:"Journey Builder",adPerformanceLabel:"Anzeigenleistung",budgetTrackerLabel:"Budget-Tracker",accountPerformanceLabel:"Kontoleistung",attributionLabel:"Attribution",channelKpiLabel:"Kanal-KPI",graphScoreLabel:"Graph-Score",crmMainLabel:"CRM",crmLabel:"CRM & Kanäle",kakaoChannelLabel:"Kakao-Kanal",emailMarketingLabel:"E-Mail-Marketing",smsMarketingLabel:"SMS-Marketing",influencerLabel:"Influencer",contentCalendarLabel:"Inhaltskalender",reviewsUgcLabel:"Bewertungen & UGC",webPopupLabel:"Web-Popup",commerceLabel:"Commerce & Logistik",omniChannelLabel:"Omnichannel",catalogLabel:"Katalog",orderHubLabel:"Bestellzentrum",wmsLabel:"WMS-Verwaltung",priceOptLabel:"Preisoptimierung",supplyChainLabel:"Lieferkette",returnsPortalLabel:"Rückgabeportal",performanceHubLabel:"Leistungs-Hub",reportBuilderLabel:"Berichtersteller",pnlLabel:"GuV-Analyse",aiInsightsLabel:"KI-Einblicke",dataProductLabel:"Datenprodukt",aiRuleEngineLabel:"KI-Regelwerk",approvalsLabel:"Genehmigungen",writebackLabel:"Rückschreibung",onboardingLabel:"Onboarding",integrationHubLabel:"Integrations-Hub",dataSchemaLabel:"Datenschema",dataTrustLabel:"Datenvertrauen",settlementsLabel:"Abrechnungen",reconciliationLabel:"Abstimmung",pricingLabel:"Preise",auditLogLabel:"Prüfprotokoll",workspaceLabel:"Arbeitsbereich",operationsLabel:"Betrieb",caseStudyLabel:"Fallstudien",helpLabel:"Hilfe",feedbackLabel:"Feedback",developerHubLabel:"Entwickler-Hub",platformEnvLabel:"Plattform",dbSchemaLabel:"DB-Schema",paymentPgLabel:"Zahlungs-PG"},
th:{dashboardLabel:"แดชบอร์ด",rollupLabel:"แดชบอร์ดรวม",autoMarketingLabel:"ศูนย์การตลาด AI",campaignManagerLabel:"จัดการแคมเปญ",journeyBuilderLabel:"ตัวสร้างเส้นทาง",adPerformanceLabel:"ประสิทธิภาพโฆษณา",budgetTrackerLabel:"ติดตามงบประมาณ",accountPerformanceLabel:"ประสิทธิภาพบัญชี",attributionLabel:"การระบุแหล่งที่มา",channelKpiLabel:"KPI ช่องทาง",graphScoreLabel:"คะแนนกราฟ",crmMainLabel:"CRM",crmLabel:"CRM และช่องทาง",commerceLabel:"คอมเมิร์ซและโลจิสติกส์",omniChannelLabel:"ออมนิแชนเนล",catalogLabel:"แค็ตตาล็อก",orderHubLabel:"ศูนย์คำสั่งซื้อ",wmsLabel:"จัดการ WMS",priceOptLabel:"ปรับราคา",supplyChainLabel:"ซัพพลายเชน",returnsPortalLabel:"พอร์ทัลคืนสินค้า",settlementsLabel:"การชำระเงิน",pricingLabel:"ราคา",helpLabel:"ช่วยเหลือ",feedbackLabel:"ข้อเสนอแนะ"},
vi:{dashboardLabel:"Bảng điều khiển",rollupLabel:"Bảng tổng hợp",autoMarketingLabel:"Hub Marketing AI",campaignManagerLabel:"Quản lý chiến dịch",journeyBuilderLabel:"Xây dựng hành trình",adPerformanceLabel:"Hiệu suất quảng cáo",budgetTrackerLabel:"Theo dõi ngân sách",accountPerformanceLabel:"Hiệu suất tài khoản",attributionLabel:"Quy kết",channelKpiLabel:"KPI Kênh",graphScoreLabel:"Điểm đồ thị",crmMainLabel:"CRM",crmLabel:"CRM & Kênh",commerceLabel:"Thương mại & Logistics",settlementsLabel:"Thanh toán",pricingLabel:"Bảng giá",helpLabel:"Trợ giúp",feedbackLabel:"Phản hồi"},
id:{dashboardLabel:"Dasbor",rollupLabel:"Dasbor Terpadu",autoMarketingLabel:"Hub Pemasaran AI",campaignManagerLabel:"Manajer Kampanye",journeyBuilderLabel:"Pembangun Perjalanan",adPerformanceLabel:"Performa Iklan",budgetTrackerLabel:"Pelacak Anggaran",accountPerformanceLabel:"Performa Akun",attributionLabel:"Atribusi",channelKpiLabel:"KPI Kanal",graphScoreLabel:"Skor Grafik",crmMainLabel:"CRM",crmLabel:"CRM & Kanal",commerceLabel:"Perdagangan & Logistik",settlementsLabel:"Penyelesaian",pricingLabel:"Harga",helpLabel:"Bantuan",feedbackLabel:"Umpan Balik"},
pt:{dashboardLabel:"Painel",rollupLabel:"Painel Integrado",autoMarketingLabel:"Hub de Marketing IA",campaignManagerLabel:"Gerenciador de Campanhas",journeyBuilderLabel:"Construtor de Jornada",adPerformanceLabel:"Desempenho de Anúncios",budgetTrackerLabel:"Rastreador de Orçamento",accountPerformanceLabel:"Desempenho da Conta",attributionLabel:"Atribuição",channelKpiLabel:"KPI do Canal",graphScoreLabel:"Pontuação de Gráfico",crmMainLabel:"CRM",crmLabel:"CRM e Canais",commerceLabel:"Comércio e Logística",settlementsLabel:"Liquidações",pricingLabel:"Preços",helpLabel:"Ajuda",feedbackLabel:"Feedback"},
ru:{dashboardLabel:"Панель",rollupLabel:"Сводная панель",autoMarketingLabel:"Хаб ИИ-маркетинга",campaignManagerLabel:"Менеджер кампаний",journeyBuilderLabel:"Конструктор путей",adPerformanceLabel:"Эффективность рекламы",budgetTrackerLabel:"Трекер бюджета",accountPerformanceLabel:"Эффективность аккаунта",attributionLabel:"Атрибуция",channelKpiLabel:"KPI каналов",graphScoreLabel:"Граф-скор",crmMainLabel:"CRM",crmLabel:"CRM и каналы",commerceLabel:"Коммерция и логистика",settlementsLabel:"Расчёты",pricingLabel:"Тарифы",helpLabel:"Помощь",feedbackLabel:"Обратная связь"},
ar:{dashboardLabel:"لوحة المعلومات",rollupLabel:"لوحة شاملة",autoMarketingLabel:"مركز التسويق بالذكاء الاصطناعي",campaignManagerLabel:"مدير الحملات",journeyBuilderLabel:"منشئ الرحلات",adPerformanceLabel:"أداء الإعلانات",budgetTrackerLabel:"تتبع الميزانية",accountPerformanceLabel:"أداء الحساب",attributionLabel:"الإسناد",channelKpiLabel:"مؤشرات القنوات",graphScoreLabel:"نقاط الرسم البياني",crmMainLabel:"إدارة العملاء",crmLabel:"العملاء والقنوات",kakaoChannelLabel:"قناة كاكاو",emailMarketingLabel:"التسويق بالبريد",smsMarketingLabel:"التسويق بالرسائل",influencerLabel:"المؤثرون",contentCalendarLabel:"تقويم المحتوى",reviewsUgcLabel:"التقييمات",webPopupLabel:"نوافذ منبثقة",commerceLabel:"التجارة والخدمات",omniChannelLabel:"قناة شاملة",catalogLabel:"الكتالوج",orderHubLabel:"مركز الطلبات",wmsLabel:"إدارة المستودعات",priceOptLabel:"تحسين الأسعار",supplyChainLabel:"سلسلة التوريد",returnsPortalLabel:"بوابة المرتجعات",performanceHubLabel:"مركز الأداء",reportBuilderLabel:"منشئ التقارير",pnlLabel:"تحليل الأرباح",aiInsightsLabel:"رؤى الذكاء الاصطناعي",dataProductLabel:"منتج البيانات",aiRuleEngineLabel:"محرك قواعد الذكاء الاصطناعي",approvalsLabel:"الموافقات",writebackLabel:"إعادة الكتابة",onboardingLabel:"الإعداد",integrationHubLabel:"مركز التكامل",dataSchemaLabel:"مخطط البيانات",dataTrustLabel:"ثقة البيانات",settlementsLabel:"التسويات",reconciliationLabel:"المطابقة",pricingLabel:"التسعير",auditLogLabel:"سجل المراجعة",workspaceLabel:"مساحة العمل",operationsLabel:"العمليات",caseStudyLabel:"دراسات الحالة",helpLabel:"المساعدة",feedbackLabel:"الملاحظات",developerHubLabel:"مركز المطورين",platformEnvLabel:"إعدادات المنصة",dbSchemaLabel:"مخطط قاعدة البيانات",paymentPgLabel:"بوابة الدفع"},
hi:{dashboardLabel:"डैशबोर्ड",rollupLabel:"समेकित डैशबोर्ड",autoMarketingLabel:"AI मार्केटिंग हब",campaignManagerLabel:"अभियान प्रबंधक",journeyBuilderLabel:"यात्रा निर्माता",adPerformanceLabel:"विज्ञापन प्रदर्शन",budgetTrackerLabel:"बजट ट्रैकर",accountPerformanceLabel:"खाता प्रदर्शन",attributionLabel:"एट्रिब्यूशन",channelKpiLabel:"चैनल KPI",graphScoreLabel:"ग्राफ स्कोर",crmMainLabel:"CRM",crmLabel:"CRM और चैनल",commerceLabel:"कॉमर्स और लॉजिस्टिक्स",settlementsLabel:"निपटान",pricingLabel:"मूल्य निर्धारण",helpLabel:"सहायता",feedbackLabel:"प्रतिक्रिया"},
"zh-TW":{dashboardLabel:"儀表板",rollupLabel:"綜合儀表板",autoMarketingLabel:"AI行銷中心",campaignManagerLabel:"廣告活動管理",journeyBuilderLabel:"旅程建構器",adPerformanceLabel:"廣告效果",budgetTrackerLabel:"預算追蹤",accountPerformanceLabel:"帳戶績效",attributionLabel:"歸因分析",channelKpiLabel:"渠道KPI",graphScoreLabel:"圖譜評分",crmMainLabel:"客戶管理",crmLabel:"客戶與渠道",commerceLabel:"電商與物流",settlementsLabel:"結算",pricingLabel:"定價",helpLabel:"幫助",feedbackLabel:"回饋"},
};
const MK={
es:{tabOverview:"Resumen",tabAdStatus:"Estado de Anuncios",tabCreative:"Creativo",tabCompare:"Comparar",tabAiDesign:"Diseño IA",tabGuide:"Guía de Uso",pageTitle:"Marketing y Rendimiento Publicitario",pageSub:"Análisis integrado de medios IA"},
fr:{tabOverview:"Aperçu",tabAdStatus:"État des Annonces",tabCreative:"Créatif",tabCompare:"Comparer",tabAiDesign:"Design IA",tabGuide:"Guide d'utilisation",pageTitle:"Marketing et Performance Publicitaire",pageSub:"Analyse intégrée des médias IA"},
de:{tabOverview:"Übersicht",tabAdStatus:"Anzeigenstatus",tabCreative:"Kreativ",tabCompare:"Vergleich",tabAiDesign:"KI-Design",tabGuide:"Nutzungsanleitung",pageTitle:"Marketing & Anzeigenleistung",pageSub:"KI-integrierte Medienanalyse"},
th:{tabOverview:"ภาพรวม",tabAdStatus:"สถานะโฆษณา",tabCreative:"ครีเอทีฟ",tabCompare:"เปรียบเทียบ",tabAiDesign:"ออกแบบ AI",tabGuide:"คู่มือการใช้งาน",pageTitle:"การตลาดและผลโฆษณา",pageSub:"วิเคราะห์สื่อ AI แบบบูรณาการ"},
vi:{tabOverview:"Tổng quan",tabAdStatus:"Trạng thái QC",tabCreative:"Sáng tạo",tabCompare:"So sánh",tabAiDesign:"Thiết kế AI",tabGuide:"Hướng dẫn sử dụng",pageTitle:"Marketing & Hiệu suất QC",pageSub:"Phân tích truyền thông AI tích hợp"},
id:{tabOverview:"Ikhtisar",tabAdStatus:"Status Iklan",tabCreative:"Kreatif",tabCompare:"Bandingkan",tabAiDesign:"Desain AI",tabGuide:"Panduan Penggunaan",pageTitle:"Marketing & Performa Iklan",pageSub:"Analisis media AI terintegrasi"},
pt:{tabOverview:"Visão Geral",tabAdStatus:"Status de Anúncios",tabCreative:"Criativo",tabCompare:"Comparar",tabAiDesign:"Design IA",tabGuide:"Guia de Uso",pageTitle:"Marketing e Desempenho de Anúncios",pageSub:"Análise integrada de mídia IA"},
ru:{tabOverview:"Обзор",tabAdStatus:"Статус рекламы",tabCreative:"Креатив",tabCompare:"Сравнение",tabAiDesign:"ИИ-дизайн",tabGuide:"Руководство",pageTitle:"Маркетинг и эффективность рекламы",pageSub:"Комплексный анализ медиа на основе ИИ"},
ar:{tabOverview:"نظرة عامة",tabAdStatus:"حالة الإعلانات",tabCreative:"الإبداعي",tabCompare:"مقارنة",tabAiDesign:"تصميم بالذكاء الاصطناعي",tabGuide:"دليل الاستخدام",pageTitle:"التسويق وأداء الإعلانات",pageSub:"تحليل الوسائط المتكامل بالذكاء الاصطناعي"},
hi:{tabOverview:"अवलोकन",tabAdStatus:"विज्ञापन स्थिति",tabCreative:"क्रिएटिव",tabCompare:"तुलना",tabAiDesign:"AI डिज़ाइन",tabGuide:"उपयोग गाइड",pageTitle:"मार्केटिंग और विज्ञापन प्रदर्शन",pageSub:"AI एकीकृत मीडिया विश्लेषण"},
"zh-TW":{tabOverview:"概覽",tabAdStatus:"廣告狀態",tabCreative:"創意",tabCompare:"比較",tabAiDesign:"AI設計",tabGuide:"使用指南",pageTitle:"行銷與廣告績效",pageSub:"AI整合媒體分析"},
};
const LANGS=['es','fr','de','th','vi','id','pt','ru','ar','hi','zh-TW'];
let total=0;
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  let cnt=0;
  // Fix gNav labels
  const sbKeys=SB[lang]||{};
  Object.entries(sbKeys).forEach(([k,v])=>{
    const esc=v.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const oldPat=new RegExp('"'+k+'"\\s*:\\s*"[^"]*"');
    const gnavMatch=src.match(/"gNav"\s*:\s*\{/);
    if(!gnavMatch)return;
    const gnavStart=gnavMatch.index+gnavMatch[0].length;
    // Find end of gNav
    let depth=1,pos=gnavStart;
    while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
    const gnavEnd=pos-1;
    const gnavContent=src.substring(gnavStart,gnavEnd);
    if(gnavContent.includes('"'+k+'"')){
      // Replace existing value
      const before=src.substring(0,gnavStart);
      const after=src.substring(gnavEnd);
      const newContent=gnavContent.replace(new RegExp('"'+k+'"\\s*:\\s*"[^"]*"'),'"'+k+'":"'+esc+'"');
      if(newContent!==gnavContent){src=before+newContent+after;cnt++;}
    } else {
      // Insert new key
      src=src.slice(0,gnavStart)+'"'+k+'":"'+esc+'",'+src.slice(gnavStart);
      cnt++;
    }
  });
  // Fix marketing keys
  const mkKeys=MK[lang]||{};
  Object.entries(mkKeys).forEach(([k,v])=>{
    const esc=v.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const mktMatch=src.match(/"marketing"\s*:\s*\{/);
    if(!mktMatch)return;
    const mktStart=mktMatch.index+mktMatch[0].length;
    let depth=1,pos=mktStart;
    while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
    const mktEnd=pos-1;
    const mktContent=src.substring(mktStart,mktEnd);
    if(mktContent.includes('"'+k+'"')){
      const before=src.substring(0,mktStart);
      const after=src.substring(mktEnd);
      const newContent=mktContent.replace(new RegExp('"'+k+'"\\s*:\\s*"[^"]*"'),'"'+k+'":"'+esc+'"');
      if(newContent!==mktContent){src=before+newContent+after;cnt++;}
    } else {
      src=src.slice(0,mktStart)+'"'+k+'":"'+esc+'",'+src.slice(mktStart);
      cnt++;
    }
  });
  if(cnt>0){fs.writeFileSync(file,src,'utf8');console.log('✅ '+lang+': '+cnt+' keys');total+=cnt;}
  else console.log('⏭️  '+lang);
});
console.log('\n🎯 Total: '+total);

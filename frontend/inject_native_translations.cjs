const fs=require('fs'),vm=require('vm');
const dir='src/i18n/locales';

// Dashboard tab translations + guide translations for all languages
const translations = {
ar: {
  dashTabs:{overview:"ملخص شامل",overviewDesc:"لوحة المعلومات العامة",marketing:"أداء التسويق",marketingDesc:"تحليل الإعلانات",channel:"مؤشرات القنوات",channelDesc:"المقاييس الرئيسية",commerce:"التجارة الإلكترونية",commerceDesc:"تسوية التجارة",sales:"المبيعات العالمية",salesDesc:"المبيعات والأرباح",influencer:"المؤثرون",influencerDesc:"تحليل المبدعين",system:"حالة النظام",systemDesc:"مراقبة الخادم",guide:"دليل الاستخدام",guideDesc:"دليل المستخدم"},
  tabs:{overview:"ملخص شامل",overviewDesc:"لوحة المعلومات العامة",marketing:"أداء التسويق",marketingDesc:"تحليل الإعلانات",channel:"مؤشرات القنوات",channelDesc:"المقاييس الرئيسية",commerce:"التجارة الإلكترونية",commerceDesc:"تسوية التجارة",sales:"المبيعات العالمية",salesDesc:"المبيعات والأرباح",influencer:"المؤثرون",influencerDesc:"تحليل المبدعين",system:"حالة النظام",systemDesc:"مراقبة الخادم"},
  dashGuide:{title:"دليل استخدام لوحة المعلومات",subtitle:"تعرف على جميع ميزات لوحة المعلومات خطوة بخطوة.",beginnerBadge:"دليل المبتدئين",timeBadge:"5 دقائق",langBadge:"15 لغة",whereToStart:"من أين أبدأ؟",whereToStartDesc:"1. انقر على \"لوحة المعلومات\" من القائمة.\n2. راجع مؤشرات الأداء.\n3. انقر على التبويبات للتحليل.\n4. راجع شريط الأمان.",stepsTitle:"🚀 دليل البدء — 10 خطوات",step1Title:"الوصول للوحة",step1Desc:"انقر على لوحة المعلومات.",step2Title:"فحص البطاقات",step2Desc:"راجع بطاقات المؤشرات.",step3Title:"تحليل التسويق",step3Desc:"قارن أداء القنوات.",step4Title:"مؤشرات القنوات",step4Desc:"عرض CTR وCPC وROAS.",step5Title:"مراجعة التجارة",step5Desc:"فحص حالة التسوية.",step6Title:"المبيعات العالمية",step6Desc:"تحليل الإيرادات حسب البلد.",step7Title:"إدارة المؤثرين",step7Desc:"مراقبة المتابعين.",step8Title:"مراقبة النظام",step8Desc:"فحص حالة الخادم.",step9Title:"تنبيهات الأمان",step9Desc:"فحص شريط الأمان.",step10Title:"المراقبة المنتظمة",step10Desc:"إنشاء روتين مراجعة يومي.",tabsTitle:"📋 مرجع التبويبات",featuresTitle:"✨ الميزات الرئيسية",tipsTitle:"نصائح الخبراء",faqTitle:"الأسئلة الشائعة",readyTitle:"🎉 أنت جاهز للبدء!",readyDesc:"انقر على تبويب الملخص."},
  marketing:{mktTabOverview:"نظرة عامة",mktTabAdStatus:"حالة الإعلانات",mktTabCreative:"الإبداعي",mktTabCompare:"مقارنة",mktTabAiDesign:"تصميم AI",mktTabGuide:"الدليل",guideTitle:"دليل التسويق الآلي",guideSub:"دليل منصة التسويق الآلي بالذكاء الاصطناعي.",autoTab1:"① إعداد الحملة",autoTab2:"③ تهيئة الحملة",autoTab3:"③ معاينة AI",autoTab4:"دليل الاستخدام"},
  campMgr:{guideTitle:"دليل مدير الحملات",guideSub:"دليل إنشاء وتحليل الحملات.",tabGuide:"الدليل"},
  jb:{guideTitle:"دليل منشئ الرحلات",guideSub:"دليل تصميم رحلة العميل.",tabGuide:"الدليل"},
  adPerf:{tabAdStatus:"حالة الإعلانات",tabCreative:"الإبداعي",tabCompare:"مقارنة",tabAiDesign:"تصميم AI",tabGuide:"الدليل"},
  acctPerf:{tabDashboard:"لوحة بيانية",tabDrilldown:"تحليل شجري",tabGuide:"الدليل"},
  crm:{tabCust:"العملاء",tabAiSeg:"شرائح AI",tabManSeg:"شرائح يدوية",tabRfm:"تحليل RFM",tabGuide:"الدليل"},
  omniChannel:{tabChannels:"القنوات",tabProducts:"المنتجات",tabOrders:"الطلبات",tabInventory:"المخزون",tabOverview:"نظرة عامة",tabGuide:"الدليل"},
  catalogSync:{tabCatalog:"الكتالوج",tabSyncRun:"المزامنة",tabGuide:"الدليل"},
  orderHub:{tabOverview:"نظرة عامة",tabOrders:"الطلبات",tabGuide:"الدليل"},
  wms:{tabWarehouse:"المستودع",tabGuide:"الدليل"},
},
ja: {
  dashTabs:{guide:"利用ガイド",guideDesc:"使い方ガイド"},
  dashGuide:{title:"ダッシュボード利用ガイド",subtitle:"ダッシュボードの全機能をステップバイステップで学びます。",beginnerBadge:"初級ガイド",timeBadge:"5分",langBadge:"15言語",whereToStart:"どこから始めますか？",whereToStartDesc:"1. 左メニューから「ダッシュボード」をクリック。\n2. 概要KPIを確認。\n3. サブタブで詳細分析。\n4. セキュリティバナーを確認。",stepsTitle:"🚀 スタートガイド — 10ステップ",step1Title:"ダッシュボードにアクセス",step1Desc:"左メニューからダッシュボードをクリック。",step2Title:"KPIカード確認",step2Desc:"上部6つのKPIカードを確認。",step3Title:"マーケティング分析",step3Desc:"チャネル別パフォーマンスを比較。",step4Title:"チャネルKPI確認",step4Desc:"チャネル別CTR、CPC、ROAS。",step5Title:"コマース確認",step5Desc:"決済状況を確認。",step6Title:"グローバル売上",step6Desc:"国別売上を分析。",step7Title:"インフルエンサー管理",step7Desc:"フォロワーをモニタリング。",step8Title:"システム監視",step8Desc:"サーバーとセキュリティ状態。",step9Title:"セキュリティアラート",step9Desc:"セキュリティバナーを確認。",step10Title:"定期モニタリング",step10Desc:"日次レビュールーティンを作成。",tabsTitle:"📋 タブ別リファレンス",featuresTitle:"✨ 主要機能",tipsTitle:"エキスパートヒント",faqTitle:"よくある質問",readyTitle:"🎉 準備完了！",readyDesc:"概要タブをクリックして開始。"},
  marketing:{mktTabOverview:"概要",mktTabAdStatus:"広告状況",mktTabCreative:"クリエイティブ",mktTabCompare:"比較",mktTabAiDesign:"AIデザイン",mktTabGuide:"ガイド",guideTitle:"マーケティング自動化ガイド",autoTab4:"利用ガイド"},
  campMgr:{guideTitle:"キャンペーン管理ガイド",tabGuide:"利用ガイド"},
  jb:{guideTitle:"ジャーニービルダーガイド",tabGuide:"利用ガイド"},
  adPerf:{tabAdStatus:"広告状況",tabCreative:"クリエイティブ",tabCompare:"比較分析",tabAiDesign:"AIデザイン",tabGuide:"ガイド"},
  acctPerf:{tabDashboard:"ダッシュボード",tabDrilldown:"ドリルダウン",tabGuide:"ガイド"},
  crm:{tabCust:"顧客管理",tabAiSeg:"AIセグメント",tabManSeg:"手動セグメント",tabRfm:"RFM分析",tabGuide:"ガイド"},
},
de: {
  dashTabs:{guide:"Anleitung",guideDesc:"Benutzerhandbuch"},
  dashGuide:{title:"Dashboard-Benutzerhandbuch",subtitle:"Lernen Sie alle Dashboard-Funktionen Schritt für Schritt kennen.",beginnerBadge:"Anfänger",timeBadge:"5 Min.",langBadge:"15 Sprachen",whereToStart:"Wo fange ich an?",whereToStartDesc:"1. Klicken Sie links auf \"Dashboard\".\n2. Überprüfen Sie die KPIs.\n3. Klicken Sie auf Tabs für Details.\n4. Überprüfen Sie das Sicherheitsbanner.",stepsTitle:"🚀 Erste Schritte — 10 Schritte",tabsTitle:"📋 Tab-Referenz",featuresTitle:"✨ Hauptfunktionen",tipsTitle:"Expertentipps",faqTitle:"FAQ",readyTitle:"🎉 Bereit zum Start!",readyDesc:"Klicken Sie auf den Übersicht-Tab."},
  marketing:{mktTabOverview:"Übersicht",mktTabAdStatus:"Anzeigenstatus",mktTabCreative:"Kreativ",mktTabCompare:"Vergleich",mktTabAiDesign:"AI-Design",mktTabGuide:"Anleitung",guideTitle:"Marketing-Automatisierung",autoTab4:"Anleitung"},
  adPerf:{tabAdStatus:"Anzeigenstatus",tabCreative:"Kreativ",tabCompare:"Vergleich",tabAiDesign:"AI-Design",tabGuide:"Anleitung"},
},
es: {
  dashTabs:{guide:"Guía",guideDesc:"Guía de usuario"},
  dashGuide:{title:"Guía del Panel",subtitle:"Aprenda todas las funciones paso a paso.",beginnerBadge:"Principiante",timeBadge:"5 min",langBadge:"15 idiomas",whereToStart:"¿Por dónde empiezo?",stepsTitle:"🚀 Primeros pasos — 10 pasos",tabsTitle:"📋 Referencia por pestaña",featuresTitle:"✨ Características",tipsTitle:"Consejos",faqTitle:"Preguntas frecuentes",readyTitle:"🎉 ¡Listo para empezar!"},
  marketing:{mktTabOverview:"Resumen",mktTabAdStatus:"Estado de anuncios",mktTabCreative:"Creativos",mktTabCompare:"Comparar",mktTabAiDesign:"Diseño AI",mktTabGuide:"Guía",autoTab4:"Guía"},
  adPerf:{tabAdStatus:"Estado",tabCreative:"Creativos",tabCompare:"Comparar",tabAiDesign:"Diseño AI",tabGuide:"Guía"},
},
fr: {
  dashTabs:{guide:"Guide",guideDesc:"Guide utilisateur"},
  dashGuide:{title:"Guide du Tableau de Bord",subtitle:"Apprenez toutes les fonctionnalités étape par étape.",beginnerBadge:"Débutant",timeBadge:"5 min",langBadge:"15 langues",whereToStart:"Par où commencer ?",stepsTitle:"🚀 Premiers pas — 10 étapes",tabsTitle:"📋 Référence par onglet",featuresTitle:"✨ Fonctionnalités",tipsTitle:"Conseils",faqTitle:"FAQ",readyTitle:"🎉 Prêt à commencer !"},
  marketing:{mktTabOverview:"Aperçu",mktTabAdStatus:"État des annonces",mktTabCreative:"Créatifs",mktTabCompare:"Comparer",mktTabAiDesign:"Design AI",mktTabGuide:"Guide",autoTab4:"Guide"},
  adPerf:{tabAdStatus:"État",tabCreative:"Créatifs",tabCompare:"Comparer",tabAiDesign:"Design AI",tabGuide:"Guide"},
},
zh: {
  dashTabs:{guide:"使用指南",guideDesc:"用户指南"},
  dashGuide:{title:"仪表盘使用指南",subtitle:"逐步了解仪表盘的所有功能。",beginnerBadge:"入门指南",timeBadge:"5分钟",langBadge:"15种语言",whereToStart:"从哪里开始？",stepsTitle:"🚀 入门 — 10个步骤",tabsTitle:"📋 标签参考",featuresTitle:"✨ 主要功能",tipsTitle:"专家提示",faqTitle:"常见问题",readyTitle:"🎉 准备开始！"},
  marketing:{mktTabOverview:"概览",mktTabAdStatus:"广告状态",mktTabCreative:"创意",mktTabCompare:"对比",mktTabAiDesign:"AI设计",mktTabGuide:"指南",autoTab4:"使用指南"},
  adPerf:{tabAdStatus:"广告状态",tabCreative:"创意",tabCompare:"对比",tabAiDesign:"AI设计",tabGuide:"指南"},
},
"zh-TW": {
  dashTabs:{guide:"使用指南",guideDesc:"使用者指南"},
  dashGuide:{title:"儀表板使用指南",subtitle:"逐步了解儀表板的所有功能。",beginnerBadge:"入門指南",timeBadge:"5分鐘",langBadge:"15種語言",whereToStart:"從哪裡開始？",stepsTitle:"🚀 入門 — 10個步驟",tabsTitle:"📋 標籤參考",featuresTitle:"✨ 主要功能",tipsTitle:"專家提示",faqTitle:"常見問題",readyTitle:"🎉 準備開始！"},
  marketing:{mktTabOverview:"概覽",mktTabAdStatus:"廣告狀態",mktTabCreative:"創意",mktTabCompare:"比較",mktTabAiDesign:"AI設計",mktTabGuide:"指南",autoTab4:"使用指南"},
},
vi: {
  dashTabs:{guide:"Hướng dẫn",guideDesc:"Hướng dẫn sử dụng"},
  dashGuide:{title:"Hướng dẫn Bảng điều khiển",subtitle:"Tìm hiểu tất cả tính năng từng bước.",beginnerBadge:"Người mới",timeBadge:"5 phút",langBadge:"15 ngôn ngữ",whereToStart:"Bắt đầu từ đâu?",stepsTitle:"🚀 Bắt đầu — 10 bước",tabsTitle:"📋 Tham khảo tab",featuresTitle:"✨ Tính năng chính",tipsTitle:"Mẹo",faqTitle:"Câu hỏi thường gặp",readyTitle:"🎉 Sẵn sàng!"},
  marketing:{mktTabOverview:"Tổng quan",mktTabAdStatus:"Trạng thái QC",mktTabCreative:"Sáng tạo",mktTabCompare:"So sánh",mktTabAiDesign:"Thiết kế AI",mktTabGuide:"Hướng dẫn",autoTab4:"Hướng dẫn"},
},
th: {
  dashTabs:{guide:"คู่มือ",guideDesc:"คู่มือการใช้งาน"},
  dashGuide:{title:"คู่มือแดชบอร์ด",subtitle:"เรียนรู้ฟีเจอร์ทั้งหมดทีละขั้นตอน",beginnerBadge:"มือใหม่",timeBadge:"5 นาที",langBadge:"15 ภาษา",whereToStart:"เริ่มต้นที่ไหน?",stepsTitle:"🚀 เริ่มต้น — 10 ขั้นตอน",tabsTitle:"📋 อ้างอิงแท็บ",featuresTitle:"✨ ฟีเจอร์หลัก",tipsTitle:"เคล็ดลับ",faqTitle:"คำถามที่พบบ่อย",readyTitle:"🎉 พร้อมเริ่ม!"},
  marketing:{mktTabOverview:"ภาพรวม",mktTabAdStatus:"สถานะโฆษณา",mktTabCreative:"ครีเอทีฟ",mktTabCompare:"เปรียบเทียบ",mktTabAiDesign:"ออกแบบ AI",mktTabGuide:"คู่มือ",autoTab4:"คู่มือ"},
},
id: {
  dashTabs:{guide:"Panduan",guideDesc:"Panduan pengguna"},
  dashGuide:{title:"Panduan Dashboard",subtitle:"Pelajari semua fitur langkah demi langkah.",beginnerBadge:"Pemula",timeBadge:"5 menit",langBadge:"15 bahasa",whereToStart:"Mulai dari mana?",stepsTitle:"🚀 Memulai — 10 Langkah",tabsTitle:"📋 Referensi Tab",featuresTitle:"✨ Fitur Utama",tipsTitle:"Tips",faqTitle:"FAQ",readyTitle:"🎉 Siap Mulai!"},
  marketing:{mktTabOverview:"Ringkasan",mktTabAdStatus:"Status Iklan",mktTabCreative:"Kreatif",mktTabCompare:"Bandingkan",mktTabAiDesign:"Desain AI",mktTabGuide:"Panduan",autoTab4:"Panduan"},
},
pt: {
  dashTabs:{overview:"Resumo Geral",marketing:"Desempenho de Marketing",channel:"KPI de Canal",commerce:"Comércio",sales:"Vendas Globais",influencer:"Influenciador",system:"Status do Sistema",guide:"Guia",guideDesc:"Guia do usuário"},
  tabs:{overview:"Resumo Geral",marketing:"Marketing",channel:"KPI de Canal",commerce:"Comércio",sales:"Vendas Globais",influencer:"Influenciador",system:"Sistema"},
  dashGuide:{title:"Guia do Painel",subtitle:"Aprenda todas as funcionalidades passo a passo.",beginnerBadge:"Iniciante",timeBadge:"5 min",langBadge:"15 idiomas",whereToStart:"Por onde começar?",stepsTitle:"🚀 Primeiros passos",tabsTitle:"📋 Referência",featuresTitle:"✨ Recursos",tipsTitle:"Dicas",faqTitle:"FAQ",readyTitle:"🎉 Pronto!"},
  marketing:{mktTabOverview:"Visão geral",mktTabAdStatus:"Status",mktTabCreative:"Criativos",mktTabCompare:"Comparar",mktTabAiDesign:"Design AI",mktTabGuide:"Guia",autoTab4:"Guia"},
},
ru: {
  dashTabs:{overview:"Обзор",marketing:"Маркетинг",channel:"KPI каналов",commerce:"Коммерция",sales:"Глобальные продажи",influencer:"Инфлюенсеры",system:"Система",guide:"Руководство",guideDesc:"Руководство пользователя"},
  tabs:{overview:"Обзор",marketing:"Маркетинг",channel:"KPI каналов",commerce:"Коммерция",sales:"Продажи",influencer:"Инфлюенсеры",system:"Система"},
  dashGuide:{title:"Руководство по панели",subtitle:"Изучите все функции шаг за шагом.",beginnerBadge:"Начинающий",timeBadge:"5 мин",langBadge:"15 языков",whereToStart:"С чего начать?",stepsTitle:"🚀 Начало работы",tabsTitle:"📋 Справочник",featuresTitle:"✨ Возможности",tipsTitle:"Советы",faqTitle:"FAQ",readyTitle:"🎉 Готово!"},
  marketing:{mktTabOverview:"Обзор",mktTabAdStatus:"Статус рекламы",mktTabCreative:"Креативы",mktTabCompare:"Сравнение",mktTabAiDesign:"AI-дизайн",mktTabGuide:"Руководство",autoTab4:"Руководство"},
},
hi: {
  dashTabs:{overview:"सारांश",marketing:"मार्केटिंग",channel:"चैनल KPI",commerce:"कॉमर्स",sales:"वैश्विक बिक्री",influencer:"इन्फ्लुएंसर",system:"सिस्टम",guide:"गाइड",guideDesc:"उपयोगकर्ता गाइड"},
  tabs:{overview:"सारांश",marketing:"मार्केटिंग",channel:"चैनल KPI",commerce:"कॉमर्स",sales:"बिक्री",influencer:"इन्फ्लुएंसर",system:"सिस्टम"},
  dashGuide:{title:"डैशबोर्ड गाइड",subtitle:"सभी सुविधाएं चरण दर चरण सीखें।",beginnerBadge:"शुरुआती",timeBadge:"5 मिनट",langBadge:"15 भाषाएं",whereToStart:"कहाँ से शुरू करें?",stepsTitle:"🚀 शुरुआत",tabsTitle:"📋 टैब संदर्भ",featuresTitle:"✨ मुख्य विशेषताएं",tipsTitle:"सुझाव",faqTitle:"FAQ",readyTitle:"🎉 तैयार!"},
  marketing:{mktTabOverview:"अवलोकन",mktTabAdStatus:"विज्ञापन स्थिति",mktTabCreative:"क्रिएटिव",mktTabCompare:"तुलना",mktTabAiDesign:"AI डिज़ाइन",mktTabGuide:"गाइड",autoTab4:"गाइड"},
},
};

for(const[lang,sections]of Object.entries(translations)){
  const f=`${dir}/${lang}.js`;
  if(!fs.existsSync(f))continue;
  const c=fs.readFileSync(f,'utf8');
  const M={e:null};
  try{vm.runInNewContext(c.replace(/^export\s+default\s+/,'M.e='),{M});}catch(e){console.log('❌ '+lang);continue;}
  const d=M.e;
  for(const[section,keys]of Object.entries(sections)){
    if(!d[section])d[section]={};
    for(const[k,v]of Object.entries(keys)){
      d[section][k]=v; // Overwrite with native translation
    }
  }
  const out=`export default ${JSON.stringify(d,null,2)};\n`;
  fs.writeFileSync(f,out,'utf8');
  console.log('✅ '+lang+'.js updated');
}

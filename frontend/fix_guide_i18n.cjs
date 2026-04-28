const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
// Direct fix for marketing sub-tab keys that weren't replaced
const FIXES={
es:{tabGuide:"Guía de Uso",guideTitle:"Guía de Marketing y Rendimiento Publicitario",guideSub:"Guía completa desde la configuración hasta el despliegue",guideStepsTitle:"Guía paso a paso",guideTipsTitle:"Consejos profesionales",guideTabsTitle:"Descripción de pestañas",aiGuideTitle:"Motor Creativo de Diseño IA — Guía Completa",aiGuideSub:"Instrucciones paso a paso desde la configuración creativa hasta el despliegue multicanal",aiGuideStepsTitle:"Diseño IA — Flujo de trabajo paso a paso"},
fr:{tabGuide:"Guide d'utilisation",guideTitle:"Guide Marketing et Performance Publicitaire",guideSub:"Guide complet de la configuration au déploiement",guideStepsTitle:"Guide étape par étape",guideTipsTitle:"Conseils d'expert",guideTabsTitle:"Description des onglets",aiGuideTitle:"Moteur Créatif de Design IA — Guide Complet",aiGuideSub:"Instructions étape par étape de la configuration créative au déploiement multicanal",aiGuideStepsTitle:"Design IA — Flux de travail étape par étape"},
de:{tabGuide:"Nutzungsanleitung",guideTitle:"Marketing & Anzeigenleistung Leitfaden",guideSub:"Vollständiger Leitfaden von der Einrichtung bis zur Bereitstellung",guideStepsTitle:"Schritt-für-Schritt-Anleitung",guideTipsTitle:"Expertentipps",guideTabsTitle:"Tab-Beschreibungen",aiGuideTitle:"KI-Design Kreativmotor — Vollständiger Leitfaden",aiGuideSub:"Schritt-für-Schritt-Anleitung von der Kreativeinrichtung bis zur Mehrkanal-Bereitstellung",aiGuideStepsTitle:"KI-Design — Schritt-für-Schritt Workflow"},
th:{tabGuide:"คู่มือการใช้งาน",guideTitle:"คู่มือการตลาดและผลโฆษณา",guideSub:"คู่มือครบถ้วนตั้งแต่การตั้งค่าจนถึงการเผยแพร่",guideStepsTitle:"คู่มือทีละขั้น",guideTipsTitle:"เคล็ดลับผู้เชี่ยวชาญ",guideTabsTitle:"คำอธิบายแท็บ",aiGuideTitle:"เครื่องมือสร้างสรรค์ AI — คู่มือฉบับสมบูรณ์",aiGuideSub:"คำแนะนำทีละขั้นตั้งแต่การตั้งค่าจนถึงการเผยแพร่หลายช่องทาง",aiGuideStepsTitle:"การออกแบบ AI — ขั้นตอนการทำงาน"},
vi:{tabGuide:"Hướng dẫn sử dụng",guideTitle:"Hướng dẫn Marketing & Hiệu suất QC",guideSub:"Hướng dẫn đầy đủ từ thiết lập đến triển khai",guideStepsTitle:"Hướng dẫn từng bước",guideTipsTitle:"Mẹo chuyên gia",guideTabsTitle:"Mô tả tab",aiGuideTitle:"Công cụ Thiết kế AI — Hướng dẫn Đầy đủ",aiGuideSub:"Hướng dẫn từng bước từ thiết lập sáng tạo đến triển khai đa kênh",aiGuideStepsTitle:"Thiết kế AI — Quy trình từng bước"},
id:{tabGuide:"Panduan Penggunaan",guideTitle:"Panduan Marketing & Performa Iklan",guideSub:"Panduan lengkap dari pengaturan hingga penerapan",guideStepsTitle:"Panduan langkah demi langkah",guideTipsTitle:"Tips ahli",guideTabsTitle:"Deskripsi tab",aiGuideTitle:"Mesin Kreatif Desain AI — Panduan Lengkap",aiGuideSub:"Instruksi langkah demi langkah dari pengaturan kreatif hingga penerapan multi-saluran",aiGuideStepsTitle:"Desain AI — Alur kerja langkah demi langkah"},
pt:{tabGuide:"Guia de Uso",guideTitle:"Guia de Marketing e Desempenho de Anúncios",guideSub:"Guia completo da configuração à implantação",guideStepsTitle:"Guia passo a passo",guideTipsTitle:"Dicas de especialista",guideTabsTitle:"Descrição das abas",aiGuideTitle:"Motor Criativo de Design IA — Guia Completo",aiGuideSub:"Instruções passo a passo da configuração criativa à implantação multicanal",aiGuideStepsTitle:"Design IA — Fluxo de trabalho passo a passo"},
ru:{tabGuide:"Руководство",guideTitle:"Руководство по маркетингу и эффективности рекламы",guideSub:"Полное руководство от настройки до развертывания",guideStepsTitle:"Пошаговое руководство",guideTipsTitle:"Советы экспертов",guideTabsTitle:"Описание вкладок",aiGuideTitle:"Движок ИИ-дизайна — Полное руководство",aiGuideSub:"Пошаговые инструкции от настройки креатива до многоканального развертывания",aiGuideStepsTitle:"ИИ-дизайн — Пошаговый рабочий процесс"},
ar:{tabGuide:"دليل الاستخدام",guideTitle:"دليل التسويق وأداء الإعلانات",guideSub:"دليل شامل من الإعداد إلى النشر",guideStepsTitle:"دليل خطوة بخطوة",guideTipsTitle:"نصائح الخبراء",guideTabsTitle:"وصف علامات التبويب",aiGuideTitle:"محرك التصميم الإبداعي بالذكاء الاصطناعي — دليل كامل",aiGuideSub:"تعليمات خطوة بخطوة من إعداد الإبداع إلى النشر متعدد القنوات",aiGuideStepsTitle:"التصميم بالذكاء الاصطناعي — سير العمل خطوة بخطوة"},
hi:{tabGuide:"उपयोग गाइड",guideTitle:"मार्केटिंग और विज्ञापन प्रदर्शन गाइड",guideSub:"सेटअप से डिप्लॉयमेंट तक पूरी गाइड",guideStepsTitle:"चरण-दर-चरण गाइड",guideTipsTitle:"विशेषज्ञ सुझाव",guideTabsTitle:"टैब विवरण",aiGuideTitle:"AI डिज़ाइन क्रिएटिव इंजन — पूर्ण गाइड",aiGuideSub:"क्रिएटिव सेटअप से मल्टी-चैनल डिप्लॉयमेंट तक चरण-दर-चरण निर्देश",aiGuideStepsTitle:"AI डिज़ाइन — चरण-दर-चरण वर्कफ़्लो"},
"zh-TW":{tabGuide:"使用指南",guideTitle:"行銷與廣告績效指南",guideSub:"從設定到部署的完整指南",guideStepsTitle:"逐步指南",guideTipsTitle:"專家建議",guideTabsTitle:"標籤說明",aiGuideTitle:"AI設計創意引擎 — 完整指南",aiGuideSub:"從創意設定到多渠道部署的逐步說明",aiGuideStepsTitle:"AI設計 — 逐步工作流程"},
};
const LANGS=Object.keys(FIXES);
let total=0;
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  let cnt=0;
  const keys=FIXES[lang];
  // Find marketing namespace boundaries
  const mktMatch=src.match(/"marketing"\s*:\s*\{/);
  if(!mktMatch)return;
  const mktStart=mktMatch.index+mktMatch[0].length;
  let depth=1,pos=mktStart;
  while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
  const mktEnd=pos-1;
  let mktContent=src.substring(mktStart,mktEnd);
  Object.entries(keys).forEach(([k,v])=>{
    const esc=v.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const re=new RegExp('"'+k+'"\\s*:\\s*"[^"]*"');
    if(re.test(mktContent)){
      mktContent=mktContent.replace(re,'"'+k+'":"'+esc+'"');
      cnt++;
    } else {
      mktContent='"'+k+'":"'+esc+'",'+mktContent;
      cnt++;
    }
  });
  src=src.substring(0,mktStart)+mktContent+src.substring(mktEnd);
  if(cnt>0){fs.writeFileSync(file,src,'utf8');console.log('✅ '+lang+': '+cnt);total+=cnt;}
});
console.log('🎯 Total: '+total);

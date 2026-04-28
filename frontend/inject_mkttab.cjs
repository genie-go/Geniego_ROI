const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const KEYS={
ko:{mktTabOverview:"성과 개요",mktTabAdStatus:"매체별 상세",mktTabCreative:"캠페인 설정",mktTabCompare:"캠페인 비교",mktTabAiDesign:"AI 디자인",mktTabGuide:"이용 가이드"},
en:{mktTabOverview:"Overview",mktTabAdStatus:"Ad Status",mktTabCreative:"Creative",mktTabCompare:"Compare",mktTabAiDesign:"AI Design",mktTabGuide:"Usage Guide"},
ja:{mktTabOverview:"概要",mktTabAdStatus:"広告状況",mktTabCreative:"クリエイティブ",mktTabCompare:"比較",mktTabAiDesign:"AIデザイン",mktTabGuide:"利用ガイド"},
zh:{mktTabOverview:"概览",mktTabAdStatus:"广告状态",mktTabCreative:"创意",mktTabCompare:"比较",mktTabAiDesign:"AI设计",mktTabGuide:"使用指南"},
"zh-TW":{mktTabOverview:"概覽",mktTabAdStatus:"廣告狀態",mktTabCreative:"創意",mktTabCompare:"比較",mktTabAiDesign:"AI設計",mktTabGuide:"使用指南"},
es:{mktTabOverview:"Resumen",mktTabAdStatus:"Estado de Anuncios",mktTabCreative:"Creativo",mktTabCompare:"Comparar",mktTabAiDesign:"Diseño IA",mktTabGuide:"Guía de Uso"},
fr:{mktTabOverview:"Aperçu",mktTabAdStatus:"État des Annonces",mktTabCreative:"Créatif",mktTabCompare:"Comparer",mktTabAiDesign:"Design IA",mktTabGuide:"Guide"},
de:{mktTabOverview:"Übersicht",mktTabAdStatus:"Anzeigenstatus",mktTabCreative:"Kreativ",mktTabCompare:"Vergleich",mktTabAiDesign:"KI-Design",mktTabGuide:"Anleitung"},
th:{mktTabOverview:"ภาพรวม",mktTabAdStatus:"สถานะโฆษณา",mktTabCreative:"ครีเอทีฟ",mktTabCompare:"เปรียบเทียบ",mktTabAiDesign:"ออกแบบ AI",mktTabGuide:"คู่มือ"},
vi:{mktTabOverview:"Tổng quan",mktTabAdStatus:"Trạng thái QC",mktTabCreative:"Sáng tạo",mktTabCompare:"So sánh",mktTabAiDesign:"Thiết kế AI",mktTabGuide:"Hướng dẫn"},
id:{mktTabOverview:"Ikhtisar",mktTabAdStatus:"Status Iklan",mktTabCreative:"Kreatif",mktTabCompare:"Bandingkan",mktTabAiDesign:"Desain AI",mktTabGuide:"Panduan"},
pt:{mktTabOverview:"Visão Geral",mktTabAdStatus:"Status de Anúncios",mktTabCreative:"Criativo",mktTabCompare:"Comparar",mktTabAiDesign:"Design IA",mktTabGuide:"Guia"},
ru:{mktTabOverview:"Обзор",mktTabAdStatus:"Статус рекламы",mktTabCreative:"Креатив",mktTabCompare:"Сравнение",mktTabAiDesign:"ИИ-дизайн",mktTabGuide:"Руководство"},
ar:{mktTabOverview:"نظرة عامة",mktTabAdStatus:"حالة الإعلانات",mktTabCreative:"الإبداعي",mktTabCompare:"مقارنة",mktTabAiDesign:"تصميم بالذكاء الاصطناعي",mktTabGuide:"دليل الاستخدام"},
hi:{mktTabOverview:"अवलोकन",mktTabAdStatus:"विज्ञापन स्थिति",mktTabCreative:"क्रिएटिव",mktTabCompare:"तुलना",mktTabAiDesign:"AI डिज़ाइन",mktTabGuide:"उपयोग गाइड"},
};
let total=0;
Object.entries(KEYS).forEach(([lang,keys])=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const m=src.match(/"marketing"\s*:\s*\{/);
  if(!m)return;
  const idx=m.index+m[0].length;
  let entries='';
  Object.entries(keys).forEach(([k,v])=>{
    if(!src.includes('"'+k+'"')){
      entries+='"'+k+'":"'+v.replace(/"/g,'\\"')+'",';
    }
  });
  if(entries){
    src=src.slice(0,idx)+entries+src.slice(idx);
    fs.writeFileSync(file,src,'utf8');
    const cnt=entries.split('","').length;
    console.log('✅ '+lang+': '+cnt);
    total+=cnt;
  }
});
console.log('🎯 Total: '+total);

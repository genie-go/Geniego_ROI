/**
 * Fix all autoTab1-4 keys in ko.js and all 13 locale files
 * Replace every occurrence with correct labels
 */
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/i18n/locales');

// Correct values per language
const CORRECT = {
  ko: {
    autoTab1: '① 크리에이티브 스튜디오',
    autoTab2: '② 캠페인 설정',
    autoTab3: '③ AI 전략 미리보기',
    autoTab4: '④ 이용 가이드',
  },
  en: {
    autoTab1: '① Creative Studio',
    autoTab2: '② Campaign Setup',
    autoTab3: '③ AI Strategy Preview',
    autoTab4: '④ Usage Guide',
  },
  ja: {
    autoTab1: '① クリエイティブスタジオ',
    autoTab2: '② キャンペーン設定',
    autoTab3: '③ AI戦略プレビュー',
    autoTab4: '④ 利用ガイド',
  },
  zh: {
    autoTab1: '① 创意工作室',
    autoTab2: '② 广告活动设置',
    autoTab3: '③ AI策略预览',
    autoTab4: '④ 使用指南',
  },
  'zh-TW': {
    autoTab1: '① 創意工作室',
    autoTab2: '② 廣告活動設定',
    autoTab3: '③ AI策略預覽',
    autoTab4: '④ 使用指南',
  },
  de: {
    autoTab1: '① Creative Studio',
    autoTab2: '② Kampagnen-Setup',
    autoTab3: '③ KI-Strategie Vorschau',
    autoTab4: '④ Benutzerhandbuch',
  },
  es: {
    autoTab1: '① Estudio Creativo',
    autoTab2: '② Configuración de Campaña',
    autoTab3: '③ Vista Previa Estrategia IA',
    autoTab4: '④ Guía de Uso',
  },
  fr: {
    autoTab1: '① Studio Créatif',
    autoTab2: '② Config. Campagne',
    autoTab3: '③ Aperçu Stratégie IA',
    autoTab4: '④ Guide',
  },
  pt: {
    autoTab1: '① Estúdio Criativo',
    autoTab2: '② Configuração de Campanha',
    autoTab3: '③ Prévia da Estratégia IA',
    autoTab4: '④ Guia de Uso',
  },
  ru: {
    autoTab1: '① Креативная студия',
    autoTab2: '② Настройка кампании',
    autoTab3: '③ Предпросмотр стратегии ИИ',
    autoTab4: '④ Руководство',
  },
  ar: {
    autoTab1: '① استوديو الإبداع',
    autoTab2: '② إعداد الحملة',
    autoTab3: '③ معاينة استراتيجية الذكاء',
    autoTab4: '④ دليل الاستخدام',
  },
  hi: {
    autoTab1: '① क्रिएटिव स्टूडियो',
    autoTab2: '② अभियान सेटअप',
    autoTab3: '③ AI रणनीति पूर्वावलोकन',
    autoTab4: '④ उपयोग गाइड',
  },
  th: {
    autoTab1: '① สตูดิโอสร้างสรรค์',
    autoTab2: '② ตั้งค่าแคมเปญ',
    autoTab3: '③ ดูตัวอย่างกลยุทธ์ AI',
    autoTab4: '④ คู่มือการใช้งาน',
  },
  vi: {
    autoTab1: '① Studio Sáng tạo',
    autoTab2: '② Thiết lập Chiến dịch',
    autoTab3: '③ Xem trước Chiến lược AI',
    autoTab4: '④ Hướng dẫn Sử dụng',
  },
  id: {
    autoTab1: '① Studio Kreatif',
    autoTab2: '② Pengaturan Kampanye',
    autoTab3: '③ Pratinjau Strategi AI',
    autoTab4: '④ Panduan Penggunaan',
  },
};

let totalFixed = 0;
Object.entries(CORRECT).forEach(([lang, tabs]) => {
  const fp = path.join(dir, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  let src = fs.readFileSync(fp, 'utf8');
  let count = 0;

  Object.entries(tabs).forEach(([key, correctVal]) => {
    // Replace ALL occurrences of this key with correct value
    const regex = new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, 'g');
    const matches = [...src.matchAll(regex)];
    if (matches.length > 0) {
      src = src.replace(regex, `"${key}": "${correctVal}"`);
      count += matches.length;
    }
  });

  if (count > 0) {
    fs.writeFileSync(fp, src, 'utf8');
    totalFixed += count;
    console.log(`${lang}: fixed ${count} autoTab occurrences`);
  } else {
    console.log(`${lang}: no changes needed`);
  }
});

console.log(`\nTotal: ${totalFixed} fixes applied`);

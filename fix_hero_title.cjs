const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const HERO = {
  ko: {heroTitle:"리뷰 & UGC",heroDesc:"채널별 리뷰 데이터와 AI 감성 분석 · 자동 답변 초안 · 부정 리뷰 CS 에스컬레이션"},
  en: {heroTitle:"Reviews & UGC",heroDesc:"Channel review data & AI sentiment analysis · Auto reply drafts · Negative review CS escalation"},
  ja: {heroTitle:"レビュー & UGC",heroDesc:"チャネルレビューとAI感情分析 · 自動返信 · CSエスカレーション"},
  zh: {heroTitle:"评论 & UGC",heroDesc:"渠道评论和AI情感分析 · 自动回复 · CS升级"},
  "zh-TW": {heroTitle:"評論 & UGC",heroDesc:"頻道評論和AI情感分析 · 自動回覆 · CS升級"},
  de: {heroTitle:"Bewertungen & UGC",heroDesc:"Kanalbewertungen und KI-Analyse · Auto-Antworten · CS-Eskalation"},
  th: {heroTitle:"รีวิว & UGC",heroDesc:"รีวิวช่องและ AI วิเคราะห์ · ร่างตอบอัตโนมัติ · ยกระดับ CS"},
  vi: {heroTitle:"Đánh giá & UGC",heroDesc:"Đánh giá kênh và phân tích AI · Trả lời tự động · Nâng cấp CS"},
  id: {heroTitle:"Ulasan & UGC",heroDesc:"Ulasan saluran dan analisis AI · Balasan otomatis · Eskalasi CS"},
};

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const h = HERO[lang] || HERO.en;
  
  // Find the heroTitle key inside reviews block and replace its value
  // Match pattern: heroTitle:"<any content until next quote>"
  // Use a more robust approach - find heroTitle:" then scan to closing "
  let idx = code.indexOf('reviews:{');
  if (idx < 0) { console.log(`${lang}: no reviews block`); return; }
  
  // Find heroTitle: within the reviews block
  const heroIdx = code.indexOf('heroTitle:', idx);
  if (heroIdx < 0) { console.log(`${lang}: no heroTitle key`); return; }
  
  // Find the opening quote
  const openQuote = code.indexOf('"', heroIdx + 10);
  if (openQuote < 0) { console.log(`${lang}: no opening quote for heroTitle`); return; }
  
  // Find the closing quote (handle escaped quotes)
  let closeQuote = -1;
  for (let i = openQuote + 1; i < code.length; i++) {
    if (code[i] === '\\') { i++; continue; }
    if (code[i] === '"') { closeQuote = i; break; }
  }
  if (closeQuote < 0) { console.log(`${lang}: no closing quote for heroTitle`); return; }
  
  const oldValue = code.substring(openQuote + 1, closeQuote);
  code = code.substring(0, openQuote + 1) + h.heroTitle + code.substring(closeQuote);
  
  // Same for heroDesc
  const descIdx = code.indexOf('heroDesc:', idx);
  if (descIdx > 0) {
    const dOpenQuote = code.indexOf('"', descIdx + 9);
    if (dOpenQuote > 0) {
      let dCloseQuote = -1;
      for (let i = dOpenQuote + 1; i < code.length; i++) {
        if (code[i] === '\\') { i++; continue; }
        if (code[i] === '"') { dCloseQuote = i; break; }
      }
      if (dCloseQuote > 0) {
        code = code.substring(0, dOpenQuote + 1) + h.heroDesc + code.substring(dCloseQuote);
      }
    }
  }
  
  fs.writeFileSync(file, code, 'utf8');
  
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const obj = fn();
    console.log(`✅ ${lang}: heroTitle="${obj.reviews?.heroTitle}"`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});

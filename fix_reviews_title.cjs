/**
 * Fix reviewsUgc page title in all locale files - currently shows "Email Marketing" instead of "Reviews & UGC"
 * Also add root_pageTitle_reviewsUgc key
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const TITLES = {
  ko: {title:"리뷰 & UGC", sub:"채널별 리뷰 분석 · AI 감성 분석 · 자동 답변 · CS 에스컬레이션"},
  en: {title:"Reviews & UGC", sub:"Channel reviews · AI sentiment analysis · Auto replies · CS escalation"},
  ja: {title:"レビュー & UGC", sub:"チャネル別レビュー · AI感情分析 · 自動返信 · CSエスカレーション"},
  zh: {title:"评论 & UGC", sub:"渠道评论 · AI情感分析 · 自动回复 · CS升级"},
  "zh-TW": {title:"評論 & UGC", sub:"頻道評論 · AI情感分析 · 自動回覆 · CS升級"},
  de: {title:"Bewertungen & UGC", sub:"Kanalbewertungen · KI-Stimmungsanalyse · Auto-Antworten"},
  th: {title:"รีวิว & UGC", sub:"รีวิวช่อง · วิเคราะห์ AI · ตอบอัตโนมัติ"},
  vi: {title:"Đánh giá & UGC", sub:"Đánh giá kênh · Phân tích AI · Trả lời tự động"},
  id: {title:"Ulasan & UGC", sub:"Ulasan saluran · Analisis AI · Balasan otomatis"},
};

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const t = TITLES[lang] || TITLES.en;
  
  // Fix pages.reviewsUgc.title
  // Find: reviewsUgc:{title:"...",sub:"..."}
  const pattern = /reviewsUgc:\{title:"[^"]*",sub:"[^"]*"\}/;
  if (pattern.test(code)) {
    code = code.replace(pattern, `reviewsUgc:{title:"${t.title}",sub:"${t.sub}"}`);
    console.log(`${lang}: Fixed pages.reviewsUgc.title`);
  } else {
    console.log(`${lang}: reviewsUgc pattern not found, checking alternative...`);
    // Try separate search
    const oldTitle = code.match(/reviewsUgc:\{title:"([^"]*)"/);
    if (oldTitle) {
      console.log(`  Current title: "${oldTitle[1]}"`);
    }
  }
  
  // Add root_pageTitle_reviewsUgc
  if (!code.includes('root_pageTitle_reviewsUgc:')) {
    const lastBrace = code.lastIndexOf('}');
    code = code.substring(0, lastBrace) + `,root_pageTitle_reviewsUgc:"${t.title}"` + code.substring(lastBrace);
    console.log(`${lang}: Added root_pageTitle_reviewsUgc`);
  }
  
  fs.writeFileSync(file, code, 'utf8');
  
  // Verify
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const obj = fn();
    console.log(`  => reviewsUgc.title="${obj.pages?.reviewsUgc?.title}", root="${obj.root_pageTitle_reviewsUgc}"`);
  } catch (e) {
    console.log(`  => ERROR: ${e.message.substring(0, 80)}`);
  }
});

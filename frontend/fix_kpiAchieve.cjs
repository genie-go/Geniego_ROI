/**
 * fix_kpiAchieve.cjs — Fix kpiAchieve English fallback in 6 locale files
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const FIXES = {
  ar: 'إنجاز KPI',
  es: 'Logro KPI',
  fr: 'Réalisation KPI',
  pt: 'Alcance KPI',
  ru: 'Достижение KPI',
  hi: 'KPI उपलब्धि',
};

for (const [lang, val] of Object.entries(FIXES)) {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all occurrences of "Kpi Achieve" and "KPI Achieve" 
  content = content.replace(/"kpiAchieve": "Kpi Achieve"/g, `"kpiAchieve": "${val}"`);
  content = content.replace(/"kpiAchieve": "KPI Achieve"/g, `"kpiAchieve": "${val}"`);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${lang}.js`);
}

console.log('Done!');

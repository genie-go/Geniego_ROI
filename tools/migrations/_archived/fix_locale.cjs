/**
 * P0-2: Remove hardcoded 'ko-KR' locale — replace with dynamic LANG_LOCALE_MAP
 * ==============================================================================
 * 9 pages have hardcoded toLocaleString('ko-KR') or toLocaleDateString('ko-KR')
 */
const fs = require('fs');
const path = require('path');
const dir = 'frontend/src/pages';

const LOCALE_MAP_CODE = `
/* ── Enterprise Dynamic Locale Map ────────────────────── */
const LANG_LOCALE_MAP = {
  ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN', 'zh-TW':'zh-TW',
  de:'de-DE', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ru:'ru-RU',
  ar:'ar-SA', hi:'hi-IN', th:'th-TH', vi:'vi-VN', id:'id-ID'
};
`;

const targets = [
  'AIMarketingHub.jsx', 'AuthPage.jsx', 'AutoMarketing.jsx', 'CatalogSync.jsx',
  'CreativeStudio.jsx', 'JourneyBuilder.jsx', 'LicenseActivation.jsx',
  'OrderHub.jsx', 'PaymentSuccess.jsx',
];

let totalFixed = 0;

targets.forEach(file => {
  const fpath = path.join(dir, file);
  if (!fs.existsSync(fpath)) return;
  
  let c = fs.readFileSync(fpath, 'utf8');
  
  // Count instances before
  const before = (c.match(/['"]ko-KR['"]/g) || []).length;
  if (before === 0) { console.log(`SKIP ${file}: no ko-KR`); return; }
  
  // Check if lang context is available
  const hasLang = /lang|useI18n|language/.test(c);
  
  // Add LANG_LOCALE_MAP if not present
  if (!c.includes('LANG_LOCALE_MAP')) {
    // Insert after last import
    const lastImport = c.lastIndexOf('import ');
    const nextLine = c.indexOf('\n', lastImport);
    c = c.substring(0, nextLine + 1) + LOCALE_MAP_CODE + c.substring(nextLine + 1);
  }
  
  // Replace all 'ko-KR' with dynamic locale
  // Pattern: toLocaleString('ko-KR') → toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR')
  c = c.replace(/\.toLocaleString\(\s*['"]ko-KR['"]\s*/g, 
    '.toLocaleString(LANG_LOCALE_MAP[lang] || \'ko-KR\'');
  c = c.replace(/\.toLocaleDateString\(\s*['"]ko-KR['"]\s*/g, 
    '.toLocaleDateString(LANG_LOCALE_MAP[lang] || \'ko-KR\'');
  c = c.replace(/\.toLocaleTimeString\(\s*['"]ko-KR['"]\s*/g, 
    '.toLocaleTimeString(LANG_LOCALE_MAP[lang] || \'ko-KR\'');
  
  // If lang variable is not available, extract from useI18n
  if (!hasLang && /useI18n/.test(c)) {
    c = c.replace(
      /const\s*\{\s*t\s*\}\s*=\s*useI18n\(\)/,
      'const { t, lang } = useI18n()'
    );
  }
  
  const after = (c.match(/['"]ko-KR['"]/g) || []).length;
  
  fs.writeFileSync(fpath, c, 'utf8');
  totalFixed++;
  console.log(`FIXED ${file}: ${before} → ${after} (${before - after} replaced)`);
});

console.log(`\n=== TOTAL: ${totalFixed} files patched ===`);

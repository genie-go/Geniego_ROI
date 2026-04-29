/**
 * Fix: Move orphaned guide keys INTO marketing namespace
 * Problem: gf1Title etc exist in file but outside marketing:{} so t('marketing.gf1Title') fails
 * Solution: For each locale, eval the file, check if marketing.gf1Title is missing,
 *           if so find the key's value in the raw text and inject it inside marketing
 */
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/i18n/locales');

const GUIDE_KEYS = [
  'gf1Title','gf1Desc','gf2Title','gf2Desc','gf3Title','gf3Desc',
  'gf4Title','gf4Desc','gf5Title','gf5Desc','gf6Title','gf6Desc',
  'gf7Title','gf7Desc','gf8Title','gf8Desc','gf9Title','gf9Desc',
  'gf10Title','gf10Desc','gf11Title','gf11Desc','gf12Title','gf12Desc',
  'gf13Title','gf13Desc','gf14Title','gf14Desc','gf15Title','gf15Desc',
  'guidePhaseA','guidePhaseB','guidePhaseC','guidePhaseD','guidePhaseE',
  'guideFullTitle','guideFullSub',
  'guideTabCreativeName','guideTabCreativeDesc',
  'guideTabSetupName','guideTabSetupDesc',
  'guideTabPreviewName','guideTabPreviewDesc',
  'guideTabGuideName','guideTabGuideDesc',
  'guideTipsTitle','guideTip1','guideTip2','guideTip3','guideTip4','guideTip5',
  'guideTip6','guideTip7','guideTabsTitle','guideStartBtn',
];

const langs = ['ja','de','es','fr','th','vi','id'];
let totalFixed = 0;

langs.forEach(lang => {
  const fp = path.join(dir, `${lang}.js`);
  let src = fs.readFileSync(fp, 'utf8');

  // Parse the file to find which keys are missing from marketing
  let evalSrc = src.replace(/^export\s+default\s*/, '(').replace(/;\s*$/, ')');
  let obj;
  try { obj = eval(evalSrc); } catch(e) { console.log(`${lang}: PARSE ERROR`); return; }
  const mk = obj.marketing || {};

  // Find keys that are in file but NOT in marketing namespace
  const missingKeys = GUIDE_KEYS.filter(k => !mk[k]);
  if (missingKeys.length === 0) { console.log(`${lang}: all OK`); return; }

  // Extract values from raw text for missing keys
  const keysToInject = {};
  missingKeys.forEach(key => {
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
    const match = regex.exec(src);
    if (match) {
      keysToInject[key] = match[1]; // already escaped
    }
  });

  if (Object.keys(keysToInject).length === 0) {
    console.log(`${lang}: ${missingKeys.length} missing but no values found in file`);
    return;
  }

  // Inject into marketing namespace - find the last autoTab4 line and add after
  const autoTab4Regex = /"autoTab4"\s*:\s*"[^"]*"/g;
  let lastMatch = null;
  let m;
  while ((m = autoTab4Regex.exec(src)) !== null) { lastMatch = m; }

  if (!lastMatch) {
    // Try autoTab3
    const autoTab3Regex = /"autoTab3"\s*:\s*"[^"]*"/g;
    while ((m = autoTab3Regex.exec(src)) !== null) { lastMatch = m; }
  }

  if (!lastMatch) {
    console.log(`${lang}: cannot find injection point`);
    return;
  }

  // Find end of line after the match
  const afterIdx = lastMatch.index + lastMatch[0].length;
  let lineEnd = src.indexOf('\n', afterIdx);
  if (lineEnd < 0) lineEnd = src.length;

  // Build injection string
  const lines = Object.entries(keysToInject).map(([k, v]) => `    "${k}": "${v}",`);
  const injection = '\n' + lines.join('\n');

  src = src.substring(0, lineEnd) + injection + src.substring(lineEnd);

  fs.writeFileSync(fp, src, 'utf8');
  totalFixed += Object.keys(keysToInject).length;
  console.log(`${lang}: injected ${Object.keys(keysToInject).length} keys into marketing`);
});

console.log(`\nTotal: ${totalFixed} keys injected`);

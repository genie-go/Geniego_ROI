const fs = require('fs');
const path = require('path');
const LOCALES_DIR = 'src/i18n/locales';

// moreItems text per language
const MOREITEMS = {
  th: 'อีก {{count}} รายการ',
  vi: '+ {{count}} mục khác',
  id: '+ {{count}} lainnya',
  'zh-TW': '另外 {{count}} 項',
  ko: '외 {{count}}개',
  en: '+ {{count}} more',
  ja: '他 {{count}}件',
  zh: '另外 {{count}} 项',
  de: '+ {{count}} weitere',
};

const langs = ['th', 'vi', 'id', 'zh-TW', 'ko', 'en', 'ja', 'zh', 'de'];

for (const lang of langs) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fp)) continue;

  let c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');

  // Find the real export default line
  const exportIdx = lines.findIndex(l => l.trim().startsWith('export default'));
  if (exportIdx < 0) { console.log(`⚠ ${lang}: no export`); continue; }

  // Walk backwards from exportIdx to find LAST line with content (not empty/comment/damaged)
  let lastGoodIdx = exportIdx - 1;
  while (lastGoodIdx >= 0) {
    const t = lines[lastGoodIdx].trim();
    // A good ending line is: "});" or "};" or ends with ';' or the pricing section properly closed
    if (t === '' || t.startsWith('//') || t === 'export default ' + lang + ';' || t === `export default ${lang === 'zh-TW' ? 'zhTW' : lang};`) {
      lastGoodIdx--;
      continue;
    }
    // Damaged: Object.assign opening without closing
    if (t.match(/Object\.assign\(.*, \{$/) && !t.endsWith('});') && !t.endsWith('},')) {
      lastGoodIdx--;
      continue;
    }
    // Damaged: "var.key = {" without closing  
    if (t.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*\.[a-zA-Z].*=\s*\{$/) && !t.endsWith('};')) {
      lastGoodIdx--;
      continue;
    }
    // Found a good line
    break;
  }

  // Rebuild: lines 0..lastGoodIdx + moreItems line + export
  const varName = lang === 'zh-TW' ? 'zhTW' : lang;
  const moreText = MOREITEMS[lang] || '+ {{count}} more';

  const newLines = [
    ...lines.slice(0, lastGoodIdx + 1),
    '',
    `${varName}.pricing = ${varName}.pricing || {}; ${varName}.pricing.moreItems = "${moreText}";`,
    '',
    `export default ${varName};`,
    ''
  ];

  fs.writeFileSync(fp, newLines.join('\n'), 'utf8');
  console.log(`✅ ${lang}: rebuilt (lastGood=${lastGoodIdx}, export was=${exportIdx})`);
}

// Verify syntax
console.log('\n--- Syntax check ---');
langs.forEach(lang => {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  try {
    delete require.cache[require.resolve('./' + fp)];
    require('./' + fp);
    console.log(`✅ ${lang}: OK`);
  } catch(e) {
    console.log(`❌ ${lang}: ${e.message.slice(0, 80)}`);
  }
});

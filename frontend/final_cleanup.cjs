const fs = require('fs');

// Final cleanup: remove ALL broken additions from en.js and other locale files
// after "// ── PricingDetail & Compare i18n" comment or similar markers

const LOCALE_FILES = [
  { fp: 'src/i18n/locales/en.js', varName: 'en' },
  { fp: 'src/i18n/locales/ko.js', varName: 'ko' },
  { fp: 'src/i18n/locales/ja.js', varName: 'ja' },
  { fp: 'src/i18n/locales/zh.js', varName: 'zh' },
  { fp: 'src/i18n/locales/de.js', varName: 'de' },
  { fp: 'src/i18n/locales/th.js', varName: 'th' },
  { fp: 'src/i18n/locales/vi.js', varName: 'vi' },
  { fp: 'src/i18n/locales/id.js', varName: 'id' },
  { fp: 'src/i18n/locales/zh-TW.js', varName: 'zhTW' },
];

for (const { fp, varName } of LOCALE_FILES) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  
  // Remove everything from "// ── PricingDetail" comment to end, then add clean export
  const pdCommentIdx = c.indexOf('// ── PricingDetail');
  const exportIdx = c.indexOf(`\nexport default ${varName};`);
  const altExport = c.indexOf(`\nexport default ${varName};\n`);
  
  if (pdCommentIdx >= 0) {
    // Check if export is after PricingDetail comment
    const realExportIdx = c.lastIndexOf(`\nexport default ${varName}`);
    
    // Remove from pdCommentIdx to realExportIdx, keeping the export
    const before = c.slice(0, pdCommentIdx).trimEnd();
    const exportLine = `\nexport default ${varName};\n`;
    c = before + exportLine;
    
    // Fix any "en.pricing = en.pricing || {};" that got split
    // Add moreItems cleanly
    const moreItems = {
      en: '+ {{count}} more', ko: '외 {{count}}개', ja: '他 {{count}}件',
      zh: '另外 {{count}} 项', de: '+ {{count}} weitere', th: 'อีก {{count}} รายการ',
      vi: '+ {{count}} mục khác', id: '+ {{count}} lainnya', zhTW: '另外 {{count}} 項'
    };
    const mi = moreItems[varName] || moreItems.en;
    const moreItemsLine = `\n${varName}.pricing = ${varName}.pricing || {}; ${varName}.pricing.moreItems = "${mi}";\n`;
    c = c.replace(`\nexport default ${varName};\n`, moreItemsLine + `\nexport default ${varName};\n`);
    
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`✅ ${varName}: cleaned pricingDetail section`);
  } else {
    // Check for broken "en.pricing = en.pricing || {};" split across lines
    // Fix: "en.pricing = en.pricing || {};\n = \"...\""
    const brokenRegex = new RegExp(`(${varName}\\.pricing = ${varName}\\.pricing \\|\\| \\{\\};)\\s*\\n\\s*=\\s*`, 'g');
    if (brokenRegex.test(c)) {
      c = c.replace(brokenRegex, `${varName}.pricing = ${varName}.pricing || {}; ${varName}.pricing.moreItems = `);
      fs.writeFileSync(fp, c, 'utf8');
      console.log(`✅ ${varName}: fixed broken moreItems line`);
    } else {
      console.log(`⏭ ${varName}: no issues found`);
    }
  }
  
  // Test syntax
  try {
    delete require.cache[require.resolve('./' + fp)];
    require('./' + fp);
    console.log(`  ✓ syntax OK`);
  } catch(e) {
    console.log(`  ✗ SYNTAX ERROR: ${e.message.slice(0, 80)}`);
  }
}

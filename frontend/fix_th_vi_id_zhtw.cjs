const fs = require('fs');
const path = require('path');

const LANG_CONF = [
  { lang: 'th', varName: 'th', moreItems: 'อีก {{count}} รายการ' },
  { lang: 'vi', varName: 'vi', moreItems: '+ {{count}} mục khác' },
  { lang: 'id', varName: 'id', moreItems: '+ {{count}} lainnya' },
  { lang: 'zh-TW', varName: 'zhTW', moreItems: '另外 {{count}} 項' },
];

for (const { lang, varName, moreItems } of LANG_CONF) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join('src/i18n/locales', fname);
  if (!fs.existsSync(fp)) continue;

  let c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');

  // Remove ALL lines that:
  // 1. Are the unclosed Object.assign for pricing: "varName.pricing = Object.assign(..."
  // 2. Are duplicate moreItems lines
  // 3. Are the comment lines we added (PricingDetail uses English fallback...)
  // 4. Are the export default line (we'll re-add it correctly)

  // Find export default position first
  const exportIdx = lines.findIndex(l => l.trim() === `export default ${varName};`);
  
  // Find the last "proper" closing before the pricing additions
  // The Pricing Page i18n comment marks the start of our damaged additions
  const pricingCommentIdx = lines.findIndex(l => l.includes('Pricing Page i18n'));
  
  let cutIdx = pricingCommentIdx >= 0 ? pricingCommentIdx : exportIdx;
  
  // Walk back from cutIdx to find last real content line
  while (cutIdx > 0 && lines[cutIdx - 1].trim() === '') cutIdx--;

  // Build clean file: lines 0..cutIdx + moreItems + export
  const cleanLines = [
    ...lines.slice(0, cutIdx),
    '',
    `${varName}.pricing = ${varName}.pricing || {}; ${varName}.pricing.moreItems = "${moreItems}";`,
    '',
    `export default ${varName};`,
    '',
  ];

  const newContent = cleanLines.join('\n');
  fs.writeFileSync(fp, newContent, 'utf8');
  
  // Test syntax
  try {
    delete require.cache[require.resolve('./' + fp)];
    require('./' + fp);
    console.log(`✅ ${lang}: OK (cutIdx=${cutIdx})`);
  } catch(e) {
    console.log(`❌ ${lang}: STILL ERROR: ${e.message.slice(0, 100)}`);
    // Show around cutIdx
    const newLines2 = newContent.split('\n');
    const total = newLines2.length;
    newLines2.slice(Math.max(0, total - 15)).forEach((l, i) => console.log(`  ${total - 15 + i}: ${l.slice(0, 80)}`));
  }
}

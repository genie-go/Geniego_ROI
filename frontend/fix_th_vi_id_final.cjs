const fs = require('fs');

const FIXES = [
  { fp: 'src/i18n/locales/th.js', mi: 'อีก {{count}} รายการ', v: 'th' },
  { fp: 'src/i18n/locales/vi.js', mi: '+ {{count}} mục khác', v: 'vi' },
  { fp: 'src/i18n/locales/id.js', mi: '+ {{count}} lainnya', v: 'id' },
  { fp: 'src/i18n/locales/zh-TW.js', mi: '另外 {{count}} 項', v: 'zhTW' },
];

for (const { fp, mi, v } of FIXES) {
  let c = fs.readFileSync(fp, 'utf8');
  
  // Remove all orphan "= ..." lines (fragment from broken regex split)
  c = c.replace(/\n = "[^"]+"\s*;\n/g, '\n');
  
  // Find export default line
  const expIdx = c.indexOf('\nexport default ' + v);
  if (expIdx < 0) { console.log(v + ': no export found'); continue; }
  
  // Check if moreItems already set correctly  
  const hasMI = c.slice(Math.max(0, expIdx - 200), expIdx).includes('.pricing.moreItems');
  
  if (!hasMI) {
    // Insert moreItems before export
    const moreItemsLine = v + '.pricing = ' + v + '.pricing || {}; ' + v + '.pricing.moreItems = "' + mi + '";\n';
    c = c.slice(0, expIdx) + '\n' + moreItemsLine + c.slice(expIdx);
  }
  
  fs.writeFileSync(fp, c, 'utf8');
  
  try {
    delete require.cache[require.resolve('./' + fp)];
    require('./' + fp);
    console.log(v + ': OK');
  } catch(e) {
    console.log(v + ' ERROR: ' + e.message.slice(0, 80));
  }
}

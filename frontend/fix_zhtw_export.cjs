const fs = require('fs');
let c = fs.readFileSync('src/i18n/locales/zh-TW.js', 'utf8');
c = c.trimEnd();
c += '\n\nzhTW.pricing = zhTW.pricing || {}; zhTW.pricing.moreItems = "\u53e6\u5916 {{count}} \u9805";\n\nexport default zhTW;\n';
fs.writeFileSync('src/i18n/locales/zh-TW.js', c, 'utf8');
try {
  delete require.cache[require.resolve('./src/i18n/locales/zh-TW.js')];
  require('./src/i18n/locales/zh-TW.js');
  console.log('zh-TW: OK');
} catch(e) {
  console.log('ERROR:', e.message.slice(0, 80));
}

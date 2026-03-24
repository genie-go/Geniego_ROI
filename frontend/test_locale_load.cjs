const fs = require('fs');

// Deep diagnostic: load the locale file as a CommonJS module and check the keys
const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');

// Convert to CJS for evaluation
const cjs = ja
  .replace('export default ja;', 'module.exports = ja;')
  .replace('export default zhTW;', 'module.exports = zhTW;')
  .replace(/^export default \w+;/m, 'module.exports = __locale;');

// Write temp file
fs.writeFileSync('/tmp/locale_test.js', cjs, 'utf8');

try {
  const locale = require('/tmp/locale_test.js');
  console.log('Top-level keys:', Object.keys(locale).join(', '));
  
  // Check for aiPredict, aiRec, cat, journeyTpl
  console.log('\naiPredict:', typeof locale.aiPredict, locale.aiPredict ? Object.keys(locale.aiPredict).join(',') : 'MISSING');
  console.log('aiRec:', typeof locale.aiRec, locale.aiRec ? Object.keys(locale.aiRec).join(',') : 'MISSING');
  console.log('cat:', typeof locale.cat, locale.cat ? Object.keys(locale.cat).join(',') : 'MISSING');
  console.log('journeyTpl:', typeof locale.journeyTpl, locale.journeyTpl ? Object.keys(locale.journeyTpl).join(',') : 'MISSING');
  
  if (locale.aiPredict) {
    console.log('\naiPredict.kpi:', typeof locale.aiPredict.kpi, locale.aiPredict.kpi ? Object.keys(locale.aiPredict.kpi) : 'MISSING');
    console.log('aiPredict.tab:', typeof locale.aiPredict.tab, locale.aiPredict.tab ? Object.keys(locale.aiPredict.tab) : 'MISSING');
    console.log('aiPredict.col:', typeof locale.aiPredict.col, locale.aiPredict.col ? Object.keys(locale.aiPredict.col) : 'MISSING');
    console.log('salesInfo via t path test:', locale.aiRec && locale.aiRec.salesInfo);
  }
} catch (e) {
  console.error('Failed to load locale:', e.message);
  console.log('\nContext around objEnd:');
  const objEnd = ja.lastIndexOf('};');
  console.log(ja.slice(objEnd - 200, objEnd + 100));
}

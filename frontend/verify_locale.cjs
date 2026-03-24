const fs = require('fs');

// Verify the generated sections are WITHIN the main object, not outside it
const langs = ['en','ja','zh','de','th','vi','id','zh-TW','ko'];
const BASE = 'src/i18n/locales';

for (const lang of langs) {
  const p = `${BASE}/${lang}.js`;
  const c = fs.readFileSync(p, 'utf8');
  
  // Find the position of the main object closing }; and auto-generated keys
  const airIdx = c.indexOf('aiRec:');
  const aiPIdx = c.indexOf('aiPredict:');
  const exportIdx = c.lastIndexOf('export default');
  
  // The main object should close with "};" just before "export default"  
  // Find the }; position right before export
  const closeBeforeExport = c.lastIndexOf('};', exportIdx);
  
  // aiRec and aiPredict should be BEFORE closeBeforeExport
  const airOK = airIdx > 0 && airIdx < closeBeforeExport;
  const aipOK = aiPIdx > 0 && aiPIdx < closeBeforeExport;
  
  if (!airOK || !aipOK) {
    console.log(`PROBLEM in ${lang}:`);
    console.log(`  aiRec at ${airIdx}, aiPredict at ${aiPIdx}, closing }; at ${closeBeforeExport}`);
    // Show context around closing
    console.log('  Context:', c.slice(closeBeforeExport - 50, closeBeforeExport + 100));
  } else {
    console.log(`OK: ${lang} (aiRec: ${airIdx}, aiPredict: ${aiPIdx}, close: ${closeBeforeExport})`);
  }
}
console.log('\nDone!');

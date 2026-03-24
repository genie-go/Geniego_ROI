const fs = require('fs');

// The real question: does the ja.js object actually CONTAIN aiRec as a key?
// Let's load the ja.js module and check
try {
  // Can't use require() on ES module, so we'll parse manually
  const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');
  
  // Check if the auto-generated section is inside the const ja = { ... } object
  // or outside of it
  
  // Find main object start
  const objStart = ja.indexOf('const ja = {');
  // Find main object end (last }; before export default)
  const exportIdx = ja.lastIndexOf('export default');
  const objEnd = ja.lastIndexOf('};', exportIdx);
  
  console.log('Object starts at:', objStart);
  console.log('Object ends at:', objEnd);
  console.log('Total file length:', ja.length);
  
  // Check if aiRec is WITHIN obj bounds
  const aiRecIdx = ja.indexOf('    aiRec:');  // note: 4 spaces indent = top level
  const aiRecIdx2 = ja.indexOf('  aiRec:');   // 2 spaces
  const aiRecIdx3 = ja.indexOf('aiRec:');     // no indent
  
  console.log('\naiRec with 4-space indent at:', aiRecIdx);
  console.log('aiRec with 2-space indent at:', aiRecIdx2);
  console.log('aiRec with no indent at:', aiRecIdx3);
  
  // Show context around the AUTO-GENERATED section insertion point
  // The script added it AFTER the closing }; but BEFORE export default
  const autoGenIdx = ja.indexOf('// ── Auto-generated i18n keys ──');
  console.log('\nAuto-generated section at:', autoGenIdx);
  console.log('Is it AFTER main object end?', autoGenIdx > objEnd);
  
  // Show the section around objEnd
  console.log('\nAround objEnd:');
  console.log(ja.slice(objEnd - 100, objEnd + 500));
  
} catch (e) {
  console.error(e);
}

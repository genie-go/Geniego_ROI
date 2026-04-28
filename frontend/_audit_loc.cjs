// Audit DashInfluencer LOC dictionary completeness  
const fs = require('fs');
const content = fs.readFileSync('./src/components/dashboards/DashInfluencer.jsx', 'utf-8');

// Extract LOC section
const locStart = content.indexOf('const LOC = {');
const locEnd = content.indexOf('\n};\n', locStart + 100);
const locBlock = content.substring(locStart, locEnd + 3);

// Get all language keys
const langMatches = locBlock.match(/^\s{2}(\w[\w-]*):\s*\{/gm) || [];
const langs = langMatches.map(m => m.trim().replace(/:\s*\{$/, ''));
console.log(`Languages in LOC: ${langs.join(', ')} (${langs.length})`);

// Get reference keys from 'en'
const enStart = locBlock.indexOf("en: {");
const enEnd = locBlock.indexOf("\n  },", enStart);
const enBlock = locBlock.substring(enStart, enEnd);
const enKeys = [];
const keyRegex = /(\w+):/g;
let match;
while ((match = keyRegex.exec(enBlock))) {
  if (match[1] !== 'en') enKeys.push(match[1]);
}
console.log(`Reference keys from 'en': ${enKeys.length}`);

// Check each language
const expectedLangs = ['ko','en','ja','zh','zh-TW','de','th','vi','id','es','fr','pt','ru','ar','hi'];
const missingLangs = expectedLangs.filter(l => !langs.includes(l));
if (missingLangs.length > 0) {
  console.log(`\n❌ Missing languages: ${missingLangs.join(', ')}`);
} else {
  console.log('\n✅ All 15 languages present in LOC');
}

// Check key coverage
for (const lang of langs) {
  const langStart = locBlock.indexOf(`${lang}: {`, locBlock.indexOf(`${lang}:`));
  const langEnd = locBlock.indexOf("\n  },", langStart);
  const langBlock = locBlock.substring(langStart, langEnd > 0 ? langEnd : locBlock.length);
  
  const missing = enKeys.filter(k => !langBlock.includes(`${k}:`));
  if (missing.length > 0) {
    console.log(`⚠️  ${lang}: Missing ${missing.length} keys: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
  } else {
    console.log(`✅ ${lang}: All ${enKeys.length} keys present`);
  }
}

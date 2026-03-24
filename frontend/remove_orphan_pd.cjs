const fs = require('fs');
const path = require('path');

// The issue: pricingDetail/cmpRow/cmpVal were inserted as object properties
// but are OUTSIDE any containing object (orphan) after insert_pricing_inside.cjs
// inserted them between the last }; of some sub-object and export default.
// 
// The locale files use pattern: 
//   const en = { ... };
//   en.xxx = Object.assign(en.xxx || {}, { ... });
//   export default en;
//
// So pricingDetail must be: en.pricingDetail = { ... };
// Currently it looks like:
//   };   <- closes something (like gdpr)
//   en.pricing.moreItems = "...";
//   cmpRow: { ... },      <- ORPHAN (not inside any var)
//   cmpVal: { ... },      <- ORPHAN
//   pricingDetail: { ... }, <- ORPHAN
//   };  <- THIS CLOSES NOTHING
//   export default en;

// OR there's a duplicated block issue from multiple script runs.

// Strategy: For each locale file:
// 1. Find all occurrences of "pricingDetail:", "cmpRow:", "cmpVal:" outside of proper context
// 2. Remove the orphaned blocks entirely
// 3. Re-add as proper en.pricingDetail = {...}; statements

const LOCALE_FILES = {
  ko: { fp: 'src/i18n/locales/ko.js', varName: 'ko' },
  en: { fp: 'src/i18n/locales/en.js', varName: 'en' },
  ja: { fp: 'src/i18n/locales/ja.js', varName: 'ja' },
  zh: { fp: 'src/i18n/locales/zh.js', varName: 'zh' },
  de: { fp: 'src/i18n/locales/de.js', varName: 'de' },
  th: { fp: 'src/i18n/locales/th.js', varName: 'th' },
  vi: { fp: 'src/i18n/locales/vi.js', varName: 'vi' },
  id: { fp: 'src/i18n/locales/id.js', varName: 'id' },
  'zh-TW': { fp: 'src/i18n/locales/zh-TW.js', varName: 'zhTW' },
};

function removeOrphanBlocks(content, varName) {
  // Remove lines that are indented object properties without a parent object
  // These appear as:
  //   cmpRow: { ... },
  //   cmpVal: { ... },
  //   pricingDetail: { ... },
  // between a }; and export default
  
  // Find the export default line
  const exportMatch = content.indexOf('\nexport default ');
  if (exportMatch < 0) return content;
  
  // Find the last }; before export
  let lastClose = content.lastIndexOf('};', exportMatch);
  if (lastClose < 0) return content;
  
  // Everything between lastClose+2 and exportMatch is suspect
  const suspectRegion = content.slice(lastClose + 2, exportMatch);
  
  // Check if there are orphan blocks in suspect region
  // (indented keys like "  cmpRow:", "  pricingDetail:", "  cmpVal:")
  const hasOrphans = /^\s+(cmpRow|cmpVal|pricingDetail)\s*:/m.test(suspectRegion);
  if (!hasOrphans) return content;
  
  // Remove the orphan region entirely: from lastClose+2 to exportMatch
  // The closing "};" or orphan characters after lastClose and before export
  // Keep only moreItems assignment if present
  const moreItemsMatch = suspectRegion.match(/([^\n]+\.pricing[^\n]*\.moreItems\s*=\s*"[^"]+";)/);
  const moreItemsLine = moreItemsMatch ? moreItemsMatch[1] : null;
  
  // Also check for duplicate "};" that closes the orphan
  // Find the orphan-closing "};": Look for a lone "};" in suspectRegion
  // Actually the suspect region might contain "};" that closes pricingDetail
  
  // Find where orphan block ends: find the last "};" in suspect region  
  let orphanEnd = exportMatch; // by default go up to export
  const closingInSuspect = suspectRegion.lastIndexOf('};');
  if (closingInSuspect >= 0) {
    orphanEnd = lastClose + 2 + closingInSuspect + 2;
  }
  
  const newContent = content.slice(0, lastClose + 2) + 
    '\n' + (moreItemsLine ? moreItemsLine + '\n' : '') +
    content.slice(orphanEnd);
  
  return newContent;
}

for (const [lang, { fp, varName }] of Object.entries(LOCALE_FILES)) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  
  const originalLen = c.length;
  
  // Check for pricingDetail as top-level assignment (correct form)
  const hasCorrectForm = c.includes(`${varName}.pricingDetail = {`) || 
                         c.includes(`${varName}.pricingDetail={`);
  
  if (hasCorrectForm) {
    console.log(`⏭ ${lang}: already has ${varName}.pricingDetail = {...}`);
    continue;
  }
  
  // Remove orphan blocks
  c = removeOrphanBlocks(c, varName);
  
  if (c.length !== originalLen) {
    console.log(`✅ ${lang}: removed orphan blocks (${originalLen} → ${c.length} chars)`);
  } else {
    console.log(`⏭ ${lang}: no orphan blocks found`);
  }
  
  fs.writeFileSync(fp, c, 'utf8');
}

console.log('\nDone. Now run add_pd_correct_v2.cjs to add as proper assignments.');

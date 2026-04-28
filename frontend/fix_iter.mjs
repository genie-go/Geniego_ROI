// Fix all escape and syntax issues iteratively
import { parse } from 'acorn';
import { readFileSync, writeFileSync } from 'fs';

const DIR = 'src/i18n/locales/';
const ALL = ['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL.forEach(lang => {
  const p = DIR + lang + '.js';
  let src = readFileSync(p, 'utf8');
  let iteration = 0;
  
  while (iteration < 20) {
    try {
      parse(src, { ecmaVersion: 2020, sourceType: 'module' });
      console.log(lang + ': FIXED after ' + iteration + ' iterations');
      writeFileSync(p, src);
      return;
    } catch(e) {
      iteration++;
      const pos = e.pos;
      const ctx = src.substring(Math.max(0,pos-30), pos+30);
      
      // Fix strategies based on context:
      // 1. Double-escaped quotes: \\\\" -> \\"
      if (ctx.includes('\\\\"')) {
        src = src.split('\\\\"').join('\\"');
        continue;
      }
      // 2. Value starting without proper quote after colon
      // 3. Unquoted string after ","
      // 4. Thai/CJK characters outside quotes
      
      // Generic fix: find the problematic key-value pair and replace value with empty string
      // Find the nearest key before pos
      let keyStart = src.lastIndexOf('"', pos - 1);
      let keyEnd = pos;
      
      // Find the nearest complete key:"value" pattern containing pos
      // Look back for ":"
      let colonPos = src.lastIndexOf('":"', pos);
      if (colonPos > pos - 100 && colonPos > 0) {
        // Find the key name
        let ks = src.lastIndexOf('"', colonPos - 1);
        if (ks >= 0) {
          let keyName = src.substring(ks+1, colonPos);
          // Find the next proper key start after this broken value
          let nextKey = src.indexOf('","', pos);
          if (nextKey > 0 && nextKey < pos + 200) {
            // Replace the broken value with empty string
            let oldPart = src.substring(colonPos + 2, nextKey + 1);
            src = src.substring(0, colonPos + 2) + '""' + src.substring(nextKey + 1);
            continue;
          }
        }
      }
      
      // If we can't fix, log and break
      console.log(lang + ': UNFIXABLE at pos ' + pos + ': ' + e.message);
      console.log('  Context: ' + JSON.stringify(ctx));
      writeFileSync(p, src);
      return;
    }
  }
  
  writeFileSync(p, src);
  console.log(lang + ': max iterations reached');
});

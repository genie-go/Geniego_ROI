// Fix all broken string patterns in locale files
// Pattern: "key":"," should be "key":"","
import { parse } from 'acorn';
import { readFileSync, writeFileSync } from 'fs';

const DIR = 'src/i18n/locales/';
const ALL = ['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL.forEach(lang => {
  const p = DIR + lang + '.js';
  let src = readFileSync(p, 'utf8');
  let fixes = 0;
  
  // Fix pattern: "key":","nextKey" -> "key":"","nextKey"
  // This happens when a value is empty but the quotes get confused
  let prev = '';
  while (prev !== src) {
    prev = src;
    // Find: ":"," where the value should be empty ""
    src = src.replace(/":\s*",\s*"/g, (match) => {
      fixes++;
      return '":"","';
    });
  }
  
  writeFileSync(p, src);
  
  // Verify parse
  try {
    parse(src, { ecmaVersion: 2020, sourceType: 'module' });
    console.log(lang + ': OK (fixed ' + fixes + ' broken strings)');
  } catch(e) {
    console.log(lang + ': STILL ERROR at pos ' + e.pos + ': ' + e.message);
    console.log('  Context: ' + JSON.stringify(src.substring(e.pos-20, e.pos+20)));
  }
});

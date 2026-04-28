// Use acorn to find exact parse error in ko.js
import { parse } from 'acorn';
import { readFileSync } from 'fs';
const src = readFileSync('src/i18n/locales/ko.js', 'utf8');
try {
  parse(src, { ecmaVersion: 2020, sourceType: 'module' });
  console.log('Parse OK');
} catch(e) {
  console.log('Error at pos ' + e.pos + ': ' + e.message);
  console.log('Context: ' + JSON.stringify(src.substring(e.pos-30, e.pos+30)));
}

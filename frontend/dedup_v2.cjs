// Parse and rebuild locale files properly using Vite's own parser
// Strategy: Use rollup/acorn to parse, but since that fails too, 
// we'll use a different approach: process the minified JS as JSON-like text

const fs = require('fs');
const DIR = 'src/i18n/locales/';
const BK = 'src/i18n/locales_backup/';

// First restore from backup
['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es'].forEach(l => {
  if(fs.existsSync(BK+l+'.js')) fs.copyFileSync(BK+l+'.js', DIR+l+'.js');
});
['pt','ru','ar','hi'].forEach(l => fs.copyFileSync(BK+'en.js', DIR+l+'.js'));

const ALL = ['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

// Strategy: Extract the JSON-like content, find duplicate top-level keys, 
// remove earlier occurrences and keep the last one
ALL.forEach(lang => {
  let src = fs.readFileSync(DIR+lang+'.js', 'utf8');
  
  // Extract content between export default { ... };
  let content = src.replace(/^export\s+default\s*\{/, '').replace(/\};\s*$/, '');
  
  // Find all top-level key positions using balanced brace matching
  const keys = [];
  let i = 0;
  while (i < content.length) {
    // Skip whitespace
    while (i < content.length && ' \t\n\r,'.includes(content[i])) i++;
    if (i >= content.length) break;
    
    // Expect a key (quoted string)
    if (content[i] !== '"' && content[i] !== "'") { i++; continue; }
    const quote = content[i];
    let keyStart = i;
    i++; // skip opening quote
    let keyName = '';
    while (i < content.length && content[i] !== quote) {
      if (content[i] === '\\') { keyName += content[i+1]; i += 2; continue; }
      keyName += content[i]; i++;
    }
    i++; // skip closing quote
    
    // Skip whitespace and colon
    while (i < content.length && ' \t\n\r'.includes(content[i])) i++;
    if (i >= content.length || content[i] !== ':') continue;
    i++; // skip colon
    while (i < content.length && ' \t\n\r'.includes(content[i])) i++;
    
    // Now find the value - could be string, object, array, number, etc.
    let valueStart = i;
    if (content[i] === '{') {
      // Object - balanced brace matching with string awareness
      let depth = 1; i++;
      while (i < content.length && depth > 0) {
        const c = content[i];
        if (c === '"' || c === "'") {
          const q = c; i++;
          while (i < content.length && content[i] !== q) {
            if (content[i] === '\\') i++;
            i++;
          }
        }
        if (c === '{') depth++;
        if (c === '}') depth--;
        i++;
      }
    } else if (content[i] === '[') {
      // Array - balanced bracket matching
      let depth = 1; i++;
      while (i < content.length && depth > 0) {
        const c = content[i];
        if (c === '"' || c === "'") {
          const q = c; i++;
          while (i < content.length && content[i] !== q) {
            if (content[i] === '\\') i++;
            i++;
          }
        }
        if (c === '[') depth++;
        if (c === ']') depth--;
        i++;
      }
    } else if (content[i] === '"' || content[i] === "'") {
      // String value
      const q = content[i]; i++;
      while (i < content.length && content[i] !== q) {
        if (content[i] === '\\') i++;
        i++;
      }
      i++; // skip closing quote
    } else if (content[i] === '`') {
      // Template literal - skip to closing backtick
      i++;
      while (i < content.length && content[i] !== '`') {
        if (content[i] === '\\') i++;
        i++;
      }
      i++;
    } else {
      // Number, boolean, etc.
      while (i < content.length && !',}'.includes(content[i])) i++;
    }
    
    let valueEnd = i;
    keys.push({
      name: keyName,
      start: keyStart,
      end: valueEnd,
      text: content.substring(keyStart, valueEnd)
    });
  }
  
  // Deduplicate: keep last occurrence of each key
  const seen = new Map();
  keys.forEach((k, idx) => {
    seen.set(k.name, idx);
  });
  
  const uniqueKeys = keys.filter((k, idx) => seen.get(k.name) === idx);
  const removed = keys.length - uniqueKeys.length;
  
  // Rebuild content
  const newContent = uniqueKeys.map(k => k.text).join(',');
  const newSrc = 'export default {' + newContent + '};\n';
  
  fs.writeFileSync(DIR + lang + '.js', newSrc, 'utf8');
  console.log(lang + ': ' + keys.length + ' -> ' + uniqueKeys.length + ' keys (removed ' + removed + '), ' + newSrc.length + ' bytes');
});

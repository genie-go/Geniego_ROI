const fs = require('fs');
const dir = 'frontend/src/i18n/locales';
const langs = ['ko','en','ja','zh','zh-TW','de','es','fr','pt','ru','ar','hi'];

langs.forEach(lang => {
  const fpath = dir + '/' + lang + '.js';
  if (!fs.existsSync(fpath)) return;
  let c = fs.readFileSync(fpath, 'utf8');
  // Fix: "}\n  "profile"" → "},\n  "profile""
  const bad = /\}\s*\n(\s*"profile": \{)/;
  if (bad.test(c)) {
    c = c.replace(bad, '},\n$1');
    fs.writeFileSync(fpath, c, 'utf8');
    console.log(lang + ': fixed missing comma before profile');
  } else {
    console.log(lang + ': ok');
  }
});

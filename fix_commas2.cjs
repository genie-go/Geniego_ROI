const fs = require('fs');
const dir = 'frontend/src/i18n/locales';
const langs = ['ko','en','ja','zh','zh-TW','de','es','fr','pt','ru','ar','hi','th','vi','id'];

langs.forEach(lang => {
  const fpath = dir + '/' + lang + '.js';
  if (!fs.existsSync(fpath)) return;
  let c = fs.readFileSync(fpath, 'utf8');
  let fixed = 0;
  
  // Fix missing commas before any top-level block
  const blocks = ['sc', 'wa', 'profile'];
  for (const b of blocks) {
    const re = new RegExp('\\}\\s*\\n(\\s*"' + b + '": \\{)');
    if (re.test(c)) {
      c = c.replace(re, '},\n$1');
      fixed++;
    }
  }
  
  if (fixed > 0) {
    fs.writeFileSync(fpath, c, 'utf8');
    console.log(lang + ': fixed ' + fixed + ' missing commas');
  } else {
    console.log(lang + ': ok');
  }
});

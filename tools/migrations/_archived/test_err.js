const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/AlertPolicies.jsx', 'utf8');

let rules = {
  R1: />(\s*)([^><{}"'()]*[가-힣][^><{}"'()]*)(\s*)</g,
  R2: / \b(label|placeholder|title|tooltip|message|desc|subtitle)=["']([^"'{()<>]*[가-힣][^"'{()<>]*)["']/g,
  R3: /\b(label|name|title|desc|message|text)\s*:\s*(["'])([^"'{()<>]*[가-힣][^"'{()<>]*)["']/g
};

for (let r in rules) {
  c.replace(rules[r], (m) => {
    if (m.includes('grid')) {
      console.log(`FOUND IN ${r}:`, m);
    }
    return m;
  });
}

const fs = require('fs');

// Check what is in marketing.aiHubTitle for zh
const c = fs.readFileSync('src/i18n/locales/zh.js', 'utf8');
const mIdx = c.indexOf('aiHubTitle');
if (mIdx >= 0) {
  console.log('zh aiHubTitle:', c.slice(mIdx, mIdx+100));
} else {
  console.log('zh: aiHubTitle NOT FOUND');
}

const mIdx2 = c.indexOf('aiHubDesc1');
if (mIdx2 >= 0) {
  console.log('zh aiHubDesc1:', c.slice(mIdx2, mIdx2+100));
} else {
  console.log('zh: aiHubDesc1 NOT FOUND');
}

// Check en
const en = fs.readFileSync('src/i18n/locales/en.js', 'utf8');
const eIdx = en.indexOf('aiHubTitle');
if (eIdx >= 0) {
  console.log('en aiHubTitle:', en.slice(eIdx, eIdx+100));
} else {
  console.log('en: aiHubTitle NOT FOUND');
}

const fs = require('fs');
const glob = require('fs').readdirSync;
const path = require('path');

const TARGETS = [
  'MOCK_KEYWORDS', 'MOCK_REVIEWS', 'MOCK_REQUESTS', 'MOCK_SETTLEMENTS',
  'MOCK_LOGS', 'MOCK_CHANNELS', 'MOCK_JOBS_INIT', 'MOCK_PRODUCTS',
  'MOCK_DATA', 'MOCK_RAW', 'DEMO_PICKS', 'DEMO_CRM_CUSTOMERS',
  'DEMO_KAKAO_CAMPAIGNS', 'DEMO_JOURNEYS', 'DEMO_LINE_CAMPAIGNS',
  'DEMO_POPUP_DEFS', 'DEMO_CONVERSATIONS', 'DEMO_CATALOG', 'DEMO_RETURNS',
  'DEMO_AB'
];

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, 'utf8');
  let orig = c;

  TARGETS.forEach(k => {
    // Array literals
    const rxArr = new RegExp(`const ${k}\\s*=\\s*\\[[\\s\\S]*?\\];`);
    c = c.replace(rxArr, `const ${k} = [];`);
  });

  // Object literal
  c = c.replace(/const MOCK_SUMMARY\s*=\s*\{[\s\S]*?\n\};/m, 'const MOCK_SUMMARY = {};');
  c = c.replace(/const DEMO_CUSTOMERS\s*=\s*\(\(\)[\s\S]*?\}\)\(\);/m, 'const DEMO_CUSTOMERS = [];');

  // MOCK_DATA which might be initialized from function output
  // Example: const MOCK_DATA = Array.from(...)
  c = c.replace(/const MOCK_DATA\s*=\s*Array\.from\([\s\S]*?\n\]\);/m, 'const MOCK_DATA = [];');

  // Also clear DEMO_EMAIL_BLOCKS which has an initial required structure
  c = c.replace(/const DEMO_EMAIL_BLOCKS\s*=\s*\[[\s\S]*?\];/m, 'const DEMO_EMAIL_BLOCKS = [];');

  if (orig !== c) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`Scrubbed ${file}`);
  }
}

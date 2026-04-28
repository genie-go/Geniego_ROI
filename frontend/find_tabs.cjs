const fs = require('fs');
const s = fs.readFileSync('src/i18n/locales_backup/ko.js', 'utf8');

// Search for translations of specific terms in backup
const searches = [
  'Ad Status', 'Creative', 'Compare', 'AI Design', 'Guide',
  'Budget Tracker', 'Overview', 'Allocation', 'Burn Rate', 'Alerts',
  'Burn Rate', 'Account Performance'
];

for (const term of searches) {
  const idx = s.indexOf('"' + term + '"');
  if (idx >= 0) {
    console.log(`"${term}" found at pos ${idx}`);
    console.log(`  Context: ...${s.substring(Math.max(0, idx - 50), idx + term.length + 50)}...`);
  }
}

// Search for Korean tab translations
const koTerms = ['광고 현황', '크리에이티브', '비교', 'AI 디자인', '이용 가이드', '예산 관리', '예산 추적', '소진율'];
for (const term of koTerms) {
  if (s.includes(term)) {
    const idx = s.indexOf(term);
    console.log(`KO "${term}" found at ${idx}`);
    console.log(`  Context: ...${s.substring(Math.max(0, idx - 50), idx + term.length + 50)}...`);
  } else {
    console.log(`KO "${term}" NOT FOUND`);
  }
}

// Check how the Ad Performance component references tabs
console.log('\n=== Checking AdPerformance component ===');
const adPerf = fs.readFileSync('src/pages/AdPerformance.jsx', 'utf8');
// Find tab definitions
const tabMatches = adPerf.match(/tab[sS]\s*=\s*\[[\s\S]*?\]/);
if (tabMatches) {
  console.log('Tab definition found:', tabMatches[0].substring(0, 300));
}
// Find where "Ad Status" is used
const lines = adPerf.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Ad Status') || lines[i].includes('Creative') || lines[i].includes('"Guide"')) {
    console.log(`L${i+1}: ${lines[i].trim().substring(0, 120)}`);
  }
}

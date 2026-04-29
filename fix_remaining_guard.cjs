const fs = require('fs');
const path = require('path');
const dir = 'frontend/src/pages';

const GUARD = `
/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();
`;

const targets = ['Attribution.jsx', 'CRM.jsx', 'JourneyBuilder.jsx', 'Settlements.jsx', 'CampaignManager.jsx', 'MappingRegistry.jsx'];
let fixed = 0;

targets.forEach(file => {
  const fpath = path.join(dir, file);
  let c = fs.readFileSync(fpath, 'utf8');
  if (/_isDemo/.test(c)) { console.log('SKIP ' + file); return; }
  
  const lastImport = c.lastIndexOf('import ');
  const nextLine = c.indexOf('\n', lastImport);
  c = c.substring(0, nextLine + 1) + GUARD + c.substring(nextLine + 1);
  
  fs.writeFileSync(fpath, c, 'utf8');
  fixed++;
  console.log('FIXED ' + file);
});

console.log('Total: ' + fixed);
